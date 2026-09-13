'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimationProvider } from '../contexts/AnimationContext';
import { TourProvider, useTour } from '../contexts/TourContext';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import SwipeableContainer from './ui/SwipeableContainer';
import MuseumStage from './MuseumStage';
import UIElements from './ui/UIElements';
import { ImageMetadata } from '../types/museum';
import { saveVisitPosition } from '../utils/userPreferences';
import { GalleryLink, entryFrameIndex, isEntryLanding, resolveLinkDestination } from '../utils/galleryLink';
import { ShelfProvider, useShelf } from '../contexts/ShelfContext';
import { GuidedTourPreferenceProvider, GuidedTourEngineProvider } from '../contexts/GuidedTourContext';
import { AmbientMusicProvider } from '../contexts/AmbientMusicContext';

function VisitPositionPersistence({ roomId }: { roomId: string }) {
  const { currentFrameIndex, totalFrames } = useTour();
  const { entryLanding, clearEntryLanding } = useRoom();

  React.useEffect(() => {
    // -1 means "not on an artwork right now" (quit, or sitting at the bench) —
    // never persist that, or exiting the tour would erase the resume point.
    if (currentFrameIndex < 0 || currentFrameIndex >= totalFrames) return;
    // A frame a shared link placed the visitor on is the sender's choice, not
    // the visitor's visit: their saved position predates the link and must
    // survive it. (A landing without a frame — a room link, and every plain
    // visit — never claims a frame here.) Compared by value, so the effect
    // running twice (React strict mode) cannot slip a save through between the
    // two runs.
    if (entryLanding?.roomId === roomId && entryLanding.frameIndex !== null) {
      if (entryLanding.frameIndex === currentFrameIndex) return;
      // They moved on by themselves: from here the position is theirs again.
      clearEntryLanding();
    }
    saveVisitPosition(roomId, currentFrameIndex);
  }, [roomId, currentFrameIndex, totalFrames, entryLanding, clearEntryLanding]);

  return null;
}

/**
 * The offer to return to where the visitor was belongs to the moment of
 * landing. The instant they navigate for themselves — another artwork, starting
 * the tour, another room — they have decided where they want to be, and the
 * offer is over for the session. It also has to end *there*: before this, the
 * offer outlived the whole visit, and every room change remounted the chip and
 * re-read the (by then overwritten) saved position, so returning once produced
 * a fresh offer pointing back — an endless ping-pong between two rooms.
 *
 * Open on this visit's landing (wherever it opened: a link's destination, or
 * the restored room's overview on a plain visit) is not navigation: compared by
 * value with `isEntryLanding`, exactly as the visit-position persistence does
 * it.
 */
function VisitorNavigationWatch({ roomId }: { roomId: string }) {
  const { entryLanding, visitReturn, markVisitorNavigated } = useRoom();
  const { currentFrameIndex } = useTour();

  useEffect(() => {
    if (visitReturn.navigated) return;
    if (isEntryLanding(entryLanding, roomId, currentFrameIndex)) return;
    markVisitorNavigated();
  }, [currentFrameIndex, entryLanding, markVisitorNavigated, roomId, visitReturn.navigated]);

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
    openArtworkInRoom,
    setActiveRoomIndex,
    registerEntryLanding,
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

    // Tell the persistence (and the offer) where this link landed: the sender's
    // choice, not the visitor's. A room-only landing carries no frame — the
    // point is that arriving there is not the visitor navigating.
    registerEntryLanding(
      destination.roomId,
      destination.kind === 'artwork' ? destination.frameIndex : null,
    );

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
    openArtworkInRoom,
    registerEntryLanding,
    roomId,
    rooms,
    setActiveRoomIndex,
    sharedLink,
    startTour,
  ]);

  return null;
}

function GalleryContent({ catalogReady }: { catalogReady: boolean }) {
  const { rooms, activeRoomIndex, getRoomImages, pendingTourTarget } = useRoom();
  const activeRoom = rooms[activeRoomIndex];
  const images = getRoomImages(activeRoom.id);
  // A visit always opens on the room overview. The room is still the one the
  // visitor left (getInitialRoomIndex, in RoomContext); it is only the artwork
  // that no longer places the camera. Landing inside a frame decides for the
  // visitor before they know where they are, and the saved position is already
  // offered twice — by "Start the Tour" (TourEntryModal) and by the return chip.
  // A link is the exception, and only because its sender asked for it: `?frame=`
  // arrives as pendingTourTarget, `?art=` places itself through SharedLinkResolver.
  const initialFrameIndex = entryFrameIndex(pendingTourTarget, activeRoom.id);

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
            <VisitorNavigationWatch roomId={activeRoom.id} />
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
