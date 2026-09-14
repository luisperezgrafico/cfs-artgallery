import * as THREE from 'three';

/**
 * Small deterministic plaster/gesso texture for the room walls, meant to be used
 * as `bumpMap` **and** `roughnessMap` at once on the wall materials: a bare
 * `planeGeometry` with a flat colour reads as untextured 3D plastic, and what
 * sells painted plaster is uneven micro-relief plus an uneven sheen, not a
 * colour pattern.
 *
 * The two jobs are carried in separate channels of the same RGBA texture,
 * because three reads `bumpMap` from `.x` and `roughnessMap` from `.g`:
 *
 *   - **r** — relief, full range. A flat wall under a soft spotlight changes
 *     almost nothing in N·L, so the bump only reads if its gradients are wide.
 *     Measured: with a narrow range here, quadrupling `bumpScale` moved 533
 *     pixels of a 1280×960 capture by at most 25 levels, i.e. nothing.
 *   - **g/b** — sheen, squeezed high. This is what a roughnessMap multiplies
 *     against `roughness={1}`, so keeping it near 0.85 leaves the wall's overall
 *     reflectivity where the curated per-room look had it.
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
 *     bumpMap={plaster} bumpScale={0.02}
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
 * Metres of wall that one tile of the texture covers. Small on purpose: the
 * grain should read as fine tooth, and at 2.5 m the same noise looked like
 * patches of uneven paint instead. There is nothing low-frequency left in the
 * data, so the repeat does not announce itself as a pattern.
 */
export const WALL_TEXTURE_TILE_M = 1.25;

/** Relief range (r). Wide, so the bump has gradients to work with. */
const MIN_RELIEF = 70;
const MAX_RELIEF = 255;

// Sheen range (g/b). Narrow and high on purpose: this multiplies `roughness={1}`
// to land the walls at ~0.83, near the flat 0.85-0.9 they had before, so
// switching the texture on does not relight the room. Widening this is the
// fastest way to make the walls look wet.
const MIN_SHEEN = 175;
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
 * large planes with a repeating texture, and a visible seam every 2.5 m would
 * be worse than the flat look this replaces.
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
 * Three octaves, all wrapping at whole cells so the octaves stay seamless too:
 * broad trowel patches, then the coarser tooth of the paint, then a fine grain
 * that only shows up close. High octaves mip away with distance, which is what
 * keeps the walls calm from the back of the room.
 */
export function createWallPlasterTexture(): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;

      const mid = periodicNoise(u * 14, v * 14, 14);
      const fine = periodicNoise(u * 48, v * 48, 48);

      // r: relief. No broad octave here on purpose: at room scale the low
      // frequency reads as damp patches on the side walls, not as a surface.
      // What sells plaster from across the room is even, fine tooth.
      const reliefNoise = mid * 0.55 + fine * 0.45;
      const relief = Math.round(
        MIN_RELIEF + Math.max(0, Math.min(1, reliefNoise)) * (MAX_RELIEF - MIN_RELIEF),
      );

      // g/b: sheen, kept at the same fine scales — anything broader and the
      // repeat becomes visible as a soft blotch every tile.
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
