'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { drawingImages } from '../../config/imagesConfig';

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const ArtworkLightbox: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, currentFrameIndex } = useTour();
  const [isOpen, setIsOpen] = useState(false);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });

  // Refs for gesture tracking (avoid stale closures)
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const lastTapAt = useRef(0);

  const artwork =
    isTourStarted && currentFrameIndex >= 0 ? drawingImages[currentFrameIndex] : null;

  const resetTransform = useCallback(() => {
    const t = { scale: 1, x: 0, y: 0 };
    transformRef.current = t;
    setTransform(t);
  }, []);

  const applyTransform = useCallback((next: Transform) => {
    const clamped: Transform = {
      scale: Math.min(Math.max(next.scale, MIN_SCALE), MAX_SCALE),
      x: next.x,
      y: next.y,
    };
    transformRef.current = clamped;
    setTransform(clamped);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    resetTransform();
  }, [currentFrameIndex, resetTransform]);

  useEffect(() => {
    if (!isTourStarted) setIsOpen(false);
  }, [isTourStarted]);

  // Notify SwipeableContainer whenever lightbox closes for any reason
  useEffect(() => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent('close-artwork-lightbox'));
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = () => {
      resetTransform();
      setIsOpen(true);
    };
    window.addEventListener('open-artwork-lightbox', handler);
    return () => window.removeEventListener('open-artwork-lightbox', handler);
  }, [resetTransform]);

  const close = useCallback(() => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('close-artwork-lightbox'));
  }, []);

  // ── Pointer gesture handlers ──────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      lastPinchDist.current = Math.hypot(dx, dy);
      lastPanPos.current = null;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cur = transformRef.current;

      if (pointers.current.size === 2) {
        // Pinch to zoom
        const pts = Array.from(pointers.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);

        if (lastPinchDist.current !== null) {
          const ratio = dist / lastPinchDist.current;
          applyTransform({ ...cur, scale: cur.scale * ratio });
        }
        lastPinchDist.current = dist;
      } else if (pointers.current.size === 1 && lastPanPos.current && cur.scale > 1) {
        // Pan when zoomed in
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        applyTransform({ ...cur, x: cur.x + dx, y: cur.y + dy });
        lastPanPos.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.current.size === 1) {
        lastPanPos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [applyTransform],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    lastPinchDist.current = null;

    if (pointers.current.size === 1) {
      const [pt] = Array.from(pointers.current.values());
      lastPanPos.current = pt;
    } else if (pointers.current.size === 0) {
      lastPanPos.current = null;
    }
  }, []);

  // Double-tap resets zoom
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current < 280) {
      resetTransform();
    }
    lastTapAt.current = now;
  }, [resetTransform]);

  if (!artwork || !isOpen) return null;

  const { scale, x, y } = transform;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ ...style, zIndex: 60, animation: 'fadeIn 0.18s ease-out' }}
    >
      {/* Gesture / image area */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none', cursor: scale > 1 ? 'grab' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onTap}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.url}
          alt={artwork.title}
          draggable={false}
          style={{
            maxWidth: '92vw',
            maxHeight: '86dvh',
            objectFit: 'contain',
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            transformOrigin: 'center center',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Top-right controls */}
      <div
        className="absolute top-0 right-0 flex gap-2 px-4"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          aria-label="Close"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors bg-white/10 hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      {/* Bottom bar — title + zoom hint */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-5"
        style={{
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <div>
          <p className="text-white/90 text-sm font-medium leading-snug">{artwork.title}</p>
          {(artwork.artist || artwork.date) && (
            <p className="text-white/40 text-xs mt-0.5 italic">
              {artwork.artist}
              {artwork.date ? ` · ${artwork.date}` : ''}
            </p>
          )}
        </div>
        {scale > 1 && (
          <p className="text-white/25 text-xs">Double-tap to reset</p>
        )}
      </div>
    </div>
  );
};

export default ArtworkLightbox;
