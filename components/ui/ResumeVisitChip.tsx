'use client';

import React, { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { useTour } from '../../contexts/TourContext';
import { describeSavedPosition, shouldOfferVisitReturn } from '../../utils/galleryLink';

/**
 * Long enough to read as a fade, short enough not to linger once the visitor
 * has moved on. Matches the transition below.
 */
const AUTO_HIDE_FADE_MS = 420;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Arrived through a shared link? The visitor's own visit is still where they
 * left it, and this offers it back — quietly. Deliberately not a modal: someone
 * with brain fog opening a link from bed is not charged a decision before they
 * see anything. It is ignorable, closable, keyboard reachable, and it lives in
 * the HTML overlay like every other control (never in the 3D scene).
 *
 * It offers exactly one thing — where the visitor was *before* opening the link
 * — and that value lives in RoomContext, captured once at entry. The chip itself
 * is remounted whenever the room changes, so nothing it offers may be captured
 * here: reading the saved position again on remount would offer "where you were
 * ten seconds ago", and returning once would offer the way back, forever.
 */
export default function ResumeVisitChip({ style }: { style?: React.CSSProperties }) {
  const {
    rooms,
    activeRoomIndex,
    getRoomImages,
    arrivedViaLink,
    visitReturn,
    markVisitorNavigated,
    dismissVisitReturn,
    openArtworkInRoom,
  } = useRoom();
  const { startTour, currentFrameIndex } = useTour();

  const saved = describeSavedPosition(
    visitReturn.beforeEntry,
    rooms.map(room => ({ id: room.id, name: room.name, images: getRoomImages(room.id) })),
  );

  const offerReturn = shouldOfferVisitReturn({
    arrivedViaLink,
    saved,
    currentRoomId: rooms[activeRoomIndex]?.id ?? '',
    currentFrameIndex,
    visitorNavigated: visitReturn.navigated,
    dismissed: visitReturn.dismissed,
  });

  // Rendered until the offer ends, then faded out instead of blinking away: the
  // visitor was not asked to watch it leave.
  const [isMounted, setIsMounted] = useState(offerReturn);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (offerReturn) {
      setIsMounted(true);
      setIsFading(false);
      return;
    }
    if (!isMounted) return;
    if (prefersReducedMotion()) {
      setIsMounted(false);
      return;
    }
    setIsFading(true);
    const timer = window.setTimeout(() => setIsMounted(false), AUTO_HIDE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [offerReturn, isMounted]);

  if (!isMounted || !saved) return null;

  const resume = () => {
    // Navigating for them is still navigating: the offer ends here, so it does
    // not flash back up in the room we are about to open.
    markVisitorNavigated();
    if (saved.roomId === rooms[activeRoomIndex]?.id) {
      startTour(saved.frameIndex);
      return;
    }
    openArtworkInRoom(saved.roomIndex, saved.frameIndex);
  };

  const where = saved.title ? `${saved.roomName}, ${saved.title}` : `${saved.roomName}, slot ${saved.frameIndex + 1}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(1rem, env(safe-area-inset-top))',
        left: 'max(1rem, env(safe-area-inset-left))',
        // Shares the top strip with the menu button on the right: keep clear of
        // it, and never run off a narrow screen.
        maxWidth: 'calc(100vw - 8.5rem)',
        ...style,
      }}
      className="z-30"
    >
      <div
        style={{
          opacity: isFading ? 0 : 1,
          transition: `opacity ${AUTO_HIDE_FADE_MS}ms ease-out`,
          pointerEvents: isFading ? 'none' : 'auto',
        }}
        className="flex items-center gap-1 rounded-full bg-[var(--floating-surface)] backdrop-blur-md shadow-lg pl-3 pr-1 py-1"
      >
        <button
          type="button"
          onClick={resume}
          aria-label={`Return to your visit: ${where}`}
          className="flex items-center gap-2 min-w-0 text-[var(--floating-text)] transition-colors"
        >
          <Undo2 size={15} className="shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">Return to your visit</span>
          <span className="text-xs text-[var(--floating-muted)] truncate">{saved.roomName}</span>
          {saved.title && (
            <span className="hidden sm:inline text-xs text-[var(--floating-muted)] truncate">
              · {saved.title}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={dismissVisitReturn}
          aria-label="Dismiss the offer to return to your visit"
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[var(--floating-muted)] hover:text-[var(--floating-text)] hover:bg-[var(--floating-surface-strong)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
