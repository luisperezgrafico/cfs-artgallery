'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { useTour } from '../../contexts/TourContext';
import { clampMenuTabY, readMenuTabY, saveMenuTabY } from '../../utils/userPreferences';
import ThemeToggle from './ThemeToggle';

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
  const [tabY, setTabY] = useState(() => readMenuTabY());
  const isMobile = useIsMobile();
  const { rooms, activeRoomIndex, setActiveRoomIndex } = useRoom();
  const { quitTour } = useTour();
  const dragState = useRef<{
    pointerId: number | null;
    startY: number;
    startTabY: number;
    dragged: boolean;
  }>({ pointerId: null, startY: 0, startTabY: tabY, dragged: false });
  const tabYRef = useRef(tabY);
  const suppressClick = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    tabYRef.current = tabY;
  }, [tabY]);

  const handleRoomSelect = (i: number) => {
    if (i === activeRoomIndex) { setIsOpen(false); return; }
    quitTour();
    setActiveRoomIndex(i);
    setIsOpen(false);
  };

  const handleTabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragState.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startTabY: tabY,
      dragged: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (state.pointerId !== e.pointerId) return;

    const delta = e.clientY - state.startY;
    if (Math.abs(delta) > 4) state.dragged = true;
    if (!state.dragged) return;

    e.preventDefault();
    const nextTabY = clampMenuTabY(state.startTabY + delta / window.innerHeight);
    tabYRef.current = nextTabY;
    setTabY(nextTabY);
  };

  const finishTabDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (state.pointerId !== e.pointerId) return;

    if (state.dragged) {
      suppressClick.current = true;
      saveMenuTabY(tabYRef.current);
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    state.pointerId = null;
  };

  const handleTabClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={style}>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.24s ease-out' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 bottom-0 z-50 transition-transform duration-500 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Tab button */}
        <button
          onClick={handleTabClick}
          onPointerDown={handleTabPointerDown}
          onPointerMove={handleTabPointerMove}
          onPointerUp={finishTabDrag}
          onPointerCancel={finishTabDrag}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          className="absolute left-0 -translate-x-full -translate-y-1/2 flex items-center justify-center bg-black/40 hover:bg-black/50 backdrop-blur-md text-white transition-colors shadow-lg rounded-l-xl border-l border-t border-b border-white/15 cursor-grab active:cursor-grabbing"
          style={{
            top: `${tabY * 100}%`,
            paddingTop: '1rem',
            paddingBottom: '1rem',
            paddingLeft: '0.75rem',
            paddingRight: '0.65rem',
            touchAction: 'none',
          }}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
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

          {/* Appearance */}
          <div className="px-5 pt-4 pb-4 border-t border-white/10">
            <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">
              Appearance
            </p>
            <div className="flex items-center justify-between">
              <span className="text-white/75 text-sm">Theme</span>
              <ThemeToggle className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" />
            </div>
          </div>

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
                <li><span className="text-white/65">Tap bench</span> — sit and look around</li>
                <li><span className="text-white/65">Swipe left / right</span> — navigate artworks</li>
                <li><span className="text-white/65">Eye-off button</span> — hide interface</li>
                <li><span className="text-white/65">Swipe down</span> — exit zoom</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-white/45">
                <li><span className="text-white/65">Click artwork</span> — zoom in</li>
                <li><span className="text-white/65">Click plaque</span> — read description</li>
                <li><span className="text-white/65">Click bench</span> — sit and look around</li>
                <li><span className="text-white/65">← → arrows</span> — navigate artworks</li>
                <li><span className="text-white/65">Eye-off button</span> — hide interface</li>
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
