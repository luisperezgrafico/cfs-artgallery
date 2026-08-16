'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

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
    const scale = Math.min(Math.max(next.scale, MIN_SCALE), MAX_SCALE);
    const clamped: Transform = {
      scale,
      // At the base scale there is no meaningful pan area. Recentering here
      // prevents a zoom-out from stranding the artwork off-screen, where the
      // visitor could no longer drag it back.
      x: scale <= MIN_SCALE ? 0 : next.x,
      y: scale <= MIN_SCALE ? 0 : next.y,
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

  const openArtworkInfo = useCallback(() => {
    close();
    // Let the lightbox unmount before opening the reading modal, rather than
    // stacking two modal layers and their focus handling on top of each other.
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('open-artwork-info'));
    });
  }, [close]);

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

  // The list view remains a real, scrollable document underneath this dialog.
  // Portal the modal to <body>, then make its siblings inert so both pointer
  // scrolling and screen-reader/keyboard focus stay inside the lightbox.
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousRootOverflow = root.style.overflow;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    const siblings = Array.from(body.children).filter(child => child !== dialogRef.current);
    const previousSiblingState = siblings.map(element => ({
      element,
      hadInert: element.hasAttribute('inert'),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    root.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    siblings.forEach(element => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.paddingRight = previousBodyPaddingRight;
      root.style.overflow = previousRootOverflow;
      previousSiblingState.forEach(({ element, hadInert, ariaHidden }) => {
        if (!hadInert) element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
    };
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

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    // Preserve the browser's ctrl/cmd-wheel zoom, and reserve artwork-wheel
    // zoom for desktop-size viewports with a precise pointer.
    if (event.ctrlKey || event.metaKey || !window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches) return;

    event.preventDefault();
    const delta = event.deltaY * (
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1
    );
    const current = transformRef.current;
    applyTransform({ ...current, scale: current.scale * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY) });
  }, [applyTransform]);

  if (!artwork || !isOpen) return null;

  const { scale, x, y } = transform;

  const dialog = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="artwork-lightbox-title"
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--floating-text)] backdrop-blur-sm transition-colors bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)]"
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
        onWheel={onWheel}
        onDragStart={(event) => event.preventDefault()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => event.preventDefault()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.url}
          alt={artwork.altText?.trim() || artwork.title}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          className="[-webkit-user-drag:none]"
          style={{
            maxWidth: '92vw',
            maxHeight: '86dvh',
            objectFit: 'contain',
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            transition: scale === MIN_SCALE ? 'transform 0.18s ease-out' : 'none',
            transformOrigin: 'center center',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* A single shared bar keeps the title and zoom control aligned without
          allowing either to overlap the other. */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-4 bg-[var(--floating-surface-strong)] px-5 py-3 backdrop-blur-sm md:grid md:grid-cols-[1fr_auto_1fr]"
        style={{
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <div aria-hidden="true" className="min-w-0 md:col-start-2 md:text-center">
          <p className="text-sm font-medium leading-snug text-[var(--floating-text)]">{artwork.title}</p>
          {(artwork.artist || artwork.date) && (
            <p className="mt-0.5 text-xs italic text-[var(--floating-muted)]">
              {artwork.artist}
              {artwork.date ? ` · ${artwork.date}` : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 md:col-start-3 md:justify-self-end">
          <button
            type="button"
            onClick={openArtworkInfo}
            aria-label="Read artwork information"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--floating-text)] backdrop-blur-sm transition-colors bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)]"
          >
            <Info size={18} />
          </button>
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
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--floating-text)] backdrop-blur-sm transition-colors bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)]"
          >
            {scale > 1 ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default ArtworkLightbox;
