'use client';

import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { ShelfItem, readShelf, writeShelf } from '../utils/userPreferences';

interface ShelfContextType {
  items: ShelfItem[];
  isShelved: (id: string) => boolean;
  toggle: (item: ShelfItem) => void;
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

  return (
    <ShelfContext.Provider value={{ items, isShelved, toggle }}>
      {children}
    </ShelfContext.Provider>
  );
};

export const useShelf = (): ShelfContextType => {
  const ctx = useContext(ShelfContext);
  if (!ctx) throw new Error('useShelf must be used within ShelfProvider');
  return ctx;
};
