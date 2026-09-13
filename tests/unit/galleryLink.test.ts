import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeEach } from 'vitest';
import { rooms } from '../../config/roomsConfig';
import type { ImageMetadata } from '../../types/museum';
import {
  artworkLinkHref,
  describeSavedPosition,
  parseGalleryLink,
  resolveLinkDestination,
  shouldOfferVisitReturn,
  staticLinkCatalog,
} from '../../utils/galleryLink';
import { readVisitPosition, saveVisitPosition } from '../../utils/userPreferences';

const catalog = staticLinkCatalog(rooms);

const link = (query: string) => parseGalleryLink(new URLSearchParams(query));
const resolve = (query: string) => resolveLinkDestination(catalog, link(query));

describe('parseGalleryLink', () => {
  it('reads a room link', () => {
    expect(link('room=room-3')).toEqual({ roomId: 'room-3' });
  });

  it('reads an artwork link by its stable id, plus the legacy slot index', () => {
    expect(link('room=room-1&art=static-silva-quieta')).toEqual({
      roomId: 'room-1',
      artworkId: 'static-silva-quieta',
    });
    expect(link('room=room-1&frame=2')).toEqual({ roomId: 'room-1', frameIndex: 2 });
  });

  it('ignores junk instead of inventing a destination', () => {
    expect(link('frame=not-a-number')).toBeNull();
    expect(link('frame=')).toBeNull();
    // A slot index with no room names nothing.
    expect(link('frame=3')).toBeNull();
    expect(link('')).toBeNull();
  });
});

describe('resolveLinkDestination', () => {
  it('opens the room the link names', () => {
    expect(resolve('room=room-3')).toEqual({ kind: 'room', roomId: 'room-3', roomIndex: 2 });
  });

  it('opens the artwork the link names, by id, at its slot', () => {
    // Room I's third configured artwork (drawingImages[2]) — not its index in
    // the URL: the link carries the id, the slot is derived from the catalogue.
    expect(resolve('room=room-1&art=static-silva-quieta')).toEqual({
      kind: 'artwork',
      roomId: 'room-1',
      roomIndex: 0,
      frameIndex: 2,
    });
  });

  it('lets the artwork id decide the room when the link disagrees', () => {
    const swapped = [
      { id: 'room-1', images: [empty(), empty()] },
      { id: 'room-2', images: [image('moved-artwork')] },
    ];
    expect(resolveLinkDestination(swapped, link('room=room-1&art=moved-artwork'))).toEqual({
      kind: 'artwork',
      roomId: 'room-2',
      roomIndex: 1,
      frameIndex: 0,
    });
  });

  it('lands on the artwork by id alone, without a room param', () => {
    expect(resolve('art=static-noctis-figura')).toEqual({
      kind: 'artwork',
      roomId: 'room-1',
      roomIndex: 0,
      frameIndex: 4,
    });
  });

  it('accepts the legacy slot index', () => {
    expect(resolve('room=room-1&frame=5')).toEqual({
      kind: 'artwork',
      roomId: 'room-1',
      roomIndex: 0,
      frameIndex: 5,
    });
  });

  it('degrades an artwork that no longer exists to its room overview', () => {
    // Removed, or an id we never published: the room still opens, quietly.
    expect(resolve('room=room-1&art=withdrawn-last-year')).toEqual({
      kind: 'room',
      roomId: 'room-1',
      roomIndex: 0,
    });
    expect(resolve('room=room-3&art=withdrawn-last-year')).toEqual({
      kind: 'room',
      roomId: 'room-3',
      roomIndex: 2,
    });
  });

  it('degrades an out-of-range slot index to the room overview', () => {
    expect(resolve('room=room-3&frame=99')).toEqual({
      kind: 'room',
      roomId: 'room-3',
      roomIndex: 2,
    });
  });

  it('resolves nothing for a link that names nothing (default entry stays)', () => {
    expect(resolve('')).toBeNull();
    expect(resolve('room=room-does-not-exist')).toBeNull();
    expect(resolve('art=withdrawn-last-year')).toBeNull();
    expect(resolveLinkDestination(catalog, null)).toBeNull();
  });
});

describe('a link never rewrites the saved visit position', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { localStorage: fakeStorage() };
  });

  it('keeps the visitor where they were after opening a room or artwork link', () => {
    saveVisitPosition('room-2', 7);

    // The whole entry path a link goes through: parse, then resolve.
    expect(resolve('room=room-1')).toEqual({ kind: 'room', roomId: 'room-1', roomIndex: 0 });
    expect(resolve('room=room-1&art=static-lux-perpetua')).toMatchObject({ kind: 'artwork' });
    expect(resolve('room=room-1&frame=3')).toMatchObject({ kind: 'artwork' });
    expect(resolve('room=room-does-not-exist')).toBeNull();

    expect(readVisitPosition()).toEqual({
      roomId: 'room-2',
      frameIndex: 7,
      updatedAt: expect.any(Number),
    });
  });

  it('keeps the entry point itself free of any visit-position write', () => {
    // Source-level guard for the behaviour above: the door goes through
    // parseGalleryLink only, so it cannot save over the visitor's position.
    const door = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8');
    expect(door).toContain('parseGalleryLink');
    expect(door).not.toContain('saveVisitPosition');
  });
});

describe('artworkLinkHref', () => {
  it('shares an artwork by its stable id', () => {
    const artwork = rooms[0].images[2];
    expect(artworkLinkHref('room-1', artwork, 2)).toBe('/?room=room-1&art=static-silva-quieta');
  });

  it('falls back to the slot index for artworks that predate ids', () => {
    const { id: _ignored, ...withoutId } = rooms[0].images[0];
    expect(artworkLinkHref('room-2', withoutId as ImageMetadata, 4)).toBe('/?room=room-2&frame=4');
  });
});

describe('the offer to return to the saved visit', () => {
  const saved = describeSavedPosition(
    { roomId: 'room-2', frameIndex: 7 },
    rooms.map(room => ({ id: room.id, name: room.name, images: staticLinkCatalog(rooms).find(r => r.id === room.id)!.images })),
  );

  it('describes a saved position in room + slot terms the visitor can recognise', () => {
    expect(saved).toMatchObject({ roomId: 'room-2', roomName: 'Room II', roomIndex: 1, frameIndex: 7 });
  });

  it('has nothing to describe without a saved or an existing position', () => {
    const names = rooms.map(room => ({ id: room.id, name: room.name, images: [] }));
    expect(describeSavedPosition(null, names)).toBeNull();
    expect(describeSavedPosition({ roomId: 'room-2', frameIndex: -1 }, names)).toBeNull();
    expect(describeSavedPosition({ roomId: 'room-gone', frameIndex: 2 }, names)).toBeNull();
    expect(describeSavedPosition({ roomId: 'room-2', frameIndex: 99 }, names)).toBeNull();
  });

  it('is offered only when a link took the visitor somewhere else', () => {
    expect(shouldOfferVisitReturn({
      arrivedViaLink: true, saved, currentRoomId: 'room-1', currentFrameIndex: -1,
    })).toBe(true);
    expect(shouldOfferVisitReturn({
      arrivedViaLink: true, saved, currentRoomId: 'room-2', currentFrameIndex: 3,
    })).toBe(true);
    // Not from a link: a plain visit never gets the offer.
    expect(shouldOfferVisitReturn({
      arrivedViaLink: false, saved, currentRoomId: 'room-1', currentFrameIndex: -1,
    })).toBe(false);
    // Already standing on the saved artwork.
    expect(shouldOfferVisitReturn({
      arrivedViaLink: true, saved, currentRoomId: 'room-2', currentFrameIndex: 7,
    })).toBe(false);
    expect(shouldOfferVisitReturn({
      arrivedViaLink: true, saved: null, currentRoomId: 'room-1', currentFrameIndex: -1,
    })).toBe(false);
  });
});

function image(id: string): ImageMetadata {
  return { id, url: `/art/${id}.svg`, title: id, artist: 'Someone', date: '2024', link: '#' };
}

function empty(): ImageMetadata {
  return { url: '', title: '', artist: '', date: '', link: '', aspectRatio: 1, isEmpty: true };
}

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => { data.delete(key); },
    setItem: (key: string, value: string) => { data.set(key, String(value)); },
  };
}
