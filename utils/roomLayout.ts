import { ImageMetadata } from '../types/museum';
import { ROOM_CAPACITY } from '../config/roomConfig';

const EMPTY_SLOT: ImageMetadata = {
  url: '', title: '', artist: '', date: '', link: '',
  aspectRatio: 1,
  isEmpty: true,
};

/**
 * Lays a room's artworks out over exactly ROOM_CAPACITY wall slots, so empty
 * positions render as "submit your work" canvases.
 *
 * An artwork with a `slot` is hung at that position — that's the canvas the
 * artist submitted through, and moving their piece elsewhere is a small betrayal
 * of what they chose. Everything else fills the remaining slots in order.
 */
export function layoutRoom(images: ImageMetadata[]): ImageMetadata[] {
  if (images.length >= ROOM_CAPACITY) return images;

  const slots: (ImageMetadata | null)[] = Array(ROOM_CAPACITY).fill(null);
  const unplaced: ImageMetadata[] = [];

  for (const image of images) {
    const wanted = image.slot;
    if (wanted !== undefined && wanted >= 0 && wanted < ROOM_CAPACITY && slots[wanted] === null) {
      slots[wanted] = image;
    } else {
      unplaced.push(image);
    }
  }

  let next = 0;
  for (const image of unplaced) {
    while (next < ROOM_CAPACITY && slots[next] !== null) next++;
    if (next >= ROOM_CAPACITY) break;   // room is full; the rest are dropped
    slots[next] = image;
  }

  return slots.map(image => image ?? EMPTY_SLOT);
}

/**
 * The next non-empty slot after `fromIndex`, or -1 if none remain. A gap can
 * sit anywhere a pinned slot leaves a hole, not just trail at the end of the
 * room — used by the guided tour to skip "submit your work" canvases.
 */
export function findNextRealIndex(images: ImageMetadata[], fromIndex: number): number {
  for (let i = fromIndex + 1; i < images.length; i++) {
    if (!images[i]?.isEmpty) return i;
  }
  return -1;
}

/** The previous non-empty slot before `fromIndex`, or -1 when already first. */
export function findPreviousRealIndex(images: ImageMetadata[], fromIndex: number): number {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (!images[i]?.isEmpty) return i;
  }
  return -1;
}
