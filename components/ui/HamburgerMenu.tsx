'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronUp, Heart, List, Menu, X } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { useTour } from '../../contexts/TourContext';
import { useShelf } from '../../contexts/ShelfContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { clampMenuTabY, readMenuTabY, saveMenuTabY, saveVisitPosition } from '../../utils/userPreferences';
import { DWELL_SECONDS_OPTIONS } from '../../utils/tourEstimate';
import ThemeToggle from './ThemeToggle';

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  style,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="px-5 pt-4 border-t shrink-0" style={{ borderColor: 'var(--panel-separator)', ...style }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 pb-4"
        aria-expanded={open}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--panel-subtitle)]">
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-[var(--panel-subtitle)]" /> : <ChevronDown size={14} className="text-[var(--panel-subtitle)]" />}
      </button>
      {open && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  );
}

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
  const [view, setView] = useState<'main' | 'shelf'>('main');
  const [tabY, setTabY] = useState(() => readMenuTabY());
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [guidedTourOpen, setGuidedTourOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();
  const { rooms, activeRoomIndex, setActiveRoomIndex, getRoomImages } = useRoom();
  const { quitTour, startTour, currentFrameIndex } = useTour();
  const { items: shelfItems, remove: removeFromShelf } = useShelf();
  const { narrationEnabled, setNarrationEnabled, dwellSeconds, setDwellSeconds } = useGuidedTourPreferences();
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

  useEffect(() => {
    if (!isOpen) setView('main');
  }, [isOpen]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(isOpen ? 'open-hamburger-menu' : 'close-hamburger-menu'));
  }, [isOpen]);

  useEffect(() => {
    if (shelfItems.length === 0 && view === 'shelf') setView('main');
  }, [shelfItems.length, view]);

  const handleRoomSelect = (i: number) => {
    if (i === activeRoomIndex) { setIsOpen(false); return; }
    quitTour();
    setActiveRoomIndex(i);
    setView('main');
    setIsOpen(false);
  };

  const handleShelfNavigate = (item: typeof shelfItems[0]) => {
    const target = rooms
      .map((room, roomIndex) => ({
        room,
        roomIndex,
        frameIndex: getRoomImages(room.id).findIndex(artwork => artwork.id === item.id),
      }))
      .find(location => location.frameIndex >= 0);

    if (!target) {
      removeFromShelf(item.id);
      return;
    }

    if (target.roomIndex === activeRoomIndex) {
      startTour(target.frameIndex);
    } else {
      saveVisitPosition(target.room.id, target.frameIndex);
      quitTour();
      setActiveRoomIndex(target.roomIndex);
    }
    setView('main');
    setIsOpen(false);
  };

  const handleSwitchToList = () => {
    const activeRoom = rooms[activeRoomIndex];
    if (activeRoom) saveVisitPosition(activeRoom.id, currentFrameIndex);
    setIsOpen(false);
    router.push('/list');
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
          className="h-full w-[75vw] max-w-sm backdrop-blur-xl border-l flex flex-col overflow-y-auto"
          style={{
            paddingRight: 'env(safe-area-inset-right)',
            background: 'var(--panel-bg)',
            borderColor: 'var(--panel-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pb-5 border-b shrink-0"
            style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))', borderColor: 'var(--panel-separator)' }}
          >
            <span className="font-semibold text-base tracking-wide" style={{ color: 'var(--panel-title)' }}>Gallery</span>
          </div>

          {view === 'shelf' ? (
            <div className="px-4 pt-5 pb-3 shrink-0">
              <button
                onClick={() => setView('main')}
                className="mb-4 inline-flex items-center gap-1.5 px-1 text-xs transition-colors text-[var(--panel-subtitle)] hover:text-[var(--panel-title)]"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1 flex items-center gap-1.5 text-[var(--panel-subtitle)]">
                My Shelf
                <span className="font-normal normal-case tracking-normal text-[9px] opacity-70">{shelfItems.length}</span>
              </p>
              <ul className="space-y-1">
                {shelfItems.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleShelfNavigate(item)}
                      className="w-full text-left px-2.5 py-2 rounded-lg transition-colors hover:bg-[var(--panel-btn-bg-hover)] group flex items-center gap-3"
                    >
                      <span className="shrink-0 w-10 h-10 rounded overflow-hidden bg-[var(--panel-btn-bg)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" className="w-full h-full object-cover opacity-85" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug truncate text-[var(--panel-text)] group-hover:text-[var(--panel-title)]">{item.title}</span>
                        <span className="block text-xs truncate text-[var(--panel-subtitle)]">{item.artist}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="px-4 pt-5 pb-2 shrink-0">
                <button
                  onClick={handleSwitchToList}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-[var(--panel-text)] hover:bg-[var(--panel-btn-bg-hover)] hover:text-[var(--panel-title)]"
                >
                  <List size={14} />
                  Simple list view
                </button>
              </div>

              {shelfItems.length > 0 && (
                <div className="px-4 pt-5 pb-2 shrink-0">
                  <button
                    onClick={() => setView('shelf')}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-[var(--panel-text)] hover:bg-[var(--panel-btn-bg-hover)] hover:text-[var(--panel-title)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Heart size={14} fill="currentColor" />
                      My Shelf
                    </span>
                    <span className="text-xs text-[var(--panel-subtitle)]">{shelfItems.length}</span>
                  </button>
                </div>
              )}

              {/* Rooms */}
              <div className="px-4 pt-3 pb-3 shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1 text-[var(--panel-subtitle)]">
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
                              ? 'font-medium bg-[var(--panel-btn-bg)] text-[var(--panel-title)]'
                              : 'text-[var(--panel-text)] hover:bg-[var(--panel-btn-bg-hover)] hover:text-[var(--panel-title)]'
                          }`}
                        >
                          {room.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}

          <div className="flex-1" />

          {view === 'main' && (
            <>
              <CollapsibleSection title="Appearance" open={appearanceOpen} onToggle={() => setAppearanceOpen(o => !o)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--panel-text)]">Theme</span>
                  <ThemeToggle className="w-11 h-11 flex items-center justify-center rounded-full transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)] text-[var(--panel-btn-text)]" />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Guided tour" open={guidedTourOpen} onToggle={() => setGuidedTourOpen(o => !o)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--panel-text)]">Narration</span>
                  <button
                    type="button"
                    onClick={() => setNarrationEnabled(!narrationEnabled)}
                    role="switch"
                    aria-checked={narrationEnabled}
                    aria-label="Narration"
                    className="relative w-11 h-6 rounded-full transition-colors bg-[var(--panel-btn-bg)]"
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform bg-[var(--panel-btn-text)]"
                      style={{ transform: narrationEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
                <div>
                  <span className="block text-sm mb-2 text-[var(--panel-text)]">Time per artwork (Silent tour)</span>
                  <div className="flex items-center gap-2">
                    {DWELL_SECONDS_OPTIONS.map(seconds => (
                      <button
                        key={seconds}
                        onClick={() => setDwellSeconds(seconds)}
                        aria-pressed={dwellSeconds === seconds}
                        className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                          dwellSeconds === seconds
                            ? 'bg-[var(--panel-btn-bg-hover)] text-[var(--panel-title)] font-medium'
                            : 'bg-[var(--panel-btn-bg)] text-[var(--panel-subtitle)] hover:text-[var(--panel-title)]'
                        }`}
                      >
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Controls"
                open={controlsOpen}
                onToggle={() => setControlsOpen(o => !o)}
                style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
              >
                {isMobile ? (
                  <ul className="space-y-2 text-xs text-[var(--panel-subtitle)]">
                    <li><span className="text-[var(--panel-text)]">Tap artwork</span> — zoom in</li>
                    <li><span className="text-[var(--panel-text)]">Tap plaque</span> — read description</li>
                    <li><span className="text-[var(--panel-text)]">Tap bench</span> — sit and look around</li>
                    <li><span className="text-[var(--panel-text)]">Swipe left / right</span> — navigate artworks</li>
                    <li><span className="text-[var(--panel-text)]">Eye-off button</span> — hide interface</li>
                    <li><span className="text-[var(--panel-text)]">Swipe down</span> — exit zoom</li>
                  </ul>
                ) : (
                  <ul className="space-y-2 text-xs text-[var(--panel-subtitle)]">
                    <li><span className="text-[var(--panel-text)]">Click artwork</span> — zoom in</li>
                    <li><span className="text-[var(--panel-text)]">Click plaque</span> — read description</li>
                    <li><span className="text-[var(--panel-text)]">Click bench</span> — sit and look around</li>
                    <li><span className="text-[var(--panel-text)]">← → arrows</span> — navigate artworks</li>
                    <li><span className="text-[var(--panel-text)]">Eye-off button</span> — hide interface</li>
                    <li><span className="text-[var(--panel-text)]">Escape</span> — exit zoom</li>
                  </ul>
                )}
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;
