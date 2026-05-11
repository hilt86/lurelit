'use client';

import { useState } from 'react';
import LurelitMascot from './LurelitMascot';
import Markdown from './Markdown';

interface HumanApprovalProps {
  executionId: string;
  message: string;
  onResumed: () => void;
}

export default function HumanApproval({ executionId, message, onResumed }: HumanApprovalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(approve: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume/${executionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proceed_with_hunt: approve, reason: reason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed: ${res.status}`);
      }
      onResumed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume workflow');
      setSubmitting(false);
    }
  }

  return (
    <div className="card animate-fade-in" style={{
      padding: 0,
      marginBottom: 32,
      borderColor: 'rgba(255,200,50,0.35)',
      background: 'linear-gradient(135deg, rgba(255,200,50,0.04) 0%, rgba(30,15,60,0.6) 100%)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,200,50,0.15)',
        background: 'rgba(255,200,50,0.04)',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--yellow, #ffc832)',
          boxShadow: '0 0 10px rgba(255,200,50,0.6)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span className="mono" style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--yellow, #ffc832)',
        }}>
          Human Approval Required
        </span>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 24, padding: '24px 24px 20px', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, marginTop: 4 }}>
          <LurelitMascot size={80} state="watching" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Markdown>{message}</Markdown>
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <label className="mono" style={{
            display: 'block', fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-faint)',
            marginBottom: 8,
          }}>
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={submitting}
            placeholder="Why are you approving or skipping this hunt?"
            rows={2}
            style={{
              width: '100%', resize: 'vertical',
              padding: '12px 16px', borderRadius: 4,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text)',
              fontSize: 14, lineHeight: 1.5,
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--teal)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          />
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: 14, borderRadius: 3,
            background: 'rgba(240,78,152,0.08)',
            border: '1px solid rgba(240,78,152,0.3)',
          }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--pink)' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="btn"
            style={{
              padding: '12px 28px',
              background: submitting ? 'var(--bg-surface)' : 'var(--teal)',
              color: submitting ? 'var(--text-faint)' : '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 0 16px rgba(0,191,179,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? 'Resuming…' : 'Approve Hunt'}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="btn btn-secondary"
            style={{
              padding: '12px 28px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Skip Hunt
          </button>
        </div>
      </div>
    </div>
  );
}
