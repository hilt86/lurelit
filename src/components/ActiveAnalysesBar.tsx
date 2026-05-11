'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface RunningExecution {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  executedBy?: string;
}

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return '...';
  const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ActiveAnalysesBar() {
  const [running, setRunning] = useState<RunningExecution[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [, setTick] = useState(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchRunning = useCallback(async () => {
    try {
      const res = await fetch('/api/history?page=1&size=10');
      if (!res.ok) return;
      const data = await res.json();
      const active = (data.results ?? []).filter((e: RunningExecution) => 
        e.status === 'running' || e.status === 'pending' || e.status === 'waiting_for_input' || (!e.duration && e.status !== 'failed' && e.status !== 'cancelled' && e.status !== 'completed')
      );
      setRunning(active);
      if (active.length > 0) setDismissed(false);
    } catch {}
  }, []);

  const handleCancel = async (e: React.MouseEvent, execId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCancellingId(execId);
    try {
      await fetch(`/api/cancel/${execId}`, { method: 'POST' });
      setTimeout(fetchRunning, 1000);
    } catch {} finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetchRunning();
    const interval = setInterval(fetchRunning, 15000);
    return () => clearInterval(interval);
  }, [fetchRunning]);

  useEffect(() => {
    if (running.length === 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running.length]);

  if (running.length === 0 || dismissed) return null;

  return (
    <div className="animate-slide-up" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      borderTop: '1px solid rgba(0,191,179,0.3)',
      background: 'rgba(5,7,13,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Pulse + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div className="animate-pulse-teal" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)' }} />
          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            {running.length} Active
          </span>
        </div>

        {/* Scrollable list of running analyses */}
        <div style={{ flex: 1, display: 'flex', gap: 10, overflowX: 'auto', minWidth: 0 }}>
          {running.map((exec) => {
            const isWaiting = exec.status === 'waiting_for_input';
            const accent = isWaiting ? 'rgba(255,200,50,' : 'rgba(0,191,179,';
            const accentVar = isWaiting ? 'var(--yellow, #ffc832)' : 'var(--teal)';
            return (
              <Link key={exec.id} href={`/results/${exec.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 3,
                background: `${accent}0.06)`, border: `1px solid ${accent}0.2)`,
                textDecoration: 'none', flexShrink: 0, transition: 'all 0.2s',
              }}>
                {isWaiting ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="4" y="3" width="2" height="8" rx="0.5" fill={accentVar} />
                    <rect x="8" y="3" width="2" height="8" rx="0.5" fill={accentVar} />
                  </svg>
                ) : (
                  <div className="animate-spin-slow" style={{ width: 14, height: 14, border: `2px solid ${accent}0.3)`, borderTopColor: accentVar, borderRadius: '50%', flexShrink: 0 }} />
                )}
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exec.id.slice(0, 12)}...
                </span>
                <span className="mono" style={{ fontSize: 11, color: accentVar, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {isWaiting ? 'WAITING' : formatElapsed(exec.startedAt)}
                </span>
                <button
                  onClick={(e) => handleCancel(e, exec.id)}
                  disabled={cancellingId === exec.id}
                  title="Cut the line"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    color: 'var(--text-faint)', flexShrink: 0, display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--pink)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                >
                  {cancellingId === exec.id ? (
                    <div style={{ width: 12, height: 12, border: '1.5px solid var(--pink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 5C3.2 3 4.5 2.8 6 4.2c1.5-1.4 2.8-1.2 4 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M4.5 7v2.5M7.5 7v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </Link>
            );
          })}
        </div>

        {/* View all + dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Link href="/history" className="mono" style={{
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: 'var(--teal)', textDecoration: 'none',
          }}>
            View All
          </Link>
          <button onClick={() => setDismissed(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-faint)',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
