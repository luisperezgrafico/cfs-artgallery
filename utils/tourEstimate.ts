import { ImageMetadata } from '../types/museum';
import { buildNarrationTextFromSource } from './audioNarrationText';

/** Camera glide between two artworks, folded into every per-artwork estimate. */
const TRANSITION_SECONDS = 3;

/** Narration reading pace used when an artwork has no measured audioDurationSec yet. */
const WORDS_PER_SECOND = 2.5;

export const DWELL_SECONDS_OPTIONS = [10, 20, 40] as const;
export type DwellSeconds = typeof DWELL_SECONDS_OPTIONS[number];
export const DEFAULT_DWELL_SECONDS: DwellSeconds = 20;

export function isDwellSeconds(value: unknown): value is DwellSeconds {
  return typeof value === 'number' && (DWELL_SECONDS_OPTIONS as readonly number[]).includes(value);
}

function narrationSecondsFor(artwork: ImageMetadata): number {
  if (artwork.audioDurationSec && artwork.audioDurationSec > 0) return artwork.audioDurationSec;

  const text = buildNarrationTextFromSource(artwork);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return words / WORDS_PER_SECOND;
}

/**
 * Deterministic per-room estimate. `narrated` mirrors what actually drives
 * advancement in the guided tour (§4 of docs/guided-tour.md): audio-length when
 * narration is on, the dwell timer when it's off.
 */
export function estimateRoomSeconds(
  images: ImageMetadata[],
  { narrated, dwellSeconds }: { narrated: boolean; dwellSeconds: number },
): number {
  const artworks = images.filter(image => !image.isEmpty);
  if (artworks.length === 0) return 0;

  return artworks.reduce((total, artwork) => {
    const perArtwork = narrated ? Math.max(narrationSecondsFor(artwork), dwellSeconds / 2) : dwellSeconds;
    return total + perArtwork + TRANSITION_SECONDS;
  }, 0);
}

/** Always vague on purpose — "about 6 minutes", never a clock. */
export function formatEstimate(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'a moment';
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `about ${minutes} min`;
}
