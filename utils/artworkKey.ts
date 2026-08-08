import type { ImageMetadata } from '../types/museum';

/**
 * Stable identity for an artwork, used by the admin panel and by React keys.
 *
 * Approved artworks carry `id` (copied from the submission at approval time).
 * Artworks approved before ids existed fall back to their blob URL, which is
 * unique per submission. Never use the array index: positions shift on delete.
 */
export function artworkKey(artwork: ImageMetadata): string {
  return artwork.id ?? artwork.url;
}
