'use client';

import Image from 'next/image';

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

export default function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  const url = URL.createObjectURL(file);

  return (
    <div className="card animate-slide-up" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="animate-pulse-teal" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} />
          <span className="label-sm" style={{ color: 'var(--text-dim)' }}>Preview</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mono" style={{ color: 'var(--text-faint)', fontSize: 11 }}>{file.name} · {(file.size / 1024).toFixed(0)}KB</span>
          <button onClick={onRemove} style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Remove">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--bg-surface)', maxHeight: 400, overflow: 'hidden' }}>
        <Image src={url} alt="Screenshot preview" width={600} height={400} style={{ objectFit: 'contain', maxHeight: 360, width: 'auto', borderRadius: 2 }} unoptimized />
      </div>
    </div>
  );
}
