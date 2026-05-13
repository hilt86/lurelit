'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function enrichText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const patterns: [RegExp, (match: string) => React.ReactNode][] = [
    [/\u{1F534}/u, () => <span key={key++} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--pink)', marginRight: 4, verticalAlign: 'middle' }} />],
    [/\u{1F7E2}/u, () => <span key={key++} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)', marginRight: 4, verticalAlign: 'middle' }} />],
    [/\u{1F7E1}/u, () => <span key={key++} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', marginRight: 4, verticalAlign: 'middle' }} />],
    [/\u274C/u, () => <span key={key++} style={{ color: 'var(--pink)', fontWeight: 600, marginRight: 2 }}>&#x2717;</span>],
    [/\u2705/u, () => <span key={key++} style={{ color: 'var(--teal)', fontWeight: 600, marginRight: 2 }}>&#x2713;</span>],
  ];

  while (remaining.length > 0) {
    let earliest = -1;
    let earliestIdx = remaining.length;
    let matchLen = 0;

    for (let i = 0; i < patterns.length; i++) {
      const m = remaining.match(patterns[i][0]);
      if (m && m.index !== undefined && m.index < earliestIdx) {
        earliest = i;
        earliestIdx = m.index;
        matchLen = m[0].length;
      }
    }

    if (earliest === -1) {
      parts.push(remaining);
      break;
    }

    if (earliestIdx > 0) parts.push(remaining.slice(0, earliestIdx));
    parts.push(patterns[earliest][1](remaining.slice(earliestIdx, earliestIdx + matchLen)));
    remaining = remaining.slice(earliestIdx + matchLen);
  }

  return parts;
}

function processChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') return enrichText(children);
  if (Array.isArray(children)) return children.map((c, i) => <React.Fragment key={i}>{processChildren(c)}</React.Fragment>);
  return children;
}

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="display" style={{
            fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '28px 0 14px',
            paddingBottom: 10, borderBottom: '1px solid var(--border)',
          }}>{processChildren(children)}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="display" style={{
            fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '24px 0 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 3, height: 18, background: 'var(--teal)', borderRadius: 2, flexShrink: 0 }} />
            {processChildren(children)}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="display" style={{
            fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '20px 0 10px',
          }}>{processChildren(children)}</h3>
        ),
        p: ({ children }) => (
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-dim)', margin: '0 0 14px' }}>
            {processChildren(children)}
          </p>
        ),
        strong: ({ children }) => (
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{processChildren(children)}</strong>
        ),
        em: ({ children }) => <em style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>{children}</em>,
        ul: ({ children }) => <ul style={{ paddingLeft: 8, marginBottom: 16, listStyleType: 'none' }}>{children}</ul>,
        ol: ({ children }) => (
          <ol style={{ paddingLeft: 8, marginBottom: 16, listStyleType: 'none', counterReset: 'md-ol' }}>{children}</ol>
        ),
        li: ({ children, ...props }) => {
          const isOrdered = (props as { node?: { position?: { start?: { offset?: number } } } }).node?.position?.start?.offset !== undefined;
          return (
            <li style={{
              fontSize: 14, lineHeight: 1.8, color: 'var(--text-dim)', marginBottom: 6,
              paddingLeft: 20, position: 'relative',
            }}>
              <span style={{
                position: 'absolute', left: 0, top: 0,
                color: isOrdered ? 'var(--blue)' : 'var(--teal)',
                fontWeight: 500, fontSize: 13,
              }}>
                {isOrdered ? '' : '—'}
              </span>
              {processChildren(children)}
            </li>
          );
        },
        code: ({ children, className }) => {
          const text = String(children ?? '');
          if (className?.includes('language-') || (!className && text.includes('\n'))) {
            const isAttackChain = text.includes('│') && (text.includes('➜') || text.includes('→')) && /\d{4}-\d{2}-\d{2}/.test(text);
            if (isAttackChain) {
              return <AttackChainTimeline text={text} />;
            }
            return (
              <pre className="mono markdown-code-block" style={{
                fontSize: 12, lineHeight: 1.65, padding: 20, borderRadius: 3,
                color: 'var(--text-dim)', background: 'var(--bg-surface)', border: '1px solid var(--border)',
                overflow: 'auto', margin: '14px 0',
              }}>
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code className="mono" style={{
              fontSize: 12, padding: '2px 7px', borderRadius: 3,
              color: 'var(--teal)', background: 'rgba(0,191,179,0.08)',
              border: '1px solid rgba(0,191,179,0.12)',
            }}>
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="markdown-table-wrap" style={{
            overflowX: 'auto', margin: '18px 0', borderRadius: 3,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-panel)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: 'var(--bg-surface)' }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th className="mono" style={{
            textAlign: 'left', padding: '12px 16px', fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600,
            borderBottom: '2px solid var(--border-strong)', whiteSpace: 'nowrap',
          }}>{processChildren(children)}</th>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr style={{ transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >{children}</tr>
        ),
        td: ({ children }) => (
          <td style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            color: 'var(--text-dim)', verticalAlign: 'top', lineHeight: 1.6,
          }}>{processChildren(children)}</td>
        ),
        hr: () => (
          <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg, transparent, var(--border-strong), transparent)', margin: '28px 0' }} />
        ),
        blockquote: ({ children }) => (
          <blockquote className="markdown-blockquote" style={{
            borderLeft: '3px solid var(--teal)', margin: '16px 0',
            background: 'rgba(0,191,179,0.03)', padding: '14px 18px',
            borderRadius: '0 3px 3px 0',
          }}>{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--blue)', textDecoration: 'underline',
            textDecorationColor: 'rgba(27,169,245,0.3)', textUnderlineOffset: 2,
          }}>{children}</a>
        ),
        del: ({ children }) => <del style={{ color: 'var(--text-faint)' }}>{children}</del>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function AttackChainTimeline({ text }: { text: string }) {
  const lines = text.trim().split('\n');
  const events: { timestamp: string; host: string; details: string[]; isAction: boolean }[] = [];
  let current: { timestamp: string; host: string; details: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '│') continue;

    const tsMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}T[\d:]+Z?)\s*[─—-]+\s*(.+)/);
    if (tsMatch) {
      if (current) events.push({ ...current, isAction: current.details.some(d => d.includes('➜') || d.includes('→')) });
      current = { timestamp: tsMatch[1], host: tsMatch[2].trim(), details: [] };
      continue;
    }

    if (current && (trimmed.startsWith('│') || trimmed.startsWith('|'))) {
      const detail = trimmed.replace(/^[│|]\s*/, '');
      if (detail) current.details.push(detail);
    }
  }
  if (current) events.push({ ...current, isAction: current.details.some(d => d.includes('➜') || d.includes('→')) });

  if (events.length === 0) {
    return <pre className="mono markdown-code-block" style={{ fontSize: 12, lineHeight: 1.65, padding: 20, borderRadius: 3, color: 'var(--text-dim)', background: 'var(--bg-surface)', border: '1px solid var(--border)', overflow: 'auto', margin: '14px 0', whiteSpace: 'pre-wrap' }}><code>{text}</code></pre>;
  }

  return (
    <div className="attack-chain-timeline" style={{ margin: '20px 0', borderRadius: 3, border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="var(--pink)" strokeWidth="1.5" />
          <path d="M8 5v3.5l2.5 1.5" stroke="var(--pink)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--pink)' }}>
          Attack Chain
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {events.map((evt, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < events.length - 1 ? 0 : 0 }}>
            {/* Timeline column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: evt.details.some(d => d.includes('➜') || d.includes('→'))
                  ? 'var(--pink)' : 'var(--teal)',
                border: '2px solid var(--bg-panel)',
                boxShadow: evt.details.some(d => d.includes('Credential') || d.includes('credential'))
                  ? '0 0 8px var(--pink)' : 'none',
              }} />
              {i < events.length - 1 && (
                <div style={{ flex: 1, width: 2, background: 'var(--border-strong)', minHeight: 20 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: i < events.length - 1 ? 20 : 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                  {evt.timestamp}
                </span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>
                  {evt.host}
                </span>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
                {evt.details.map((detail, di) => {
                  const isAction = detail.startsWith('➜') || detail.startsWith('→');
                  const isCritical = detail.toLowerCase().includes('credential') || detail.toLowerCase().includes('compromise') || detail.toLowerCase().includes('successfully');
                  const cleanDetail = detail.replace(/^[➜→]\s*/, '');

                  return (
                    <div key={di} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: isAction ? '6px 10px' : '2px 0',
                      borderRadius: isAction ? 3 : 0,
                      background: isAction ? (isCritical ? 'rgba(240,78,152,0.06)' : 'rgba(0,191,179,0.04)') : 'transparent',
                      border: isAction ? `1px solid ${isCritical ? 'rgba(240,78,152,0.2)' : 'rgba(0,191,179,0.15)'}` : 'none',
                    }}>
                      {isAction && (
                        <span style={{ color: isCritical ? 'var(--pink)' : 'var(--teal)', fontWeight: 600, flexShrink: 0 }}>→</span>
                      )}
                      <span className="mono" style={{
                        fontSize: 12, lineHeight: 1.5,
                        color: isAction ? (isCritical ? 'var(--pink)' : 'var(--teal)') : 'var(--text-dim)',
                        fontWeight: isAction ? 500 : 400,
                      }}>
                        {isAction ? cleanDetail : detail}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
