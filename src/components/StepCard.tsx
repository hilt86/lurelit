'use client';

import { useState, useEffect } from 'react';
import type { StepExecution, ExecutionStatus } from '@/lib/types';

function StatusIcon({ status }: { status: ExecutionStatus }) {
  if (status === 'completed') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" fill="rgba(0,191,179,0.15)" stroke="var(--teal)" strokeWidth="1.5" />
        <path d="M7 11l3 3 5-6" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'running') {
    return (
      <div style={{ position: 'relative', width: 22, height: 22 }}>
        <div className="animate-spin-slow" style={{ position: 'absolute', inset: 0, border: '2px solid rgba(240,78,152,0.25)', borderTopColor: 'var(--pink)', borderRadius: '50%', boxShadow: '0 0 12px var(--pink-glow)' }} />
      </div>
    );
  }
  if (status === 'waiting') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" fill="rgba(255,200,50,0.12)" stroke="var(--yellow, #ffc832)" strokeWidth="1.5" />
        <rect x="8" y="7" width="2.5" height="8" rx="1" fill="var(--yellow, #ffc832)" />
        <rect x="12" y="7" width="2.5" height="8" rx="1" fill="var(--yellow, #ffc832)" />
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" fill="rgba(240,78,152,0.15)" stroke="var(--pink)" strokeWidth="1.5" />
        <path d="M8 8l6 6M14 8l-6 6" stroke="var(--pink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--border-strong)', background: 'var(--bg-surface)' }} />
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function LiveDuration({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = now - new Date(startedAt).getTime();
  return <span className="mono" style={{ fontSize: 10, color: 'var(--pink)', letterSpacing: '0.16em' }}>RUNNING…</span>;
}

export default function StepCard({ step, index, isLast, hasRunningBefore }: { step: StepExecution; index: number; isLast: boolean; hasRunningBefore: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = step.output && Object.keys(step.output).length > 0;
  const hasLogs = step.logs && step.logs.length > 0;
  const canExpand = hasOutput || hasLogs;

  const isPending = step.status === 'pending';
  const isRunning = step.status === 'running';
  const isWaiting = step.status === 'waiting';

  const ringColor = isWaiting ? 'rgba(255,200,50,0.40)'
    : isRunning ? 'rgba(240,78,152,0.40)'
    : step.status === 'completed' ? 'rgba(0,191,179,0.30)'
    : 'var(--border-strong)';

  const cardBg = isWaiting ? 'rgba(255,200,50,0.04)'
    : isRunning ? 'rgba(240,78,152,0.05)'
    : step.status === 'completed' ? 'rgba(0,191,179,0.04)'
    : 'transparent';

  return (
    <div className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <div style={{ display: 'flex', gap: 18, position: 'relative' }}>
        {/* connector line */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
          <StatusIcon status={step.status} />
          {!isLast && (
            <div style={{
              flex: 1, width: 2, marginTop: 4, marginBottom: 4,
              background: step.status === 'completed' ? 'var(--teal)' : 'var(--border)',
              opacity: 0.4,
              minHeight: 28,
            }} />
          )}
        </div>
        {/* card */}
        <div style={{ flex: 1, marginBottom: 12 }}>
          <div
            style={{
              padding: '14px 20px', borderRadius: 4,
              border: `1px solid ${ringColor}`,
              background: cardBg,
              opacity: isPending ? 0.6 : 1,
              transition: 'all 0.3s',
              cursor: canExpand ? 'pointer' : 'default',
            }}
            onClick={() => canExpand && setExpanded(!expanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: step.status === 'completed' ? 'var(--teal-bright)' : isRunning ? 'var(--pink-bright)' : isWaiting ? 'var(--yellow, #ffc832)' : 'var(--text-faint)' }}>
                {String(index + 1).padStart(2, '0')} · {step.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isRunning && step.startedAt && <LiveDuration startedAt={step.startedAt} />}
                {isWaiting && (
                  <span className="mono" style={{ fontSize: 10, color: 'var(--yellow, #ffc832)', letterSpacing: '0.14em' }}>AWAITING APPROVAL</span>
                )}
                {step.status === 'completed' && step.startedAt && (
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.14em' }}>
                    {formatMs((step.completedAt ? new Date(step.completedAt).getTime() : Date.now()) - new Date(step.startedAt).getTime())}
                  </span>
                )}
                {step.status === 'failed' && (
                  <span className="mono" style={{ fontSize: 10, color: 'var(--pink)', letterSpacing: '0.14em' }}>FAILED</span>
                )}
                {canExpand && (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            {(isRunning || isWaiting || step.status === 'completed') && (
              <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>
                {isRunning ? 'Processing — this may take a few minutes...' : isWaiting ? 'Workflow paused — waiting for your input above.' : ''}
              </p>
            )}

            {expanded && (
              <div className="animate-fade-in" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                {hasOutput && (
                  <div style={{ marginBottom: hasLogs ? 12 : 0 }}>
                    <p className="label-sm" style={{ color: 'var(--blue)', marginBottom: 8 }}>Output</p>
                    <pre className="mono" style={{ fontSize: 12, lineHeight: 1.6, padding: 16, overflowX: 'auto', overflowY: 'auto', maxHeight: 250, borderRadius: 3, color: 'var(--text-dim)', background: 'var(--bg-surface)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  </div>
                )}
                {hasLogs && (
                  <div>
                    <p className="label-sm" style={{ color: 'var(--blue)', marginBottom: 8 }}>Logs</p>
                    <div className="mono" style={{ fontSize: 12, padding: 16, maxHeight: 200, overflow: 'auto', borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      {step.logs!.map((log, li) => (
                        <div key={li} style={{ display: 'flex', gap: 12, lineHeight: 1.6 }}>
                          <span style={{ color: 'var(--text-faint)', flexShrink: 0, width: 72 }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span style={{ color: log.level === 'error' ? 'var(--pink)' : 'var(--text-dim)' }}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
