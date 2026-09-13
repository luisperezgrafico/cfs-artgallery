'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { rooms as allRooms, RoomConfig } from '../config/roomsConfig';
import { getInitialRoomIndex, readVisitPosition } from '../utils/userPreferences';
import { ImageMetadata } from '../types/museum';
import { mergeRoomArtworks } from '../utils/roomArtworks';
import {
  GalleryLink,
  LinkLanding,
  VisitReturnState,
  initialVisitReturnState,
  resolveLinkDestination,
  staticLinkCatalog,
  withDismissal,
  withVisitorNavigation,
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
   * Where a shared link put the visitor: its room, and the frame it placed
   * (null for a link to a room, which lands on the overview). It is the
   * sender's choice, not the visitor's own move, so two things compare it by
   * value instead of trusting a one-shot flag (which a double-invoked effect
   * under React strict mode would defeat): the visit-position persistence, so
   * it never saves the sender's frame over the visitor's saved position, and
   * the offer below, so landing is not mistaken for navigating.
   */
  linkLanding: LinkLanding | null;
  registerLinkPlacement: (roomId: string, frameIndex: number | null) => void;
  clearLinkPlacement: () => void;
  /**
   * The offer to return to where the visitor was before this visit began. Lives
   * here, above the per-room remount boundary, because it must not be re-read
   * when a room change remounts the chip: the offered position is captured once
   * at entry, and `navigated`/`dismissed` only ever go one way.
   */
  visitReturn: VisitReturnState;
  markVisitorNavigated: () => void;
  dismissVisitReturn: () => void;
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
    const arrivedViaLink = roomIndex >= 0 || destination !== null;
    return {
      roomIndex: roomIndex >= 0 ? roomIndex : getInitialRoomIndex(allRooms),
      frameIndex: legacyFrame,
      arrivedViaLink,
      pending,
      // Where the link landed. A link to a room lands on the overview: no frame.
      landing: arrivedViaLink && roomIndex >= 0
        ? { roomId: allRooms[roomIndex].id, frameIndex: legacyFrame }
        : null,
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
  const [linkLanding, setLinkLanding] = useState<LinkLanding | null>(initialEntry.landing);

  // One read, at entry, before anything the visitor does can overwrite it — and
  // never again (see VisitReturnState in utils/galleryLink).
  const [visitReturn, setVisitReturn] = useState<VisitReturnState>(() =>
    initialVisitReturnState(link ? readVisitPosition() : null),
  );

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

  const registerLinkPlacement = useCallback((roomId: string, frameIndex: number | null) => {
    setLinkLanding({ roomId, frameIndex });
  }, []);

  const clearLinkPlacement = useCallback(() => setLinkLanding(null), []);

  const markVisitorNavigated = useCallback(() => setVisitReturn(withVisitorNavigation), []);
  const dismissVisitReturn = useCallback(() => setVisitReturn(withDismissal), []);

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
      linkLanding,
      registerLinkPlacement,
      clearLinkPlacement,
      visitReturn,
      markVisitorNavigated,
      dismissVisitReturn,
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
