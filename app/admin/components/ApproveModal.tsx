'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Submission } from '../../../lib/storage';
import { rooms } from '../../../config/roomsConfig';
import { contentNoteLabel } from '../../../config/contentNotes';
import type { ImageMetadata } from '../../../types/museum';

export default function ApproveModal({
  submission,
  artworks,
  onConfirm,
  onClose,
}: {
  submission: Submission;
  artworks: Record<string, ImageMetadata[]>;
  onConfirm: (roomId: string, slot: number | null) => Promise<void>;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState(submission.preferredRoom ?? rooms[0]?.id ?? '');
  const [slot, setSlot] = useState(submission.preferredSlot !== undefined ? String(submission.preferredSlot) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const contentNotes = submission.contentNotes ?? [];
  const preferredRoom = submission.preferredRoom
    ? rooms.find(r => r.id === submission.preferredRoom)?.name ?? submission.preferredRoom
    : null;
  const preferredSlot = submission.preferredSlot !== undefined ? `slot ${submission.preferredSlot + 1}` : null;
  const occupiedSlots = new Set((artworks[roomId] ?? [])
    .filter(artwork => artwork.slot !== undefined)
    .map(artwork => artwork.slot as number));
  const slotOccupiedInRoom = (nextRoomId: string, nextSlot: string) =>
    nextSlot !== ''
    && (artworks[nextRoomId] ?? []).some(artwork => artwork.slot === Number(nextSlot));

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(roomId, slot === '' ? null : Number(slot));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="approve-modal">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-6 space-y-4">
        <h3 className="text-white font-semibold text-base">Approve &ldquo;{submission.title}&rdquo;</h3>

        {submission.shortDescription && (
          <p className="text-white/50 text-xs italic">&ldquo;{submission.shortDescription}&rdquo;</p>
        )}

        {(preferredRoom || preferredSlot) && (
          <p className="text-white/35 text-xs">
            Artist preference: {[preferredRoom, preferredSlot].filter(Boolean).join(' · ')}
          </p>
        )}

        {submission.artistAudioUrl && (
          <p className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 text-xs text-white/55">
            Artist audio is attached and will accompany this artwork.
          </p>
        )}

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
            Assign to room
            {submission.preferredRoom && (
              <span className="ml-2 normal-case text-white/30 tracking-normal">· artist&rsquo;s preference</span>
            )}
          </label>
          <select
            value={roomId}
            onChange={e => {
              const nextRoomId = e.target.value;
              setRoomId(nextRoomId);
              if (slotOccupiedInRoom(nextRoomId, slot)) setSlot('');
            }}
            disabled={busy}
            aria-label="Assign to room"
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
            Assign to slot
            {submission.preferredSlot !== undefined && (
              <span className="ml-2 normal-case text-white/30 tracking-normal">· artist&rsquo;s preference</span>
            )}
          </label>
          <select
            value={slot}
            onChange={e => setSlot(e.target.value)}
            disabled={busy}
            aria-label="Assign to slot"
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Auto</option>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i} value={i} disabled={occupiedSlots.has(i)}>
                Slot {i + 1}{occupiedSlots.has(i) ? ' — occupied' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">
            Content notes
          </label>
          {contentNotes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {contentNotes.map(note => (
                <span key={note} className="rounded border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-white/55">
                  {contentNoteLabel(note)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">No content notes selected by the artist.</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2" data-testid="approve-error">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={confirm} disabled={busy} data-testid="confirm-approve"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {busy ? 'Approving…' : 'Approve'}
          </button>
          <button onClick={onClose} disabled={busy}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
