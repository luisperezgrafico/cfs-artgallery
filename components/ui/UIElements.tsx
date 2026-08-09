'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useDetectGPU } from '@react-three/drei';
import { useSwipeable, SwipeEventData } from 'react-swipeable';
import { useAnimation } from '../../contexts/AnimationContext';
import { useTour } from '../../contexts/TourContext';
import { useRoom } from '../../contexts/RoomContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { estimateRoomSeconds, formatEstimate } from '../../utils/tourEstimate';
import LoadingScreen from './LoadingScreen';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import NowPlayingStrip from './NowPlayingStrip';
import ArtworkInfoModal from './ArtworkInfoModal';
import ArtworkLightbox from './ArtworkLightbox';
import SubmitArtworkModal from './SubmitArtworkModal';
import HamburgerMenu from './HamburgerMenu';

const HIDE_INTERFACE_FADE_MS = 520;

function HiddenInterfaceLayer({ onShow }: { onShow: () => void }) {
  const {
    isTourStarted,
    currentFrameIndex,
    setCurrentFrameIndex,
    totalFrames,
    startTour,
    nextFrame,
    previousFrame,
    quitTour,
  } = useTour();
  const swipedRecently = useRef(false);
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFrameIndex = useRef<number | null>(null);

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

  useEffect(() => {
    if (currentFrameIndex >= 0 && currentFrameIndex < totalFrames) {
      lastFrameIndex.current = currentFrameIndex;
    }
  }, [currentFrameIndex, totalFrames]);

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
    onSwipedUp: !isTourStarted && lastFrameIndex.current !== null
      ? (eventData) => {
          const targetFrameIndex = lastFrameIndex.current;
          markSwipe(eventData);
          if (targetFrameIndex === null || targetFrameIndex >= totalFrames) return;
          startTour();
          setCurrentFrameIndex(targetFrameIndex);
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

function RestControls({ style }: { style?: React.CSSProperties }) {
  const { isMobile } = useDetectGPU();
  const { quitTour } = useTour();
  const { rooms, activeRoomIndex, setActiveRoomIndex, getRoomImages } = useRoom();
  const { narrationEnabled, dwellSeconds, requestAutoStart } = useGuidedTourPreferences();

  const nextRoom = rooms[activeRoomIndex + 1];
  const nextRoomEstimate = nextRoom
    ? formatEstimate(estimateRoomSeconds(getRoomImages(nextRoom.id), { narrated: narrationEnabled, dwellSeconds }))
    : null;

  const goToNextRoom = () => {
    if (!nextRoom) return;
    // The new room mounts idle, showing its own overview first (same as any
    // fresh visit); requestAutoStart tells its engine to pick the tour back
    // up on its own shortly after, since the mode already carries over.
    requestAutoStart();
    setActiveRoomIndex(activeRoomIndex + 1);
  };

  return (
    <div style={style}>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-3"
        style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
      >
        <div className="text-white/60 text-xs">
          {isMobile ? 'Drag your finger to look around' : 'Drag with the mouse to look around'}
        </div>
        <div className="flex gap-3">
          {nextRoom && (
            <button
              onClick={goToNextRoom}
              className="h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-5 text-white flex items-center gap-2 shadow-lg transition-colors"
            >
              <span className="text-sm font-medium">Next room</span>
              {nextRoomEstimate && <span className="text-xs text-white/70">— {nextRoomEstimate}</span>}
              <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={quitTour}
            aria-label="Exit rest view"
            className="h-11 rounded-full bg-black/40 hover:bg-black/55 backdrop-blur-md px-4 text-white flex items-center gap-2 shadow-lg transition-colors"
          >
            <X size={17} />
            <span className="text-sm font-medium">Exit rest</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const UIElements: React.FC = () => {
  const { isResting } = useTour();
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
        <>
          {/* Outside the hidden-interface branch on purpose — a content note
              is information, not a control, so it survives "hide interface". */}
          <NowPlayingStrip
            style={{ animation: 'fadeIn 1s ease-out forwards' }}
            showNarrationControl={!isInterfaceHidden && !isInterfaceFadingOut}
          />
          {isInterfaceHidden ? (
            <HiddenInterfaceLayer onShow={showInterface} />
          ) : (
            <div
              style={{
                opacity: isInterfaceFadingOut ? 0 : 1,
                pointerEvents: isInterfaceFadingOut ? 'none' : 'auto',
                transition: `opacity ${HIDE_INTERFACE_FADE_MS}ms ease-out`,
              }}
            >
              {isResting ? (
                <RestControls style={{ animation: 'fadeIn 1s ease-out forwards' }} />
              ) : (
                <>
                  <TourControls
                    style={{ animation: 'fadeIn 1s ease-out forwards' }}
                    onHideInterface={hideInterface}
                  />
                  <ArtworkInfoModal />
                  <ArtworkLightbox />
                  <SubmitArtworkModal />
                  <HamburgerMenu style={{ animation: 'fadeIn 1s ease-out forwards' }} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default UIElements;
