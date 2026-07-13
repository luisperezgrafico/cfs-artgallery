'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';

const TourControls: React.FC = () => {
  const { isTourStarted, currentFrameIndex, totalFrames, nextFrame, previousFrame, quitTour, startTour } = useTour();

  if (!isTourStarted) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={startTour}
          className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-all duration-200 tracking-wide"
        >
          Start Tour
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={previousFrame}
          disabled={currentFrameIndex <= 0}
          aria-label="Previous artwork"
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="px-6 py-3 bg-black/50 backdrop-blur-sm rounded-full text-white text-base font-medium min-w-[80px] text-center tabular-nums">
          {currentFrameIndex + 1} / {totalFrames}
        </div>

        <button
          onClick={nextFrame}
          disabled={currentFrameIndex >= totalFrames - 1}
          aria-label="Next artwork"
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={22} />
        </button>

        <button
          onClick={quitTour}
          aria-label="Exit tour"
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <p className="text-white/40 text-sm">Tap or swipe to navigate</p>
    </div>
  );
};

export default TourControls;
