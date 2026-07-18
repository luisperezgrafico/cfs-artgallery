'use client';

import React from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider } from '../contexts/TourContext';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';

function GalleryContent() {
  const { rooms, activeRoomIndex } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  return (
    <AnimationProvider>
      <TourProvider totalFrames={activeRoom.images.length}>
        <SwipeableContainer>
          <MuseumStage images={activeRoom.images} />
          <UIElements />
        </SwipeableContainer>
      </TourProvider>
    </AnimationProvider>
  );
}

export default function Gallery() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <RoomProvider>
        <GalleryContent />
      </RoomProvider>
    </div>
  );
}
