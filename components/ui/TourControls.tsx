'use client';

import React, { useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDetectGPU } from '@react-three/drei';
import { useTour } from '../../contexts/TourContext';

const TourControls: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isMobile } = useDetectGPU();
  const {
    isTourStarted,
    currentFrameIndex,
    totalFrames,
    startTour,
    nextFrame,
    previousFrame,
    quitTour,
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
        <div className="fixed bottom-8 md:bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          <button
            onClick={startTour}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 md:px-10 md:py-4 rounded-full text-white flex items-center gap-3 shadow-lg transition-colors"
          >
            <Play size={isMobile ? 18 : 22} />
            <span className="text-sm md:text-lg font-semibold">Start Tour</span>
          </button>
          <p className="text-white/50 text-xs whitespace-nowrap">
            {isMobile ? 'Tap to start' : 'Press Space or Enter to start'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={style}>
      <div className="fixed bottom-8 md:bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
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

        <p className="text-white/40 text-xs whitespace-nowrap">
          {isMobile ? 'Tap or swipe to navigate' : '← → arrows · Esc to exit'}
        </p>
      </div>
    </div>
  );
};

export default TourControls;
