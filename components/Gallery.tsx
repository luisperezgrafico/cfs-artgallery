'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider, useTour } from '../contexts/TourContext';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';
import { ImageMetadata } from '../types/museum';
import { getInitialFrameIndex, saveVisitPosition } from '../utils/userPreferences';
import { GalleryLink, resolveLinkDestination } from '../utils/galleryLink';
import { ShelfProvider, useShelf } from '../contexts/ShelfContext';
import { GuidedTourPreferenceProvider, GuidedTourEngineProvider } from '../contexts/GuidedTourContext';
import { AmbientMusicProvider } from '../contexts/AmbientMusicContext';

function VisitPositionPersistence({ roomId }: { roomId: string }) {
  const { currentFrameIndex, totalFrames } = useTour();
  const { linkPlacedFrame, clearLinkPlacement } = useRoom();

  React.useEffect(() => {
    // -1 means "not on an artwork right now" (quit, or sitting at the bench) —
    // never persist that, or exiting the tour would erase the resume point.
    if (currentFrameIndex < 0 || currentFrameIndex >= totalFrames) return;
    // The frame a shared link placed the visitor on is the sender's choice, not
    // the visitor's visit: their saved position predates the link and must
    // survive it. Compared by value, so the effect running twice (React strict
    // mode) cannot slip a save through between the two runs.
    if (linkPlacedFrame?.roomId === roomId) {
      if (linkPlacedFrame.frameIndex === currentFrameIndex) return;
      // They moved on by themselves: from here the position is theirs again.
      clearLinkPlacement();
    }
    saveVisitPosition(roomId, currentFrameIndex);
  }, [roomId, currentFrameIndex, totalFrames, linkPlacedFrame, clearLinkPlacement]);

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

function ConsumePendingTourTarget({ roomId }: { roomId: string }) {
  const { pendingTourTarget, consumePendingTourTarget } = useRoom();

  useEffect(() => {
    if (pendingTourTarget?.roomId === roomId) consumePendingTourTarget(roomId);
  }, [roomId, pendingTourTarget, consumePendingTourTarget]);

  return null;
}

/**
 * Applies a shared link whose `?art=` id could only be resolved once the
 * submission-merged catalogue was in (a room's live artworks replace its
 * configured ones, so an id cannot be trusted against the config alone).
 * One shot, and it yields to the visitor: if they have already taken over the
 * tour while the catalogue was loading, the link is dropped rather than yanking
 * them somewhere they did not ask to go.
 */
function SharedLinkResolver({ roomId, catalogReady }: { roomId: string; catalogReady: boolean }) {
  const {
    rooms,
    getRoomImages,
    sharedLink,
    clearSharedLink,
    markArrivedViaLink,
    openArtworkInRoom,
    setActiveRoomIndex,
    registerLinkPlacement,
  } = useRoom();
  const { startTour, currentFrameIndex } = useTour();
  const applied = useRef(false);
  // The frame this room opened on. A link that resolves late may only move the
  // visitor if they have not moved since: an index they reached themselves is
  // theirs, not ours to overrule.
  const entryFrame = useRef<number | null>(null);

  useEffect(() => {
    if (entryFrame.current === null) entryFrame.current = currentFrameIndex;
    if (!sharedLink || applied.current) return;
    if (!catalogReady) return;
    applied.current = true;

    const destination = resolveLinkDestination(
      rooms.map(room => ({ id: room.id, images: getRoomImages(room.id) })),
      sharedLink,
    );
    clearSharedLink();

    // The artwork is no longer published (removed, or an id that was never
    // ours): degrade quietly, in overview, with nothing broken on screen.
    if (!destination) return;
    if (currentFrameIndex !== entryFrame.current) return;

    markArrivedViaLink();

    if (destination.kind === 'artwork') {
      // Tell the persistence this frame is the link's doing, not the visitor's:
      // their saved position must survive opening someone's link.
      registerLinkPlacement(destination.roomId, destination.frameIndex);
    }

    if (destination.roomId !== roomId) {
      if (destination.kind === 'artwork') {
        openArtworkInRoom(destination.roomIndex, destination.frameIndex);
      } else {
        setActiveRoomIndex(destination.roomIndex);
      }
      return;
    }

    if (destination.kind === 'artwork') startTour(destination.frameIndex);
  }, [
    catalogReady,
    clearSharedLink,
    currentFrameIndex,
    getRoomImages,
    markArrivedViaLink,
    openArtworkInRoom,
    registerLinkPlacement,
    roomId,
    rooms,
    setActiveRoomIndex,
    sharedLink,
    startTour,
  ]);

  return null;
}

function GalleryContent({ catalogReady }: { catalogReady: boolean }) {
  const { rooms, activeRoomIndex, getRoomImages, pendingTourTarget, arrivedViaLink } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  const images = getRoomImages(activeRoom.id);
  // A link decides where this visit opens; it never resumes a half-remembered
  // frame. `?frame=` lands on its artwork through pendingTourTarget, a link to a
  // room opens that room's overview, and `?art=` is placed by SharedLinkResolver.
  const initialFrameIndex = pendingTourTarget?.roomId === activeRoom.id
    ? pendingTourTarget.frameIndex
    : arrivedViaLink
      ? -1
      : getInitialFrameIndex(activeRoom.id, images.length);

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
            <ConsumePendingTourTarget roomId={activeRoom.id} />
            <SharedLinkResolver roomId={activeRoom.id} catalogReady={catalogReady} />
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

export default function Gallery({ link = null }: { link?: GalleryLink | null }) {
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
      // A link waiting on an `?art=` id must not hang on a failed fetch: the
      // catalogue we have (the configured artworks) is all we can resolve against.
      .catch(() => setCatalogReady(true));
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <RoomProvider liveArtworks={liveArtworks} link={link}>
        <ShelfProvider>
          <AmbientMusicProvider>
            <GalleryContent catalogReady={catalogReady} />
          </AmbientMusicProvider>
        </ShelfProvider>
      </RoomProvider>
    </div>
  );
}
