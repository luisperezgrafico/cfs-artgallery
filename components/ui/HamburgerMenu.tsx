'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { useTour } from '../../contexts/TourContext';

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(hover: none) and (pointer: coarse)');
    setMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return mobile;
}

const HamburgerMenu: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { rooms, activeRoomIndex, setActiveRoomIndex } = useRoom();
  const { quitTour } = useTour();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleRoomSelect = (i: number) => {
    if (i === activeRoomIndex) { setIsOpen(false); return; }
    quitTour();
    setActiveRoomIndex(i);
    setIsOpen(false);
  };

  return (
    <div style={style}>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Tab button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md text-white transition-colors shadow-lg rounded-l-2xl border-l border-t border-b border-white/15"
          style={{
            paddingTop: '1.25rem',
            paddingBottom: '1.25rem',
            paddingLeft: '0.875rem',
            paddingRight: '0.75rem',
          }}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Drawer panel */}
        <div
          className="h-full w-[75vw] max-w-sm bg-black/90 backdrop-blur-xl border-l border-white/10 flex flex-col"
          style={{ paddingRight: 'env(safe-area-inset-right)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pb-5 border-b border-white/10"
            style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}
          >
            <span className="text-white font-semibold text-base tracking-wide">Gallery</span>
          </div>

          {/* Rooms */}
          <div className="px-4 pt-5 pb-3">
            <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3 px-1">
              Rooms
            </p>
            <ul className="space-y-0.5">
              {rooms.map((room, i) => {
                const isActive = i === activeRoomIndex;
                return (
                  <li key={room.id}>
                    <button
                      onClick={() => handleRoomSelect(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-white/12 text-white font-medium'
                          : 'text-white/75 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      {room.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex-1" />

          {/* Controls */}
          <div
            className="px-5 pt-4 border-t border-white/10"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">
              Controls
            </p>
            {isMobile ? (
              <ul className="space-y-2 text-xs text-white/45">
                <li><span className="text-white/65">Tap artwork</span> — zoom in</li>
                <li><span className="text-white/65">Tap plaque</span> — read description</li>
                <li><span className="text-white/65">Swipe left / right</span> — navigate artworks</li>
                <li><span className="text-white/65">Swipe down</span> — exit zoom</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-white/45">
                <li><span className="text-white/65">Click artwork</span> — zoom in</li>
                <li><span className="text-white/65">Click plaque</span> — read description</li>
                <li><span className="text-white/65">← → arrows</span> — navigate artworks</li>
                <li><span className="text-white/65">Escape</span> — exit zoom</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;
