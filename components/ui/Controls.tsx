'use client';

import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

const Controls: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div style={style}>
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
              <li>Space / Enter to start tour</li>
              <li>Escape to exit</li>
              <li className="pt-1 border-t border-white/10">Swipe left/right on mobile</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Controls;
