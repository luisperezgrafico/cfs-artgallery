'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const PLACEHOLDER_ROOMS = [
  { name: 'Room 1 — Quiet Landscapes', available: true },
  { name: 'Room 2 — Portraits & Faces', available: false },
  { name: 'Room 3 — Abstract & Texture', available: false },
  { name: 'Room 4 — Night & Rest', available: false },
];

const HamburgerMenu: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={style}>
      {/* Trigger — half-pill anchored to right edge, vertically centered */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md text-white transition-colors shadow-lg rounded-l-2xl border-l border-t border-b border-white/15"
        style={{
          paddingTop: '1.25rem',
          paddingBottom: '1.25rem',
          paddingLeft: '0.875rem',
          paddingRight: 'max(0.625rem, env(safe-area-inset-right))',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer — slides in from right */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-3/5 max-w-[300px] bg-black/90 backdrop-blur-xl border-l border-white/10 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ paddingRight: 'env(safe-area-inset-right)' }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 pb-4 border-b border-white/10"
          style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}
        >
          <span className="text-white font-semibold text-base tracking-wide">Gallery</span>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Rooms */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">
            Rooms
          </p>
          <ul className="space-y-0.5">
            {PLACEHOLDER_ROOMS.map((room) => (
              <li key={room.name}>
                <button
                  disabled={!room.available}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    room.available
                      ? 'text-white/85 hover:bg-white/10'
                      : 'text-white/25 cursor-not-allowed'
                  }`}
                >
                  {room.name}
                  {!room.available && (
                    <span className="ml-2 text-[9px] text-white/20 uppercase tracking-wider">Soon</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1" />

        {/* Controls reference */}
        <div
          className="px-5 pt-4 border-t border-white/10"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">
            Controls
          </p>
          <ul className="space-y-2 text-xs text-white/45">
            <li><span className="text-white/60">Tap artwork</span> — open info panel</li>
            <li><span className="text-white/60">← → arrows</span> — navigate artworks</li>
            <li><span className="text-white/60">Space / Enter</span> — start tour</li>
            <li><span className="text-white/60">Escape</span> — exit tour</li>
            <li className="pt-1.5 border-t border-white/10 text-white/30">Swipe left / right on mobile</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;
