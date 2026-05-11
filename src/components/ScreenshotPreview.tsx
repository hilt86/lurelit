'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ScreenshotPreview({ src }: { src: string }) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div
        onClick={() => setLightbox(true)}
        className="card"
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, cursor: 'zoom-in', overflow: 'hidden' }}
      >
        {/* Thumbnail */}
        <div style={{
          width: 80, height: 60, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Image src={src} alt="Screenshot" width={80} height={60} style={{ objectFit: 'cover', width: 80, height: 60 }} unoptimized />
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="var(--teal)" strokeWidth="1.2" />
              <circle cx="5.5" cy="7" r="1.5" stroke="var(--teal)" strokeWidth="1" />
              <path d="M1 11l3.5-3 2.5 2 3.5-4L15 11" stroke="var(--teal)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="label-sm" style={{ color: 'var(--text-dim)' }}>Submitted Screenshot</span>
          </div>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Click to enlarge</span>
        </div>

        {/* Enlarge icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-faint)' }}>
          <path d="M9 1h6v6M7 15H1V9M15 1L9.5 6.5M1 15l5.5-5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <>
          <div onClick={() => setLightbox(false)} style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,7,13,0.92)',
            backdropFilter: 'blur(8px)', cursor: 'zoom-out',
          }} />
          <div onClick={() => setLightbox(false)} style={{
            position: 'fixed', inset: 0, zIndex: 201,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40, cursor: 'zoom-out',
          }}>
            <div className="animate-fade-in" style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <Image
                src={src} alt="Screenshot" width={1200} height={900}
                style={{ objectFit: 'contain', maxHeight: '85vh', maxWidth: '85vw', width: 'auto', borderRadius: 3, border: '1px solid var(--border-strong)' }}
                unoptimized
              />
              <button onClick={(e) => { e.stopPropagation(); setLightbox(false); }} style={{
                position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-panel)', border: '1px solid var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
