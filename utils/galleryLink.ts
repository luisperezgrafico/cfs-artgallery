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
 * The frame a room opens on.
 *
 * Always the overview. Dropping the visitor inside an artwork would decide for
 * them before they know where they are: they land on a picture filling the
 * screen with no room around it, having asked for nothing. The saved position
 * is not lost by this — it is *offered*, by "Start the Tour" (which reads it
 * through `getInitialFrameIndex`) and by the return chip — it just no longer
 * places the camera on arrival.
 *
 * A link's own destination is the exception, because there the sender asked for
 * that artwork: `?frame=` arrives as a pending tour target and opens on it, and
 * `?art=` places itself once the live catalogue is in (`SharedLinkResolver`).
 */
export function entryFrameIndex(
  pendingTourTarget: { roomId: string; frameIndex: number } | null,
  roomId: string,
): number {
  return pendingTourTarget?.roomId === roomId ? pendingTourTarget.frameIndex : -1;
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

/** A link to a room: `/?room=room-3`. */
export function roomLinkHref(roomId: string): string {
  return `/?${new URLSearchParams({ room: roomId }).toString()}`;
}

/**
 * The link the share control hands out for an artwork: canonical, by stable id.
 *
 * An artwork with no id cannot be shared *as an artwork*. The only other thing
 * the format can carry is a slot index, and that silently points at a different
 * picture the moment one is approved in front of it — the exact lie the
 * canonical link exists to avoid, and one the visitor cannot see happening. So
 * it degrades to the room, which always opens where the artwork hangs and never
 * claims to show something it does not.
 */
export function artworkShareHref(
  roomId: string,
  artwork: ImageMetadata,
  frameIndex: number,
): string {
  return artwork.id ? artworkLinkHref(roomId, artwork, frameIndex) : roomLinkHref(roomId);
}

/**
 * The same link, absolute.
 *
 * A share sheet or a clipboard needs a full URL, and the gallery runs on
 * localhost, on a tailnet and on Vercel — so the origin is read from the page
 * at the moment of sharing, never hardcoded.
 */
export function absoluteGalleryUrl(href: string, origin: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}${href.startsWith('/') ? href : `/${href}`}`;
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
 * Where a visit opened: its room, and the frame that placed the visitor there
 * (`null` when the visit opened on the room overview).
 *
 * On a shared link this is the sender's destination; on a plain visit it is the
 * restored room at its overview. Either way the visitor did not drive
 * themselves here, so it must not be mistaken for navigation — which is why it
 * is a value compared by identity rather than a one-shot flag (a double-invoked
 * effect under React strict mode would defeat the flag).
 */
export interface EntryLanding {
  roomId: string;
  frameIndex: number | null;
}

/**
 * Whether this (room, frame) is still where the visit opened.
 * The landing is not the visitor navigating: it is the same distinction the
 * visit-position persistence makes, and both need it — the persistence so it
 * does not save a link's frame over the visitor's position, the offer below so
 * it is not dismissed on arrival.
 */
export function isEntryLanding(
  landing: EntryLanding | null,
  roomId: string,
  frameIndex: number,
): boolean {
  if (!landing) return false;
  return landing.roomId === roomId && frameIndex === (landing.frameIndex ?? -1);
}

/**
 * The offer to return to where the visitor was before this visit began.
 *
 * `beforeEntry` is captured exactly once, when the link is opened, and is never
 * read from storage again: the visit-position persistence keeps overwriting the
 * stored position as the visitor moves, so re-reading would turn the offer into
 * "go back to where you were ten seconds ago" — and, every time a room change
 * remounts the chip, into an endless ping-pong between two rooms.
 *
 * `navigated` and `dismissed` are one-way: once the offer is over it is over for
 * the session.
 */
export interface VisitReturnState {
  /** Where the visitor was when the link was opened. Captured at entry, never re-read. */
  beforeEntry: SavedVisitPosition | null;
  /** The visitor has navigated for themselves since landing. */
  navigated: boolean;
  /** The visitor closed the offer. */
  dismissed: boolean;
}

export function initialVisitReturnState(
  savedAtEntry: SavedVisitPosition | null,
): VisitReturnState {
  return { beforeEntry: savedAtEntry, navigated: false, dismissed: false };
}

/** The visitor moved on their own: the offer is over. */
export function withVisitorNavigation(state: VisitReturnState): VisitReturnState {
  return state.navigated ? state : { ...state, navigated: true };
}

/** The visitor closed the chip: it stays closed. */
export function withDismissal(state: VisitReturnState): VisitReturnState {
  return state.dismissed ? state : { ...state, dismissed: true };
}

/**
 * Whether to offer "return to where you left off".
 *
 * Offered on every visit that lands anywhere other than the saved position,
 * not only on the visits that arrive through a shared link: a plain visit
 * restores the room the visitor left but always opens on its overview, so the
 * artwork they were on is one they can only reach by starting the tour — the
 * offer is that shortcut.
 *
 * One rule: the offer belongs to the moment of landing, and it is over the
 * instant the visitor navigates for themselves — another artwork, starting the
 * tour, another room. By then they have decided where they want to be, and
 * offering them somewhere else is noise. Never a modal, never blocking: just a
 * discreet control they can also close early.
 */
export function shouldOfferVisitReturn(args: {
  saved: SavedPositionDescription | null;
  currentRoomId: string;
  currentFrameIndex: number;
  visitorNavigated: boolean;
  dismissed: boolean;
}): boolean {
  const { saved, currentRoomId, currentFrameIndex, visitorNavigated, dismissed } = args;
  if (!saved) return false;
  if (visitorNavigated || dismissed) return false;
  // Already standing on the artwork the offer would take them to.
  return !(saved.roomId === currentRoomId && saved.frameIndex === currentFrameIndex);
}
