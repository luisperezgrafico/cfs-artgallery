'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Loader2, Pause, RefreshCw, RotateCcw, Save,
  Trash2, UploadCloud, Volume2, X,
} from 'lucide-react';
import type { EditableArtworkFields } from '../../../lib/storage';
import { rooms } from '../../../config/roomsConfig';
import type { ImageMetadata } from '../../../types/museum';
import { artworkKey } from '../../../utils/artworkKey';
import { useAudioPlayer } from '../../../utils/useAudioPlayer';
import ContentNotesDropdown from '../../../components/ui/ContentNotesDropdown';
import { hasNarrationText, isAudioOutdated, timeAgo } from '../helpers';

export default function ArtworkManageModal({
  roomId,
  artwork,
  artworks,
  busyArtworkId,
  onClose,
  onRemove,
  onUpdate,
  onRegenerateAudio,
  onUploadAudio,
  onRemoveAudio,
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
  onUploadAudio: (roomId: string, artworkId: string, file: File) => Promise<ImageMetadata>;
  onRemoveAudio: (roomId: string, artworkId: string) => Promise<ImageMetadata>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { audioState, toggle: toggleAudio, reset: resetAudio, audioProps } = useAudioPlayer();
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
    contentNotes: artwork.contentNotes ?? [],
    link: artwork.link,
  });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [removingAudio, setRemovingAudio] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const audioUploadRef = useRef<HTMLInputElement | null>(null);
  const key = artworkKey(current);
  const room = rooms.find(r => r.id === currentRoomId);
  const busy = busyArtworkId === key || saving || regenerating || uploadingAudio || removingAudio;
  const canRegenerateAudio = hasNarrationText(current);
  const currentAudioOutdated = isAudioOutdated(current);
  const audioSourceLabel = current.audioSource === 'uploaded' ? 'Uploaded' : 'Generated';
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
          contentNotes: fields.contentNotes,
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
    resetAudio();
    try {
      const updated = await onRegenerateAudio(currentRoomId, key);
      setCurrent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate audio.');
    } finally {
      setRegenerating(false);
    }
  };

  const uploadAudio = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAudio(true);
    setError('');
    resetAudio();
    try {
      const updated = await onUploadAudio(currentRoomId, key, file);
      setCurrent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload audio.');
    } finally {
      setUploadingAudio(false);
      if (audioUploadRef.current) audioUploadRef.current.value = '';
    }
  };

  const removeAudio = async () => {
    setRemovingAudio(true);
    setError('');
    resetAudio();
    try {
      const updated = await onRemoveAudio(currentRoomId, key);
      setCurrent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove audio.');
    } finally {
      setRemovingAudio(false);
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
                <p className="text-white/35 text-xs mb-2">Content notes</p>
                <ContentNotesDropdown
                  value={fields.contentNotes}
                  onChange={value => setFields(f => ({ ...f, contentNotes: value }))}
                  disabled={busy}
                />
              </div>
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
                <div className="space-y-2">
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
                          ? `${audioSourceLabel} ${timeAgo(current.audioGeneratedAt)}`
                          : 'Audio ready'}
                    </span>
                    <audio {...audioProps} src={current.audioUrl} />
                  </div>
                  {currentAudioOutdated && (
                    <p className="text-amber-300/80 text-xs" data-testid="audio-outdated-note">
                      Text changed since this audio was added.
                    </p>
                  )}
                </div>
              ) : (
                <p className={canRegenerateAudio ? 'text-amber-300/80 text-sm' : 'text-white/30 text-sm'}>
                  {canRegenerateAudio
                    ? 'Audio is missing for this artwork.'
                    : 'Add a short or long description before generating audio.'}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button onClick={regenerateAudio} disabled={busy || !canRegenerateAudio} data-testid="regenerate-audio"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/70 text-sm transition-colors">
                  {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {regenerating ? 'Generating…' : 'Generate with AI'}
                </button>
                <input
                  ref={audioUploadRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg"
                  className="sr-only"
                  onChange={e => void uploadAudio(e.target.files?.[0])}
                  disabled={busy}
                  data-testid="upload-audio-input"
                />
                <button
                  type="button"
                  onClick={() => audioUploadRef.current?.click()}
                  disabled={busy}
                  data-testid="upload-audio-button"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/70 text-sm transition-colors">
                  {uploadingAudio ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                  {uploadingAudio ? 'Uploading…' : 'Upload audio'}
                </button>
                <button onClick={removeAudio} disabled={busy || !current.audioUrl} data-testid="remove-audio"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/70 text-sm transition-colors">
                  {removingAudio ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {removingAudio ? 'Removing…' : 'Remove audio'}
                </button>
              </div>
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
