'use client';

import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useTour } from '../../contexts/TourContext';

interface SwipeableContainerProps {
  children: React.ReactNode;
}

const SwipeableContainer: React.FC<SwipeableContainerProps> = ({ children }) => {
  const { isTourStarted, nextFrame, previousFrame, quitTour } = useTour();
  const lightboxOpen = useRef(false);

  useEffect(() => {
    const open = () => { lightboxOpen.current = true; };
    const close = () => { lightboxOpen.current = false; };
    window.addEventListener('open-artwork-lightbox', open);
    window.addEventListener('close-artwork-lightbox', close);
    return () => {
      window.removeEventListener('open-artwork-lightbox', open);
      window.removeEventListener('close-artwork-lightbox', close);
    };
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft:  isTourStarted ? () => { if (!lightboxOpen.current) nextFrame();     } : undefined,
    onSwipedRight: isTourStarted ? () => { if (!lightboxOpen.current) previousFrame(); } : undefined,
    onSwipedDown:  isTourStarted ? () => { if (!lightboxOpen.current) quitTour();      } : undefined,
    preventScrollOnSwipe: true,
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
