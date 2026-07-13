'use client';

import React from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider } from '../contexts/TourContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';
import { drawingImages } from '../config/imagesConfig';

export default function Gallery() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <AnimationProvider>
        <TourProvider totalFrames={drawingImages.length}>
          <SwipeableContainer>
            <MuseumStage images={drawingImages} />
            <UIElements />
          </SwipeableContainer>
        </TourProvider>
      </AnimationProvider>
    </div>
  );
}
