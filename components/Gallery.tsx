'use client';

import React, { useEffect, useState } from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider, useTour } from '../contexts/TourContext';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';
import { ImageMetadata } from '../types/museum';
import { getInitialFrameIndex, saveVisitPosition } from '../utils/userPreferences';
import { ShelfProvider } from '../contexts/ShelfContext';
import { layoutRoom } from '../utils/roomLayout';

function VisitPositionPersistence({ roomId }: { roomId: string }) {
  const { currentFrameIndex, totalFrames } = useTour();

  React.useEffect(() => {
    if (currentFrameIndex >= totalFrames) return;
    saveVisitPosition(roomId, currentFrameIndex);
  }, [roomId, currentFrameIndex, totalFrames]);

  return null;
}

function GalleryContent({ liveArtworks }: { liveArtworks: Record<string, ImageMetadata[]> }) {
  const { rooms, activeRoomIndex } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  const roomLive = liveArtworks[activeRoom.id];
  // KV artworks replace static config for that room; fall back to static if KV has none
  const baseImages = roomLive && roomLive.length > 0 ? roomLive : activeRoom.images;
  const images = layoutRoom(baseImages);
  const initialFrameIndex = getInitialFrameIndex(activeRoom.id, images.length);

  return (
    <AnimationProvider>
      <TourProvider
        key={activeRoom.id}
        totalFrames={images.length}
        initialFrameIndex={initialFrameIndex}
        images={images}
      >
        <VisitPositionPersistence roomId={activeRoom.id} />
        <SwipeableContainer>
          <MuseumStage images={images} theme={activeRoom.theme} roomId={activeRoom.id} />
          <UIElements />
        </SwipeableContainer>
      </TourProvider>
    </AnimationProvider>
  );
}

export default function Gallery() {
  const [liveArtworks, setLiveArtworks] = useState<Record<string, ImageMetadata[]>>({});

  useEffect(() => {
    fetch('/api/artworks')
      .then(r => r.json())
      .then(data => setLiveArtworks(data))
      .catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <ShelfProvider>
        <RoomProvider>
          <GalleryContent liveArtworks={liveArtworks} />
        </RoomProvider>
      </ShelfProvider>
    </div>
  );
}
