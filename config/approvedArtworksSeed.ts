import { drawingImages } from './imagesConfig';
import type { ImageMetadata } from '../types/museum';

export function approvedArtworksSeed(roomId: string): ImageMetadata[] | null {
  if (roomId !== 'room-1') return null;

  return drawingImages
    .map((artwork, slot) => ({ artwork, slot }))
    .filter(({ artwork }) => !artwork.isEmpty)
    .map(({ artwork, slot }) => ({
      ...artwork,
      slot,
    }));
}
