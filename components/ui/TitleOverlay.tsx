'use client';

import React, { useState, useEffect } from 'react';

interface TitleScreenProps {
  onFading?: () => void;
  onComplete?: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onFading, onComplete }) => {
  const [animationState, setAnimationState] = useState<'initial' | 'visible' | 'fading'>('initial');

  useEffect(() => {
    const appearTimer  = setTimeout(() => { setAnimationState('visible'); }, 300);
    const fadeOutTimer = setTimeout(() => { setAnimationState('fading'); if (onFading) onFading(); }, 3500);
    const completeTimer = setTimeout(() => { if (onComplete) onComplete(); }, 4500);

    return () => {
      clearTimeout(appearTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center z-40 pointer-events-none"
      style={{
        opacity: animationState === 'fading' ? 0 : 1,
        transition: 'opacity 1s ease-out',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="overflow-hidden">
        <h1
          className="text-white text-5xl md:text-7xl font-light tracking-wider text-center px-4"
          style={{
            transform:
              animationState === 'initial' ? 'translateY(100%)' :
              animationState === 'fading'  ? 'translateY(100%)' : 'translateY(0)',
            opacity: animationState === 'initial' || animationState === 'fading' ? 0 : 1,
            transition: 'transform 1.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.8s ease-out',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}
        >
          ME/CFS Community Gallery
        </h1>
      </div>
    </div>
  );
};

export default TitleScreen;
