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

  const bottomStyle: React.CSSProperties = {
    paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
  };

  if (!isTourStarted) {
    return (
      <div style={style}>
        <div
          className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center"
          style={bottomStyle}
        >
          <button
            onClick={startTour}
            className="bg-white/20 hover:bg-white/30 px-8 py-3 md:px-10 md:py-4 rounded-full text-white flex items-center gap-3 shadow-lg transition-colors"
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
        <div className="flex gap-4 items-center bg-black/40 backdrop-blur-md px-5 py-3 rounded-full shadow-lg">
          <button
            onClick={previousFrame}
            disabled={currentFrameIndex === 0}
            aria-label="Previous artwork"
            className={`bg-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors
              ${currentFrameIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'}`}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-white bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium min-w-[80px] text-center tabular-nums">
            {currentFrameIndex + 1} / {totalFrames}
          </div>

          <button
            onClick={nextFrame}
            disabled={currentFrameIndex === totalFrames - 1}
            aria-label="Next artwork"
            className={`bg-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors
              ${currentFrameIndex === totalFrames - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/30'}`}
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={quitTour}
            aria-label="Exit tour"
            className="bg-white/10 hover:bg-white/20 rounded-full text-white w-10 h-10 flex items-center justify-center transition-colors"
          >
            <X size={20} />
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
