'use client';

import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';

interface LoadingScreenProps {
  setIsLoading: (isLoading: boolean) => void;
  assetsReady?: boolean;
}

const LoadingScreen = ({ setIsLoading, assetsReady = false }: LoadingScreenProps) => {
  const { progress } = useProgress();
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
      <div className="flex items-center mb-10">
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: '#e8e0d4',
            fontSize: '1.6rem',
            fontWeight: 400,
            letterSpacing: '0.05em',
          }}
        >
          ME/CFS Community Gallery
        </h1>
      </div>

      <div className="w-56 overflow-hidden" style={{ height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, background: 'rgba(232, 224, 212, 0.7)', borderRadius: '1px' }}
        />
      </div>

      <p
        className="mt-5"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: 'rgba(232, 224, 212, 0.45)',
          fontSize: '0.8rem',
          letterSpacing: '0.04em',
        }}
      >
        {Math.round(progress)}%
      </p>
    </div>
  );
};

export default LoadingScreen;
