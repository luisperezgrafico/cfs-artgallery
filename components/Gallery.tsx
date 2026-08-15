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
import { ShelfProvider, useShelf } from '../contexts/ShelfContext';
import { GuidedTourPreferenceProvider, GuidedTourEngineProvider } from '../contexts/GuidedTourContext';
import { AmbientMusicProvider } from '../contexts/AmbientMusicContext';

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

function ShelfCatalogSync({ enabled }: { enabled: boolean }) {
  const { rooms, getRoomImages } = useRoom();
  const { sync } = useShelf();

  useEffect(() => {
    if (!enabled) return;
    sync(rooms.map(room => ({ roomId: room.id, images: getRoomImages(room.id) })));
  }, [enabled, getRoomImages, rooms, sync]);

  return null;
}

function GalleryContent({ catalogReady }: { catalogReady: boolean }) {
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
            <ShelfCatalogSync enabled={catalogReady} />
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
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    fetch('/api/artworks')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load artworks.');
        return r.json();
      })
      .then(data => {
        setLiveArtworks(data);
        setCatalogReady(true);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <RoomProvider liveArtworks={liveArtworks}>
        <ShelfProvider>
          <AmbientMusicProvider>
            <GalleryContent catalogReady={catalogReady} />
          </AmbientMusicProvider>
        </ShelfProvider>
      </RoomProvider>
    </div>
  );
}
