'use client';

import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useTour } from '../../contexts/TourContext';

interface SwipeableContainerProps {
  children: React.ReactNode;
}

const SwipeableContainer: React.FC<SwipeableContainerProps> = ({ children }) => {
  const { isTourStarted, nextFrame, previousFrame, quitTour } = useTour();
  // True whenever any overlay (lightbox, info modal, submit modal) is open
  const anyModalOpen = useRef(false);

  useEffect(() => {
    const open  = () => { anyModalOpen.current = true;  };
    const close = () => { anyModalOpen.current = false; };
    const OPEN_EVENTS  = ['open-artwork-lightbox',  'open-artwork-info',  'open-submit-artwork'];
    const CLOSE_EVENTS = ['close-artwork-lightbox', 'close-artwork-info', 'close-submit-artwork'];
    OPEN_EVENTS.forEach(e  => window.addEventListener(e, open));
    CLOSE_EVENTS.forEach(e => window.addEventListener(e, close));
    return () => {
      OPEN_EVENTS.forEach(e  => window.removeEventListener(e, open));
      CLOSE_EVENTS.forEach(e => window.removeEventListener(e, close));
    };
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft:  isTourStarted ? () => { if (!anyModalOpen.current) nextFrame();     } : undefined,
    onSwipedRight: isTourStarted ? () => { if (!anyModalOpen.current) previousFrame(); } : undefined,
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
