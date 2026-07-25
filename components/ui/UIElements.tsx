'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSwipeable, SwipeEventData } from 'react-swipeable';
import { useAnimation } from '../../contexts/AnimationContext';
import { useTour } from '../../contexts/TourContext';
import LoadingScreen from './LoadingScreen';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import ArtworkInfoModal from './ArtworkInfoModal';
import ArtworkLightbox from './ArtworkLightbox';
import SubmitArtworkModal from './SubmitArtworkModal';
import HamburgerMenu from './HamburgerMenu';

const HIDE_INTERFACE_FADE_MS = 520;

function HiddenInterfaceLayer({ onShow }: { onShow: () => void }) {
  const { isTourStarted, nextFrame, previousFrame, quitTour } = useTour();
  const swipedRecently = useRef(false);
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSwipe = useCallback((eventData: SwipeEventData) => {
    eventData.event.stopPropagation();
    swipedRecently.current = true;
    if (swipeTimer.current) clearTimeout(swipeTimer.current);
    swipeTimer.current = setTimeout(() => {
      swipedRecently.current = false;
      swipeTimer.current = null;
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (swipeTimer.current) clearTimeout(swipeTimer.current);
    };
  }, []);

  const swipeHandlers = useSwipeable({
    onTouchStartOrOnMouseDown: ({ event }) => event.stopPropagation(),
    onTouchEndOrOnMouseUp: ({ event }) => event.stopPropagation(),
    onSwipeStart: ({ event }) => event.stopPropagation(),
    onSwiping: ({ event }) => event.stopPropagation(),
    onSwipedLeft: isTourStarted
      ? (eventData) => {
          markSwipe(eventData);
          nextFrame();
        }
      : undefined,
    onSwipedRight: isTourStarted
      ? (eventData) => {
          markSwipe(eventData);
          previousFrame();
        }
      : undefined,
    onSwipedDown: isTourStarted
      ? (eventData) => {
          markSwipe(eventData);
          quitTour();
        }
      : undefined,
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 10,
    swipeDuration: 500,
  });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (swipedRecently.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onShow();
  };

  return (
    <button
      {...swipeHandlers}
      type="button"
      aria-label="Show interface"
      title="Show interface"
      className="fixed inset-0 z-30 cursor-default bg-transparent"
      style={{ touchAction: 'none' }}
      onClick={handleClick}
    />
  );
}

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
          <HiddenInterfaceLayer onShow={showInterface} />
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
