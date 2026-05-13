'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import VerdictPanel from '@/components/VerdictPanel';
import TimelineSkeleton from '@/components/TimelineSkeleton';
import ScreenshotPreview from '@/components/ScreenshotPreview';
import CostDisplay from '@/components/CostDisplay';
import LurelitMascot from '@/components/LurelitMascot';
import HumanApproval from '@/components/HumanApproval';
import type { WorkflowStatus } from '@/lib/types';

const POLL_INTERVAL = 3000;

function UserAvatar({ username }: { username: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/avatar').then(r => r.json()).then(d => { if (d.avatar) setSrc(d.avatar); }).catch(() => {});
  }, []);
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: src ? `url(${src}) center/cover` : 'linear-gradient(135deg, var(--teal), var(--pink))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: 'var(--bg)', border: src ? '1.5px solid var(--teal)' : 'none',
    }}>
      {!src && username.charAt(0).toUpperCase()}
    </div>
  );
}

function ElapsedTimer({ startedAt, completedAt }: { startedAt?: string; completedAt?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (completedAt) return;
    const update = () => setNow(Date.now());
    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [completedAt]);

  if (!startedAt) return null;

  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : now;
  if (end === null) return null;
  const totalSec = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const display = m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="var(--text-faint)" strokeWidth="1.2" />
        <path d="M7 4v3.5l2.5 1.5" stroke="var(--text-faint)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="mono" style={{
        fontSize: 20, fontWeight: 600, letterSpacing: '0.02em',
        color: completedAt ? 'var(--text-dim)' : 'var(--teal)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.1em' }}>
        {completedAt ? 'total' : 'elapsed'}
      </span>
    </div>
  );
}

function CompletedStepCount({ data }: { data: WorkflowStatus | null }) {
  if (!data?.steps?.length) return null;
  const done = data.steps.filter(s => s.status === 'completed').length;
  const total = data.totalSteps ?? data.steps.length;
  const pct = Math.min(Math.round((done / total) * 100), 99);
  return (
    <div style={{ marginTop: 32, maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="label-sm" style={{ color: 'var(--text-faint)' }}>Progress</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--pink-bright)', fontWeight: 700 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.4)' }}>
        <div style={{
          height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--pink), var(--pink-bright))',
          boxShadow: '0 0 12px var(--pink-glow)',
        }} />
      </div>
    </div>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ executionId: string }> }) {
  const { executionId } = use(params);
  const [data, setData] = useState<WorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [stepsCollapsed, setStepsCollapsed] = useState(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isTerminal = data?.status === 'completed' || data?.status === 'failed' || data?.status === 'cancelled';
  const isWaiting = data?.isAwaitingInput === true;

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/cancel/${executionId}`, { method: 'POST' });
    } catch {} finally {
      setCancelling(false);
      setCancelConfirm(false);
    }
  };

  useEffect(() => {
    if (isTerminal && !hasAutoCollapsed) {
      const id = window.setTimeout(() => {
        setStepsCollapsed(true);
        setHasAutoCollapsed(true);
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [isTerminal, hasAutoCollapsed]);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(`screenshot:${executionId}`);
      if (stored) {
        Promise.resolve().then(() => {
          if (!cancelled) setScreenshot(stored);
        });
      }
    } catch {}
    return () => { cancelled = true; };
  }, [executionId]);

  const fetchStatus = useCallback(async () => {
    try {
      const qs = screenshot ? '?screenshot=false' : '';
      const res = await fetch(`/api/status/${executionId}${qs}`);
      if (!res.ok) { const b = await res.json(); throw new Error(b.error || `Status check failed: ${res.status}`); }
      const status: WorkflowStatus = await res.json();
      setData(status);
      if (status.screenshot && !screenshot) setScreenshot(status.screenshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  }, [executionId, screenshot]);

  useEffect(() => {
    const timeout = window.setTimeout(fetchStatus, 0);
    const interval = window.setInterval(() => { if (!isTerminal) fetchStatus(); }, POLL_INTERVAL);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [fetchStatus, isTerminal]);

  return (
    <>
      <Nav />
      <main className="print-report" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 80, paddingBottom: 64 }}>
        <div className="print-report-container" style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '0 32px' }}>
          {/* Top bar */}
          <div className="row gap-4 animate-fade-in no-print" style={{ marginBottom: 8, paddingTop: 40, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4, 12px)' }}>
              <Link href="/" className="mono" style={{ background: 'none', border: 0, color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none' }}>
                ← Back
              </Link>
              <div className="divider" />
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.14em' }}>
                EXEC_ID:&nbsp;<span style={{ color: 'var(--text-dim)' }}>{executionId.slice(0, 16)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isTerminal && data && data.status !== 'cancelled' && (
                <button
                  onClick={handleExportPdf}
                  className="mono"
                  style={{
                    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--teal-bright)', background: 'rgba(0,191,179,0.06)', border: '1px solid rgba(0,191,179,0.35)',
                    borderRadius: 3, padding: '6px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'rgba(0,191,179,0.10)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,191,179,0.35)'; e.currentTarget.style.background = 'rgba(0,191,179,0.06)'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M3 1.5h5l3 3V12a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 3 12v-10a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M8 1.5v3h3M5 8h4M5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export PDF
                </button>
              )}
              {!isTerminal && !isWaiting && data && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  disabled={cancelling}
                  className="mono"
                  style={{
                    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--text-faint)', background: 'none', border: '1px solid var(--border-strong)',
                    borderRadius: 3, padding: '5px 10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pink)'; e.currentTarget.style.color = 'var(--pink)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                  Cut the line
                </button>
              )}
            </div>
          </div>

          <div className="print-only" style={{ marginBottom: 24 }}>
            <p className="label" style={{ color: 'var(--teal)', marginBottom: 6 }}>Lurelit Analysis Report</p>
            <h1 className="display" style={{ color: 'var(--text)', fontSize: 28, marginBottom: 6 }}>Phishing/Smishing Verdict</h1>
            <p className="mono" style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: '0.08em' }}>
              Execution ID: {executionId}
            </p>
          </div>

          {/* Hero row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginTop: 24, marginBottom: 32 }}>
            <div style={{ flex: 1 }}>
              <p className="label" style={{ color: data?.status === 'cancelled' ? 'var(--pink)' : 'var(--pink)', marginBottom: 12 }}>
                {data?.status === 'cancelled'
                  ? 'Analysis cancelled'
                  : isTerminal
                  ? (data?.status === 'failed' ? 'Analysis failed' : 'Analysis complete')
                  : isWaiting ? 'Awaiting your decision'
                  : 'Analysis in progress'}
              </p>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16, color: 'var(--text)' }}>
                {data?.status === 'cancelled'
                  ? <>Line was <span style={{ color: 'var(--pink)' }} className="glow-text-pink">cut</span>.</>
                  : isTerminal
                  ? (data?.status === 'failed'
                    ? <>Something went <span style={{ color: 'var(--pink)' }} className="glow-text-pink">wrong</span>.</>
                    : <>Verdict <span style={{ color: 'var(--teal-bright)' }} className="glow-text-teal">ready</span>.</>)
                  : isWaiting
                  ? <>Needs your <span style={{ color: 'var(--yellow, #ffc832)' }}>approval</span>.</>
                  : <>Following the <span style={{ color: 'var(--teal-bright)' }} className="glow-text-teal">scent</span>…</>}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 540, lineHeight: 1.55 }}>
                {data?.status === 'cancelled'
                  ? 'This analysis was cancelled before completion. Partial results may be available below.'
                  : isTerminal
                  ? 'The analysis workflow has finished. Review the results below.'
                  : isWaiting
                  ? 'The workflow has paused and needs your input to continue. Review the details below and approve or skip.'
                  : 'Lurelit is running a multi-step agentic workflow on your screenshot. You can leave this tab — results will be saved to your history.'}
              </p>

              {/* Verdict summary inline */}
              {isTerminal && data?.output && data.status === 'completed' && (() => {
                const o = data.output!;
                const isThreat = o.classification_is_phishing === 'true' || o.classification_is_phishing === true;
                const type = (o.classification_type as string) ?? '';
                const conf = String(o.classification_confidence ?? '');
                const accent = isThreat ? 'var(--pink)' : 'var(--teal)';
                const accentBright = isThreat ? 'var(--pink-bright)' : 'var(--teal-bright)';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 3,
                      background: isThreat ? 'rgba(240,78,152,0.08)' : 'rgba(0,191,179,0.08)',
                      border: `1px solid ${isThreat ? 'rgba(240,78,152,0.3)' : 'rgba(0,191,179,0.3)'}`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: accentBright, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {isThreat ? '▲ Threat Detected' : '✓ No Threat'}
                      </span>
                    </div>
                    {type && (
                      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 2, fontWeight: 600, color: accentBright, border: `1px solid ${isThreat ? 'rgba(240,78,152,0.30)' : 'rgba(0,191,179,0.30)'}`, background: isThreat ? 'rgba(240,78,152,0.10)' : 'rgba(0,191,179,0.10)' }}>
                        {type}
                      </span>
                    )}
                    {conf && (
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {String(conf)}% confidence
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Status pills row */}
              {isTerminal && data?.output && data.status === 'completed' && (() => {
                const o = data.output!;
                const steps = data.steps ?? [];
                const huntRaw = String(o.hunt_results ?? '');

                const pillStyle = {
                  fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                  padding: '3px 8px', borderRadius: 2, fontWeight: 600, display: 'inline-block',
                };

                const huntSkipped = huntRaw.startsWith('No hunt performed');
                const huntHasHits = !huntSkipped && huntRaw.length > 0 && (
                  /confirmed (compromise|hit)/i.test(huntRaw) ||
                  /⚠️\s*HIT/i.test(huntRaw) ||
                  /\*\*\d+\s*hits?\*\*/i.test(huntRaw) ||
                  /HITS?\s*FOUND/i.test(huntRaw)
                );
                const huntNoHits = !huntSkipped && !huntHasHits && huntRaw.length > 0 && (
                  /no evidence of compromise/i.test(huntRaw) ||
                  /zero hits/i.test(huntRaw) ||
                  /returned no (hits|results|matches)/i.test(huntRaw)
                );

                const hadHitlStep = steps.some(s => s.stepId === 'ask_hunt_approval' && s.status === 'completed');
                const huntAfterApproval = steps.some(s => s.stepId === 'hunt_in_environment_after_approval' && s.status === 'completed');
                const hitlApproved = hadHitlStep && huntAfterApproval;
                const hitlSkipped = hadHitlStep && !huntAfterApproval;

                const pills: { label: string; color: string; bg: string; border: string; glow?: string }[] = [];

                if (huntSkipped) {
                  pills.push({ label: '🔍 HUNT SKIPPED', color: 'var(--text-faint)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' });
                } else if (huntNoHits) {
                  pills.push({ label: '🔍 HUNTED — NO HITS', color: 'var(--teal)', bg: 'rgba(0,191,179,0.05)', border: 'rgba(0,191,179,0.2)' });
                } else if (huntHasHits) {
                  pills.push({ label: '🔍 HUNTED — HITS FOUND', color: 'var(--pink-bright)', bg: 'rgba(240,78,152,0.08)', border: 'rgba(240,78,152,0.35)', glow: '0 0 8px rgba(240,78,152,0.3)' });
                } else {
                  pills.push({ label: '🔍 HUNTED', color: 'var(--teal-bright)', bg: 'rgba(0,191,179,0.06)', border: 'rgba(0,191,179,0.25)' });
                }

                if (hitlApproved) {
                  pills.push({ label: '👤 ANALYST APPROVED', color: 'var(--teal-bright)', bg: 'rgba(0,191,179,0.06)', border: 'rgba(0,191,179,0.25)' });
                } else if (hitlSkipped) {
                  pills.push({ label: '👤 ANALYST SKIPPED', color: 'var(--text-faint)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' });
                }

                if (huntHasHits) {
                  pills.push({ label: '⚠ ENVIRONMENT EXPOSURE DETECTED', color: 'var(--pink-bright)', bg: 'rgba(240,78,152,0.10)', border: 'rgba(240,78,152,0.4)', glow: '0 0 12px rgba(240,78,152,0.35)' });
                }

                if (pills.length === 0) return null;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {pills.map((p, i) => (
                      <span key={i} className="mono" style={{
                        ...pillStyle,
                        color: p.color,
                        background: p.bg,
                        border: `1px solid ${p.border}`,
                        boxShadow: p.glow ?? 'none',
                      }}>
                        {p.label}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
                <ElapsedTimer startedAt={data?.startedAt} completedAt={data?.completedAt} />
                {isTerminal && data?.output?.ai_cost_tracking ? (
                  <CostDisplay costData={data.output.ai_cost_tracking as Record<string, unknown>} />
                ) : null}
              </div>

              {/* Cancel confirmation modal */}
              {cancelConfirm && (
                <>
                  <div onClick={() => setCancelConfirm(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,2,16,0.7)', backdropFilter: 'blur(4px)' }} />
                  <div style={{ position: 'fixed', inset: 0, zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
                    <div className="card animate-slide-up" style={{ padding: 28, maxWidth: 380, pointerEvents: 'auto', textAlign: 'center' }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto 16px' }}>
                        <circle cx="16" cy="16" r="14" stroke="var(--pink)" strokeWidth="1.5" fill="none" />
                        <path d="M11 11l10 10M21 11l-10 10" stroke="var(--pink)" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <h3 className="display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Cut the line?</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 24 }}>
                        This will cancel the running analysis. The workflow will stop and partial results may not be available.
                      </p>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => setCancelConfirm(false)} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: 11 }}>Keep running</button>
                        <button onClick={handleCancel} disabled={cancelling} className="btn btn-pink" style={{ padding: '8px 18px', fontSize: 11 }}>
                          {cancelling ? 'Cancelling…' : 'Yes, cut it'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {!isTerminal && !isWaiting && <CompletedStepCount data={data} />}

              <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                {data?.executedBy && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserAvatar username={data.executedBy} />
                    Submitted by <span style={{ color: 'var(--text)', fontWeight: 500 }}>{data.executedBy}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="no-print" style={{ flexShrink: 0 }}>
              <LurelitMascot
                size={140}
                state={
                  !data ? 'analyzing' :
                  data.status === 'cancelled' ? 'idle' :
                  data.status === 'failed' ? 'threat' :
                  data.status === 'waiting' ? 'watching' :
                  isTerminal && data?.output && (data.output.classification_is_phishing === 'true' || data.output.classification_is_phishing === true) ? 'threat' :
                  isTerminal ? 'clean' :
                  'analyzing'
                }
              />
            </div>
          </div>

          {/* Screenshot */}
          {screenshot && (
            <div style={{ marginBottom: 32 }}>
              <ScreenshotPreview src={screenshot} />
            </div>
          )}

          {/* Human Approval */}
          {isWaiting && data && (() => {
            const waitingStep = data.steps.find(s => s.status === 'waiting' && s.waitingMessage);
            if (!waitingStep) return null;
            return (
              <HumanApproval
                executionId={executionId}
                message={waitingStep.waitingMessage!}
                onResumed={fetchStatus}
              />
            );
          })()}

          {/* Error */}
          {error && (
            <div className="card card-accent-pink animate-fade-in" style={{ padding: 24, marginBottom: 32 }}>
              <p className="label-sm" style={{ color: 'var(--pink)', marginBottom: 4 }}>Connection Error</p>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{error}</p>
              <button onClick={fetchStatus} className="mono" style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          )}

          {/* Timeline (collapsible when done) */}
          <div className="no-print">
            {isTerminal && data && (
              <button
                onClick={() => setStepsCollapsed(!stepsCollapsed)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '14px 0', marginBottom: stepsCollapsed ? 0 : 16,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{
                  color: 'var(--text-faint)', transform: stepsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="label-sm" style={{ color: 'var(--text-dim)' }}>
                  Execution Steps
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {data.steps.filter(s => s.status === 'completed').length} steps completed
                </span>
              </button>
            )}
            {!stepsCollapsed && (
              !data && !error ? <TimelineSkeleton /> : <WorkflowTimeline steps={data?.steps ?? []} />
            )}
          </div>

          {/* Verdict */}
          {isTerminal && data && data.status !== 'cancelled' && <VerdictPanel output={data.output ?? {}} status={data.status as 'completed' | 'failed'} enrichmentDetails={data.enrichmentDetails} />}

          {/* Back button */}
          {isTerminal && (
            <div className="row gap-3 animate-fade-in no-print" style={{ marginTop: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8H2M2 8l5-5M2 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Analyze Another
              </Link>
              <Link href="/history" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                View history
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
