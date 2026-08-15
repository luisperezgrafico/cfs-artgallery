'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const ArtworkLightbox: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, currentFrameIndex, images } = useTour();
  const [isOpen, setIsOpen] = useState(false);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });

  // Refs for gesture tracking (avoid stale closures)
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const lastTapAt = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const artwork =
    isTourStarted && currentFrameIndex >= 0 ? images[currentFrameIndex] : null;

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
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [],
        );
        const currentIndex = controls.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

        if (currentIndex === -1 || nextIndex < 0 || nextIndex >= controls.length) {
          event.preventDefault();
          controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    openerRef.current?.focus();
    openerRef.current = null;
  }, [isOpen]);

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

  // Double-tap: zoom in to 2× when at 1×, reset when zoomed
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current < 280) {
      if (transformRef.current.scale > 1) {
        resetTransform();
      } else {
        applyTransform({ scale: 2, x: 0, y: 0 });
      }
    }
    lastTapAt.current = now;
  }, [resetTransform, applyTransform]);

  if (!artwork || !isOpen) return null;

  const { scale, x, y } = transform;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="artwork-lightbox-title"
      aria-describedby="artwork-lightbox-instructions"
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ ...style, zIndex: 60, animation: 'fadeIn 0.32s ease-out' }}
    >
      {/* This comes first so it is the first focus stop when the dialog opens. */}
      <div
        className="absolute top-0 right-0 flex gap-2 px-4"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <button
          ref={closeButtonRef}
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

      {/* Kept before the image in the DOM so screen readers get the work's
          context before its alternative text. The visible copy lives in the
          shared bottom bar below, where it can reflow with the zoom controls. */}
      <div className="sr-only">
        <h2 id="artwork-lightbox-title">{artwork.title}</h2>
        {(artwork.artist || artwork.date) && (
          <p>
            {artwork.artist}
            {artwork.date ? ` · ${artwork.date}` : ''}
          </p>
        )}
      </div>

      {/* Kept after the title and artist so a screen reader reaches the visual
          description with its context already announced. */}
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
          alt={artwork.altText?.trim() || artwork.title}
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

      {/* This shared, full-width bar keeps its two visual halves from ever
          overlapping. On narrow screens they stack instead of competing for
          the same bottom edge. */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-black/75 px-5 py-3 backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between"
        style={{
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <div aria-hidden="true" className="min-w-0">
          <p className="text-sm font-medium leading-snug text-white/95">{artwork.title}</p>
          {(artwork.artist || artwork.date) && (
            <p className="mt-0.5 text-xs italic text-white/90">
              {artwork.artist}
              {artwork.date ? ` · ${artwork.date}` : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3">
          <p id="artwork-lightbox-instructions" className="max-w-52 text-right text-xs text-white/90">
            {scale > 1 ? 'Use the zoom out button or double-tap to reset' : 'Use the zoom in button or double-tap to zoom'}
          </p>
          <button
            type="button"
            aria-label={scale > 1 ? 'Zoom out' : 'Zoom in'}
            onClick={(event) => {
              event.stopPropagation();
              if (transformRef.current.scale > 1) {
                resetTransform();
              } else {
                applyTransform({ scale: 2, x: 0, y: 0 });
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors bg-white/10 hover:bg-white/20"
          >
            {scale > 1 ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkLightbox;
