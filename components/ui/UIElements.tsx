'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useSwipeable, SwipeEventData } from 'react-swipeable';
import { useAnimation } from '../../contexts/AnimationContext';
import { useTour } from '../../contexts/TourContext';
import { useRoom } from '../../contexts/RoomContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { estimateRoomSeconds, formatEstimate } from '../../utils/tourEstimate';
import LoadingScreen from './LoadingScreen';
import LoadingDiagnostics from './LoadingDiagnostics';
import TitleScreen from './TitleOverlay';
import TourControls from './TourControls';
import NowPlayingStrip from './NowPlayingStrip';
import ArtworkInfoModal from './ArtworkInfoModal';
import ArtworkLightbox from './ArtworkLightbox';
import SubmitArtworkModal from './SubmitArtworkModal';
import HamburgerMenu from './HamburgerMenu';

const HIDE_INTERFACE_FADE_MS = 520;
const TOUR_CONTROLS_EXIT_MS = 350;

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
  const { quitTour } = useTour();
  const { rooms, activeRoomIndex, setActiveRoomIndex, getRoomImages } = useRoom();
  const { narrationEnabled, dwellSeconds } = useGuidedTourPreferences();

  const nextRoom = rooms[activeRoomIndex + 1];
  const nextRoomEstimate = nextRoom
    ? formatEstimate(estimateRoomSeconds(getRoomImages(nextRoom.id), { narrated: narrationEnabled, dwellSeconds }))
    : null;

  const goToNextRoom = () => {
    if (!nextRoom) return;
    // Changing rooms is a natural pause. The next room opens at its overview
    // and waits for the visitor to choose Start the Tour again.
    setActiveRoomIndex(activeRoomIndex + 1);
  };

  return (
    <div style={style}>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-3"
        style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
      >
        <div className="text-[var(--floating-muted)] text-xs">
          <span className="lg:hidden">Drag your finger to look around</span>
          <span className="hidden lg:inline">Drag with the mouse to look around</span>
        </div>
        <div className="flex gap-3">
          {nextRoom && (
            <button
              onClick={goToNextRoom}
              className="h-11 rounded-full bg-[var(--floating-control)] hover:bg-[var(--floating-control-hover)] backdrop-blur-md px-5 text-[var(--floating-text)] flex items-center gap-2 shadow-lg transition-colors"
            >
              <span className="text-sm font-medium">Next room</span>
              {nextRoomEstimate && <span className="text-xs text-[var(--floating-muted)]">— {nextRoomEstimate}</span>}
              <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={quitTour}
            aria-label="Exit rest view"
            className="h-11 rounded-full bg-[var(--floating-surface)] hover:bg-[var(--floating-surface-strong)] backdrop-blur-md px-4 text-[var(--floating-text)] flex items-center gap-2 shadow-lg transition-colors"
          >
            <X size={17} />
            <span className="text-sm font-medium">Exit rest</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RestingViewNotice() {
  const [isShown, setIsShown] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setIsShown(true), 700);
    const fadeTimer = window.setTimeout(() => setIsShown(false), 2800);
    const hideTimer = window.setTimeout(() => setIsVisible(false), 4350);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        Resting view. You can look around, continue to the next room, or exit rest.
      </p>
      {isVisible && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed bottom-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-center transition-opacity duration-[1800ms] ease-out ${
            isShown ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ bottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
        >
          <p
            className="text-3xl md:text-4xl"
            style={{ color: 'var(--floating-text)', fontFamily: "Georgia, 'Times New Roman', serif", textShadow: '0 2px 8px rgba(0, 0, 0, 0.45)' }}
          >
            Resting view
          </p>
        </div>
      )}
    </>
  );
}

const UIElements: React.FC = () => {
  // Rest-view controls wait for isSeated (the camera has actually arrived),
  // not just isResting (the visitor tapped a bench) — otherwise "Next room" /
  // "Exit rest" flash in while the camera is still gliding toward the bench.
  const { isResting, isSeated } = useTour();
  const { currentScreen, assetsReady, handleLoadingComplete, handleTitleFading, handleTitleComplete } = useAnimation();
  const [isLoading, setIsLoading] = useState(true);
  const [isInterfaceHidden, setIsInterfaceHidden] = useState(false);
  const [isInterfaceFadingOut, setIsInterfaceFadingOut] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // TourControls used to unmount the instant isResting flipped true — before
  // the bench arrival animation even started — vanishing abruptly instead of
  // fading. Keep it mounted (invisible, non-interactive) for one fade-out
  // before actually removing it.
  const [showTourGroup, setShowTourGroup] = useState(!isResting);
  const tourGroupExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isResting) {
      if (tourGroupExitTimer.current) {
        clearTimeout(tourGroupExitTimer.current);
        tourGroupExitTimer.current = null;
      }
      setShowTourGroup(true);
      return;
    }

    tourGroupExitTimer.current = setTimeout(() => {
      setShowTourGroup(false);
      tourGroupExitTimer.current = null;
    }, TOUR_CONTROLS_EXIT_MS);

    return () => {
      if (tourGroupExitTimer.current) {
        clearTimeout(tourGroupExitTimer.current);
        tourGroupExitTimer.current = null;
      }
    };
  }, [isResting]);

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

  // Rest view asks the visitor to choose what happens next, so its controls
  // must not remain hidden just because the previous tour UI was concealed.
  // Waiting for isSeated avoids bringing the whole interface back during the
  // glide toward the bench.
  useEffect(() => {
    if (isResting && isSeated) showInterface();
  }, [isResting, isSeated, showInterface]);

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
      <LoadingDiagnostics />
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
          {isResting && <RestingViewNotice />}
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
              {isResting && isSeated && (
                <RestControls style={{ animation: 'fadeIn 1s ease-out forwards' }} />
              )}
              {showTourGroup && (
                <div
                  style={{
                    opacity: isResting ? 0 : 1,
                    pointerEvents: isResting ? 'none' : 'auto',
                    transition: `opacity ${TOUR_CONTROLS_EXIT_MS}ms ease-out`,
                  }}
                >
                  <TourControls
                    style={{ animation: 'fadeIn 1s ease-out forwards' }}
                    onHideInterface={hideInterface}
                  />
                  <ArtworkInfoModal />
                  <ArtworkLightbox />
                  <SubmitArtworkModal />
                </div>
              )}
              <HamburgerMenu style={{ animation: 'fadeIn 1s ease-out forwards' }} />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default UIElements;
