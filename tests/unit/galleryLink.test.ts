import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeEach } from 'vitest';
import { rooms } from '../../config/roomsConfig';
import type { ImageMetadata } from '../../types/museum';
import {
  absoluteGalleryUrl,
  artworkLinkHref,
  artworkShareHref,
  describeSavedPosition,
  entryFrameIndex,
  initialVisitReturnState,
  isEntryLanding,
  parseGalleryLink,
  resolveLinkDestination,
  roomLinkHref,
  shouldOfferVisitReturn,
  staticLinkCatalog,
  withDismissal,
  withVisitorNavigation,
} from '../../utils/galleryLink';
import {
  getInitialFrameIndex,
  getInitialRoomIndex,
  readVisitPosition,
  saveVisitPosition,
} from '../../utils/userPreferences';

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

describe('return-visit chip copy', () => {
  it('uses concise mobile copy and reserves saved location details for desktop', () => {
    const chip = readFileSync(new URL('../../components/ui/ResumeVisitChip.tsx', import.meta.url), 'utf8');

    expect(chip).toContain('>Return to your last visit</span>');
    expect(chip).toContain('hidden sm:inline text-xs text-[var(--floating-muted)] truncate');
    expect(chip).toContain('{saved.roomName}');
    expect(chip).toContain('· {saved.title}');
    expect(chip).not.toContain('>Return to your visit</span>');

    const mobileCapture = readFileSync(new URL('../../scripts/mobile-state-capture.cjs', import.meta.url), 'utf8');
    expect(mobileCapture).toContain('[aria-label^="Return to your last visit"]');
  });
});

describe('entering the gallery: the room is resumed, the artwork is not', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { localStorage: fakeStorage() };
  });

  it('opens on the room overview on a plain visit, saved position or not', () => {
    saveVisitPosition('room-1', 5);

    // Nothing on a plain visit asks for a frame: not the saved position, not a link.
    expect(entryFrameIndex(null, 'room-1')).toBe(-1);

    // The saved frame is not lost — it is what "Start the Tour" offers, and only
    // that. Handing it to the camera on arrival is the behaviour being removed.
    expect(getInitialFrameIndex('room-1', 8)).toBe(5);
  });

  it('still restores the room the visitor left', () => {
    saveVisitPosition('room-3', 5);

    expect(getInitialRoomIndex(rooms)).toBe(2);
    // ... and that room opens on its overview, not on the saved slot.
    expect(entryFrameIndex(null, 'room-3')).toBe(-1);
  });

  it('still opens on the artwork a link asked for', () => {
    // `?frame=` reaches the room as its pending tour target.
    expect(entryFrameIndex({ roomId: 'room-1', frameIndex: 2 }, 'room-1')).toBe(2);
    // A target belonging to another room places nothing here.
    expect(entryFrameIndex({ roomId: 'room-2', frameIndex: 2 }, 'room-1')).toBe(-1);
  });

  it('leaves the frame resume to "Start the Tour", not to the entry path', () => {
    // Source-level guard for the behaviour above: the gallery may only be placed
    // on a frame by a link, and the resume offer reads the saved position itself.
    const gallery = readFileSync(new URL('../../components/Gallery.tsx', import.meta.url), 'utf8');
    expect(gallery).toContain('entryFrameIndex');
    expect(gallery).not.toContain('getInitialFrameIndex');

    const entryModal = readFileSync(
      new URL('../../components/ui/TourEntryModal.tsx', import.meta.url), 'utf8',
    );
    expect(entryModal).toContain('getInitialFrameIndex');
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

describe('artworkShareHref: what the share control hands out', () => {
  it('shares a room link for a room', () => {
    expect(roomLinkHref('room-3')).toBe('/?room=room-3');
    // The link a room link produces must resolve back to that room.
    expect(resolve('room=room-3')).toEqual({ kind: 'room', roomId: 'room-3', roomIndex: 2 });
  });

  it('shares the canonical id link for an artwork that has one', () => {
    const artwork = rooms[0].images[2];
    expect(artworkShareHref('room-1', artwork, 2)).toBe('/?room=room-1&art=static-silva-quieta');
    // Which is the artwork it says it is — not merely a slot that happens to
    // hold it today.
    expect(resolve('room=room-1&art=static-silva-quieta')).toMatchObject({
      kind: 'artwork',
      roomId: 'room-1',
      frameIndex: 2,
    });
  });

  it('shares the room instead of an index for an artwork without a stable id', () => {
    const { id: _ignored, ...withoutId } = rooms[0].images[0];
    const href = artworkShareHref('room-2', withoutId as ImageMetadata, 4);

    // Not `?frame=4`: that would open whichever artwork sits in the fourth slot
    // by the time the recipient clicks, and silently hand them a different
    // picture. The room always opens where the artwork actually hangs.
    expect(href).toBe('/?room=room-2');
    expect(href).not.toContain('frame');
    expect(resolve(href.slice(2))).toEqual({ kind: 'room', roomId: 'room-2', roomIndex: 1 });
  });
});

describe('absoluteGalleryUrl: the origin is the page\'s own', () => {
  it('makes a gallery path absolute against whatever origin it is given', () => {
    const href = artworkShareHref('room-1', rooms[0].images[2], 2);

    expect(absoluteGalleryUrl(href, 'http://localhost:3002'))
      .toBe('http://localhost:3002/?room=room-1&art=static-silva-quieta');
    expect(absoluteGalleryUrl(href, 'https://gallery.tailnet.ts.net'))
      .toBe('https://gallery.tailnet.ts.net/?room=room-1&art=static-silva-quieta');
    // A trailing slash on the origin must not double up.
    expect(absoluteGalleryUrl(href, 'https://cfs-gallery.vercel.app/'))
      .toBe('https://cfs-gallery.vercel.app/?room=room-1&art=static-silva-quieta');
  });

  it('still produces a usable URL from a bare path', () => {
    expect(absoluteGalleryUrl('?room=room-1', 'http://localhost:3002'))
      .toBe('http://localhost:3002/?room=room-1');
  });
});

describe('the offer to return to the saved visit', () => {
  const catalogImages = (roomId: string) => staticLinkCatalog(rooms).find(r => r.id === roomId)!.images;
  const described = (position: { roomId: string; frameIndex: number }) => describeSavedPosition(
    position,
    rooms.map(room => ({ id: room.id, name: room.name, images: catalogImages(room.id) })),
  );
  const saved = described({ roomId: 'room-2', frameIndex: 7 });
  const offered = (args: {
    saved?: typeof saved;
    currentRoomId?: string;
    currentFrameIndex?: number;
    visitorNavigated?: boolean;
    dismissed?: boolean;
  }) => shouldOfferVisitReturn({
    saved,
    currentRoomId: 'room-1',
    currentFrameIndex: -1,
    visitorNavigated: false,
    dismissed: false,
    ...args,
  });

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

  it('is offered on a plain visit too, whenever the saved position is elsewhere', () => {
    // A plain visit restores the room but opens on its overview, so the saved
    // artwork is never where the visitor already stands.
    expect(offered({ currentRoomId: 'room-2', currentFrameIndex: -1 })).toBe(true);
    // The room is the one they are in: the offer is the shortcut to that artwork.
    expect(offered({ currentRoomId: 'room-1', currentFrameIndex: -1 })).toBe(true);
    // Arriving through a link is no longer a special case — same rule.
    expect(offered({ currentRoomId: 'room-1', currentFrameIndex: 3 })).toBe(true);

    // Already standing on the saved artwork.
    expect(offered({ currentRoomId: 'room-2', currentFrameIndex: 7 })).toBe(false);
    // Nothing saved, or nothing describable (unknown room, a negative slot — the
    // visitor had left the tour or was sitting at the bench — a slot past the end
    // of the room): the offer would lead nowhere, so there is no offer.
    expect(offered({ saved: null })).toBe(false);
    expect(offered({ currentRoomId: 'room-2', currentFrameIndex: -1, saved: described({ roomId: 'room-2', frameIndex: -1 }) })).toBe(false);
    expect(offered({ currentRoomId: 'room-2', currentFrameIndex: -1, saved: described({ roomId: 'room-2', frameIndex: 99 }) })).toBe(false);
    expect(offered({ currentRoomId: 'room-2', currentFrameIndex: -1, saved: described({ roomId: 'room-gone', frameIndex: 2 }) })).toBe(false);
  });

  describe('lifecycle', () => {
    const state = () => initialVisitReturnState({ roomId: 'room-2', frameIndex: 7 });

    it('offers the position captured at entry, and keeps offering it while the visitor only looks around', () => {
      const entry = state();
      expect(entry.beforeEntry).toEqual({ roomId: 'room-2', frameIndex: 7 });
      // Still at the landing: the visitor has not navigated, so the offer stands.
      expect(offered({ visitorNavigated: entry.navigated, dismissed: entry.dismissed })).toBe(true);
    });

    it('stops offering as soon as the visitor navigates, and never comes back', () => {
      const navigated = withVisitorNavigation(state());
      expect(navigated.navigated).toBe(true);
      expect(offered({ visitorNavigated: navigated.navigated, dismissed: navigated.dismissed })).toBe(false);

      // Further movement (or a room change remounting the chip) cannot revive it.
      const again = withVisitorNavigation(navigated);
      expect(again).toBe(navigated);
      expect(offered({
        visitorNavigated: again.navigated,
        dismissed: again.dismissed,
        currentRoomId: 'room-3',
        currentFrameIndex: 2,
      })).toBe(false);
    });

    it('keeps the offered position untouched while the visitor moves around', () => {
      // Navigating must not rewrite *what* was offered: it only ends the offer.
      const navigated = withVisitorNavigation(state());
      expect(navigated.beforeEntry).toEqual(state().beforeEntry);

      // And however far they wander, that is still where the chip would take them.
      const description = describeSavedPosition(
        navigated.beforeEntry,
        rooms.map(room => ({ id: room.id, name: room.name, images: catalogImages(room.id) })),
      );
      expect(description).toMatchObject({ roomId: 'room-2', frameIndex: 7, roomName: 'Room II' });
    });

    it('stays closed once the visitor closes it', () => {
      const dismissed = withDismissal(state());
      expect(offered({ dismissed: dismissed.dismissed })).toBe(false);
      expect(withDismissal(dismissed)).toBe(dismissed);
      // Closing is not navigating: the two facts are independent.
      expect(dismissed.navigated).toBe(false);
    });

    it('never captures a position the visitor never had', () => {
      expect(initialVisitReturnState(null)).toEqual({ beforeEntry: null, navigated: false, dismissed: false });
      expect(offered({ saved: null })).toBe(false);
    });

    it('captures the saved position exactly once, and never from the chip', () => {
      // The chip remounts on every room change; reading storage there is what
      // turned the offer into "go back to where you were ten seconds ago".
      const chip = readFileSync(new URL('../../components/ui/ResumeVisitChip.tsx', import.meta.url), 'utf8');
      expect(chip).not.toContain('readVisitPosition');
      expect(chip).toContain('visitReturn');

      // One read, at entry, above the per-room remount boundary — and on every
      // visit, not only on link arrivals: a plain visit opens on the overview,
      // and this offer is the shortcut back to its artwork.
      const roomContext = readFileSync(new URL('../../contexts/RoomContext.tsx', import.meta.url), 'utf8');
      expect(roomContext.match(/readVisitPosition\(/g)).toHaveLength(1);
      expect(roomContext).toContain('initialVisitReturnState(readVisitPosition())');
    });
  });
});

describe('the visit landing is not the visitor navigating', () => {
  it('recognises the room a room-link landed on, overview included', () => {
    // A link to a room lands on the overview: no frame, and still the landing.
    expect(isEntryLanding({ roomId: 'room-3', frameIndex: null }, 'room-3', -1)).toBe(true);
    expect(isEntryLanding({ roomId: 'room-3', frameIndex: null }, 'room-3', 0)).toBe(false);
    expect(isEntryLanding({ roomId: 'room-3', frameIndex: null }, 'room-1', -1)).toBe(false);
  });

  it('recognises the artwork a frame link landed on', () => {
    expect(isEntryLanding({ roomId: 'room-1', frameIndex: 4 }, 'room-1', 4)).toBe(true);
    expect(isEntryLanding({ roomId: 'room-1', frameIndex: 4 }, 'room-1', 5)).toBe(false);
    expect(isEntryLanding({ roomId: 'room-1', frameIndex: 4 }, 'room-1', -1)).toBe(false);
  });

  it('recognises the restored room a plain visit opened on', () => {
    // A plain visit lands on the overview of the room it restored.
    const plain = { roomId: 'room-1', frameIndex: null };
    expect(isEntryLanding(plain, 'room-1', -1)).toBe(true);
    // Stepping into a frame is the visitor's own move, and so is another room:
    // the offer must end there rather than follow them around.
    expect(isEntryLanding(plain, 'room-1', 0)).toBe(false);
    expect(isEntryLanding(plain, 'room-3', -1)).toBe(false);
  });

  it('has no landing to recognise without one', () => {
    expect(isEntryLanding(null, 'room-1', -1)).toBe(false);
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
