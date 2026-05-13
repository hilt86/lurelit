'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import MetricsDashboard from '@/components/MetricsDashboard';
import VerdictBadge from '@/components/VerdictBadge';

interface Execution {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  executedBy?: string;
  triggeredBy?: string;
  error?: string;
  isTestRun?: boolean;
}

type Filter = 'all' | 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'threats' | 'safe';

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  completed: { color: 'var(--teal)', bg: 'rgba(0,191,179,0.08)', border: 'rgba(0,191,179,0.3)', label: 'Completed' },
  failed: { color: 'var(--pink)', bg: 'rgba(240,78,152,0.08)', border: 'rgba(240,78,152,0.3)', label: 'Failed' },
  running: { color: 'var(--blue)', bg: 'rgba(27,169,245,0.08)', border: 'rgba(27,169,245,0.3)', label: 'Running' },
  pending: { color: 'var(--yellow)', bg: 'rgba(254,197,20,0.08)', border: 'rgba(254,197,20,0.3)', label: 'Starting' },
  cancelled: { color: 'var(--text-faint)', bg: 'var(--bg-surface)', border: 'var(--border)', label: 'Cancelled' },
};

function HistoryThumbnail({ executionId }: { executionId: string }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  const isLoading = src === undefined;

  useEffect(() => {
    let cancelled = false;

    try {
      const stored = localStorage.getItem(`screenshot:${executionId}`);
      if (stored) {
        Promise.resolve().then(() => {
          if (!cancelled) setSrc(stored);
        });
        return;
      }
    } catch {}

    fetch(`/api/thumbnail/${executionId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled) setSrc(data?.screenshot ?? null);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => { cancelled = true; };
  }, [executionId]);

  return (
    <div
      aria-label={src ? 'Screenshot thumbnail' : 'No screenshot thumbnail available'}
      title={src ? 'Submitted screenshot' : isLoading ? 'Loading screenshot thumbnail' : 'Screenshot unavailable'}
      style={{
        width: 50, height: 38, borderRadius: 4, overflow: 'hidden',
        background: src ? 'var(--bg-surface)' : 'rgba(0,191,179,0.06)',
        border: `1px solid ${src ? 'var(--border-strong)' : 'rgba(0,191,179,0.22)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: src ? '0 0 12px rgba(0,191,179,0.18)' : 'inset 0 0 8px rgba(0,191,179,0.08)',
        justifySelf: 'start',
      }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={50}
          height={38}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          unoptimized
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--teal)', opacity: isLoading ? 0.5 : 0.8 }}>
            <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            <circle cx="6" cy="7" r="1.2" stroke="currentColor" strokeWidth="1" />
            <path d="M2.5 11l3-2.5 2.2 1.8L10.5 7l3 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mono" style={{ fontSize: 6, lineHeight: 1, color: 'var(--teal)', letterSpacing: '0.12em', opacity: isLoading ? 0.45 : 0.65 }}>
            {isLoading ? 'LOAD' : 'SHOT'}
          </span>
        </div>
      )}
    </div>
  );
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as Filter) || 'completed';
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [threats, setThreats] = useState<Record<string, boolean>>({});

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?page=${page}&size=20`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExecutions(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const handleCancel = async (e: React.MouseEvent, execId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCancellingId(execId);
    try {
      await fetch(`/api/cancel/${execId}`, { method: 'POST' });
      setTimeout(fetchHistory, 1000);
    } catch {} finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(fetchHistory, 0);
    return () => window.clearTimeout(id);
  }, [fetchHistory]);

  useEffect(() => {
    const users = [...new Set(executions.map(e => e.executedBy).filter(Boolean))] as string[];
    users.forEach(async (username) => {
      if (avatars[username] !== undefined) return;
      try {
        const res = await fetch(`/api/avatar/${username}`);
        if (res.ok) {
          const data = await res.json();
          setAvatars(prev => ({ ...prev, [username]: data.avatar || null }));
        }
      } catch {
        setAvatars(prev => ({ ...prev, [username]: null }));
      }
    });
  }, [executions]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'all' ? executions
    : filter === 'running' ? executions.filter(e => e.status === 'running' || e.status === 'pending')
    : filter === 'completed' ? executions.filter(e => e.status === 'completed')
    : filter === 'threats' ? executions.filter(e => e.status === 'completed')
    : filter === 'safe' ? executions.filter(e => e.status === 'completed')
    : executions.filter(e => e.status === filter);

  const counts = {
    all: total,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    running: executions.filter(e => e.status === 'running' || e.status === 'pending').length,
    pending: 0,
    cancelled: executions.filter(e => e.status === 'cancelled').length,
    threats: 0,
    safe: 0,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'threats', label: 'Threats' },
    { key: 'safe', label: 'Clean' },
    { key: 'failed', label: 'Failed' },
    { key: 'running', label: 'Running' },
  ];

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Nav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 80, paddingBottom: 64 }}>
        <div style={{ width: '100%', maxWidth: 980, margin: '0 auto', padding: '0 32px' }}>
          {/* Header */}
          <div className="row gap-4 animate-fade-in" style={{ marginBottom: 8, paddingTop: 40 }}>
            <span className="label" style={{ color: 'var(--teal-bright)' }}>{'// Catalogue'}</span>
            <div className="divider" />
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.14em' }}>last 30 days</span>
          </div>

          <h2 className="display animate-slide-up" style={{ fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.0, marginTop: 16, marginBottom: 28, color: 'var(--text)' }}>
            The <span style={{ color: 'var(--pink)' }} className="glow-text-pink">tackle box</span>.
          </h2>

          {/* Metrics Dashboard */}
          <MetricsDashboard />

          {/* Filter pills */}
          <div className="row gap-2 animate-fade-in" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="mono"
                style={{
                  padding: '7px 14px', borderRadius: 3, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  border: `1px solid ${filter === f.key ? 'var(--teal)' : 'var(--border-strong)'}`,
                  background: filter === f.key ? 'rgba(0,191,179,0.10)' : 'transparent',
                  color: filter === f.key ? 'var(--teal-bright)' : 'var(--text-dim)',
                  boxShadow: filter === f.key ? '0 0 12px rgba(0,191,179,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}>
                {f.label}
                {counts[f.key] > 0 && <span style={{ opacity: 0.5, marginLeft: 6 }}>{counts[f.key]}</span>}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="card card-accent-pink" style={{ padding: 24, marginBottom: 24 }}>
              <p className="label-sm" style={{ color: 'var(--pink)', marginBottom: 4 }}>Error</p>
              <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '64px 0' }}>
              <div className="animate-spin-slow" style={{ width: 40, height: 40, border: '2px solid var(--border-strong)', borderTopColor: 'var(--teal)', borderRadius: '50%' }} />
              <p className="label" style={{ color: 'var(--text-faint)' }}>Loading history...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ color: 'var(--text-faint)', fontSize: 15, marginBottom: 16 }}>
                {filter === 'all' ? 'No executions found' : `No ${filter} executions`}
              </p>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="mono" style={{ fontSize: 11, color: 'var(--teal-bright)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  Show all
                </button>
              )}
            </div>
          )}

          {/* Execution list */}
          {!loading && filtered.length > 0 && (
            <div className="card animate-slide-up stagger-2" style={{ overflow: 'hidden', padding: 0 }}>
              {filtered.map((exec, i) => {
                const st = STATUS_STYLES[exec.status] ?? (exec.finishedAt ? STATUS_STYLES.cancelled : STATUS_STYLES.pending);
                return (
                  <Link
                    key={exec.id}
                    href={`/results/${exec.id}`}
                    style={{
                      display: 'grid', gridTemplateColumns: '32px 28px 68px minmax(0, 1fr) 120px 120px 80px', gap: 0, padding: '14px 20px',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s', alignItems: 'center', textDecoration: 'none',
                      color: 'inherit',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: exec.status === 'completed' && threats[exec.id] !== undefined
                        ? (threats[exec.id] ? 'var(--pink)' : 'var(--teal)')
                        : st.color,
                      boxShadow: exec.status === 'running' ? `0 0 8px ${st.color}` : exec.status === 'completed' && threats[exec.id] !== undefined
                        ? `0 0 6px ${threats[exec.id] ? 'var(--pink)' : 'var(--teal)'}`
                        : `0 0 6px ${st.color}`,
                    }} />

                    {exec.executedBy ? (
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: 'var(--text-faint)', fontWeight: 600,
                      }}>
                        {avatars[exec.executedBy] ? (
                          <img src={avatars[exec.executedBy]!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          exec.executedBy.charAt(0).toUpperCase()
                        )}
                      </div>
                    ) : <div />}

                    <HistoryThumbnail executionId={exec.id} />

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                        <span className="mono" style={{
                          fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600,
                          padding: '3px 9px', borderRadius: 2,
                          color: st.color, background: st.bg, border: `1px solid ${st.border}`,
                        }}>
                          {st.label}
                        </span>
                        {exec.isTestRun && (
                          <span className="mono" style={{
                            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: 2,
                            color: 'var(--yellow)', background: 'rgba(254,197,20,0.08)', border: '1px solid rgba(254,197,20,0.3)',
                          }}>Test</span>
                        )}
                        <VerdictBadge executionId={exec.id} status={exec.status} onVerdictLoaded={(id, isThreat) => setThreats(prev => ({ ...prev, [id]: isThreat }))} />
                      </div>
                      <p className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.08em', marginTop: 2 }}>
                        {exec.id}
                      </p>
                    </div>

                    <span className="mono" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(exec.duration)}
                    </span>

                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {formatRelativeTime(exec.startedAt)}
                    </span>

                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {(exec.status === 'running' || exec.status === 'pending') ? (
                        <button
                          onClick={(ev) => handleCancel(ev, exec.id)}
                          disabled={cancellingId === exec.id}
                          title="Cut the line"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                            color: 'var(--text-faint)', display: 'flex', alignItems: 'center',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--pink)')}
                          onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-faint)')}
                        >
                          {cancellingId === exec.id ? (
                            <div style={{ width: 14, height: 14, border: '1.5px solid var(--pink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2.5 6C4 3.5 5.5 3 7 5c1.5-2 3-1.5 4.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              <path d="M5 8.5v3M9 8.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      ) : '→'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: 11, opacity: page <= 1 ? 0.3 : 1 }}
              >
                Previous
              </button>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: 11, opacity: page >= totalPages ? 0.3 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryContent />
    </Suspense>
  );
}
