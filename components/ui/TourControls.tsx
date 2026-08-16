'use client';

import React, { useEffect, useState } from 'react';
import { Play, ChevronLeft, ChevronRight, EyeOff, X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import TourEntryModal from './TourEntryModal';
import { findNextRealIndex, findPreviousRealIndex } from '../../utils/roomLayout';

const TourControls: React.FC<{
  style?: React.CSSProperties;
  onHideInterface?: () => void;
}> = ({ style, onHideInterface }) => {
  const {
    isTourStarted, currentFrameIndex, totalFrames,
    images, startTour, nextFrame, previousFrame, quitTour,
  } = useTour();
  const { autoAdvance, setAutoAdvance, pendingAutoStart } = useGuidedTourPreferences();
  const [showEntryModal, setShowEntryModal] = useState(false);

  // Auto skips submit canvases; Manual deliberately visits every wall slot so
  // a visitor can reach its "Submit your work" action.
  const goNext = () => nextFrame(!autoAdvance);
  const goPrevious = () => previousFrame(!autoAdvance);
  const hasPreviousArtwork = autoAdvance
    ? findPreviousRealIndex(images, currentFrameIndex) !== -1
    : currentFrameIndex > 0;
  const hasNextArtwork = autoAdvance
    ? findNextRealIndex(images, currentFrameIndex) !== -1
    : currentFrameIndex < totalFrames - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTourStarted) {
        if (!pendingAutoStart && (e.key === ' ' || e.key === 'Enter')) setShowEntryModal(true);
      } else {
        if (e.key === 'ArrowRight' || e.key === 'd') {
          goNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'a') {
          if (hasPreviousArtwork) goPrevious();
        } else if (e.key === 'Escape') {
          quitTour();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourStarted, hasNextArtwork, hasPreviousArtwork, quitTour, pendingAutoStart, goNext, goPrevious]);

  const bottomStyle: React.CSSProperties = {
    paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
  };

  if (!isTourStarted) {
    // Arriving via "Next room": let the overview show quietly, with no
    // "Start the Tour" button to press — the tour resumes on its own shortly.
    if (pendingAutoStart) return <div style={style} />;

    return (
      <div style={style}>
        {showEntryModal && (
          <TourEntryModal onClose={() => setShowEntryModal(false)} onStart={startTour} />
        )}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center"
          style={bottomStyle}
        >
          <button
            onClick={() => setShowEntryModal(true)}
            className="bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)] px-10 py-4 rounded-full text-[var(--floating-text)] flex items-center gap-3 shadow-lg transition-colors"
          >
            <Play size={20} />
            <span className="text-sm md:text-lg font-semibold">Start the Tour</span>
          </button>
          <div className="text-[var(--floating-muted)] text-xs mt-2">
            <span className="lg:hidden">Tap to start</span>
            <span className="hidden lg:inline">Press Space or Enter to start</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={style}>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center"
        style={bottomStyle}
      >
        <div className="flex gap-3 items-center bg-[var(--floating-surface)] md:bg-[var(--floating-surface-strong)] backdrop-blur-md px-6 py-4 rounded-full shadow-lg">
          <button
            onClick={goPrevious}
            disabled={!hasPreviousArtwork}
            aria-label="Previous artwork"
            className={`bg-[var(--floating-control)] p-2 rounded-full text-[var(--floating-text)] w-10 h-10 flex items-center justify-center transition-colors
              ${!hasPreviousArtwork ? 'bg-[var(--floating-control-disabled)] text-[var(--floating-muted)] cursor-not-allowed' : 'hover:bg-[var(--floating-control-hover)]'}`}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setAutoAdvance(!autoAdvance)}
            aria-label={autoAdvance ? 'Auto — switch to manual navigation' : 'Manual — resume auto-advance'}
            className={`h-10 w-20 shrink-0 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
              autoAdvance
                ? 'bg-[var(--floating-active)] text-[var(--floating-active-text)]'
                : 'bg-[var(--floating-control)] text-[var(--floating-text)] hover:bg-[var(--floating-control-hover)]'
            }`}
          >
            {autoAdvance ? 'Auto' : 'Manual'}
          </button>

          <button
            onClick={goNext}
            aria-label={hasNextArtwork ? 'Next artwork' : 'Finish tour at the rest view'}
            className="bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)] p-2 rounded-full text-[var(--floating-text)] w-10 h-10 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={onHideInterface}
            aria-label="Hide interface"
            title="Hide interface"
            className="bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)] rounded-full text-[var(--floating-text)] w-10 h-10 flex items-center justify-center transition-colors"
          >
            <EyeOff size={19} />
          </button>

          <button
            onClick={quitTour}
            aria-label="Exit tour"
            className="bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)] rounded-full text-[var(--floating-text)] w-10 h-10 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-[var(--floating-text)] md:bg-[var(--floating-surface-strong)] md:px-3 md:py-1 md:rounded-full drop-shadow text-xs mt-2 tabular-nums">
          {currentFrameIndex + 1} / {totalFrames}
          {' · '}
          <span className="lg:hidden">Tap or swipe to navigate</span>
          <span className="hidden lg:inline">← → arrows · Esc to exit</span>
        </div>
      </div>
    </div>
  );
};

export default TourControls;
