'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { rooms as allRooms, RoomConfig } from '../config/roomsConfig';
import { getInitialRoomIndex } from '../utils/userPreferences';
import { ImageMetadata } from '../types/museum';
import { mergeRoomArtworks } from '../utils/roomArtworks';
import {
  GalleryLink,
  resolveLinkDestination,
  staticLinkCatalog,
} from '../utils/galleryLink';

interface RoomContextValue {
  rooms: RoomConfig[];
  activeRoomIndex: number;
  setActiveRoomIndex: (i: number) => void;
  /** A one-shot tour destination used when navigating to a shelf item in another room. */
  pendingTourTarget: { roomId: string; frameIndex: number } | null;
  openArtworkInRoom: (roomIndex: number, frameIndex: number) => void;
  consumePendingTourTarget: (roomId: string) => void;
  /** The eight-slot, submission-merged image list for any room — used to estimate another room's visit time before jumping to it. */
  getRoomImages: (roomId: string) => ImageMetadata[];
  /**
   * A shared link (`?room=` / `?art=` / `?frame=`) still waiting to be applied:
   * `?art=` ids can only be resolved once the live catalogue is in. Room ids and
   * legacy slot indexes are applied before the first render, so they never wait.
   */
  sharedLink: GalleryLink | null;
  clearSharedLink: () => void;
  /** True once a shared link has decided where this visit opens. */
  arrivedViaLink: boolean;
  markArrivedViaLink: () => void;
  /**
   * The frame a shared link placed the visitor on. It is the sender's choice,
   * not the visitor's own move, so the visit-position persistence skips that
   * frame instead of overwriting the position saved on this device with it.
   * Compared by value (never consumed), so a double-invoked effect under React
   * strict mode cannot slip a save through between the two runs.
   */
  linkPlacedFrame: { roomId: string; frameIndex: number } | null;
  registerLinkPlacement: (roomId: string, frameIndex: number) => void;
  clearLinkPlacement: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  children,
  liveArtworks = {},
  link = null,
}: {
  children: React.ReactNode;
  liveArtworks?: Record<string, ImageMetadata[]>;
  link?: GalleryLink | null;
}) {
  // A shared link is a destination, not a preference: it decides which room this
  // visit opens (and, for `?frame=`, which slot), and it never writes the visit
  // position saved on this device (see utils/userPreferences).
  //
  // Resolved once, against the rooms and their configured artworks, so the room
  // is right on the first frame instead of being corrected after a fetch.
  const [initialEntry] = useState(() => {
    const destination = resolveLinkDestination(staticLinkCatalog(allRooms), link);
    const roomId = destination?.roomId ?? link?.roomId;
    const roomIndex = roomId ? allRooms.findIndex(room => room.id === roomId) : -1;
    const legacyFrame = link?.artworkId === undefined && destination?.kind === 'artwork'
      ? destination.frameIndex
      : null;
    // An artwork id needs the submission-merged catalogue (a room's live
    // artworks replace its configured ones), so `?art=` is applied later, by
    // SharedLinkResolver, and kept pending until then.
    const pending: GalleryLink | null = link && (link.artworkId !== undefined || roomIndex < 0)
      ? link
      : null;
    return {
      roomIndex: roomIndex >= 0 ? roomIndex : getInitialRoomIndex(allRooms),
      frameIndex: legacyFrame,
      arrivedViaLink: roomIndex >= 0 || destination !== null,
      pending,
    };
  });

  const [activeRoomIndex, setActiveRoomIndex] = useState(initialEntry.roomIndex);
  const [pendingTourTarget, setPendingTourTarget] = useState<{
    roomId: string;
    frameIndex: number;
  } | null>(
    initialEntry.frameIndex !== null && link?.roomId
      ? { roomId: link.roomId, frameIndex: initialEntry.frameIndex }
      : null,
  );
  const [sharedLink, setSharedLink] = useState<GalleryLink | null>(initialEntry.pending);
  const [arrivedViaLink, setArrivedViaLink] = useState(initialEntry.arrivedViaLink);

  const roomImages = useMemo(
    () => mergeRoomArtworks(allRooms, liveArtworks),
    [liveArtworks],
  );

  const getRoomImages = useCallback(
    (roomId: string) => roomImages[roomId] ?? [],
    [roomImages],
  );

  const openArtworkInRoom = useCallback((roomIndex: number, frameIndex: number) => {
    const room = allRooms[roomIndex];
    if (!room || frameIndex < 0) return;
    setPendingTourTarget({ roomId: room.id, frameIndex });
    setActiveRoomIndex(roomIndex);
  }, []);

  const consumePendingTourTarget = useCallback((roomId: string) => {
    setPendingTourTarget(target => target?.roomId === roomId ? null : target);
  }, []);

  const clearSharedLink = useCallback(() => setSharedLink(null), []);
  const markArrivedViaLink = useCallback(() => setArrivedViaLink(true), []);

  // The link's own placement, as state so the persistence below can compare it
  // by value on every run instead of consuming a one-shot flag.
  const [linkPlacedFrame, setLinkPlacedFrame] = useState<{ roomId: string; frameIndex: number } | null>(
    initialEntry.frameIndex !== null && link?.roomId
      ? { roomId: link.roomId, frameIndex: initialEntry.frameIndex }
      : null,
  );

  const registerLinkPlacement = useCallback((roomId: string, frameIndex: number) => {
    setLinkPlacedFrame({ roomId, frameIndex });
  }, []);

  const clearLinkPlacement = useCallback(() => setLinkPlacedFrame(null), []);

  return (
    <RoomContext.Provider value={{
      rooms: allRooms,
      activeRoomIndex,
      setActiveRoomIndex,
      pendingTourTarget,
      openArtworkInRoom,
      consumePendingTourTarget,
      getRoomImages,
      sharedLink,
      clearSharedLink,
      arrivedViaLink,
      markArrivedViaLink,
      linkPlacedFrame,
      registerLinkPlacement,
      clearLinkPlacement,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be inside RoomProvider');
  return ctx;
}
