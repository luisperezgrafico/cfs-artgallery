'use client';

import React, { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';

const Controls: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const { isTourStarted, nextFrame, previousFrame, quitTour } = useTour();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTourStarted) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextFrame();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   previousFrame();
      if (e.key === 'Escape') quitTour();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourStarted, nextFrame, previousFrame, quitTour]);

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
      <button
        onClick={() => setShowInfo(v => !v)}
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Toggle controls info"
      >
        {showInfo ? <X size={16} /> : <Info size={16} />}
      </button>

      {showInfo && (
        <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-white text-sm max-w-xs">
          <h3 className="font-semibold mb-2 text-white/80">Controls</h3>
          <ul className="space-y-1 text-white/60 text-xs">
            <li>Click a frame to zoom in</li>
            <li>← → Arrow keys to navigate</li>
            <li>Escape to exit zoom</li>
            <li className="pt-1 border-t border-white/10">Swipe left/right to navigate</li>
            <li>Swipe down to exit tour</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Controls;
