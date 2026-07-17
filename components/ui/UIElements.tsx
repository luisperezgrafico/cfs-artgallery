'use client';

import React, { useState, useEffect } from 'react';
import { useAnimation } from '../../contexts/AnimationContext';
import LoadingScreen from './LoadingScreen';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import Controls from './Controls';
import ArtworkInfoModal from './ArtworkInfoModal';
import ArtworkLightbox from './ArtworkLightbox';
import HamburgerMenu from './HamburgerMenu';

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
          <TourControls style={{ animation: 'fadeIn 1s ease-out forwards' }} />
          <ArtworkInfoModal style={{ animation: 'fadeIn 1s ease-out forwards' }} />
          <ArtworkLightbox />
          <HamburgerMenu style={{ animation: 'fadeIn 1s ease-out forwards' }} />
          <Controls style={{ animation: 'fadeIn 1s ease-out forwards' }} />
        </>
      )}
    </>
  );
};

export default UIElements;
