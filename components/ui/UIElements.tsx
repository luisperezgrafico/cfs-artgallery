'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useAnimation } from '../../contexts/AnimationContext';
import LoadingScreen from './LoadingScreen';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import ArtworkInfoModal from './ArtworkInfoModal';
import ArtworkLightbox from './ArtworkLightbox';
import SubmitArtworkModal from './SubmitArtworkModal';
import HamburgerMenu from './HamburgerMenu';

const HIDE_INTERFACE_FADE_MS = 520;

const UIElements: React.FC = () => {
  const { currentScreen, assetsReady, handleLoadingComplete, handleTitleFading, handleTitleComplete } = useAnimation();
  const [isLoading, setIsLoading] = useState(true);
  const [isInterfaceHidden, setIsInterfaceHidden] = useState(false);
  const [isInterfaceFadingOut, setIsInterfaceFadingOut] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoading) handleLoadingComplete();
  }, [isLoading]);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const showInterface = useCallback(() => {
    clearHideTimer();
    setIsInterfaceHidden(false);
    setIsInterfaceFadingOut(false);
  }, [clearHideTimer]);

  const hideInterface = useCallback(() => {
    if (isInterfaceHidden || isInterfaceFadingOut) return;

    setIsInterfaceFadingOut(true);
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      setIsInterfaceHidden(true);
      setIsInterfaceFadingOut(false);
      hideTimer.current = null;
    }, HIDE_INTERFACE_FADE_MS);
  }, [clearHideTimer, isInterfaceHidden, isInterfaceFadingOut]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  useEffect(() => {
    if (!isInterfaceHidden && !isInterfaceFadingOut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        showInterface();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInterfaceHidden, isInterfaceFadingOut, showInterface]);

  useEffect(() => {
    if (currentScreen !== 'scene') showInterface();
  }, [currentScreen, showInterface]);

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
            onClick={showInterface}
          />
        ) : (
          <div
            style={{
              opacity: isInterfaceFadingOut ? 0 : 1,
              pointerEvents: isInterfaceFadingOut ? 'none' : 'auto',
              transition: `opacity ${HIDE_INTERFACE_FADE_MS}ms ease-out`,
            }}
          >
            <TourControls
              style={{ animation: 'fadeIn 1s ease-out forwards' }}
              onHideInterface={hideInterface}
            />
            <ArtworkInfoModal />
            <ArtworkLightbox />
            <SubmitArtworkModal />
            <HamburgerMenu style={{ animation: 'fadeIn 1s ease-out forwards' }} />
          </div>
        )
      )}
    </>
  );
};

export default UIElements;
