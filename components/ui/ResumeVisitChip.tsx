'use client';

import React, { useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { useTour } from '../../contexts/TourContext';
import { readVisitPosition } from '../../utils/userPreferences';
import { describeSavedPosition, shouldOfferVisitReturn } from '../../utils/galleryLink';

/**
 * Arrived through a shared link? The visitor's own visit is still where they
 * left it, and this offers it back — quietly. Deliberately not a modal: someone
 * with brain fog opening a link from bed is not charged a decision before they
 * see anything. It is ignorable, dismissible, keyboard reachable, and it lives
 * in the HTML overlay like every other control (never in the 3D scene).
 */
export default function ResumeVisitChip({ style }: { style?: React.CSSProperties }) {
  const { rooms, activeRoomIndex, getRoomImages, arrivedViaLink, openArtworkInRoom } = useRoom();
  const { startTour, currentFrameIndex } = useTour();
  const [dismissed, setDismissed] = useState(false);

  // Read once, on mount: this is where the visitor was *when the link was
  // opened*, which is exactly what we are offering back.
  const [savedBeforeEntry] = useState(() => readVisitPosition());

  const saved = describeSavedPosition(
    savedBeforeEntry,
    rooms.map(room => ({ id: room.id, name: room.name, images: getRoomImages(room.id) })),
  );

  const offerReturn = shouldOfferVisitReturn({
    arrivedViaLink,
    saved,
    currentRoomId: rooms[activeRoomIndex]?.id ?? '',
    currentFrameIndex,
  });

  if (dismissed || !saved || !offerReturn) return null;

  const destination = saved.title ? `${saved.roomName} · ${saved.title}` : `${saved.roomName} · slot ${saved.frameIndex + 1}`;

  const resume = () => {
    if (saved.roomId === rooms[activeRoomIndex]?.id) {
      startTour(saved.frameIndex);
      return;
    }
    openArtworkInRoom(saved.roomIndex, saved.frameIndex);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(1rem, env(safe-area-inset-top))',
        left: 'max(1rem, env(safe-area-inset-left))',
        ...style,
      }}
      className="z-30 flex items-center gap-1 rounded-full bg-[var(--floating-surface)] backdrop-blur-md shadow-lg pl-3 pr-1 py-1"
    >
      <button
        type="button"
        onClick={resume}
        aria-label={`Return to your visit: ${saved.roomName}${saved.title ? `, ${saved.title}` : `, slot ${saved.frameIndex + 1}`}`}
        className="flex items-center gap-2 text-[var(--floating-text)] hover:text-[var(--floating-text)] transition-colors"
      >
        <Undo2 size={15} />
        <span className="text-sm font-medium">Return to your visit</span>
        <span className="text-xs text-[var(--floating-muted)]">{destination}</span>
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss the offer to return to your visit"
        className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[var(--floating-muted)] hover:text-[var(--floating-text)] hover:bg-[var(--floating-surface-strong)] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
