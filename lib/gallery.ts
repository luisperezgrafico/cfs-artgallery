export interface Artwork {
  slug: string;
  title: string;
  artist: string;
  medium: string;
  description: string;
  image: string;
  /** physical size of the piece in the room, meters */
  width: number;
  height: number;
}

export interface RoomTheme {
  fog: string;
  floor: string;
  panel: string;
  frame: string;
  accent: string;
}

export interface Room {
  name: string;
  theme: RoomTheme;
  artworks: Artwork[];
}

export interface Viewpoint {
  position: [number, number, number];
  look: [number, number, number];
}

/** Room layout: artworks float on an arc facing its center. */
const RADIUS = 7;
const SPREAD = Math.PI * 0.9; // arc covered by the artworks (~162°)
const ART_Y = 1.7; // artwork center height
const EYE = 1.5; // visitor eye height
const VIEW_DIST = 2.4; // how close a viewpoint stands to its artwork

export interface Placement {
  position: [number, number, number];
  rotY: number;
}

export function artworkPlacement(i: number, n: number): Placement {
  const a = n === 1 ? 0 : -SPREAD / 2 + (SPREAD * i) / (n - 1);
  const x = Math.sin(a) * RADIUS;
  const z = -Math.cos(a) * RADIUS;
  return { position: [x, ART_Y, z], rotY: Math.atan2(-x, -z) };
}

export const OVERVIEW: Viewpoint = {
  position: [0, 2.3, 5.2],
  look: [0, 1.4, -5],
};

export function viewpointFor(i: number, n: number): Viewpoint {
  const [x, y, z] = artworkPlacement(i, n).position;
  const k = (RADIUS - VIEW_DIST) / RADIUS;
  return { position: [x * k, EYE, z * k], look: [x, y, z] };
}

/** Viewpoint 0 is the room overview; 1..n stand in front of each artwork. */
export function viewpoints(room: Room): Viewpoint[] {
  const n = room.artworks.length;
  return [OVERVIEW, ...room.artworks.map((_, i) => viewpointFor(i, n))];
}
