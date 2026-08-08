'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Eye, X, ChevronDown, ChevronUp,
  Plus, Trash2, Send, Save, Loader2, AlertCircle, RefreshCw, UploadCloud,
  SlidersHorizontal, Volume2, Pause, RotateCcw,
} from 'lucide-react';
import type { AudioSettings, EditableArtworkFields, Submission, GallerySettings } from '../../lib/storage';
import { rooms } from '../../config/roomsConfig';
import type { ImageMetadata } from '../../types/museum';
import { artworkKey } from '../../utils/artworkKey';
import { hasArtworks } from './adminState';
import { useAdminData, type AdminData } from './useAdminData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Image lightbox ────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose} aria-label="Close">
        <X size={24} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Full size artwork" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({
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
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-white font-semibold text-base">Approve &ldquo;{submission.title}&rdquo;</h3>

        {submission.shortDescription && (
          <p className="text-white/50 text-xs italic">&ldquo;{submission.shortDescription}&rdquo;</p>
        )}

        {(preferredRoom || preferredSlot) && (
          <p className="text-white/35 text-xs">
            Artist preference: {[preferredRoom, preferredSlot].filter(Boolean).join(' · ')}
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

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  submission,
  onConfirm,
  onClose,
}: {
  submission: Submission;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="reject-modal">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-white font-semibold text-base">Reject &ldquo;{submission.title}&rdquo;</h3>

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
            Note to the artist <span className="normal-case text-white/30">(optional)</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} disabled={busy}
            aria-label="Note to the artist"
            placeholder="Added to the rejection email if provided…" rows={3}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2" data-testid="reject-error">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={confirm} disabled={busy} data-testid="confirm-reject"
            className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {busy ? 'Rejecting…' : 'Reject'}
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

// ── Submission card ───────────────────────────────────────────────────────────

function SubmissionCard({
  submission,
  onApprove,
  onReject,
}: {
  submission: Submission;
  onApprove: (s: Submission) => void;
  onReject: (s: Submission) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      {lightbox && <Lightbox url={submission.imageUrl} onClose={() => setLightbox(false)} />}
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden"
        data-testid="submission-card" data-submission-id={submission.id}>
        <div className="flex gap-4 p-4">
          <button onClick={() => setLightbox(true)} title="View full image"
            className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-zinc-800 relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={submission.imageUrl} alt={submission.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye size={18} className="text-white" />
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{submission.title}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {submission.artist}
              {submission.medium ? ` · ${submission.medium}` : ''}
              {submission.year ? ` · ${submission.year}` : ''}
            </p>
            <p className="text-white/35 text-xs mt-1">{timeAgo(submission.submittedAt)}</p>

            {(submission.shortDescription || submission.statement) && (
              <button onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-white/45 hover:text-white/70 text-xs mt-2 transition-colors">
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Hide' : 'Read statement'}
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-2">
            {submission.shortDescription && (
              <p className="text-white/70 text-xs italic border-t border-white/10 pt-3">
                &ldquo;{submission.shortDescription}&rdquo;
              </p>
            )}
            {submission.statement && (
              <p className="text-white/55 text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-2">
                {submission.statement}
              </p>
            )}
          </div>
        )}

        <div className="flex border-t border-white/10">
          <button onClick={() => onApprove(submission)} data-testid="approve-button"
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-emerald-400 hover:bg-emerald-900/30 transition-colors">
            <CheckCircle size={15} /> Approve
          </button>
          <div className="w-px bg-white/10" />
          <button onClick={() => onReject(submission)} data-testid="reject-button"
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-red-400 hover:bg-red-900/30 transition-colors">
            <XCircle size={15} /> Reject
          </button>
        </div>
      </div>
    </>
  );
}

// ── Submissions tab (presentational) ──────────────────────────────────────────

function SubmissionsTab({
  submissions,
  artworks,
  onApprove,
  onReject,
}: {
  submissions: Submission[];
  artworks: Record<string, ImageMetadata[]>;
  onApprove: (s: Submission, roomId: string, slot: number | null) => Promise<void>;
  onReject: (s: Submission, reason: string) => Promise<void>;
}) {
  const [activeModal, setActiveModal] = useState<{ submission: Submission; type: 'approve' | 'reject' } | null>(null);

  if (submissions.length === 0) {
    return <div className="text-center py-20 text-white/35 text-sm" data-testid="submissions-empty">No pending submissions.</div>;
  }

  return (
    <>
      {activeModal?.type === 'approve' && (
        <ApproveModal
          submission={activeModal.submission}
          artworks={artworks}
          onConfirm={async (roomId, slot) => { await onApprove(activeModal.submission, roomId, slot); setActiveModal(null); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.type === 'reject' && (
        <RejectModal
          submission={activeModal.submission}
          onConfirm={async reason => { await onReject(activeModal.submission, reason); setActiveModal(null); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {submissions.map(s => (
          <SubmissionCard key={s.id} submission={s}
            onApprove={s => setActiveModal({ submission: s, type: 'approve' })}
            onReject={s => setActiveModal({ submission: s, type: 'reject' })}
          />
        ))}
      </div>
    </>
  );
}

// ── Approved tab (presentational) ─────────────────────────────────────────────

/** Shown while storage catches up, so an approval is never invisible. */
function PublishingChip() {
  return (
    <span data-testid="publishing-chip"
      className="shrink-0 flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-900/25 border border-amber-700/40 rounded-full px-2 py-0.5">
      <UploadCloud size={11} className="animate-pulse" /> Publishing…
    </span>
  );
}

function sortArtworksForAdmin(list: ImageMetadata[]): ImageMetadata[] {
  return [...list].sort((a, b) => {
    const aSlot = a.slot ?? Number.POSITIVE_INFINITY;
    const bSlot = b.slot ?? Number.POSITIVE_INFINITY;
    if (aSlot !== bSlot) return aSlot - bSlot;
    return a.title.localeCompare(b.title);
  });
}

function hasNarrationText(artwork: ImageMetadata): boolean {
  return !!(artwork.shortDescription?.trim() || artwork.longDescription?.trim());
}

function AudioStatusBadge({ artwork, busy = false }: { artwork: ImageMetadata; busy?: boolean }) {
  if (busy) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-sky-300/90 bg-sky-950/35 border border-sky-800/40 rounded-full px-2 py-0.5"
        data-testid="audio-status">
        <Loader2 size={11} className="animate-spin" /> Generating…
      </span>
    );
  }

  if (artwork.audioUrl) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-emerald-300/85 bg-emerald-950/30 border border-emerald-800/35 rounded-full px-2 py-0.5"
        data-testid="audio-status">
        <Volume2 size={11} /> Audio ready
      </span>
    );
  }

  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-950/35 border border-amber-800/40 rounded-full px-2 py-0.5"
      data-testid="audio-status">
      <AlertCircle size={11} /> Audio missing
    </span>
  );
}

function ArtworkManageModal({
  roomId,
  artwork,
  artworks,
  busyArtworkId,
  onClose,
  onRemove,
  onUpdate,
  onRegenerateAudio,
}: {
  roomId: string;
  artwork: ImageMetadata;
  artworks: Record<string, ImageMetadata[]>;
  busyArtworkId: string | null;
  onClose: () => void;
  onRemove: (roomId: string, artworkId: string) => Promise<void>;
  onUpdate: (
    roomId: string,
    artworkId: string,
    input: { targetRoomId: string; slot?: number; fields: Partial<EditableArtworkFields> },
  ) => Promise<ImageMetadata>;
  onRegenerateAudio: (roomId: string, artworkId: string) => Promise<ImageMetadata>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused' | 'ended' | 'error'>('idle');
  const [currentRoomId, setCurrentRoomId] = useState(roomId);
  const [current, setCurrent] = useState(artwork);
  const [targetRoomId, setTargetRoomId] = useState(roomId);
  const [slotDraft, setSlotDraft] = useState(artwork.slot !== undefined ? String(artwork.slot) : '');
  const [fields, setFields] = useState<Required<EditableArtworkFields>>({
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    medium: artwork.medium ?? '',
    shortDescription: artwork.shortDescription ?? '',
    longDescription: artwork.longDescription ?? '',
    link: artwork.link,
  });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const key = artworkKey(current);
  const room = rooms.find(r => r.id === currentRoomId);
  const busy = busyArtworkId === key || saving || regenerating;
  const canRegenerateAudio = hasNarrationText(current);
  const occupiedSlots = new Set((artworks[targetRoomId] ?? [])
    .filter(item => artworkKey(item) !== key && item.slot !== undefined)
    .map(item => item.slot as number));

  const slotOccupiedInRoom = (nextRoomId: string, slot: string) =>
    slot !== ''
    && (artworks[nextRoomId] ?? []).some(item =>
      artworkKey(item) !== key && item.slot === Number(slot));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [busy, onClose]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggleAudio = async () => {
    const player = audioRef.current;
    if (!player) return;

    if (audioState === 'playing') {
      player.pause();
      setAudioState('paused');
      return;
    }

    if (audioState === 'ended') player.currentTime = 0;

    try {
      await player.play();
      setAudioState('playing');
    } catch {
      setAudioState('error');
    }
  };

  const remove = async () => {
    await onRemove(currentRoomId, key);
    onClose();
  };

  const saveChanges = async () => {
    if (!fields.title.trim() || !fields.artist.trim()) {
      setError('Title and artist are required.');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await onUpdate(currentRoomId, key, {
        targetRoomId,
        slot: slotDraft === '' ? undefined : Number(slotDraft),
        fields: {
          title: fields.title.trim(),
          artist: fields.artist.trim(),
          date: fields.date.trim(),
          medium: fields.medium.trim(),
          shortDescription: fields.shortDescription.trim(),
          longDescription: fields.longDescription.trim(),
          link: fields.link.trim(),
        },
      });
      setCurrent(updated);
      setCurrentRoomId(targetRoomId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const regenerateAudio = async () => {
    setRegenerating(true);
    setError('');
    setAudioState('idle');
    audioRef.current?.pause();
    try {
      const updated = await onRegenerateAudio(currentRoomId, key);
      setCurrent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate audio.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="manage-artwork-modal">
      <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/10">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-base truncate">Manage &ldquo;{current.title}&rdquo;</h3>
            <p className="text-white/45 text-xs mt-1">
              {room?.name ?? roomId}
              {current.slot !== undefined ? ` · slot ${current.slot + 1}` : ''}
            </p>
          </div>
          <button onClick={onClose} disabled={busy}
            className="shrink-0 text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors"
            aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <div className="aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={current.title} className="w-full h-full object-cover" />
            </div>
            <a href={current.url} target="_blank" rel="noopener noreferrer"
              className="block text-center text-xs text-white/45 hover:text-white/70 underline">
              Open image
            </a>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2" data-testid="manage-error">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <section className="space-y-3">
              <h4 className="text-white/45 text-xs font-semibold uppercase tracking-widest">Artwork</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-white/35 text-xs mb-1">Title</p>
                  <input aria-label="Artwork title" value={fields.title} onChange={e => setFields(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="text-white/35 text-xs mb-1">Artist</p>
                  <input aria-label="Artist" value={fields.artist} onChange={e => setFields(f => ({ ...f, artist: e.target.value }))}
                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="text-white/35 text-xs mb-1">Date</p>
                  <input aria-label="Artwork date" value={fields.date} onChange={e => setFields(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="text-white/35 text-xs mb-1">Medium</p>
                  <input aria-label="Medium" value={fields.medium} onChange={e => setFields(f => ({ ...f, medium: e.target.value }))}
                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-white/45 text-xs font-semibold uppercase tracking-widest">Placement</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-white/35 text-xs mb-1">Room</p>
                  <select aria-label="Room" value={targetRoomId} onChange={e => {
                    const nextRoomId = e.target.value;
                    setTargetRoomId(nextRoomId);
                    if (slotOccupiedInRoom(nextRoomId, slotDraft)) setSlotDraft('');
                  }}
                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm">
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-white/35 text-xs mb-1">Slot</p>
                  <select aria-label="Slot" value={slotDraft} onChange={e => setSlotDraft(e.target.value)}
                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <option value="">Auto</option>
                    {Array.from({ length: 8 }, (_, i) => (
                      <option key={i} value={i} disabled={occupiedSlots.has(i)}>
                        Slot {i + 1}{occupiedSlots.has(i) ? ' — occupied' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-white/45 text-xs font-semibold uppercase tracking-widest">Descriptions</h4>
              <textarea aria-label="Short description" value={fields.shortDescription} rows={3}
                onChange={e => setFields(f => ({ ...f, shortDescription: e.target.value }))}
                placeholder="Short description"
                className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y" />
              <textarea aria-label="Long description" value={fields.longDescription} rows={7}
                onChange={e => setFields(f => ({ ...f, longDescription: e.target.value }))}
                placeholder="Long description"
                className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y" />
              <div>
                <p className="text-white/35 text-xs mb-1">External link</p>
                <input aria-label="External link" value={fields.link} onChange={e => setFields(f => ({ ...f, link: e.target.value }))}
                  className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveChanges} disabled={busy} data-testid="save-artwork"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {saved && <span className="text-emerald-400 text-xs">Saved</span>}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-white/45 text-xs font-semibold uppercase tracking-widest">Audio</h4>
              {current.audioUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={toggleAudio}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white/80 text-sm transition-colors"
                    data-testid="manage-audio-button">
                    {audioState === 'playing'
                      ? <Pause size={14} />
                      : audioState === 'ended'
                        ? <RotateCcw size={14} />
                        : <Volume2 size={14} />}
                    {audioState === 'playing' ? 'Pause' : audioState === 'ended' ? 'Replay' : 'Play audio'}
                  </button>
                  <span className={`text-xs ${audioState === 'error' ? 'text-red-400' : 'text-white/35'}`}>
                    {audioState === 'error'
                      ? 'Audio unavailable'
                      : current.audioGeneratedAt
                        ? `Generated ${timeAgo(current.audioGeneratedAt)}`
                        : 'Audio ready'}
                  </span>
                  <audio
                    ref={audioRef}
                    src={current.audioUrl}
                    preload="none"
                    onEnded={() => setAudioState('ended')}
                    onPause={() => setAudioState(state => state === 'playing' ? 'paused' : state)}
                    onError={() => setAudioState('error')}
                  />
                </div>
              ) : (
                <p className={canRegenerateAudio ? 'text-amber-300/80 text-sm' : 'text-white/30 text-sm'}>
                  {canRegenerateAudio
                    ? 'Audio is missing for this artwork.'
                    : 'Add a short or long description before generating audio.'}
                </p>
              )}
              <button onClick={regenerateAudio} disabled={busy || !canRegenerateAudio} data-testid="regenerate-audio"
                className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/70 text-sm transition-colors">
                {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {regenerating ? 'Regenerating…' : 'Regenerate audio'}
              </button>
            </section>

            <section className="space-y-3 border-t border-white/10 pt-5">
              <h4 className="text-red-300/70 text-xs font-semibold uppercase tracking-widest">Danger</h4>
              {confirmDelete ? (
                <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3 space-y-3" data-testid="delete-modal">
                  <p className="text-white/70 text-sm">&ldquo;{current.title}&rdquo; will be removed from the gallery. This cannot be undone.</p>
                  <div className="flex gap-3">
                    <button onClick={remove} disabled={busy} data-testid="confirm-delete"
                      className="flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                      {busy ? 'Removing…' : 'Remove'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} disabled={busy}
                      className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-white/70 rounded-lg px-4 py-2 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} disabled={busy}
                  data-testid="delete-button"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 bg-red-950/30 hover:bg-red-950/50 border border-red-800/40 rounded-lg transition-colors disabled:opacity-40">
                  <Trash2 size={14} /> Remove from gallery
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApprovedTab({
  artworks,
  publishingIds,
  publishingSubmissions,
  busyArtworkId,
  actionError,
  onRemove,
  onUpdate,
  onRegenerateAudio,
}: {
  artworks: Record<string, ImageMetadata[]>;
  publishingIds: string[];
  publishingSubmissions: Submission[];
  busyArtworkId: string | null;
  actionError: string;
  onRemove: (roomId: string, artworkId: string) => Promise<void>;
  onUpdate: (
    roomId: string,
    artworkId: string,
    input: { targetRoomId: string; slot?: number; fields: Partial<EditableArtworkFields> },
  ) => Promise<ImageMetadata>;
  onRegenerateAudio: (roomId: string, artworkId: string) => Promise<ImageMetadata>;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [manageArtwork, setManageArtwork] = useState<{ roomId: string; artwork: ImageMetadata } | null>(null);

  if (!hasArtworks(artworks) && publishingSubmissions.length === 0) {
    return <div className="text-center py-20 text-white/35 text-sm" data-testid="approved-empty">No approved artworks yet. Approve a submission to add one.</div>;
  }

  return (
    <>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      {manageArtwork && (
        <ArtworkManageModal
          roomId={manageArtwork.roomId}
          artwork={manageArtwork.artwork}
          artworks={artworks}
          busyArtworkId={busyArtworkId}
          onClose={() => setManageArtwork(null)}
          onRemove={onRemove}
          onUpdate={onUpdate}
          onRegenerateAudio={onRegenerateAudio}
        />
      )}

      {/* A failed delete rolls the row back; without this the artwork would just
          reappear with no explanation. */}
      {actionError && !manageArtwork && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2 mb-4" data-testid="approved-error">
          <AlertCircle size={13} /> {actionError}
        </div>
      )}

      {publishingIds.length > 0 && (
        <p className="text-amber-300/70 text-xs mb-4 flex items-center gap-2" data-testid="publishing-banner">
          <UploadCloud size={13} />
          {publishingIds.length === 1 ? 'One artwork is' : `${publishingIds.length} artworks are`} still
          being published. They are already approved — this clears by itself.
        </p>
      )}

      {publishingSubmissions.length > 0 && (
        <section className="mb-8" data-testid="publishing-section">
          <div className="space-y-2">
            {publishingSubmissions.map(s => (
              <div key={s.id} data-testid="publishing-row" data-artwork-id={s.id}
                className="flex items-center gap-3 bg-zinc-900/60 border border-amber-700/25 rounded-xl px-4 py-3">
                <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover opacity-60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate">{s.title}</p>
                  <p className="text-white/40 text-xs truncate">
                    {s.artist}
                    {s.approvedRoom ? ` · ${rooms.find(r => r.id === s.approvedRoom)?.name ?? s.approvedRoom}` : ''}
                  </p>
                </div>
                <PublishingChip />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8">
        {rooms.map(room => {
          const list = sortArtworksForAdmin(artworks[room.id] ?? []);
          if (list.length === 0) return null;
          return (
            <section key={room.id} data-testid="approved-room" data-room-id={room.id}>
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">{room.name}</h3>
              <div className="space-y-2">
                {list.map(artwork => {
                  const key = artworkKey(artwork);
                  return (
                    <div key={key} data-testid="artwork-row" data-artwork-id={key}
                      className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3">
                      <button onClick={() => setLightbox(artwork.url)} className="shrink-0 w-10 h-10 rounded overflow-hidden bg-zinc-800 group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={artwork.url} alt={artwork.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={12} className="text-white" />
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{artwork.title}</p>
                        <p className="text-white/50 text-xs truncate">
                          {artwork.artist}{artwork.date ? ` · ${artwork.date}` : ''}{artwork.medium ? ` · ${artwork.medium}` : ''}
                          {artwork.slot !== undefined ? ` · slot ${artwork.slot + 1}` : ''}
                        </p>
                      </div>
                      {publishingIds.includes(key) && <PublishingChip />}
                      <AudioStatusBadge artwork={artwork} busy={busyArtworkId === key} />
                      <button
                        onClick={() => setManageArtwork({ roomId: room.id, artwork })}
                        disabled={!!busyArtworkId}
                        data-testid="manage-button"
                        className="shrink-0 inline-flex items-center gap-1.5 text-white/40 hover:text-white/75 disabled:opacity-40 transition-colors px-2 py-1 text-xs"
                        title="Manage artwork"
                      >
                        <SlidersHorizontal size={14} /> Manage
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  type DisplaySettings = GallerySettings & { resendApiKeySet?: boolean };
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((data: DisplaySettings) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      moderatorEmails: settings.moderatorEmails,
      approvalTemplate: settings.approvalTemplate,
      rejectionTemplate: settings.rejectionTemplate,
    };
    if (apiKeyDraft) body.resendApiKey = apiKeyDraft;
    await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    setSaved(true);
    setApiKeyDraft('');
    setTimeout(() => setSaved(false), 2500);
  };

  const sendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const to = settings?.moderatorEmails[0];
      if (!to) { setTestResult('fail'); return; }
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }),
      });
      setTestResult(res.ok ? 'ok' : 'fail');
    } catch { setTestResult('fail'); }
    finally { setTesting(false); setTimeout(() => setTestResult(null), 4000); }
  };

  const addEmail = () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@') || settings?.moderatorEmails.includes(email)) return;
    setSettings(s => s ? { ...s, moderatorEmails: [...s.moderatorEmails, email] } : s);
    setNewEmail('');
  };

  if (loading || !settings) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/40" /></div>;

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Resend API key ── */}
      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Email — Resend</h3>
        <div>
          <label className="block text-xs text-white/40 mb-1">API key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyDraft || (settings.resendApiKeySet ? '••••••••••••••••••••••••' : '')}
              onChange={e => setApiKeyDraft(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxx"
              className="flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button onClick={() => setShowKey(s => !s)}
              className="px-3 text-white/40 hover:text-white/70 bg-zinc-800 border border-white/10 rounded-lg text-xs transition-colors">
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button onClick={sendTestEmail} disabled={testing || (!settings.resendApiKeySet && !apiKeyDraft)}
              className="flex items-center gap-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white/70 hover:text-white border border-white/10 rounded-lg text-xs transition-colors disabled:opacity-40">
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {testResult === 'ok' ? 'Sent!' : testResult === 'fail' ? 'Failed' : 'Test'}
            </button>
          </div>
          <p className="text-white/25 text-xs mt-1">
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 underline">resend.com</a>
          </p>
        </div>
      </section>

      {/* ── Moderator emails ── */}
      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Moderators</h3>
        <p className="text-white/35 text-xs">Notified when a new artwork is submitted.</p>
        <div className="space-y-2">
          {settings.moderatorEmails.map(email => (
            <div key={email} className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-white/80">{email}</span>
              <button onClick={() => setSettings(s => s ? { ...s, moderatorEmails: s.moderatorEmails.filter(e => e !== email) } : s)}
                className="text-white/30 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              placeholder="Add email address"
              className="flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <button onClick={addEmail}
              className="flex items-center gap-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white/60 hover:text-white text-xs transition-colors">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </section>

      {/* ── Email templates ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Email templates</h3>
          <p className="text-white/25 text-xs">{'{{artist}}'} {'{{title}}'} {'{{gallery_url}}'}</p>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Approval</label>
          <textarea value={settings.approvalTemplate} rows={6}
            onChange={e => setSettings(s => s ? { ...s, approvalTemplate: e.target.value } : s)}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y font-mono" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Rejection</label>
          <textarea value={settings.rejectionTemplate} rows={6}
            onChange={e => setSettings(s => s ? { ...s, rejectionTemplate: e.target.value } : s)}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y font-mono" />
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved</span>}
      </div>
    </div>
  );
}

// ── Developer tab ─────────────────────────────────────────────────────────────

type DisplayAudioSettings = AudioSettings & {
  local: AudioSettings['local'] & { apiKeySet?: boolean };
  openai: AudioSettings['openai'] & { apiKeySet?: boolean };
  elevenlabs: AudioSettings['elevenlabs'] & { apiKeySet?: boolean };
};

function DeveloperTab({ onReset }: { onReset: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const [message, setMessage] = useState('');
  const [audioSettings, setAudioSettings] = useState<DisplayAudioSettings | null>(null);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioSaving, setAudioSaving] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [localApiKeyDraft, setLocalApiKeyDraft] = useState('');
  const [openAiApiKeyDraft, setOpenAiApiKeyDraft] = useState('');
  const [elevenLabsApiKeyDraft, setElevenLabsApiKeyDraft] = useState('');

  useEffect(() => {
    fetch('/api/admin/developer/audio-settings')
      .then(async res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json() as Promise<DisplayAudioSettings>;
      })
      .then(data => setAudioSettings(data))
      .catch(() => setAudioMessage('Failed to load audio settings.'))
      .finally(() => setAudioLoading(false));
  }, []);

  const resetRoomOne = async () => {
    setBusy(true);
    setResult(null);
    setMessage('');
    try {
      await onReset();
      setResult('ok');
      setMessage('Room I reset with template artworks.');
    } catch (err) {
      setResult('fail');
      setMessage(err instanceof Error ? err.message : 'Failed to reset Room I.');
    } finally {
      setBusy(false);
    }
  };

  const saveAudioSettings = async () => {
    if (!audioSettings) return;
    setAudioSaving(true);
    setAudioMessage('');
    try {
      const res = await fetch('/api/admin/developer/audio-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...audioSettings,
          local: { ...audioSettings.local, apiKey: localApiKeyDraft },
          openai: { ...audioSettings.openai, apiKey: openAiApiKeyDraft },
          elevenlabs: { ...audioSettings.elevenlabs, apiKey: elevenLabsApiKeyDraft },
        }),
      });
      const data = await res.json().catch(() => null) as
        | { ok?: boolean; error?: string; audioSettings?: DisplayAudioSettings }
        | null;
      if (!res.ok || !data?.ok || !data.audioSettings) {
        throw new Error(data?.error ?? 'Failed to save audio settings.');
      }
      setAudioSettings(data.audioSettings);
      setLocalApiKeyDraft('');
      setOpenAiApiKeyDraft('');
      setElevenLabsApiKeyDraft('');
      setAudioMessage('Audio settings saved.');
    } catch (err) {
      setAudioMessage(err instanceof Error ? err.message : 'Failed to save audio settings.');
    } finally {
      setAudioSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Audio model</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-4">
          {audioLoading || !audioSettings ? (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading audio settings…
            </div>
          ) : (
            <>
              <div>
                <p className="text-white/35 text-xs mb-1">Provider</p>
                <select
                  value={audioSettings.provider}
                  onChange={e => setAudioSettings(s => s ? { ...s, provider: e.target.value as AudioSettings['provider'] } : s)}
                  className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
                  data-testid="audio-provider"
                >
                  <option value="local">Local OpenAI-compatible</option>
                  <option value="openai">OpenAI</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {audioSettings.provider === 'local' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">Base URL</p>
                    <input value={audioSettings.local.baseUrl}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, baseUrl: e.target.value } } : s)}
                      placeholder="http://127.0.0.1:8010/v1"
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Model</p>
                    <input value={audioSettings.local.model}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, model: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Voice</p>
                    <input value={audioSettings.local.voice}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, voice: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Format</p>
                    <input value={audioSettings.local.format}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, format: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Timeout ms</p>
                    <input type="number" value={audioSettings.local.timeoutMs}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, timeoutMs: Number(e.target.value) } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">API key</p>
                    <input value={localApiKeyDraft} onChange={e => setLocalApiKeyDraft(e.target.value)}
                      placeholder={audioSettings.local.apiKeySet ? 'Saved API key' : 'Optional'}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {audioSettings.provider === 'openai' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">Base URL</p>
                    <input value={audioSettings.openai.baseUrl}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, baseUrl: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Model</p>
                    <input value={audioSettings.openai.model}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, model: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Voice</p>
                    <input value={audioSettings.openai.voice}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, voice: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Format</p>
                    <input value={audioSettings.openai.format}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, format: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Timeout ms</p>
                    <input type="number" value={audioSettings.openai.timeoutMs}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, timeoutMs: Number(e.target.value) } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">API key</p>
                    <input value={openAiApiKeyDraft} onChange={e => setOpenAiApiKeyDraft(e.target.value)}
                      placeholder={audioSettings.openai.apiKeySet ? 'Saved API key' : 'Paste API key'}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {audioSettings.provider === 'elevenlabs' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">API key</p>
                    <input value={elevenLabsApiKeyDraft} onChange={e => setElevenLabsApiKeyDraft(e.target.value)}
                      placeholder={audioSettings.elevenlabs.apiKeySet ? 'Saved API key' : 'Paste ElevenLabs API key'}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">Voice ID</p>
                    <input value={audioSettings.elevenlabs.voiceId}
                      onChange={e => setAudioSettings(s => s ? { ...s, elevenlabs: { ...s.elevenlabs, voiceId: e.target.value } } : s)}
                      placeholder="JBFqnCBsd6RMkjVDRZzb"
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Model ID</p>
                    <input value={audioSettings.elevenlabs.modelId}
                      onChange={e => setAudioSettings(s => s ? { ...s, elevenlabs: { ...s.elevenlabs, modelId: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Output format</p>
                    <input value={audioSettings.elevenlabs.outputFormat}
                      onChange={e => setAudioSettings(s => s ? { ...s, elevenlabs: { ...s.elevenlabs, outputFormat: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Timeout ms</p>
                    <input type="number" value={audioSettings.elevenlabs.timeoutMs}
                      onChange={e => setAudioSettings(s => s ? { ...s, elevenlabs: { ...s.elevenlabs, timeoutMs: Number(e.target.value) } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={saveAudioSettings} disabled={audioSaving} data-testid="save-audio-settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition-colors">
                  {audioSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {audioSaving ? 'Saving…' : 'Save audio settings'}
                </button>
                {audioMessage && (
                  <span className={`text-xs ${audioMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}
                    data-testid="audio-settings-result">
                    {audioMessage}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Mock data</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-white text-sm font-medium">Reset Room I with template artworks</p>
            <p className="text-white/40 text-xs mt-1">
              Replaces Room I&rsquo;s approved artworks with the built-in mock/template set for testing.
            </p>
          </div>
          <button onClick={resetRoomOne} disabled={busy} data-testid="reset-room-1-seed"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/80 text-sm transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {busy ? 'Resetting…' : 'Reset Room I mocks'}
          </button>
          {message && (
            <p className={result === 'ok' ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'} data-testid="developer-result">
              {message}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

type Tab = 'submissions' | 'approved' | 'settings' | 'developer';
type AdminRole = 'admin' | 'dev';

function TabBar({
  tab,
  onSelect,
  counts,
  role,
}: {
  tab: Tab;
  onSelect: (t: Tab) => void;
  counts: { submissions: number; approved: number };
  role: AdminRole;
}) {
  const tabs: Tab[] = role === 'dev'
    ? ['submissions', 'approved', 'settings', 'developer']
    : ['submissions', 'approved', 'settings'];

  return (
    <nav className="border-b border-white/10 px-6">
      <div className="flex">
        {tabs.map(t => (
          <button key={t} onClick={() => onSelect(t)} data-testid={`tab-${t}`}
            className={`px-4 py-3 text-sm capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-white text-white' : 'border-transparent text-white/45 hover:text-white/70'
            }`}>
            {t}
            {t === 'submissions' && counts.submissions > 0 && (
              <span className="ml-2 text-xs text-white/40" data-testid="count-submissions">{counts.submissions}</span>
            )}
            {t === 'approved' && counts.approved > 0 && (
              <span className="ml-2 text-xs text-white/40" data-testid="count-approved">{counts.approved}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('submissions');
  const [role, setRole] = useState<AdminRole>('admin');

  // One store for the whole panel, mounted here so tab switches never remount
  // it: the tabs below are pure views over this state.
  const { state, refresh, approve, reject, remove, updateArtwork, regenerateAudio }: AdminData = useAdminData();

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.json())
      .then((data: { role?: AdminRole }) => setRole(data.role === 'dev' ? 'dev' : 'admin'))
      .catch(() => setRole('admin'));
  }, []);

  const handleApprove = async (submission: Submission, roomId: string, slot: number | null) => {
    await approve(submission, roomId, slot);
    setTab('approved');
  };

  const resetRoomOneSeed = async () => {
    const res = await fetch('/api/admin/developer/reset-room-1', { method: 'POST' });
    const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? 'Failed to reset Room I.');
    }
    await refresh({ quiet: true });
  };

  const approvedCount = Object.values(state.artworks).reduce((n, list) => n + list.length, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm tracking-wide">ME/CFS Gallery — Admin</span>
        <button onClick={() => refresh()} disabled={state.loading} data-testid="refresh"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors"
          title="Reload from the server">
          <RefreshCw size={13} className={state.loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <TabBar tab={tab} onSelect={setTab} counts={{ submissions: state.submissions.length, approved: approvedCount }} role={role} />

      <main className="px-6 py-6" data-testid="admin-main" data-loading={state.loading ? 'true' : 'false'}>
        {state.loading && (
          <div className="flex items-center justify-center py-20" data-testid="dashboard-loading">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        )}

        {!state.loading && state.loadError && (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-red-400 text-sm" data-testid="load-error">{state.loadError}</p>
            <button onClick={() => refresh()} className="text-white/50 text-xs underline">Retry</button>
          </div>
        )}

        {!state.loading && !state.loadError && (
          <>
            {tab === 'submissions' && (
              <SubmissionsTab submissions={state.submissions} artworks={state.artworks} onApprove={handleApprove} onReject={reject} />
            )}
            {tab === 'approved' && (
              <ApprovedTab
                artworks={state.artworks}
                publishingIds={state.publishingArtworkIds}
                publishingSubmissions={state.publishingSubmissions}
                busyArtworkId={state.busyArtworkId}
                actionError={state.actionError}
                onRemove={remove}
                onUpdate={updateArtwork}
                onRegenerateAudio={regenerateAudio}
              />
            )}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'developer' && <DeveloperTab onReset={resetRoomOneSeed} />}
          </>
        )}
      </main>
    </div>
  );
}
