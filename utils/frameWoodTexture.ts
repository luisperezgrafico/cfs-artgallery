import * as THREE from 'three';

/**
 * Small deterministic oak/walnut end-grain-free wood texture, meant as a bumpMap
 * for `ProceduralFrame`'s carved-oak material (see frameDesign.ts, room-3).
 *
 * Rail UVs run u along the rail length and v across its width (see
 * createFrameGeometry's `tex` array: `[length*3, outset*8]`), so grain here runs
 * long and thin along u with narrow banding across v, matching real quarter-sawn
 * boards rather than an end-grain cut.
 *
 * Recommended usage:
 *   <meshStandardMaterial bumpMap={createFrameWoodTexture()} bumpScale={0.004} />
 * Assign only for the carved-oak design; texture.colorSpace should stay the
 * default THREE.NoColorSpace (bump maps are not color data, never sRGB).
 */

const SIZE = 128;

// Deterministic hash -> [0, 1), no Math.random, so output is reproducible.
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Value noise with bilinear interpolation over an integer lattice.
function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
  const a = hash2(x0, y0), b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

/** Builds a small deterministic oak/walnut grain bump map. See module comment. */
export function createFrameWoodTexture(): THREE.DataTexture {
  const width = SIZE, height = SIZE;
  const data = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    // v: across the rail (0..1) — this is where grain rings/bands live.
    const v = y / height;
    for (let x = 0; x < width; x++) {
      // u: along the rail (0..1) — grain stays long and subtle along this axis.
      const u = x / width;

      // Growth-ring bands across v, gently wobbled along u so rings aren't
      // perfectly straight (as in real quarter-sawn oak/walnut).
      const wobble = valueNoise(u * 3, 7.3) * 0.12 + valueNoise(u * 9 + 41, 3.1) * 0.05;
      const ring = Math.sin((v + wobble) * Math.PI * 10) * 0.5 + 0.5;
      const bands = Math.pow(ring, 3); // narrower, sharper ridges between wide flats

      // Long, low-frequency grain streaks running along u.
      const streak = valueNoise(u * 4, v * 40) * 0.5 + valueNoise(u * 1.5 + 100, v * 40 + 100) * 0.5;

      // Fine longitudinal fiber texture, subtle so it stays wood-like, not sandy.
      const fiber = valueNoise(u * 60, v * 6 + 200) * 0.15;

      const value = bands * 0.55 + streak * 0.3 + fiber * 0.15;
      data[y * width + x] = Math.max(0, Math.min(255, Math.round(value * 255)));
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
