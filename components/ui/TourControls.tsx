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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
      <button
        onClick={previousFrame}
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30"
        disabled={currentFrameIndex <= 0}
        aria-label="Previous artwork"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full">
        <span className="text-white/60 text-xs">
          {currentFrameIndex + 1} / {totalFrames}
        </span>
        <button
          onClick={quitTour}
          className="flex items-center gap-1 text-white/60 hover:text-white text-xs transition-colors"
          aria-label="Exit tour"
        >
          <X size={12} />
          <span>Exit</span>
        </button>
      </div>

      <button
        onClick={nextFrame}
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30"
        disabled={currentFrameIndex >= totalFrames - 1}
        aria-label="Next artwork"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default TourControls;
