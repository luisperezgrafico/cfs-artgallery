'use client';

import React, { useState, useEffect } from 'react';
import { useAnimation } from '../../contexts/AnimationContext';
import LoadingScreen from './LoadingScreen';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import ArtworkInfoModal from './ArtworkInfoModal';
import ArtworkLightbox from './ArtworkLightbox';
import SubmitArtworkModal from './SubmitArtworkModal';
import HamburgerMenu from './HamburgerMenu';

const UIElements: React.FC = () => {
  const { currentScreen, assetsReady, handleLoadingComplete, handleTitleFading, handleTitleComplete } = useAnimation();
  const [isLoading, setIsLoading] = useState(true);
  const [isInterfaceHidden, setIsInterfaceHidden] = useState(false);

  useEffect(() => {
    if (!isLoading) handleLoadingComplete();
  }, [isLoading]);

  useEffect(() => {
    if (!isInterfaceHidden) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsInterfaceHidden(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInterfaceHidden]);

  useEffect(() => {
    if (currentScreen !== 'scene') setIsInterfaceHidden(false);
  }, [currentScreen]);

  return (
    <>
      {isLoading && (
        <LoadingScreen setIsLoading={setIsLoading} assetsReady={assetsReady} />
      )}

      {currentScreen === 'title' && (
        <TitleScreen onFading={handleTitleFading} onComplete={handleTitleComplete} />
      )}

      {currentScreen === 'scene' && (
        isInterfaceHidden ? (
          <button
            type="button"
            aria-label="Show interface"
            title="Show interface"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setIsInterfaceHidden(false)}
          />
        ) : (
          <>
            <TourControls
              style={{ animation: 'fadeIn 1s ease-out forwards' }}
              onHideInterface={() => setIsInterfaceHidden(true)}
            />
            <ArtworkInfoModal />
            <ArtworkLightbox />
            <SubmitArtworkModal />
            <HamburgerMenu style={{ animation: 'fadeIn 1s ease-out forwards' }} />
          </>
        )
      )}
    </>
  );
};

export default UIElements;
