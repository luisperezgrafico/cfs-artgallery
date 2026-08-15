'use client';

import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';

interface SwipeableContainerProps {
  children: React.ReactNode;
}

const SwipeableContainer: React.FC<SwipeableContainerProps> = ({ children }) => {
  const { isTourStarted, nextFrame, previousFrame, quitTour } = useTour();
  const { autoAdvance } = useGuidedTourPreferences();
  // True whenever any overlay/drawer owns touch gestures.
  const anyModalOpen = useRef(false);

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

  // Swiping follows the same policy as the arrows: Auto skips blank submit
  // canvases, while Manual stops at each one so it remains reachable.
  const swipeHandlers = useSwipeable({
    onSwipedLeft:  isTourStarted ? () => { if (!anyModalOpen.current) nextFrame(!autoAdvance);     } : undefined,
    onSwipedRight: isTourStarted ? () => { if (!anyModalOpen.current) previousFrame(!autoAdvance); } : undefined,
    onSwipedDown:  isTourStarted ? () => { if (!anyModalOpen.current) quitTour();      } : undefined,
    preventScrollOnSwipe: false,
    trackMouse: false,
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
