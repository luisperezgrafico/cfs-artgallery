import * as THREE from 'three';

/**
 * A *pattern* laid on a room's floor — the stone each room's floor is cut from.
 *
 * Why this is not simply a `map` on `MeshReflectorMaterial`: the floor's albedo
 * is almost black (`#050505`–`#0a0806`), so a colour map has nothing to colour.
 * What the visitor sees is the reflection, and drei's shader ends with
 *
 *     diffuseColor.rgb = diffuseColor.rgb * ((1 - mirror) + reflection * mixStrength)
 *
 * i.e. **the albedo multiplies the reflection**. So a map is still a lever — not
 * as paint, but as a *multiplier on the reflection*: dim the multiplier where a
 * vein runs and the vein reads as duller stone. `albedo-map` does exactly that,
 * and pushes the floor colour by `1 / mean(field)` (the generator measures the
 * mean) so the average brightness of the floor does not move.
 *
 * That compensation is the part the earlier floor studies did not try: a map on
 * its own can only subtract, which is why it read as dead patches. Measured on
 * Room I: the compensated version holds the floor band at 30.2–30.5 against the
 * unpatterned 30.4, with the wall band unmoved (79.66), so the pattern costs no
 * brightness at all.
 *
 * One technique was tried and rejected, kept here only as a study: `overlay-mesh`
 * (a thin lit plane a few mm above the reflector) reads as waves of fog over the
 * reflection and brightens the floor band to 33.8. Do not reach for it again.
 *
 * Two registries, the same shape as `floorDesign.ts`:
 *  - `FLOOR_PATTERNS` — what a room's floor is cut from. This is what visitors see.
 *  - `FLOOR_PATTERN_STUDIES` — prototypes reachable only through `?floor=<key>`,
 *    each belonging to one room and ignored in any other.
 *
 * Cost: one 256² RGBA texture, generated once per mount and disposed on unmount;
 * nothing per frame, no assets, no dependencies. Tiles are square in metres
 * (`tile`), so a pattern does not stretch with the room's proportions.
 */

export type FloorPatternKind = 'marble-veins' | 'lime-cloud';
export type FloorPatternTechnique = 'albedo-map' | 'overlay-mesh';

export interface FloorPattern {
  id: string;
  /** The room this stone belongs to; a key never leaks into another room. */
  room: string;
  kind: FloorPatternKind;
  technique: FloorPatternTechnique;
  /**
   * `generated` (default) builds the mask in code from `kind`; `imported` loads a
   * photograph from `file`. Only the `overlay-mesh` technique has an imported
   * form, and it needs `file`.
   */
  source?: 'generated' | 'imported';
  /** Public path of the photograph, for an imported pattern. */
  file?: string;
  /** Side of one tile, in metres. */
  tile: number;
  /** How far the field dips below 1.0 at its darkest, before `gain`. */
  depth: number;
  /** Bands per tile along the room's width. Higher = closer veins. */
  bands: number;
  /**
   * Bands per tile along the room's length. Equal to `bands` runs the veins at
   * 45°; 0 rules them straight along the length; a small value gives the shallow
   * cleavage lines of slate. Both must be integers, or the tile stops wrapping.
   */
  cross: number;
  /**
   * Exponent on the band: 7 is a wide soft ridge (that one read as drifting
   * smoke, not stone), 22 a thin cut line.
   */
  sharpness: number;
  /** How far the noise drags the bands off straight, in tile widths. */
  warp: number;
  /** Share of the fine grain in the field, 0–1. The rest is the veins. */
  grain: number;
  /** `albedo-map` only: extra push on the floor colour, on top of the mean fix. */
  gain: number;
  /** `overlay-mesh` only: peak opacity of the layer. */
  opacity: number;
  /** `overlay-mesh` only: roughness of the veins, so they catch a sheen. */
  roughness: number;
  /** Colour of the overlay layer — a stone tint, never white. */
  tint: string;
}

/** Every room's own stone. A room with no entry simply has a plain floor. */
export const FLOOR_PATTERNS: Record<string, FloorPattern> = {
  'room-1': {
    // Ocre Profond, sealed waxed sienna. A sober, wide-spaced veining: enough
    // structure to read as stone, little enough to stay under the artwork. (An
    // earlier, bolder pass with two wide soft bands read as drifting smoke, and
    // a finer three-band one was busy under the paintings.)
    id: 'room-1', room: 'room-1', kind: 'marble-veins', technique: 'albedo-map',
    tile: 2.4, depth: 0.6, bands: 3, cross: 3, sharpness: 22, warp: 0.7, grain: 0.08,
    gain: 1.1, opacity: 0, roughness: 0, tint: '#2b1c11',
  },
  'room-2': {
    // Ardoise, wet polished slate — and the room where the *generated* mask was
    // abandoned: its reflection is a sharp mirror, so dimming the reflection
    // reads as stripes over a mirrored room, not as stone. What works here is a
    // photograph laid on top (study `room-2-pat-marmol-azul-suave`): a real
    // blue-black marble over the mirror, at the dose where the room's reflection
    // — its whole identity — is still legible. Measured: the floor band goes
    // 29.4 -> 52.0 with the wall band unmoved (87.6).
    id: 'room-2', room: 'room-2', kind: 'marble-veins', technique: 'overlay-mesh',
    source: 'imported', file: '/floor-pattern/marble023_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.18, roughness: 0.35, tint: '#ffffff',
  },
  'room-3': {
    // Vert Forêt — matte absorbent stone, and the room where the *choice* was
    // between two stones that both worked. The charcoal marble (study
    // `room-3-pat-negro-veta`) was dropped not for its numbers but for its
    // language: two dark veined marbles in rooms II and III read as one floor
    // moved around, and the four rooms are meant to read as four materials. A
    // smooth mottled stone with the room's own green over it separates them, at
    // the price of a brighter floor band (35.5 -> 46.9 against the room's 98.3
    // wall). Plain grey was the one that flattened the room.
    id: 'room-3', room: 'room-3', kind: 'lime-cloud', technique: 'overlay-mesh',
    source: 'imported', file: '/floor-pattern/concrete030_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.22, roughness: 0.8, tint: '#8aa38f',
  },
  'room-4': {
    // Indigo — dark polished resin, and the room where the *generated* mask fails
    // for a second reason: with one broad wave over six metres, even at depth 0.6
    // it perturbs the floor band by 0.75/255 — invisible, no matter how correct
    // the compensation is. Fine structure is what makes a generated mask read;
    // a slow gradient gives the eye nothing. So a photograph again: a poured
    // smooth surface tinted into the room's indigo. 14% of 26.6 -> 42.6 keeps
    // Room IV the darkest floor of the four, which is its whole character; at
    // 20% the indigo greys out, and the speckled terrazzo reads as chips (the
    // one thing the brief rules out). Studies: `room-4-pat-liso-indigo-*`.
    id: 'room-4', room: 'room-4', kind: 'lime-cloud', technique: 'overlay-mesh',
    source: 'imported', file: '/floor-pattern/concrete036_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.14, roughness: 0.35, tint: '#7b74ab',
  },
};

/** Prototypes: reachable through `?floor=<key>`, never drawn on an ordinary visit. */
export const FLOOR_PATTERN_STUDIES: Record<string, FloorPattern> = {
  // Room I — the three rounds it took to get to the sober veining above.
  'room-1-pat-marble': {
    id: 'room-1-pat-marble', room: 'room-1', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3, depth: 0.85, bands: 2, cross: 2, sharpness: 13, warp: 1.1, grain: 0.12,
    gain: 1.15, opacity: 0, roughness: 0, tint: '#2b1c11',
  },
  'room-1-pat-marble-fine': {
    id: 'room-1-pat-marble-fine', room: 'room-1', kind: 'marble-veins', technique: 'albedo-map',
    tile: 1.8, depth: 0.75, bands: 3, cross: 3, sharpness: 17, warp: 1.3, grain: 0.16,
    gain: 1.12, opacity: 0, roughness: 0, tint: '#2b1c11',
  },
  'room-1-pat-marble-plain': {
    id: 'room-1-pat-marble-plain', room: 'room-1', kind: 'marble-veins', technique: 'albedo-map',
    tile: 2.4, depth: 0.6, bands: 3, cross: 3, sharpness: 22, warp: 0.7, grain: 0.08,
    gain: 1.1, opacity: 0, roughness: 0, tint: '#2b1c11',
  },
  'room-1-pat-smoke': {
    id: 'room-1-pat-smoke', room: 'room-1', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3.4, depth: 0.8, bands: 2, cross: 2, sharpness: 7, warp: 1.4, grain: 0.22,
    gain: 1.2, opacity: 0, roughness: 0, tint: '#2b1c11',
  },
  'room-1-pat-lime': {
    id: 'room-1-pat-lime', room: 'room-1', kind: 'lime-cloud', technique: 'albedo-map',
    tile: 4.2, depth: 0.5, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1.05, opacity: 0, roughness: 0, tint: '#2b1c11',
  },
  'room-1-pat-layer': {
    id: 'room-1-pat-layer', room: 'room-1', kind: 'marble-veins', technique: 'overlay-mesh',
    tile: 3, depth: 0.85, bands: 2, cross: 2, sharpness: 13, warp: 1.1, grain: 0.12,
    gain: 1, opacity: 0.22, roughness: 0.5, tint: '#2b1c11',
  },

  // Room II — Ardoise, wet polished slate. Slate cleaves in parallel planes, so
  // the veins here run long, close and barely warped. Round 1 (six to ten *thin*
  // lines, depth 0.45-0.55) perturbed the floor band about half as much as Room
  // I's accepted stone and read as nothing: what carries a pattern here is how
  // much floor a vein covers, not how sharp its edge is. These four widen the
  // band, raise the depth, and keep one candidate at the ceiling to find out
  // whether this room can carry a pattern at all.
  'room-2-pat-laja': {
    id: 'room-2-pat-laja', room: 'room-2', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3.2, depth: 0.85, bands: 5, cross: 1, sharpness: 9, warp: 0.3, grain: 0.1,
    gain: 1.12, opacity: 0, roughness: 0, tint: '#101c2c',
  },
  'room-2-pat-laja-fina': {
    id: 'room-2-pat-laja-fina', room: 'room-2', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3.2, depth: 0.95, bands: 9, cross: 1, sharpness: 13, warp: 0.3, grain: 0.14,
    gain: 1.18, opacity: 0, roughness: 0, tint: '#101c2c',
  },
  'room-2-pat-cruzada': {
    // The same stone with the grain running across the room instead, to judge
    // direction rather than density.
    id: 'room-2-pat-cruzada', room: 'room-2', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3.2, depth: 0.9, bands: 1, cross: 7, sharpness: 11, warp: 0.3, grain: 0.12,
    gain: 1.15, opacity: 0, roughness: 0, tint: '#101c2c',
  },
  'room-2-pat-max': {
    // The ceiling probe: if the floor band still does not move here, the room
    // cannot carry a pattern without giving up the mirror that defines it.
    id: 'room-2-pat-max', room: 'room-2', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3.2, depth: 1, bands: 5, cross: 1, sharpness: 9, warp: 0.3, grain: 0.1,
    gain: 1.2, opacity: 0, roughness: 0, tint: '#101c2c',
  },
  // Room II, round 4 — the photograph route. A generated mask can only dim the
  // reflection; a *photograph* of stone laid on top brings its own colour and
  // veining and a lit surface, at the price of covering the mirror it sits on.
  // Three doses of one blue-black marble plus a light grey control, so the
  // question is how much veil this room tolerates, not which stone.
  // Room III — Vert Forêt, matte absorbent stone. The mirror is nearly gone here
  // (mirror 0.14), so a generated mask has almost nothing to modulate; a
  // photograph is the only lever that carries. Two stones: a charcoal marble
  // with fine veining, which stays dark and so protects the room's identity, and
  // a plain grey concrete, which reads as smooth matte stone but lifts the band.
  // Each at two tints, plus one lower dose, because 'how much' is the open
  // question and 'green' is the room's palette, not necessarily its floor.
  'room-3-pat-negro-veta': {
    id: 'room-3-pat-negro-veta', room: 'room-3', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/marble016_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.18, roughness: 0.65, tint: '#ffffff',
  },
  'room-3-pat-negro-verde': {
    id: 'room-3-pat-negro-verde', room: 'room-3', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/marble016_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.24, roughness: 0.65, tint: '#6d8f74',
  },
  'room-3-pat-hormigon': {
    id: 'room-3-pat-hormigon', room: 'room-3', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/concrete030_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.18, roughness: 0.8, tint: '#ffffff',
  },
  'room-3-pat-hormigon-verde': {
    id: 'room-3-pat-hormigon-verde', room: 'room-3', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/concrete030_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.22, roughness: 0.8, tint: '#8aa38f',
  },
  'room-3-pat-hormigon-suave': {
    id: 'room-3-pat-hormigon-suave', room: 'room-3', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/concrete030_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.1, roughness: 0.8, tint: '#ffffff',
  },
  // Room IV — Indigo, dark polished resin. Not stone: a veined marble here would
  // repeat Room II's language, so the four options are two *poured* materials
  // (a speckled chip floor and a plain mottled one, both tinted into the room's
  // indigo) and two generated swirls — this room's reflection is diffuse
  // (blurFactor ~1.2, like Room I), so a generated mask does read as material
  // here, and it would be the only room carrying no downloaded asset.
  'room-4-pat-terrazo-indigo': {
    id: 'room-4-pat-terrazo-indigo', room: 'room-4', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/terrazzo005_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.16, roughness: 0.4, tint: '#6f68a0',
  },
  'room-4-pat-liso-indigo': {
    id: 'room-4-pat-liso-indigo', room: 'room-4', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/concrete036_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.2, roughness: 0.35, tint: '#7b74ab',
  },
  'room-4-pat-liso-indigo-suave': {
    id: 'room-4-pat-liso-indigo-suave', room: 'room-4', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/concrete036_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.1, roughness: 0.35, tint: '#7b74ab',
  },
  'room-4-pat-liso-indigo-medio': {
    id: 'room-4-pat-liso-indigo-medio', room: 'room-4', kind: 'lime-cloud',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/concrete036_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.14, roughness: 0.35, tint: '#7b74ab',
  },
  'room-4-pat-resina-onda': {
    id: 'room-4-pat-resina-onda', room: 'room-4', kind: 'marble-veins',
    technique: 'albedo-map', tile: 6, depth: 0.6, bands: 1, cross: 1, sharpness: 5,
    warp: 1.9, grain: 0.35, gain: 1.06, opacity: 0, roughness: 0, tint: '#160f30',
  },
  'room-4-pat-resina-onda-suave': {
    id: 'room-4-pat-resina-onda-suave', room: 'room-4', kind: 'marble-veins',
    technique: 'albedo-map', tile: 6.5, depth: 0.32, bands: 1, cross: 1, sharpness: 6,
    warp: 1.9, grain: 0.4, gain: 1.03, opacity: 0, roughness: 0, tint: '#160f30',
  },
  'room-2-pat-marmol-azul-suave': {
    id: 'room-2-pat-marmol-azul-suave', room: 'room-2', kind: 'marble-veins',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/marble023_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.18, roughness: 0.35, tint: '#ffffff',
  },
  'room-2-pat-marmol-azul-media': {
    id: 'room-2-pat-marmol-azul-media', room: 'room-2', kind: 'marble-veins',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/marble023_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.34, roughness: 0.35, tint: '#ffffff',
  },
  'room-2-pat-marmol-azul-fuerte': {
    id: 'room-2-pat-marmol-azul-fuerte', room: 'room-2', kind: 'marble-veins',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/marble023_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.55, roughness: 0.35, tint: '#ffffff',
  },
  'room-2-pat-marmol-gris': {
    id: 'room-2-pat-marmol-gris', room: 'room-2', kind: 'marble-veins',
    technique: 'overlay-mesh', source: 'imported', file: '/floor-pattern/marble012_512.jpg',
    tile: 2.4, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1, opacity: 0.3, roughness: 0.35, tint: '#ffffff',
  },
  'room-2-pat-veta': {
    // Round 3: the same perturbation, but irregular instead of parallel courses.
    // Regular spacing is what reads as banding on a sharp reflection, so this
    // wanders the way Room I's accepted marble does and drops the laja rhythm.
    id: 'room-2-pat-veta', room: 'room-2', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3, depth: 0.85, bands: 3, cross: 2, sharpness: 12, warp: 1.2, grain: 0.18,
    gain: 1.12, opacity: 0, roughness: 0, tint: '#101c2c',
  },
  'room-2-pat-veta-suave': {
    id: 'room-2-pat-veta-suave', room: 'room-2', kind: 'marble-veins', technique: 'albedo-map',
    tile: 3, depth: 0.55, bands: 3, cross: 2, sharpness: 12, warp: 1.2, grain: 0.18,
    gain: 1.06, opacity: 0, roughness: 0, tint: '#101c2c',
  },
  'room-2-pat-moteado': {
    // No lines at all: broad matte patches, the way a worn slate floor is uneven.
    id: 'room-2-pat-moteado', room: 'room-2', kind: 'lime-cloud', technique: 'albedo-map',
    tile: 4.2, depth: 1, bands: 3, cross: 3, sharpness: 4, warp: 0, grain: 1,
    gain: 1.15, opacity: 0, roughness: 0, tint: '#101c2c',
  },
};

const SIZE = 256;

// Deterministic hash -> [0, 1), no Math.random: the same key always yields the
// same floor, and a test can rely on it.
function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Value noise on an integer lattice that **wraps** every `period` cells, so a
 * field sampled over u,v ∈ [0,1) tiles seamlessly — the floor repeats it eight
 * times, and a visible seam would be the one thing the eye finds immediately.
 */
function periodicNoise(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
  const wrap = (n: number) => ((n % period) + period) % period;
  const a = hash2(wrap(x0), wrap(y0), seed);
  const b = hash2(wrap(x0 + 1), wrap(y0), seed);
  const c = hash2(wrap(x0), wrap(y0 + 1), seed);
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1), seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

/** fBm whose every octave keeps an integer lattice period, so it stays seamless. */
function periodicFbm(u: number, v: number, freq: number, octaves: number, seed: number): number {
  let amp = 0.5, sum = 0, norm = 0, f = freq;
  for (let o = 0; o < octaves; o++) {
    sum += amp * periodicNoise(u * f, v * f, f, seed + o * 13);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/**
 * Where the pattern sits, 0 (plain floor) to 1 (deepest vein). Veins come from a
 * sine band whose phase is warped by two octaves of noise, so they wander the
 * way cut stone does instead of ruling the tile; the band coefficients are
 * integers, which is what keeps the warp seam-free.
 */
function marbleField(p: FloorPattern, u: number, v: number): number {
  const pulled = (periodicFbm(u, v, 2, 3, 3) - 0.5) * p.warp
    + (periodicFbm(u, v, 4, 2, 17) - 0.5) * p.warp * 0.35;
  const phase = (u * p.bands + v * p.cross + pulled) * Math.PI * 2;
  const vein = Math.pow(0.5 + 0.5 * Math.sin(phase), p.sharpness);
  const grain = periodicFbm(u, v, 16, 3, 41);
  return Math.min(1, vein * (1 - p.grain) + grain * p.grain);
}

/** The same idea with no veins at all: broad mottling, like lime-washed stone. */
function limeField(u: number, v: number): number {
  const body = periodicFbm(u, v, 3, 4, 7);
  const detail = periodicFbm(u, v, 9, 3, 23);
  return Math.min(1, Math.pow(body, 1.7) * 0.72 + detail * 0.28);
}

export interface FloorPatternTexture {
  texture: THREE.DataTexture;
  /** Mean of the multiplier field, so a caller can hold average brightness. */
  mean: number;
}

/**
 * Builds the pattern as RGBA data: RGB is the multiplier the floor colour is
 * scaled by, A is where the pattern sits (the overlay layer reads it, the
 * `albedo-map` technique ignores it — the material is not transparent).
 *
 * `colorSpace` stays the default `NoColorSpace` on purpose: this is a mask to do
 * arithmetic with, not a picture to look at, and an sRGB decode would bend the
 * compensation the caller derives from `mean`.
 */
export function createFloorPatternTexture(pattern: FloorPattern): FloorPatternTexture {
  const { kind, depth } = pattern;
  const data = new Uint8Array(SIZE * SIZE * 4);
  let sum = 0;

  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const field = kind === 'marble-veins' ? marbleField(pattern, u, v) : limeField(u, v);
      const value = Math.max(0, Math.min(1, 1 - depth * field));
      const i = (y * SIZE + x) * 4;
      const grey = Math.round(value * 255);
      data[i] = grey;
      data[i + 1] = grey;
      data[i + 2] = grey;
      data[i + 3] = Math.round(field * 255);
      // The mean is taken from the byte that the GPU will actually sample, not
      // from the float behind it: this number is what the caller divides by.
      sum += grey / 255;
    }
  }

  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return { texture, mean: sum / (SIZE * SIZE) };
}

/** The stone a room's floor is cut from. A room without one keeps a plain floor. */
export function floorPatternDesign(roomId?: string): FloorPattern | null {
  return (roomId && FLOOR_PATTERNS[roomId]) || null;
}

export const FLOOR_PATTERN_PARAM = 'floor';

/** The study key the URL asks for, or null when there is nothing to preview. */
export function floorPatternPreviewKey(search?: string | null): string | null {
  if (!search) return null;
  const key = new URLSearchParams(search).get(FLOOR_PATTERN_PARAM)?.trim();
  if (!key) return null;
  return FLOOR_PATTERN_STUDIES[key] ? key : null;
}

/**
 * What to lay on this room's floor: the study the URL asks for — only in the
 * room it was designed for — otherwise the room's own stone. Null means a plain
 * floor, which is every ordinary visit to a room with no pattern yet.
 */
export function floorPatternForRoom(search: string | null | undefined, roomId?: string): FloorPattern | null {
  const key = floorPatternPreviewKey(search);
  const study = key ? FLOOR_PATTERN_STUDIES[key] : null;
  if (study && roomId && study.room === roomId) return study;
  return floorPatternDesign(roomId);
}
