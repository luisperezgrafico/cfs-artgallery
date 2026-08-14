'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { rooms as allRooms, RoomConfig } from '../config/roomsConfig';
import { getInitialRoomIndex } from '../utils/userPreferences';
import { ImageMetadata } from '../types/museum';
import { layoutRoom } from '../utils/roomLayout';

interface RoomContextValue {
  rooms: RoomConfig[];
  activeRoomIndex: number;
  setActiveRoomIndex: (i: number) => void;
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

  const roomImages = useMemo(() => {
    const map: Record<string, ImageMetadata[]> = {};
    for (const room of allRooms) {
      const live = liveArtworks[room.id];
      const base = live && live.length > 0 ? live : room.images;
      map[room.id] = layoutRoom(base);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveArtworks]);

  const getRoomImages = useCallback(
    (roomId: string) => roomImages[roomId] ?? [],
    [roomImages],
  );

  return (
    <RoomContext.Provider value={{ rooms: allRooms, activeRoomIndex, setActiveRoomIndex, getRoomImages }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be inside RoomProvider');
  return ctx;
}
