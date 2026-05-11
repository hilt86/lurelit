'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface AvatarEditorProps {
  open: boolean;
  imageUrl: string;
  onSave: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export default function AvatarEditor({ open, imageUrl, onSave, onClose }: AvatarEditorProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) { setZoom(1); setOffset({ x: 0, y: 0 }); }
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open || !imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; };
    img.src = imageUrl;
  }, [open, imageUrl]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 200;
    const scale = size / previewSize;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = previewSize * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = previewSize * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = (previewSize - drawW) / 2 + offset.x;
    const drawY = (previewSize - drawH) / 2 + offset.y;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, drawX * scale, drawY * scale, drawW * scale, drawH * scale);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onSave(dataUrl);
  };

  if (!open) return null;

  const previewSize = 200;
  const imgAspect = imgRef.current ? imgRef.current.naturalWidth / imgRef.current.naturalHeight : 1;
  let imgW: number, imgH: number;
  if (imgAspect > 1) {
    imgH = previewSize * zoom;
    imgW = imgH * imgAspect;
  } else {
    imgW = previewSize * zoom;
    imgH = imgW / imgAspect;
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,2,16,0.85)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
        <div className="card animate-slide-up" style={{ padding: 0, pointerEvents: 'auto', width: 340 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="label" style={{ color: 'var(--teal-bright)' }}>Edit Avatar</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {/* Preview circle */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                width: previewSize, height: previewSize, borderRadius: '50%',
                overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab',
                border: '3px solid var(--teal)', boxShadow: '0 0 20px var(--teal-glow)',
                position: 'relative', background: 'var(--bg-deep)',
              }}
            >
              <Image
                src={imageUrl} alt="Avatar preview" width={imgW} height={imgH} unoptimized
                style={{
                  position: 'absolute',
                  left: `${(previewSize - imgW) / 2 + offset.x}px`,
                  top: `${(previewSize - imgH) / 2 + offset.y}px`,
                  width: imgW, height: imgH,
                  pointerEvents: 'none', userSelect: 'none',
                }}
                draggable={false}
              />
            </div>

            {/* Zoom slider */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>−</span>
              <input
                type="range" min="0.5" max="3" step="0.05" value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--teal)' }}
              />
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>+</span>
            </div>

            <p className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
              Drag to reposition · Scroll to zoom
            </p>
          </div>

          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 11 }}>Cancel</button>
            <button onClick={handleSave} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 11 }}>Save</button>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </>
  );
}
