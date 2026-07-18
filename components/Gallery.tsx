'use client';

import React from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider } from '../contexts/TourContext';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';
import { ImageMetadata } from '../types/museum';

const ROOM_CAPACITY = 8;
const EMPTY_SLOT: ImageMetadata = {
  url: '', title: '', artist: '', date: '', link: '', description: '',
  aspectRatio: 3 / 4,  // portrait canvas — matches tendency of submitted artworks
  isEmpty: true,
};

// Pad any room to exactly ROOM_CAPACITY slots so empty rooms show submit canvases
function padImages(images: ImageMetadata[]): ImageMetadata[] {
  if (images.length >= ROOM_CAPACITY) return images;
  return [...images, ...Array(ROOM_CAPACITY - images.length).fill(EMPTY_SLOT)];
}

function GalleryContent() {
  const { rooms, activeRoomIndex } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  const images = padImages(activeRoom.images);
  return (
    <AnimationProvider>
      <TourProvider totalFrames={images.length}>
        <SwipeableContainer>
          <MuseumStage images={images} />
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
