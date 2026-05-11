'use client';

import { useEffect, useState } from 'react';

export default function VerdictBadge({ executionId, status, onVerdictLoaded }: { executionId: string; status: string; onVerdictLoaded?: (id: string, isThreat: boolean) => void }) {
  const [verdict, setVerdict] = useState<{ isThreat: boolean; type: string } | null>(null);

  useEffect(() => {
    if (status !== 'completed') return;
    let cancelled = false;

    fetch(`/api/status/${executionId}?screenshot=false`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const o = data.output;
        if (!o || !('classification_is_phishing' in o)) return;
        const isThreat = o.classification_is_phishing === 'true' || o.classification_is_phishing === true;
        setVerdict({ isThreat, type: (o.classification_type as string) ?? '' });
        onVerdictLoaded?.(executionId, isThreat);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [executionId, status, onVerdictLoaded]);

  if (!verdict) return null;

  const color = verdict.isThreat ? 'var(--pink)' : 'var(--teal)';
  const bg = verdict.isThreat ? 'rgba(240,78,152,0.08)' : 'rgba(0,191,179,0.08)';
  const border = verdict.isThreat ? 'rgba(240,78,152,0.3)' : 'rgba(0,191,179,0.3)';

  return (
    <span className="mono" style={{
      fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
      padding: '2px 8px', borderRadius: 2,
      color, background: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>
      {verdict.isThreat ? 'Threat' : 'Safe'}{verdict.type ? ` · ${verdict.type}` : ''}
    </span>
  );
}
