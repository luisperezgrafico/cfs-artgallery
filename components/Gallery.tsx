'use client';

import React from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider, useTour } from '../contexts/TourContext';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';
import { ImageMetadata } from '../types/museum';
import { getInitialFrameIndex, saveVisitPosition } from '../utils/userPreferences';

const ROOM_CAPACITY = 8;
const EMPTY_SLOT: ImageMetadata = {
  url: '', title: '', artist: '', date: '', link: '', description: '',
  aspectRatio: 1,  // square — consistent default until a real artwork fills the slot
  isEmpty: true,
};

// Pad any room to exactly ROOM_CAPACITY slots so empty rooms show submit canvases
function padImages(images: ImageMetadata[]): ImageMetadata[] {
  if (images.length >= ROOM_CAPACITY) return images;
  return [...images, ...Array(ROOM_CAPACITY - images.length).fill(EMPTY_SLOT)];
}

function VisitPositionPersistence({ roomId }: { roomId: string }) {
  const { currentFrameIndex, totalFrames } = useTour();

  React.useEffect(() => {
    if (currentFrameIndex >= totalFrames) return;
    saveVisitPosition(roomId, currentFrameIndex);
  }, [roomId, currentFrameIndex, totalFrames]);

  return null;
}

function GalleryContent() {
  const { rooms, activeRoomIndex } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  const images = padImages(activeRoom.images);
  const initialFrameIndex = getInitialFrameIndex(activeRoom.id, images.length);

  return (
    <AnimationProvider>
      <TourProvider
        key={activeRoom.id}
        totalFrames={images.length}
        initialFrameIndex={initialFrameIndex}
      >
        <VisitPositionPersistence roomId={activeRoom.id} />
        <SwipeableContainer>
          <MuseumStage images={images} theme={activeRoom.theme} />
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
