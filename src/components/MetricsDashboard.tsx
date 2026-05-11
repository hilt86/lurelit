'use client';

import { useEffect, useState } from 'react';
import SankeyDiagram from './SankeyDiagram';

interface FlowData {
  total: number;
  completed: number;
  failed: number;
  phishing_email: number;
  smishing: number;
  spam: number;
  legitimate: number;
  unknown: number;
  autoHunted: number;
  hitlApproved: number;
  hitlSkipped: number;
  noHunt: number;
  hunted: number;
  not_hunted: number;
}

interface Metrics {
  totalAnalyses: number;
  completed: number;
  failed: number;
  running: number;
  cancelled: number;
  threats: number;
  safe: number;
  avgDurationMs: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  topUsers: { user: string; count: number }[];
  typeBreakdown: Record<string, number>;
  dailyCounts: { date: string; total: number; threats: number }[];
  estimatedTimeSavedMinutes: number;
  flowData?: FlowData;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <p className="label-sm" style={{ color: 'var(--text-faint)', marginBottom: 8 }}>{label}</p>
      <p className="display" style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function DonutChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  let angle = -90;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const sweep = pct * 360;
          const startRad = (angle * Math.PI) / 180;
          const endRad = ((angle + sweep) * Math.PI) / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const largeArc = sweep > 180 ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          angle += sweep;
          return <path key={i} d={path} fill={d.color} opacity={0.85} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--bg-panel)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="700" fontFamily="var(--font-display)">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-faint)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="0.1em">TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d.label}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { date: string; total: number; threats: number }[] }) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const barWidth = Math.max(16, Math.min(40, 500 / data.length - 4));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, minWidth: data.length * (barWidth + 4) }}>
        {data.map((d, i) => {
          const h = (d.total / maxVal) * 100;
          const threatH = (d.threats / maxVal) * 100;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: barWidth }}>
              <div style={{ position: 'relative', width: '100%', height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${h}%`, borderRadius: '2px 2px 0 0', background: 'var(--teal)', opacity: 0.3, position: 'relative' }}>
                  {threatH > 0 && (
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(threatH / h) * 100}%`, background: 'var(--pink)', borderRadius: '0 0 0 0', opacity: 1 }} />
                  )}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 8, color: 'var(--text-faint)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', width: 0 }}>
                {d.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--teal)', opacity: 0.3 }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>Total</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--pink)' }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>Threats</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetch('/api/metrics')
      .then(r => r.json())
      .then(d => { if (!d.error) setMetrics(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!metrics?.topUsers.length) return;
    const users = metrics.topUsers.slice(0, 5);
    Promise.allSettled(
      users.map(u =>
        fetch(`/api/avatar/${encodeURIComponent(u.user)}`)
          .then(r => r.json())
          .then(d => ({ user: u.user, avatar: d.avatar as string | null }))
      )
    ).then(results => {
      const map: Record<string, string | null> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') map[r.value.user] = r.value.avatar;
      }
      setAvatars(map);
    });
  }, [metrics]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div className="animate-spin-slow" style={{ width: 32, height: 32, border: '2px solid var(--border-strong)', borderTopColor: 'var(--teal)', borderRadius: '50%' }} />
    </div>
  );

  if (!metrics) return null;

  const threatPct = metrics.completed > 0 ? Math.round((metrics.threats / metrics.completed) * 100) : 0;

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Top stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Total Analyses" value={String(metrics.totalAnalyses)} sub={`${metrics.running} running`} />
        <StatCard label="Threats Found" value={String(metrics.threats)} sub={`${threatPct}% threat rate`} accent="var(--pink)" />
        <StatCard label="Avg Duration" value={formatDuration(metrics.avgDurationMs)} sub="per analysis" />
        <StatCard label="AI Cost" value={`$${metrics.totalCost.toFixed(2)}`} sub={`${((metrics.totalInputTokens + metrics.totalOutputTokens) / 1000).toFixed(0)}K tokens`} accent="var(--blue)" />
      </div>

      {/* Second row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Time Saved" value={`${Math.floor(metrics.estimatedTimeSavedMinutes / 60)}h ${metrics.estimatedTimeSavedMinutes % 60}m`} sub={`vs ~45min manual analysis × ${metrics.completed}`} accent="var(--teal)" />
        <StatCard label="Safe Messages" value={String(metrics.safe)} sub={`${metrics.completed > 0 ? 100 - threatPct : 0}% clean`} accent="var(--teal)" />
        <StatCard label="Failed" value={String(metrics.failed)} sub={metrics.cancelled > 0 ? `${metrics.cancelled} cancelled` : ''} />
      </div>

      {/* Sankey flow diagram */}
      {metrics.flowData && metrics.flowData.total > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <p className="label-sm" style={{ color: 'var(--text-faint)', marginBottom: 16, letterSpacing: '0.1em' }}>ANALYSIS FLOW</p>
          <SankeyDiagram flowData={metrics.flowData} />
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Verdict breakdown */}
        <div className="card" style={{ padding: 24, flex: '1 1 280px' }}>
          <p className="label-sm" style={{ color: 'var(--text-faint)', marginBottom: 16 }}>Verdict Breakdown</p>
          <DonutChart data={[
            ...(Object.entries(metrics.typeBreakdown).map(([type, count]) => ({
              label: type, value: count,
              color: type === 'legitimate' ? 'var(--teal)' : type === 'smishing' ? 'var(--pink)' : type === 'phishing_email' ? '#c44dff' : 'var(--yellow)',
            }))),
          ]} />
        </div>

        {/* Daily activity */}
        {metrics.dailyCounts.length > 1 && (
          <div className="card" style={{ padding: 24, flex: '2 1 360px' }}>
            <p className="label-sm" style={{ color: 'var(--text-faint)', marginBottom: 16 }}>Daily Activity</p>
            <BarChart data={metrics.dailyCounts} />
          </div>
        )}

        {/* Top users */}
        {metrics.topUsers.length > 0 && (
          <div className="card" style={{ padding: 24, flex: '1 1 220px' }}>
            <p className="label-sm" style={{ color: 'var(--text-faint)', marginBottom: 16 }}>Top Analysts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {metrics.topUsers.slice(0, 5).map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {avatars[u.user] ? (
                      <img
                        src={avatars[u.user]!}
                        alt={u.user}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          objectFit: 'cover',
                          border: `1px solid ${i === 0 ? 'var(--teal)' : 'var(--border-strong)'}`,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: i === 0 ? 'var(--teal)' : 'var(--bg-surface)',
                        border: `1px solid ${i === 0 ? 'var(--teal)' : 'var(--border-strong)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                        color: i === 0 ? 'var(--bg)' : 'var(--text-dim)',
                      }}>
                        {u.user.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{u.user}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
