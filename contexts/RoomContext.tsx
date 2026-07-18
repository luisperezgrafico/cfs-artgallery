'use client';

import React, { createContext, useContext, useState } from 'react';
import { rooms as allRooms, RoomConfig } from '../config/roomsConfig';

interface RoomContextValue {
  rooms: RoomConfig[];
  activeRoomIndex: number;
  setActiveRoomIndex: (i: number) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  return (
    <RoomContext.Provider value={{ rooms: allRooms, activeRoomIndex, setActiveRoomIndex }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be inside RoomProvider');
  return ctx;
}
