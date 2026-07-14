'use client';

import React, { useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDetectGPU } from '@react-three/drei';
import { useTour } from '../../contexts/TourContext';

const TourControls: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isMobile } = useDetectGPU();
  const {
    isTourStarted, currentFrameIndex, totalFrames,
    startTour, nextFrame, previousFrame, quitTour,
  } = useTour();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTourStarted) {
        if (e.key === ' ' || e.key === 'Enter') startTour();
      } else {
        if (e.key === 'ArrowRight' || e.key === 'd') {
          if (currentFrameIndex < totalFrames - 1) nextFrame();
        } else if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'a') {
          if (currentFrameIndex > 0) previousFrame();
        } else if (e.key === 'Escape') {
          quitTour();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourStarted, currentFrameIndex, totalFrames, startTour, nextFrame, previousFrame, quitTour]);

  if (!isTourStarted) {
    return (
      <div style={style}>
        <div className="fixed bottom-8 md:bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <button
            onClick={startTour}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 md:px-10 md:py-4 rounded-full text-white flex items-center gap-3 shadow-lg transition-colors"
          >
            <Play size={isMobile ? 18 : 24} />
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
      <div className="fixed bottom-8 md:bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <div className="flex gap-4 items-center bg-black/40 backdrop-blur-md p-2 rounded-full shadow-lg">
          <button
            onClick={previousFrame}
            disabled={currentFrameIndex === 0}
            aria-label="Previous artwork"
            className={`bg-white/20 p-2 rounded-full text-white w-9 h-9 flex items-center justify-center transition-colors
              ${currentFrameIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'}`}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-white bg-white/10 px-4 py-1 rounded-full text-sm font-medium min-w-[80px] text-center tabular-nums">
            {currentFrameIndex + 1} / {totalFrames}
          </div>

          <button
            onClick={nextFrame}
            disabled={currentFrameIndex === totalFrames - 1}
            aria-label="Next artwork"
            className={`bg-white/20 p-2 rounded-full text-white w-9 h-9 flex items-center justify-center transition-colors
              ${currentFrameIndex === totalFrames - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'}`}
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={quitTour}
            aria-label="Exit tour"
            className="bg-white/10 hover:bg-white/20 p-1 rounded-full text-white ml-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="text-white/60 text-xs mt-2">
          {isMobile ? 'Tap or swipe to navigate' : '← → arrows · Esc to exit'}
        </div>
      </div>
    </div>
  );
};

export default TourControls;
