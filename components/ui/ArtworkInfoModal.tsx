'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { drawingImages } from '../../config/imagesConfig';

interface Origin {
  x: number;
  y: number;
}

const ArtworkInfoModal: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, currentFrameIndex } = useTour();
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);

  const artwork = isTourStarted && currentFrameIndex >= 0
    ? drawingImages[currentFrameIndex]
    : null;

  useEffect(() => { setIsOpen(false); }, [currentFrameIndex]);
  useEffect(() => { if (!isTourStarted) setIsOpen(false); }, [isTourStarted]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Origin | undefined>).detail;
      // Store plaque coordinates if provided (used as animation origin)
      setOrigin(detail?.x !== undefined ? detail : null);
      setIsOpen(true);
    };
    window.addEventListener('open-artwork-info', handler);
    return () => window.removeEventListener('open-artwork-info', handler);
  }, []);

  if (!artwork || !isOpen) return null;

  const close = () => setIsOpen(false);

  // transform-origin for the panel-wrapper (which is fixed inset-0):
  // viewport coordinates map directly because the wrapper spans the full viewport.
  // Fallback: roughly where the plaque would be (center-bottom area).
  const transformOrigin = origin
    ? `${origin.x}px ${origin.y}px`
    : '50% 75%';

  const safeAreaPadding = 'max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left))';

  return (
    <div style={style}>
      {/* Backdrop — fades in independently, captures outside clicks */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={close}
      />

      {/*
        Panel wrapper — same fixed inset-0 layer but pointer-events-none so
        the backdrop above captures clicks outside the panel.
        Scales from the plaque's viewport coordinates via transform-origin.
      */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{
          padding: safeAreaPadding,
          transformOrigin,
          animation: 'scaleIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Panel — re-enables pointer events */}
        <div className="pointer-events-auto w-full max-w-lg bg-black/80 border border-white/15 rounded-2xl shadow-2xl flex flex-col max-h-[85dvh]">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 className="text-white text-lg font-semibold leading-snug">{artwork.title}</h2>
              <p className="text-white/55 text-sm mt-1">
                {artwork.artist}
                {artwork.date ? ` · ${artwork.date}` : ''}
              </p>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Separator */}
          {artwork.description && <div className="border-t border-white/10 mx-6" />}

          {/* Scrollable description */}
          {artwork.description && (
            <div className="overflow-y-auto px-6 py-5 flex-1">
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
                {artwork.description}
              </p>
            </div>
          )}

          {/* Footer link */}
          {artwork.link && artwork.link !== '#' && (
            <div className="px-6 pb-6 pt-3 border-t border-white/10">
              <a
                href={artwork.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm transition-colors"
              >
                <ExternalLink size={14} />
                View work
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtworkInfoModal;
