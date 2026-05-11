'use client';

export default function TimelineSkeleton() {
  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px dashed var(--border)', animation: 'pulse 2s infinite' }} />
            {i < 4 && <div style={{ flex: 1, width: 1, background: 'var(--border)', minHeight: 16, margin: '4px 0' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ height: 10, width: 56, background: 'var(--border)', borderRadius: 2 }} />
                <div style={{ height: 10, width: 64, background: 'var(--border)', borderRadius: 2 }} />
              </div>
              <div style={{ height: 18, width: 200, background: 'var(--border)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
