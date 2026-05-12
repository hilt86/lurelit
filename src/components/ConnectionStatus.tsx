'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function ConnectionStatus() {
  const [disconnected, setDisconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/settings/test', { cache: 'no-store' });
      if (!res.ok) { setDisconnected(true); return; }
      const data = await res.json();
      const isDown = !data.ok;
      setDisconnected(isDown);
      if (!isDown) setDismissed(false);
    } catch {
      setDisconnected(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, 45_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [check]);

  if (!disconnected || dismissed) return null;

  return (
    <div className="connection-banner" role="alert">
      <div className="connection-banner-inner">
        <span className="connection-banner-dot" />
        <span className="connection-banner-msg">
          Connection to Kibana lost. Some features may not work until connectivity is restored.
        </span>
        <button
          className="connection-banner-retry"
          onClick={check}
          disabled={checking}
        >
          {checking ? 'Checking…' : 'Retry'}
        </button>
        <button
          className="connection-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
