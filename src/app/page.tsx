'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Nav from '@/components/Nav';
import UploadZone from '@/components/UploadZone';
import Footer from '@/components/Footer';

interface FileEntry {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  executionId?: string;
  error?: string;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelect = useCallback((newFiles: File[]) => {
    setError(null);
    const entries: FileEntry[] = newFiles.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...entries]);
  }, []);

  const handleRemove = useCallback((idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleClearAll = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) return;

    if (files.length === 1) {
      setSubmitting(true);
      setError(null);
      try {
        const base64 = await readAsBase64(files[0].file);
        const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Submission failed'); }
        const { executionId } = await res.json();
        try { localStorage.setItem(`screenshot:${executionId}`, base64); } catch {}
        router.push(`/results/${executionId}`);
      } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); setSubmitting(false); }
      return;
    }

    setSubmitting(true);
    setError(null);
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

    const results = await Promise.allSettled(
      files.map(async (entry, idx) => {
        const base64 = await readAsBase64(entry.file);
        const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        const { executionId } = await res.json();
        try { localStorage.setItem(`screenshot:${executionId}`, base64); } catch {}
        return { idx, executionId };
      })
    );

    const updated = [...files];
    let successCount = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        updated[r.value.idx] = { ...updated[r.value.idx], status: 'done', executionId: r.value.executionId };
        successCount++;
      } else {
        const idx = results.indexOf(r);
        updated[idx] = { ...updated[idx], status: 'error', error: r.reason?.message ?? 'Failed' };
      }
    }
    setFiles(updated);
    setSubmitting(false);

    if (successCount === 1) {
      const done = updated.find(f => f.status === 'done');
      if (done?.executionId) router.push(`/results/${done.executionId}`);
    } else if (successCount > 1) {
      router.push('/history?filter=running');
    }
  }, [files, router]);

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'uploading').length;

  return (
    <>
      <Nav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <section style={{
          minHeight: 'calc(100vh - 60px)', position: 'relative', display: 'flex', alignItems: 'center',
          padding: '80px 32px 64px',
        }}>
          <div style={{ width: '100%', maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
            <div className="badge badge-pink animate-fade-in" style={{ marginBottom: 28 }}>
              <span className="animate-pulse-pink" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pink)', display: 'inline-block' }} />
              phish_prevention.exe
            </div>

            <h1 className="display animate-slide-up" style={{
              fontWeight: 900, fontSize: 'clamp(48px, 8vw, 104px)', lineHeight: 0.92,
              letterSpacing: '-0.045em', marginBottom: 24, color: 'var(--text)',
            }}>
              Light up the <span style={{ color: 'var(--pink)' }} className="glow-text-pink">lures</span>.
            </h1>

            <p className="mono animate-slide-up stagger-1" style={{
              fontSize: 11, color: 'var(--pink)', letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 32, opacity: 0.85,
            }}>
              ▸ Don&apos;t take the bait.
            </p>

            <p className="animate-slide-up stagger-2" style={{
              fontSize: 19, color: 'var(--text-dim)', maxWidth: 700, margin: '0 auto 20px', lineHeight: 1.55,
            }}>
              Upload screenshots of suspicious messages.{' '}
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Lurelit</strong>{' '}
              analyzes them with AI, enriches IOCs, and hunts your environment — automatically.
            </p>

            <p className="mono animate-slide-up stagger-3" style={{
              fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.18em', marginBottom: 48, textTransform: 'uppercase',
            }}>
              AI Analysis &nbsp;·&nbsp; IOC Enrichment &nbsp;·&nbsp; Automated Threat Hunting
            </p>

            <div className="animate-slide-up stagger-4">
              {files.length === 0 && (
                <>
                  <UploadZone onFilesSelect={handleFilesSelect} disabled={submitting} />
                </>
              )}

              {files.length > 0 && (
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span className="label-sm" style={{ color: 'var(--text-dim)' }}>
                      {files.length} screenshot{files.length !== 1 ? 's' : ''} ready to analyze
                    </span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => document.getElementById('add-more-input')?.click()} disabled={submitting}
                        className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal-bright)', background: 'none', border: 'none', cursor: 'pointer', opacity: submitting ? 0.4 : 1 }}>
                        + Add More
                      </button>
                      <button onClick={handleClearAll} disabled={submitting}
                        className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', opacity: submitting ? 0.4 : 1 }}>
                        Clear All
                      </button>
                    </div>
                    <input id="add-more-input" type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) handleFilesSelect(f); e.target.value = ''; }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: files.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {files.map((entry, idx) => (
                      <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ aspectRatio: files.length === 1 ? '16/9' : '1', overflow: 'hidden', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: files.length === 1 ? 16 : 0 }}>
                          <Image src={entry.preview} alt={entry.file.name} width={files.length === 1 ? 500 : 160} height={files.length === 1 ? 300 : 160}
                            style={{ objectFit: files.length === 1 ? 'contain' : 'cover', width: '100%', height: files.length === 1 ? 'auto' : '100%', maxHeight: files.length === 1 ? 350 : undefined }}
                            unoptimized />
                        </div>
                        {entry.status === 'uploading' && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,24,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="animate-spin-slow" style={{ width: 24, height: 24, border: '2px solid rgba(0,191,179,0.3)', borderTopColor: 'var(--teal)', borderRadius: '50%' }} />
                          </div>
                        )}
                        {entry.status === 'done' && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,191,179,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" fill="rgba(0,191,179,0.3)" /><path d="M9 14l3.5 3.5L19 10" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        )}
                        {entry.status === 'error' && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,78,152,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" fill="rgba(240,78,152,0.3)" /><path d="M10 10l8 8M18 10l-8 8" stroke="var(--pink)" strokeWidth="2.5" strokeLinecap="round" /></svg>
                          </div>
                        )}
                        {entry.status === 'pending' && (
                          <button onClick={() => handleRemove(idx)} style={{
                            position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%',
                            background: 'rgba(10,6,24,0.7)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </button>
                        )}
                        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                          <p className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.file.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSubmit} disabled={submitting || pendingCount === 0}
                    className="btn btn-primary" style={{ margin: '24px auto 0', display: 'flex' }}>
                    {submitting ? (
                      <>
                        <div className="animate-spin-slow" style={{ width: 16, height: 16, border: '2px solid rgba(5,2,16,0.3)', borderTopColor: 'var(--bg-deep)', borderRadius: '50%' }} />
                        Submitting {files.length} file{files.length !== 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Analyze {files.length} Screenshot{files.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="card card-accent-pink animate-fade-in" style={{ maxWidth: 480, margin: '24px auto 0', padding: 20 }}>
                  <p className="label-sm" style={{ color: 'var(--pink)', marginBottom: 4 }}>Error</p>
                  <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>{error}</p>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
