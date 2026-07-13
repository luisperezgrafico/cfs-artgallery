'use client';

import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { useTour } from '../../contexts/TourContext';

interface SwipeableContainerProps {
  children: React.ReactNode;
}

const SwipeableContainer: React.FC<SwipeableContainerProps> = ({ children }) => {
  const { isTourStarted, nextFrame, previousFrame, quitTour } = useTour();

  const swipeHandlers = useSwipeable({
    onSwipedLeft:  isTourStarted ? nextFrame     : undefined,
    onSwipedRight: isTourStarted ? previousFrame : undefined,
    onSwipedDown:  isTourStarted ? quitTour      : undefined,
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
