import type { ImageMetadata } from '../types/museum';
import type { RoomConfig } from '../config/roomsConfig';
import { layoutRoom } from './roomLayout';

/**
 * Shareable links into the gallery.
 *
 *   /?room=room-3                          — a room
 *   /?room=room-1&art=static-silva-quieta  — one artwork (canonical: stable id)
 *   /?room=room-1&frame=2                  — legacy / hand-written, slot index
 *
 * Two identifiers, deliberately different — and this is the point of the module:
 *
 * - Resuming a visit uses `room + frameIndex` (see `utils/userPreferences`).
 *   Unchanged: the room id survives rooms being reordered, and the slot index
 *   matches the eight-slot room model, empty submit canvases included.
 * - Sharing an *artwork* uses `ImageMetadata.id` — the same stable id favourites
 *   are keyed by. A slot index points at a different picture the moment a new
 *   artwork is approved in front of it.
 *
 * A link is a destination, never a preference: opening one must not overwrite
 * the visitor's saved visit position. Nothing here touches storage — the saved
 * position is only ever read, by `utils/userPreferences`.
 */

/** What a link asks for, before it is matched against the catalogue. */
export interface GalleryLink {
  /** `?room=` — a room id from `config/roomsConfig`. */
  roomId?: string;
  /** `?art=` — the stable `ImageMetadata.id`. */
  artworkId?: string;
  /** `?frame=` — legacy slot index inside `roomId`. */
  frameIndex?: number;
}

/** A room's rendered slot list; index is the room's position in `rooms`. */
export interface LinkCatalogRoom {
  id: string;
  images: ImageMetadata[];
}

/** What a link resolves to once matched against the catalogue. */
export type LinkDestination =
  | { kind: 'room'; roomId: string; roomIndex: number }
  | { kind: 'artwork'; roomId: string; roomIndex: number; frameIndex: number };

export interface SavedVisitPosition {
  roomId: string;
  frameIndex: number;
}

function trimmed(value: string | null): string | undefined {
  const clean = value?.trim();
  return clean ? clean : undefined;
}

function parseFrameParam(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Reads the shareable-link params. Returns `null` when the URL names no
 * destination at all, which is what keeps the plain `/` visit (resume where you
 * left off) exactly as it was. A bare `?frame=` names no room, so it is not a
 * destination either.
 */
export function parseGalleryLink(
  search: { get(key: string): string | null },
): GalleryLink | null {
  const roomId = trimmed(search.get('room'));
  const artworkId = trimmed(search.get('art'));
  const frameIndex = parseFrameParam(search.get('frame'));
  if (!roomId && !artworkId) return null;
  return { roomId, artworkId, frameIndex };
}

/**
 * Matches a link against a room catalogue.
 *
 * Degrades quietly rather than breaking: an artwork whose id is no longer
 * published (removed, or never ours) opens its room as an overview, and a
 * destination we cannot find at all returns `null` so the visitor keeps the
 * default entry (their saved position) without seeing an error.
 */
export function resolveLinkDestination(
  catalog: LinkCatalogRoom[],
  link: GalleryLink | null,
): LinkDestination | null {
  if (!link) return null;

  if (link.artworkId) {
    for (let roomIndex = 0; roomIndex < catalog.length; roomIndex++) {
      const images = catalog[roomIndex].images;
      const frameIndex = images.findIndex(
        image => !image.isEmpty && image.id === link.artworkId,
      );
      if (frameIndex >= 0) {
        return { kind: 'artwork', roomId: catalog[roomIndex].id, roomIndex, frameIndex };
      }
    }
    // Gone: fall back to the room the link mentions, in overview.
  }

  const roomIndex = catalog.findIndex(room => room.id === link.roomId);
  if (roomIndex < 0) return null;
  const roomId = catalog[roomIndex].id;

  const frameIndex = link.frameIndex;
  if (frameIndex !== undefined && frameIndex < catalog[roomIndex].images.length) {
    return { kind: 'artwork', roomId, roomIndex, frameIndex };
  }

  return { kind: 'room', roomId, roomIndex };
}

/**
 * The catalogue a link can be resolved against before any fetch: each room's
 * own configured artworks, laid out over its wall slots. Room ids are static,
 * so `?room=` and the static placeholder artworks resolve on the first render.
 */
export function staticLinkCatalog(rooms: RoomConfig[]): LinkCatalogRoom[] {
  return rooms.map(room => ({ id: room.id, images: layoutRoom(room.images) }));
}

/**
 * The canonical link to a shared artwork: its stable id when it has one, and
 * the legacy slot index only for artworks that predate ids.
 */
export function artworkLinkHref(
  roomId: string,
  artwork: ImageMetadata,
  frameIndex: number,
): string {
  const params = new URLSearchParams({ room: roomId });
  if (artwork.id) params.set('art', artwork.id);
  else params.set('frame', String(frameIndex));
  return `/?${params.toString()}`;
}

export interface SavedPositionDescription {
  roomId: string;
  roomName: string;
  roomIndex: number;
  frameIndex: number;
  /** Plaque title of the saved slot, when there is an artwork on it. */
  title: string | null;
}

/**
 * Turns the saved visit position into something a visitor can recognise
 * ("Room II · Hora Incerta"). Returns `null` when there is nothing to offer:
 * no saved position, no artwork slot saved, or a room that no longer exists.
 */
export function describeSavedPosition(
  saved: SavedVisitPosition | null,
  rooms: { id: string; name: string; images: ImageMetadata[] }[],
): SavedPositionDescription | null {
  if (!saved || saved.frameIndex < 0) return null;

  const roomIndex = rooms.findIndex(room => room.id === saved.roomId);
  if (roomIndex < 0) return null;

  const room = rooms[roomIndex];
  if (saved.frameIndex >= room.images.length) return null;

  const image = room.images[saved.frameIndex];
  return {
    roomId: room.id,
    roomName: room.name,
    roomIndex,
    frameIndex: saved.frameIndex,
    title: image && !image.isEmpty ? image.title : null,
  };
}

/**
 * Whether to offer "return to where you left off". Only worth it when the
 * visitor arrived through a link (the gallery jumped somewhere they did not
 * choose) and their own saved visit is a real artwork slot somewhere else.
 * Never a modal, never blocking: just a discreet control they can ignore.
 */
export function shouldOfferVisitReturn(args: {
  arrivedViaLink: boolean;
  saved: SavedPositionDescription | null;
  currentRoomId: string;
  currentFrameIndex: number;
}): boolean {
  const { arrivedViaLink, saved, currentRoomId, currentFrameIndex } = args;
  if (!arrivedViaLink || !saved) return false;
  return !(saved.roomId === currentRoomId && saved.frameIndex === currentFrameIndex);
}
