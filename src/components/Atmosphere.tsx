'use client';

import { useEffect } from 'react';

type AtmosphereMode = 'grid' | 'starfield' | 'combo';

interface AtmosphereProps {
  mode?: AtmosphereMode;
  inHero?: boolean;
}

function seeded(i: number, offset: number): number {
  return ((i * 2654435761 + offset * 340573) >>> 0) % 10000 / 100;
}

const stars = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: seeded(i, 1),
  y: seeded(i, 2),
  size: 1 + (seeded(i, 3) / 100) * 2,
  delay: (seeded(i, 4) / 100) * 4,
  duration: 2 + (seeded(i, 5) / 100) * 3,
  kind: seeded(i, 6) > 70 ? 'sparkle' as const : 'dot' as const,
  color: seeded(i, 7) > 60 ? 'var(--pink)' : 'var(--teal)',
}));

const bubbles = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: seeded(i, 10),
  size: 4 + (seeded(i, 11) / 100) * 8,
  delay: (seeded(i, 12) / 100) * 18,
  duration: 14 + (seeded(i, 13) / 100) * 10,
}));

export default function Atmosphere({ mode = 'combo', inHero = false }: AtmosphereProps) {
  useEffect(() => {
    document.body.setAttribute('data-atmos', mode);
    if (mode === 'combo' && inHero) {
      document.body.classList.add('in-hero');
    } else {
      document.body.classList.remove('in-hero');
    }
    document.body.classList.add('atmos-base');
  }, [mode, inHero]);

  const showStarfield =
    mode === 'starfield' || (mode === 'combo' && inHero);

  return (
    <>
      {showStarfield && (
        <div className="atmos-layer" aria-hidden="true">
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            {stars.map(s => s.kind === 'sparkle' ? (
              <g key={s.id}
                style={{
                  transformOrigin: `${s.x}% ${s.y}%`,
                  animation: `sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                }}
              >
                <circle
                  cx={`${s.x}%`} cy={`${s.y}%`} r={s.size}
                  fill={s.color}
                  opacity="0.7"
                />
              </g>
            ) : (
              <circle
                key={s.id}
                cx={`${s.x}%`} cy={`${s.y}%`} r={s.size * 0.6}
                fill={s.color}
                opacity="0.5"
                style={{
                  animation: `sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}
          </svg>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {bubbles.map(b => (
              <span
                key={b.id}
                style={{
                  position: 'absolute',
                  bottom: '-20px',
                  left: `${b.x}%`,
                  width: b.size,
                  height: b.size,
                  borderRadius: '50%',
                  border: '1px solid rgba(240, 78, 152, 0.3)',
                  background: 'radial-gradient(circle at 30% 30%, rgba(240,78,152,0.2), transparent 70%)',
                  boxShadow: '0 0 8px rgba(240,78,152,0.2)',
                  animation: `bubble-rise ${b.duration}s linear ${b.delay}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="atmos-scan" aria-hidden="true" />
    </>
  );
}
