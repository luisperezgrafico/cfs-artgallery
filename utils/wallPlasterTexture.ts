import * as THREE from 'three';

/**
 * Small deterministic plaster/gesso texture for the room walls, meant to be used
 * as `bumpMap` **and** `roughnessMap` at once on the wall materials: a bare
 * `planeGeometry` with a flat colour reads as untextured 3D plastic, and what
 * sells painted plaster is a fine tooth plus an uneven sheen, not a colour
 * pattern.
 *
 * The taste here was set by looking, and it is *very* restrained on purpose — a
 * normal painted wall, not a rusticated one. Three passes got it here, and they
 * are the reason the numbers below are what they are:
 *
 *   1. A broad octave made the walls look like damp patches from across the room.
 *   2. Removing it but keeping a wide relief range and a 1.25 m tile still read
 *      as blotches — too big and too strong.
 *   3. Fine scales, a 0.6 m tile and a narrow range: barely there at a glance,
 *      visible as surface up close.
 *
 * The two jobs are carried in separate channels of the same RGBA texture,
 * because three reads `bumpMap` from `.x` and `roughnessMap` from `.g`:
 *
 *   - **r** — relief. Narrow range: this is tooth, not topography. `bumpScale`
 *     on the material is the dial if it ever needs to be stronger.
 *   - **g/b** — sheen. Multiplied against `roughness={1}`, it lands the walls at
 *     ~0.89, next to the flat 0.85-0.9 the rooms were tuned with, so turning
 *     this on does not relight a room. Widening this is the fastest way to make
 *     the walls look wet.
 *
 * Deliberately not a colour map: the per-room `wallColor` stays the source of
 * the wall's tint, and a `map` would multiply into it (and drag the walls a few
 * percent darker). Hue is the room's business; this is only surface.
 *
 * A single-channel RedFormat texture (as `frameWoodTexture` uses) is not an
 * option here: `roughnessMap` would read 0 from its missing green channel and
 * turn the walls into mirrors.
 *
 * Recommended usage:
 *   const plaster = useMemo(getWallPlasterTexture, []);
 *   <meshStandardMaterial
 *     roughness={1}
 *     bumpMap={plaster} bumpScale={0.025}
 *     roughnessMap={plaster}
 *   />
 * ...or `wallTextureTile(plaster, span, height)` per wall so one tile always
 * covers the same number of metres and the grain does not stretch.
 *
 * `bumpMap` and `roughnessMap` are not colour data, so `colorSpace` stays the
 * default THREE.NoColorSpace (never sRGB).
 */

const SIZE = 256;

/**
 * Metres of wall that one tile of the texture covers. Small: the grain is meant
 * to be fine, and a larger tile turned the same noise into visible blotches.
 */
export const WALL_TEXTURE_TILE_M = 0.6;

/** Relief range (r). Narrow — tooth, not topography. */
const MIN_RELIEF = 170;
const MAX_RELIEF = 255;

// Sheen range (g/b). Narrow and high on purpose: this multiplies `roughness={1}`
// to land the walls at ~0.89, near the flat 0.85-0.9 they had before, so
// switching the texture on does not relight the room.
const MIN_SHEEN = 200;
const MAX_SHEEN = 255;

// Deterministic hash -> [0, 1), no Math.random, so output is reproducible.
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Value noise with bilinear interpolation over an integer lattice that wraps
 * every `period` cells. The wrap is what makes the tile seamless: walls are
 * large planes with a repeating texture, and a visible seam would be worse than
 * the flat look this replaces.
 */
function periodicNoise(x: number, y: number, period: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
  const wrap = (v: number) => ((v % period) + period) % period;
  const a = hash2(wrap(x0), wrap(y0));
  const b = hash2(wrap(x0 + 1), wrap(y0));
  const c = hash2(wrap(x0), wrap(y0 + 1));
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1));
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

/**
 * Builds the wall plaster texture. See module comment.
 *
 * Two octaves at neighbouring fine scales, both wrapping at whole cells so they
 * stay seamless: together they read as one irregular grain rather than as two
 * sizes of blob. With only high frequencies in the data, a tile repeat does not
 * announce itself as a pattern, however small the tile is.
 */
export function createWallPlasterTexture(): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;

      const mid = periodicNoise(u * 22, v * 22, 22);
      const fine = periodicNoise(u * 60, v * 60, 60);

      const reliefNoise = mid * 0.55 + fine * 0.45;
      const relief = Math.round(
        MIN_RELIEF + Math.max(0, Math.min(1, reliefNoise)) * (MAX_RELIEF - MIN_RELIEF),
      );

      const sheenNoise = mid * 0.6 + fine * 0.4;
      const sheen = Math.round(
        MIN_SHEEN + Math.max(0, Math.min(1, sheenNoise)) * (MAX_SHEEN - MIN_SHEEN),
      );

      const i = (y * SIZE + x) * 4;
      data[i] = relief;
      data[i + 1] = sheen;
      data[i + 2] = sheen;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * One shared instance for the whole gallery: rooms mount and unmount as the
 * visitor moves between them, and re-uploading the same 256 KB plaster on every
 * room switch is pure waste. The texture is immutable, so sharing is safe.
 */
let shared: THREE.DataTexture | null = null;

export function getWallPlasterTexture(): THREE.DataTexture {
  if (!shared) shared = createWallPlasterTexture();
  return shared;
}

/**
 * A copy of the plaster texture scaled so one tile always covers `tileM` metres
 * regardless of the wall's size — otherwise the grain stretches on the long
 * walls and only the short ones look right. Clones share the same GPU
 * `source`, so this costs no extra texture memory.
 */
export function wallTextureTile(
  base: THREE.DataTexture,
  spanM: number,
  heightM: number,
  tileM: number = WALL_TEXTURE_TILE_M,
): THREE.DataTexture {
  const texture = base.clone();
  texture.repeat.set(spanM / tileM, heightM / tileM);
  texture.needsUpdate = true;
  return texture;
}
