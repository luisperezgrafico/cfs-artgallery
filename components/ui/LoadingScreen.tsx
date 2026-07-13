'use client';

import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';

interface LoadingScreenProps {
  setIsLoading: (isLoading: boolean) => void;
  assetsReady?: boolean;
}

const LoadingScreen = ({ setIsLoading, assetsReady = false }: LoadingScreenProps) => {
  const { progress, item, loaded, total } = useProgress();
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (assetsReady && progress === 100) {
      const timer = setTimeout(() => { setOpacity(0); }, 500);
      return () => clearTimeout(timer);
    }
  }, [assetsReady, progress]);

  const handleTransitionEnd = () => {
    if (opacity === 0) setIsLoading(false);
  };

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-black z-50"
      style={{ opacity, transition: 'opacity 1.5s ease-in-out', pointerEvents: opacity === 0 ? 'none' : 'auto' }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="flex items-center mb-8">
        <h1 className="text-white text-3xl font-bold">ME/CFS Gallery</h1>
      </div>

      <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-col items-center text-white">
        <div className="text-lg font-medium mb-2">{Math.round(progress)}% loaded</div>
        {item && (
          <div className="text-xs text-gray-400 max-w-xs text-center truncate">
            Loading: {item}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">{loaded}/{total} assets loaded</div>
      </div>
    </div>
  );
};

export default LoadingScreen;
