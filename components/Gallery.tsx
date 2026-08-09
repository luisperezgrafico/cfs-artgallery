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
import { GuidedTourPreferenceProvider, GuidedTourEngineProvider } from '../contexts/GuidedTourContext';

function VisitPositionPersistence({ roomId }: { roomId: string }) {
  const { currentFrameIndex, totalFrames } = useTour();

  React.useEffect(() => {
    // -1 means "not on an artwork right now" (quit, or sitting at the bench) —
    // never persist that, or exiting the tour would erase the resume point.
    if (currentFrameIndex < 0 || currentFrameIndex >= totalFrames) return;
    saveVisitPosition(roomId, currentFrameIndex);
  }, [roomId, currentFrameIndex, totalFrames]);

  return null;
}

function GalleryContent() {
  const { rooms, activeRoomIndex, getRoomImages } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  const images = getRoomImages(activeRoom.id);
  const initialFrameIndex = getInitialFrameIndex(activeRoom.id, images.length);

  return (
    // Preferences live above the per-room remount boundary so "Next room" carries
    // auto-advance / narration over; the engine below is per-room on purpose.
    <GuidedTourPreferenceProvider>
      <AnimationProvider>
        <TourProvider
          key={activeRoom.id}
          totalFrames={images.length}
          initialFrameIndex={initialFrameIndex}
          images={images}
        >
          <GuidedTourEngineProvider>
            <VisitPositionPersistence roomId={activeRoom.id} />
            <SwipeableContainer>
              <MuseumStage images={images} theme={activeRoom.theme} roomId={activeRoom.id} />
              <UIElements />
            </SwipeableContainer>
          </GuidedTourEngineProvider>
        </TourProvider>
      </AnimationProvider>
    </GuidedTourPreferenceProvider>
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
        <RoomProvider liveArtworks={liveArtworks}>
          <GalleryContent />
        </RoomProvider>
      </ShelfProvider>
    </div>
  );
}
