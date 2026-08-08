'use client';

import React from 'react';
import { AlertCircle, Loader2, UploadCloud, Volume2 } from 'lucide-react';
import type { ImageMetadata } from '../../../types/museum';
import { isAudioOutdated } from '../helpers';

/** Shown while storage catches up, so an approval is never invisible. */
export function PublishingChip() {
  return (
    <span data-testid="publishing-chip"
      className="shrink-0 flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-900/25 border border-amber-700/40 rounded-full px-2 py-0.5">
      <UploadCloud size={11} className="animate-pulse" /> Publishing…
    </span>
  );
}

export function AudioStatusBadge({ artwork, busy = false }: { artwork: ImageMetadata; busy?: boolean }) {
  if (busy) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-sky-300/90 bg-sky-950/35 border border-sky-800/40 rounded-full px-2 py-0.5"
        data-testid="audio-status">
        <Loader2 size={11} className="animate-spin" /> Generating…
      </span>
    );
  }

  if (artwork.audioUrl) {
    if (isAudioOutdated(artwork)) {
      return (
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-950/35 border border-amber-800/40 rounded-full px-2 py-0.5"
          data-testid="audio-status">
          <AlertCircle size={11} /> Audio outdated
        </span>
      );
    }

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
