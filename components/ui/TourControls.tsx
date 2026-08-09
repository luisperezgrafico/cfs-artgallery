'use client';

import React, { useEffect, useState } from 'react';
import { Play, ChevronLeft, ChevronRight, EyeOff, X } from 'lucide-react';
import { useDetectGPU } from '@react-three/drei';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import TourEntryModal from './TourEntryModal';

const TourControls: React.FC<{
  style?: React.CSSProperties;
  onHideInterface?: () => void;
}> = ({ style, onHideInterface }) => {
  const { isMobile } = useDetectGPU();
  const {
    isTourStarted, currentFrameIndex, totalFrames,
    startTour, nextFrame, previousFrame, quitTour,
  } = useTour();
  const { autoAdvance, setAutoAdvance } = useGuidedTourPreferences();
  const [showEntryModal, setShowEntryModal] = useState(false);

  // Arrows navigate without leaving Auto — that's the whole point of keeping
  // them visible there: skipping past one artwork (e.g. one flagged with
  // content notes) shouldn't require abandoning the guided tour to do it.
  const goNext = () => nextFrame();
  const goPrevious = () => previousFrame();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTourStarted) {
        if (e.key === ' ' || e.key === 'Enter') setShowEntryModal(true);
      } else {
        if (e.key === 'ArrowRight' || e.key === 'd') {
          if (currentFrameIndex < totalFrames - 1) goNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'a') {
          if (currentFrameIndex > 0) goPrevious();
        } else if (e.key === 'Escape') {
          quitTour();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourStarted, currentFrameIndex, totalFrames, quitTour]);

  const bottomStyle: React.CSSProperties = {
    paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
  };

  if (!isTourStarted) {
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
            className="bg-white/20 hover:bg-white/30 px-10 py-4 rounded-full text-white flex items-center gap-3 shadow-lg transition-colors"
          >
            <Play size={isMobile ? 18 : 22} />
            <span className="text-sm md:text-lg font-semibold">Start the Tour</span>
          </button>
          <div className="text-white/60 text-xs mt-2">
            {isMobile ? 'Tap to start' : 'Press Space or Enter to start'}
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
        <div className="flex gap-3 items-center bg-black/40 backdrop-blur-md px-6 py-4 rounded-full shadow-lg">
          <button
            onClick={goPrevious}
            disabled={currentFrameIndex === 0}
            aria-label="Previous artwork"
            className={`bg-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors
              ${currentFrameIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'}`}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setAutoAdvance(!autoAdvance)}
            aria-label={autoAdvance ? 'Switch to manual navigation' : 'Resume auto-advance'}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              autoAdvance ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {autoAdvance ? 'Auto' : 'Manual'}
          </button>

          <button
            onClick={goNext}
            disabled={currentFrameIndex === totalFrames - 1}
            aria-label="Next artwork"
            className={`bg-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors
              ${currentFrameIndex === totalFrames - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'}`}
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={onHideInterface}
            aria-label="Hide interface"
            title="Hide interface"
            className="bg-white/10 hover:bg-white/20 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors"
          >
            <EyeOff size={19} />
          </button>

          <button
            onClick={quitTour}
            aria-label="Exit tour"
            className="bg-white/10 hover:bg-white/20 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-white/60 text-xs mt-2 tabular-nums">
          {currentFrameIndex + 1} / {totalFrames}
          {' · '}
          {isMobile ? 'Tap or swipe to navigate' : '← → arrows · Esc to exit'}
        </div>
      </div>
    </div>
  );
};

export default TourControls;
