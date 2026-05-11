'use client';

import { useEffect, useRef, useState } from 'react';

export type MascotState = 'idle' | 'watching' | 'analyzing' | 'clean' | 'threat';

interface LurelitMascotProps {
  state?: MascotState;
  size?: number;
  showLure?: boolean;
}

export default function LurelitMascot({ state = 'idle', size = 96, showLure = true }: LurelitMascotProps) {
  const eyeRef = useRef<SVGGElement>(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (state !== 'watching') return;
    const handler = (e: MouseEvent) => {
      const node = eyeRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      const max = 1.2;
      const nx = len === 0 ? 0 : (dx / len) * Math.min(max, len / 80);
      const ny = len === 0 ? 0 : (dy / len) * Math.min(max, len / 80);
      setPupil({ x: nx, y: ny });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [state]);

  useEffect(() => {
    if (state !== 'analyzing') return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.12;
      setPupil({ x: Math.sin(t) * 1.5, y: Math.cos(t * 0.7) * 0.6 });
    }, 60);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state === 'idle' || state === 'clean' || state === 'threat') {
      setPupil({ x: 0, y: 0 });
    }
  }, [state]);

  const isThreat = state === 'threat';
  const isClean = state === 'clean';

  const lureClass = isThreat ? 'animate-lure-threat' : 'animate-lure';
  const bodyGlow = isThreat
    ? 'drop-shadow(0 0 12px rgba(240,78,152,0.8)) drop-shadow(0 0 28px rgba(240,78,152,0.5))'
    : 'drop-shadow(0 0 8px rgba(240,78,152,0.45)) drop-shadow(0 0 18px rgba(240,78,152,0.25))';

  const eyeColor = isThreat ? 'var(--pink-bright)' : 'var(--teal-bright)';
  const eyeRingColor = isThreat ? 'var(--pink)' : 'var(--teal)';

  const mouth = isClean
    ? 'M44 78 Q60 92 76 78'
    : isThreat
    ? 'M44 84 Q60 76 76 84'
    : 'M46 80 Q60 86 74 80';

  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 140 140"
      fill="none"
      className="mascot"
      style={{ filter: bodyGlow, transition: 'filter 0.4s ease', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="0.4" cy="0.4" r="0.8">
          <stop offset="0%" stopColor="#3a1a5e" />
          <stop offset="60%" stopColor="#1a0a30" />
          <stop offset="100%" stopColor="#0a0418" />
        </radialGradient>
        <filter id="softEdge" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
        </filter>
        <radialGradient id="lureGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={isThreat ? '#FF6FB3' : '#FFD24A'} stopOpacity="1" />
          <stop offset="40%" stopColor="#F04E98" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#F04E98" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="eyeGrad" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="30%" stopColor={eyeColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={eyeColor} stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {showLure && (
        <g className={lureClass} style={{ transformOrigin: '22px 18px' }}>
          <circle cx="22" cy="18" r="14" fill="url(#lureGlow)" opacity="0.7" />
          <path
            d="M 50 38 Q 38 30 28 22"
            stroke={isThreat ? 'var(--pink)' : 'var(--teal)'}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="22" cy="18" r="4.5" fill="#1a0a2e" stroke="var(--pink)" strokeWidth="1.4" />
          <circle cx="22" cy="18" r="2.2" fill={isThreat ? 'var(--pink-bright)' : 'var(--lure)'} />
          {(isThreat || state === 'idle' || state === 'watching') && (
            <text
              x="22" y="20.5"
              textAnchor="middle"
              fontSize="5"
              fontWeight="900"
              fill={isThreat ? '#fff' : '#1a0a2e'}
              fontFamily="var(--font-mono)"
            >@</text>
          )}
        </g>
      )}

      <path
        d="M 100 60 Q 114 50 112 72 Q 114 86 100 76 Z"
        fill="url(#bodyGrad)"
        stroke="var(--pink)"
        strokeWidth="1.4"
        filter="url(#softEdge)"
        opacity="0.9"
      />
      <path d="M 102 64 Q 108 70 102 76" stroke="var(--teal)" strokeWidth="0.8" fill="none" opacity="0.6" filter="url(#softEdge)" />

      <path
        d="M 60 28 Q 70 18 78 30 Z"
        fill="url(#bodyGrad)"
        stroke="var(--pink)"
        strokeWidth="1.4"
        filter="url(#softEdge)"
        opacity="0.9"
      />

      {/* Body glow layer (soft) */}
      <ellipse cx="60" cy="65" rx="38" ry="32" fill="none" stroke="var(--pink)" strokeWidth="3" opacity="0.3" filter="url(#softGlow)" />
      {/* Body */}
      <ellipse cx="60" cy="65" rx="38" ry="32" fill="url(#bodyGrad)" stroke="var(--pink)" strokeWidth="1.6" opacity="0.9" filter="url(#softEdge)" />

      <path
        d="M 56 96 Q 62 106 70 98 Q 62 100 56 96 Z"
        fill="url(#bodyGrad)"
        stroke="var(--pink)"
        strokeWidth="1.2"
        filter="url(#softEdge)"
        opacity="0.9"
      />

      <g ref={eyeRef}>
        <circle cx="48" cy="58" r="11" fill="url(#eyeGrad)" opacity="0.4" />
        <circle cx="48" cy="58" r="8.5" fill="#fff" stroke={eyeRingColor} strokeWidth="1.6" />
        <path
          d={isThreat ? 'M 40 47 Q 48 44 56 50' : 'M 40 49 Q 48 46 56 49'}
          stroke="var(--pink)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <g
          className={state === 'idle' ? 'mascot-blink-eye' : ''}
          style={{
            transform: `translate(${pupil.x * 1.5}px, ${pupil.y * 1.5}px)`,
            transition: state === 'analyzing' ? 'none' : 'transform 0.18s ease-out',
            transformOrigin: '48px 58px',
          }}
        >
          <circle cx="48" cy="58" r="3.4" fill="#0a0418" />
          <circle cx="46.8" cy="56.8" r="1.2" fill="#fff" />
        </g>
      </g>

      <path d={mouth} stroke="var(--pink)" strokeWidth="1.6" strokeLinecap="round" fill="none" filter="url(#softEdge)" />
      {isThreat && (
        <g stroke="#fff" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M 50 80 L 51.5 83 L 53 80" fill="#fff" />
          <path d="M 58 80 L 59.5 83 L 61 80" fill="#fff" />
          <path d="M 66 80 L 67.5 83 L 69 80" fill="#fff" />
        </g>
      )}

      <circle cx="74" cy="62" r="0.9" fill="var(--teal)" opacity="0.7" />
      <circle cx="80" cy="70" r="0.8" fill="var(--teal)" opacity="0.6" />
      <circle cx="76" cy="76" r="0.7" fill="var(--teal)" opacity="0.5" />
      <circle cx="86" cy="64" r="0.6" fill="var(--teal)" opacity="0.5" />

      <ellipse cx="50" cy="78" rx="14" ry="6" fill="#5a2890" opacity="0.25" />
    </svg>
  );
}
