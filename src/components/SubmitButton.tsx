'use client';

interface SubmitButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function SubmitButton({ onClick, loading, disabled }: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={loading || disabled ? '' : 'btn-primary'}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, margin: '32px auto 0',
        fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
        fontWeight: 600, padding: '14px 28px', borderRadius: 3, border: '1px solid', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s',
        ...(disabled || loading ? {
          background: 'rgba(44,55,77,0.3)', color: 'var(--text-faint)', borderColor: 'var(--border)',
        } : {
          background: 'var(--teal)', color: 'var(--bg)', borderColor: 'var(--teal)',
        }),
      }}
    >
      {loading ? (
        <>
          <div className="animate-spin-slow" style={{ width: 16, height: 16, border: '2px solid rgba(5,7,13,0.3)', borderTopColor: 'var(--bg)', borderRadius: '50%' }} />
          Analyzing...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Analyze Screenshot
        </>
      )}
    </button>
  );
}
