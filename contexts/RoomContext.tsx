'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { rooms as allRooms, RoomConfig } from '../config/roomsConfig';
import { getInitialRoomIndex } from '../utils/userPreferences';
import { ImageMetadata } from '../types/museum';
import { mergeRoomArtworks } from '../utils/roomArtworks';

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
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  children,
  liveArtworks = {},
}: {
  children: React.ReactNode;
  liveArtworks?: Record<string, ImageMetadata[]>;
}) {
  const [activeRoomIndex, setActiveRoomIndex] = useState(() => getInitialRoomIndex(allRooms));
  const [pendingTourTarget, setPendingTourTarget] = useState<{
    roomId: string;
    frameIndex: number;
  } | null>(null);

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

  return (
    <RoomContext.Provider value={{
      rooms: allRooms,
      activeRoomIndex,
      setActiveRoomIndex,
      pendingTourTarget,
      openArtworkInRoom,
      consumePendingTourTarget,
      getRoomImages,
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
