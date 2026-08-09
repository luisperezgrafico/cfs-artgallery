'use client';

import React, { useState } from 'react';
import { AlertCircle, Eye, SlidersHorizontal, UploadCloud } from 'lucide-react';
import type { EditableArtworkFields, Submission } from '../../../lib/storage';
import { rooms } from '../../../config/roomsConfig';
import type { ImageMetadata } from '../../../types/museum';
import { artworkKey } from '../../../utils/artworkKey';
import { hasArtworks } from '../adminState';
import { sortArtworksForAdmin } from '../helpers';
import Lightbox from '../components/Lightbox';
import ArtworkManageModal from '../components/ArtworkManageModal';
import { AudioStatusBadge, PublishingChip } from '../components/AudioStatusBadge';

export default function ApprovedTab({
  artworks,
  publishingIds,
  publishingSubmissions,
  busyArtworkId,
  actionError,
  onRemove,
  onUpdate,
  onRegenerateAudio,
  onUploadAudio,
  onRemoveAudio,
  onUpdateAudioDuration,
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
  onUploadAudio: (roomId: string, artworkId: string, file: File, durationSec?: number) => Promise<ImageMetadata>;
  onRemoveAudio: (roomId: string, artworkId: string) => Promise<ImageMetadata>;
  onUpdateAudioDuration: (roomId: string, artworkId: string, durationSec: number) => Promise<ImageMetadata | null>;
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
          onUploadAudio={onUploadAudio}
          onRemoveAudio={onRemoveAudio}
          onUpdateAudioDuration={onUpdateAudioDuration}
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
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {publishingIds.includes(key) && <PublishingChip />}
                        <button
                          onClick={() => setManageArtwork({ roomId: room.id, artwork })}
                          disabled={!!busyArtworkId}
                          data-testid="manage-button"
                          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/75 disabled:opacity-40 transition-colors px-2 py-1 text-xs"
                          title="Manage artwork"
                        >
                          <SlidersHorizontal size={14} /> Manage
                        </button>
                        <AudioStatusBadge artwork={artwork} busy={busyArtworkId === key} />
                      </div>
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
