'use client';

import { useCallback, useRef, useState } from 'react';
import LurelitMascot from './LurelitMascot';

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFilesSelect, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }, [disabled]);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFilesSelect(files);
  }, [disabled, onFilesSelect]);

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
      style={{
        width: '100%', maxWidth: 640, margin: '0 auto', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 320, padding: '52px 40px',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) onFilesSelect(files);
        e.target.value = '';
      }} style={{ display: 'none' }} disabled={disabled} />

      <div style={{ marginBottom: 20, transform: isDragOver ? 'scale(1.08)' : 'none', transition: 'transform 0.3s' }}>
        <LurelitMascot size={92} state={isDragOver ? 'analyzing' : 'watching'} />
      </div>

      <p className="mono" style={{ fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: isDragOver ? 'var(--teal-bright)' : 'var(--teal)', marginBottom: 12, fontWeight: 600 }}>
        {isDragOver ? '▸ Drop to upload' : '▸ Bait the lure'}
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
        Drag and drop screenshots of suspicious messages, or click to browse.
        Each image is analyzed in parallel.
      </p>
      <p className="mono" style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 16, letterSpacing: '0.14em' }}>
        PNG · JPG · WEBP &nbsp;·&nbsp; Multiple files supported
      </p>
    </div>
  );
}
