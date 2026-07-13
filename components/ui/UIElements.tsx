'use client';

import React, { useState, useEffect } from 'react';
import { useAnimation } from '../../contexts/AnimationContext';
import LoadingScreen from './LoadingScreen';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import Controls from './Controls';

const UIElements: React.FC = () => {
  const { currentScreen, assetsReady, handleLoadingComplete, handleTitleFading, handleTitleComplete } = useAnimation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) handleLoadingComplete();
  }, [isLoading]);

  return (
    <>
      {isLoading && (
        <LoadingScreen setIsLoading={setIsLoading} assetsReady={assetsReady} />
      )}

      {currentScreen === 'title' && (
        <TitleScreen onFading={handleTitleFading} onComplete={handleTitleComplete} />
      )}

      {currentScreen === 'scene' && (
        <>
          <TourControls />
          <Controls />
        </>
      )}
    </>
  );
};

export default UIElements;
