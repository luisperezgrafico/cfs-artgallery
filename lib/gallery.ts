// Room geometry constants — shared by content files and 3D components
export const ROOM = {
  W: 11,       // width (x: -5.5 to +5.5)
  D: 8,        // depth (z: -4 to +4)
  H: 3.8,      // ceiling height
  DOOR_W: 2.2, // doorway width
  DOOR_H: 3.0, // doorway height
  ART_Y: 1.85, // artwork center height
  EYE_H: 1.55, // camera eye height
  VIEW_DIST: 2.3, // distance camera stands from artwork
} as const;

export type WallId = 'back' | 'left' | 'right';
export type RoomVariant = 'lobby' | 'warm' | 'cool' | 'dark';

export interface Artwork {
  slug: string;
  title: string;
  artist: string;
  medium: string;
  description: string;
  image: string;
  width: number;
  height: number;
}

export interface WallSlot {
  wall: WallId;
  /** position along wall from center, in metres */
  offset: number;
  /** artwork slug from the room's artworks map, or null = blank canvas */
  artworkSlug: string | null;
}

export interface RoomTheme {
  fog: string;
  fogNear: number;
  fogFar: number;
  walls: string;
  floor: string;
  ceiling: string;
  trim: string;
  accent: string;
  ambientColor: string;
  ambientIntensity: number;
  dirLightColor: string;
  dirLightIntensity: number;
}

export interface RoomData {
  slug: string;
  name: string;
  variant: RoomVariant;
  theme: RoomTheme;
  slots: WallSlot[];
  artworks: Record<string, Artwork>;
}

export interface GalleryRoom {
  slug: string;
  name: string;
  variant: RoomVariant;
}

export interface GalleryManifest {
  title: string;
  tagline: string;
  rooms: GalleryRoom[];
}

export interface Placement {
  position: [number, number, number];
  rotY: number;
}

export interface Viewpoint {
  position: [number, number, number];
  look: [number, number, number];
}

const WALL_GAP = 0.06; // artwork sits just off the wall surface

export function slotPlacement(slot: WallSlot): Placement {
  const { W, D, ART_Y } = ROOM;
  switch (slot.wall) {
    case 'back':
      return { position: [slot.offset, ART_Y, -D / 2 + WALL_GAP], rotY: 0 };
    case 'left':
      // rotY = PI/2 → normal faces +x (into room)
      return { position: [-W / 2 + WALL_GAP, ART_Y, slot.offset], rotY: Math.PI / 2 };
    case 'right':
      // rotY = -PI/2 → normal faces -x (into room)
      return { position: [W / 2 - WALL_GAP, ART_Y, slot.offset], rotY: -Math.PI / 2 };
  }
}

export function viewpointForSlot(slot: WallSlot): Viewpoint {
  const p = slotPlacement(slot);
  const [ax, ay, az] = p.position;
  const { EYE_H, VIEW_DIST } = ROOM;
  // artwork normal after rotY: (sin(rotY), 0, cos(rotY))
  // viewer stands along that normal
  const vx = ax + Math.sin(p.rotY) * VIEW_DIST;
  const vz = az + Math.cos(p.rotY) * VIEW_DIST;
  return { position: [vx, EYE_H, vz], look: [ax, ay, az] };
}

/** Standing in the center of the room looking at the artwork wall */
export const ROOM_OVERVIEW: Viewpoint = {
  position: [0, 1.65, 0],
  look: [0, 1.65, -3.8],
};

/** Just inside the doorway — camera snaps here then glides to ROOM_OVERVIEW */
export const ROOM_ENTRANCE: Viewpoint = {
  position: [0, 1.65, 3.0],
  look: [0, 1.65, 0],
};

/** Standing in the lobby center, looking at the three portals */
export const LOBBY_OVERVIEW: Viewpoint = {
  position: [0, 1.65, 0.5],
  look: [0, 1.6, -3.5],
};

/** Shared state type — exported so both Gallery and Overlay can import it */
export type GalleryState =
  | { scene: 'lobby' }
  | { scene: 'walking'; to: string }
  | { scene: 'room'; roomSlug: string; slotIndex: number };

// ── Single-scene world layout ─────────────────────────────────────────────────
// Lobby at world origin. Room B straight back (−z). Rooms A and C to the sides.
// Each room's local z=+4 (front wall/door) faces the connecting corridor.

export interface RoomTransform {
  offset: [number, number, number];
  rotY: number;
}

export const ROOM_TRANSFORMS: Record<string, RoomTransform> = {
  'room-a': { offset: [-16, 0, 0], rotY:  Math.PI / 2 },
  'room-b': { offset: [0, 0, -16], rotY:  0            },
  'room-c': { offset: [16, 0, 0],  rotY: -Math.PI / 2  },
};

export function localToWorld(
  local: [number, number, number],
  offset: [number, number, number],
  rotY: number,
): [number, number, number] {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const [lx, ly, lz] = local;
  return [
    offset[0] + c * lx + s * lz,
    offset[1] + ly,
    offset[2] + (-s * lx + c * lz),
  ];
}

export function worldRoomOverview(t: RoomTransform): Viewpoint {
  return {
    position: localToWorld(ROOM_OVERVIEW.position, t.offset, t.rotY),
    look:     localToWorld(ROOM_OVERVIEW.look,     t.offset, t.rotY),
  };
}

export function worldViewpointForSlot(slot: WallSlot, t: RoomTransform): Viewpoint {
  const local = viewpointForSlot(slot);
  return {
    position: localToWorld(local.position, t.offset, t.rotY),
    look:     localToWorld(local.look,     t.offset, t.rotY),
  };
}
