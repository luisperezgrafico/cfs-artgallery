'use client';

import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import {
  ShelfItem,
  ShelfRoomSnapshot,
  readShelf,
  reconcileShelf,
  writeShelf,
} from '../utils/userPreferences';

interface ShelfContextType {
  items: ShelfItem[];
  isShelved: (id: string) => boolean;
  toggle: (item: ShelfItem) => void;
  remove: (id: string) => void;
  sync: (rooms: ShelfRoomSnapshot[]) => void;
}

const ShelfContext = createContext<ShelfContextType | undefined>(undefined);

export const ShelfProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ShelfItem[]>(() => readShelf());

  const isShelved = useCallback((id: string) => items.some(i => i.id === id), [items]);

  const toggle = useCallback((item: ShelfItem) => {
    setItems(prev => {
      const next = prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item];
      writeShelf(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(item => item.id !== id);
      if (next.length === prev.length) return prev;
      writeShelf(next);
      return next;
    });
  }, []);

  const sync = useCallback((rooms: ShelfRoomSnapshot[]) => {
    setItems(prev => {
      const next = reconcileShelf(prev, rooms);
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      writeShelf(next);
      return next;
    });
  }, []);

  return (
    <ShelfContext.Provider value={{ items, isShelved, toggle, remove, sync }}>
      {children}
    </ShelfContext.Provider>
  );
};

export const useShelf = (): ShelfContextType => {
  const ctx = useContext(ShelfContext);
  if (!ctx) throw new Error('useShelf must be used within ShelfProvider');
  return ctx;
};
