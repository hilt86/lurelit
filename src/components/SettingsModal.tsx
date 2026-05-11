'use client';

import { useState, useEffect, useCallback } from 'react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsModal({ open, onClose, onSaved }: SettingsModalProps) {
  const [url, setUrl] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [huntEnabled, setHuntEnabled] = useState(true);
  const [isEnvVar, setIsEnvVar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setUrl(data.kibanaUrl ?? '');
    setWorkflowId(data.workflowId ?? '');
    setHuntEnabled(data.huntEnabled ?? true);
    setIsEnvVar(data.isEnvVar ?? false);
  }, []);

  useEffect(() => {
    if (open) { fetchConfig(); setTestResult(null); setError(null); setSuccess(false); }
  }, [open, fetchConfig]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kibanaUrl: url, workflowId, huntEnabled }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true); fetchConfig(); onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      if (url) await handleSave();
      const res = await fetch('/api/settings/test', { method: 'POST' });
      setTestResult(await res.json());
    } catch { setTestResult({ ok: false, message: 'Test failed' }); }
    finally { setTesting(false); }
  };

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 3, border: '1px solid var(--border-strong)',
    background: 'var(--bg-surface)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,7,13,0.75)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
        <div className="animate-slide-up" style={{ width: '100%', maxWidth: 480, pointerEvents: 'auto' }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Workflow Settings</h2>
                <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.1em' }}>
                  {isEnvVar ? 'Configured via environment variables' : 'Kibana connection settings'}
                </p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--text-faint)' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {isEnvVar && (
                <div style={{ padding: 12, borderRadius: 3, border: '1px solid rgba(27,169,245,0.3)', background: 'rgba(27,169,245,0.06)' }}>
                  <p className="mono" style={{ fontSize: 11, color: 'var(--blue)' }}>Managed via environment variables. UI changes will override.</p>
                </div>
              )}

              <div>
                <label className="label-sm" style={{ color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Kibana URL</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-kibana:5601" style={inputStyle} />
              </div>
              <div>
                <label className="label-sm" style={{ color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Workflow ID</label>
                <input type="text" value={workflowId} onChange={e => setWorkflowId(e.target.value)} placeholder="phishing-smishing-screenshot-analyzer" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  <label className="label-sm" style={{ color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Environment Threat Hunting</label>
                  <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.4 }}>
                    When enabled, Lurelit will search your environment for confirmed malicious indicators. Disable to save costs on the AI agent hunt step.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={huntEnabled}
                  onClick={() => setHuntEnabled(!huntEnabled)}
                  style={{
                    position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: huntEnabled ? 'var(--teal)' : 'var(--border-strong)',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: huntEnabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>
              {!huntEnabled && (
                <div style={{ padding: 10, borderRadius: 3, border: '1px solid rgba(240,78,152,0.3)', background: 'rgba(240,78,152,0.06)' }}>
                  <p className="mono" style={{ fontSize: 11, color: 'var(--pink)' }}>Hunt step will be skipped for all analyses</p>
                </div>
              )}

              <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                Authentication uses your logged-in Elastic credentials.
              </p>

              {testResult && (
                <div style={{ padding: 12, borderRadius: 3, border: `1px solid ${testResult.ok ? 'rgba(0,191,179,0.3)' : 'rgba(240,78,152,0.3)'}`, background: testResult.ok ? 'rgba(0,191,179,0.06)' : 'rgba(240,78,152,0.06)' }}>
                  <span className="mono" style={{ fontSize: 12, color: testResult.ok ? 'var(--teal)' : 'var(--pink)' }}>{testResult.message}</span>
                </div>
              )}
              {error && <p className="mono" style={{ fontSize: 12, color: 'var(--pink)' }}>{error}</p>}
              {success && !error && <p className="mono" style={{ fontSize: 12, color: 'var(--teal)' }}>Settings saved</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 28px', borderTop: '1px solid var(--border)', gap: 10 }}>
              <button onClick={handleTest} disabled={testing || !url} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 11, opacity: testing || !url ? 0.4 : 1 }}>
                {testing ? 'Testing...' : 'Test'}
              </button>
              <button onClick={handleSave} disabled={saving || !url || !workflowId} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 11, opacity: saving || !url || !workflowId ? 0.4 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
