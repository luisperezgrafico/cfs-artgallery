import type { ImageMetadata } from '../../types/museum';
import { audioTextSignature } from '../../utils/audioNarrationText';

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function sortArtworksForAdmin(list: ImageMetadata[]): ImageMetadata[] {
  return [...list].sort((a, b) => {
    const aSlot = a.slot ?? Number.POSITIVE_INFINITY;
    const bSlot = b.slot ?? Number.POSITIVE_INFINITY;
    if (aSlot !== bSlot) return aSlot - bSlot;
    return a.title.localeCompare(b.title);
  });
}

export function hasNarrationText(artwork: ImageMetadata): boolean {
  return !!(artwork.shortDescription?.trim() || artwork.longDescription?.trim());
}

export function isAudioOutdated(artwork: ImageMetadata): boolean {
  if (!artwork.audioUrl) return false;
  if (!artwork.audioTextSignature) return true;
  return audioTextSignature(artwork) !== artwork.audioTextSignature;
}
