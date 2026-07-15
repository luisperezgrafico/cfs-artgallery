'use client';

import React, { useState, useEffect } from 'react';
import { Info, X, ExternalLink } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { drawingImages } from '../../config/imagesConfig';

function useIsLandscape() {
  const [landscape, setLandscape] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    setLandscape(mql.matches);
    const handler = (e: MediaQueryListEvent) => setLandscape(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return landscape;
}

const ArtworkInfoModal: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, currentFrameIndex } = useTour();
  const [isOpen, setIsOpen] = useState(false);
  const isLandscape = useIsLandscape();

  const artwork = isTourStarted && currentFrameIndex >= 0
    ? drawingImages[currentFrameIndex]
    : null;

  useEffect(() => { setIsOpen(false); }, [currentFrameIndex]);
  useEffect(() => { if (!isTourStarted) setIsOpen(false); }, [isTourStarted]);

  if (!artwork) return null;

  // In landscape, place button on the left side so it doesn't overlap the artwork
  const buttonPositionClass = isLandscape
    ? 'fixed left-4 top-1/2 -translate-y-1/2 z-30'
    : 'fixed bottom-0 left-0 right-0 z-30 flex justify-center';

  const buttonStyle: React.CSSProperties = isLandscape
    ? { paddingLeft: 'max(1rem, env(safe-area-inset-left))' }
    : { paddingBottom: 'max(6.5rem, calc(env(safe-area-inset-bottom) + 6rem))' };

  return (
    <div style={style}>
      {/* Info button */}
      <div className={buttonPositionClass} style={buttonStyle}>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Artwork information"
          className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm transition-colors shadow-lg border border-white/10"
        >
          <Info size={14} />
          {!isLandscape && <span>Artwork info</span>}
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ animation: 'fadeIn 0.2s ease-out', padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg bg-black/80 border border-white/15 rounded-2xl shadow-2xl flex flex-col max-h-[85dvh]">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 pb-3">
              <div>
                <h2 className="text-white text-lg font-semibold leading-snug">{artwork.title}</h2>
                <p className="text-white/60 text-sm mt-0.5">
                  {artwork.artist}
                  {artwork.date ? ` · ${artwork.date}` : ''}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors mt-0.5"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            {artwork.description && (
              <div className="overflow-y-auto px-5 pb-2 flex-1">
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-line">
                  {artwork.description}
                </p>
              </div>
            )}

            {/* Footer link */}
            {artwork.link && artwork.link !== '#' && (
              <div className="p-5 pt-3 border-t border-white/10">
                <a
                  href={artwork.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm transition-colors"
                >
                  <ExternalLink size={14} />
                  View work
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtworkInfoModal;
