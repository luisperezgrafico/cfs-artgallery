'use client';

import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { nextNavigableIndex, previousNavigableIndex } from '../../utils/roomLayout';

const WHEEL_NAVIGATION_THRESHOLD = 80;
const WHEEL_NAVIGATION_COOLDOWN_MS = 900;
const WHEEL_NAVIGATION_SAFETY_TIMEOUT_MS = 8000;

interface SwipeableContainerProps {
  children: React.ReactNode;
}

const SwipeableContainer: React.FC<SwipeableContainerProps> = ({ children }) => {
  const {
    isTourStarted,
    currentFrameIndex,
    images,
    nextFrame,
    previousFrame,
    quitTour,
  } = useTour();
  const { autoAdvance } = useGuidedTourPreferences();
  // True whenever any overlay/drawer owns touch gestures.
  const anyModalOpen = useRef(false);
  const wheelDelta = useRef(0);
  const wheelNavigationLocked = useRef(false);
  const wheelTargetIndex = useRef<number | null>(null);
  const wheelCooldownTimeout = useRef<number | null>(null);
  const wheelSafetyTimeout = useRef<number | null>(null);

  const releaseWheelNavigation = () => {
    wheelNavigationLocked.current = false;
    wheelTargetIndex.current = null;
    wheelDelta.current = 0;
    if (wheelCooldownTimeout.current !== null) {
      window.clearTimeout(wheelCooldownTimeout.current);
      wheelCooldownTimeout.current = null;
    }
    if (wheelSafetyTimeout.current !== null) {
      window.clearTimeout(wheelSafetyTimeout.current);
      wheelSafetyTimeout.current = null;
    }
  };

  useEffect(() => {
    const open  = () => { anyModalOpen.current = true;  };
    const close = () => { anyModalOpen.current = false; };
    const OPEN_EVENTS  = ['open-artwork-lightbox',  'open-artwork-info',  'open-submit-artwork',  'open-hamburger-menu'];
    const CLOSE_EVENTS = ['close-artwork-lightbox', 'close-artwork-info', 'close-submit-artwork', 'close-hamburger-menu'];
    OPEN_EVENTS.forEach(e  => window.addEventListener(e, open));
    CLOSE_EVENTS.forEach(e => window.addEventListener(e, close));
    return () => {
      OPEN_EVENTS.forEach(e  => window.removeEventListener(e, open));
      CLOSE_EVENTS.forEach(e => window.removeEventListener(e, close));
    };
  }, []);

  // Camera arrival releases the lock immediately. A short cooldown below also
  // permits a measured follow-up gesture before a long camera glide has fully
  // settled, without turning a continuous wheel spin into many skipped works.
  useEffect(() => {
    const handleCameraArrival = (event: Event) => {
      const frameIndex = (event as CustomEvent<{ frameIndex?: number }>).detail?.frameIndex;
      if (wheelNavigationLocked.current && frameIndex === wheelTargetIndex.current) {
        releaseWheelNavigation();
      }
    };

    window.addEventListener('tour-camera-arrived', handleCameraArrival);
    return () => {
      window.removeEventListener('tour-camera-arrived', handleCameraArrival);
      if (wheelCooldownTimeout.current !== null) window.clearTimeout(wheelCooldownTimeout.current);
      if (wheelSafetyTimeout.current !== null) window.clearTimeout(wheelSafetyTimeout.current);
    };
  }, []);

  useEffect(() => {
    // Reaching the rest view ends the tour, so there is no frame-arrival
    // event to wait for. Clear this small transient lock immediately.
    if (!isTourStarted) releaseWheelNavigation();
  }, [isTourStarted]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (pointer: fine)');

    const handleWheel = (event: WheelEvent) => {
      if (!media.matches || !isTourStarted || anyModalOpen.current || event.ctrlKey) return;

      // The stage itself does not scroll. Preventing the page's rubber-band
      // scroll makes a wheel gesture feel like the same deliberate rail move
      // as the arrow buttons.
      event.preventDefault();
      if (wheelNavigationLocked.current) return;

      const delta = event.deltaY * (
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1
      );
      wheelDelta.current += delta;
      if (Math.abs(wheelDelta.current) < WHEEL_NAVIGATION_THRESHOLD) return;

      const goForward = wheelDelta.current > 0;
      wheelDelta.current = 0;
      const includeEmpty = !autoAdvance;
      const targetIndex = goForward
        ? nextNavigableIndex(images, currentFrameIndex, includeEmpty)
        : previousNavigableIndex(images, currentFrameIndex, includeEmpty);

      // The previous arrow is deliberately inert at the first frame. Don't
      // create a lock when there is nowhere for the camera to travel.
      if (!goForward && targetIndex === -1) return;

      wheelNavigationLocked.current = true;
      wheelTargetIndex.current = targetIndex === -1 ? null : targetIndex;
      wheelCooldownTimeout.current = window.setTimeout(
        releaseWheelNavigation,
        WHEEL_NAVIGATION_COOLDOWN_MS,
      );
      wheelSafetyTimeout.current = window.setTimeout(
        releaseWheelNavigation,
        WHEEL_NAVIGATION_SAFETY_TIMEOUT_MS,
      );

      if (goForward) nextFrame(includeEmpty);
      else previousFrame(includeEmpty);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [autoAdvance, currentFrameIndex, images, isTourStarted, nextFrame, previousFrame]);

  // Swiping follows the same policy as the arrows: Auto skips blank submit
  // canvases, while Manual stops at each one so it remains reachable.
  const swipeHandlers = useSwipeable({
    onSwipedLeft:  isTourStarted ? () => { if (!anyModalOpen.current) nextFrame(!autoAdvance);     } : undefined,
    onSwipedRight: isTourStarted ? () => { if (!anyModalOpen.current) previousFrame(!autoAdvance); } : undefined,
    onSwipedDown:  isTourStarted ? () => { if (!anyModalOpen.current) quitTour();      } : undefined,
    preventScrollOnSwipe: false,
    // Keep ordinary clicks available for opening an artwork or its plaque,
    // while a deliberate click-and-drag on desktop follows touch swiping.
    trackMouse: true,
    delta: 10,
    swipeDuration: 500,
  });

  return (
    <div {...swipeHandlers} className="absolute inset-0 w-full h-full z-10">
      {children}
    </div>
  );
};

export default SwipeableContainer;
