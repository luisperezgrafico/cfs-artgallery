import * as THREE from 'three';

/**
 * Floor matter: one small procedural texture that gives a preview finish a
 * material of its own, without assets, dependencies or a per-frame cost.
 *
 * Read this before changing anything here. Two attempts have now failed on this
 * floor, in opposite directions, and both for the same reason: reaching for a
 * knob that trades the reflection's *brightness* instead of its *shape*.
 *
 *  - The four committed floors are near-black (`#050505`–`#080e0a`). There is
 *    almost no albedo to decorate: what you see is the reflection — the room
 *    coming back at the floor, times `mixStrength`. The first preview set
 *    painted the surface with a dark multiply veil and lowered `mirror` /
 *    `mixStrength` to make the numbers look right, and every room lost its
 *    benches, frames and light pools.
 *  - This module's first version put the matter in `roughnessMap`, which drei's
 *    patch multiplies into the reflector's blur mix. That looked free and is
 *    not: the blur pass *attenuates* (`blur *= min(1, depthFactor + 0.25)`,
 *    `merge *= min(1, depthFactor + 0.5)`), so a less-blurred texel is a
 *    **brighter** texel — by a factor that grows towards the far wall. Measured
 *    on the real render, a range of `[0.42, 1]` took Room I's floor band from
 *    luma 35.8 to 90.8 and turned an ochre floor into grey mist. For every room
 *    whose committed `mixBlur * roughness` is already at or above 1 there is
 *    headroom in one direction only: brighter. So the roughness channel is not
 *    a material knob here, and is deliberately left out.
 *
 * What is left is the geometry of the reflection, which costs nothing in
 * brightness:
 *
 *  - **red** is the height field. It is handed to the reflector twice: as
 *    `bumpMap`, so the sheen the spotlights lay down breaks over the relief,
 *    and as `distortionMap` (drei's built-in `USE_DISTORTION`), so the projected
 *    reflection sample is displaced *per texel* — the surface warps the image it
 *    gives back instead of mirroring it perfectly. Displacement moves the
 *    reflection's content; it does not amplify it.
 *  - **green** and **blue** are unused (255 and 0). The green channel is where
 *    the roughness of the next attempt will want to go; it is kept as a constant
 *    so the choice is visible in the bytes rather than implied by omission.
 *
 * Mechanical notes that are easy to get wrong:
 *
 *  - **Tiling has to be baked into the field, not into `texture.repeat`.** The
 *    reflector's patched samplers read raw `vUv` (three's `vUv` carries no
 *    per-map transform), so `repeat` would move the albedo and the bump and
 *    leave the reflection behind. Every frequency here lives in `scale`.
 *  - **128², power of two, with mipmaps**, so a floor seen down the room cannot
 *    crawl while the camera is on rails; a smooth, band-limited field plus mips
 *    is what keeps this off the moiré list. One RGBA 128² texture is 64 KiB of
 *    CPU data, ~85 KiB with its mip chain, against a 2 MB per-room budget.
 */

export type FloorTextureKind =
  /** Mottled mineral: an even, directionless grain. Honed stone, travertine. */
  | 'mineral'
  /** Long, softly wandering streaks along the slow axis. Grain, riven slate, brushed metal. */
  | 'grain'
  /** Broad trowel clouds. Wax, concrete, polished plaster. */
  | 'cloud'
  /** Very broad pools, larger than any tile. Poured resin, lacquer. */
  | 'pooled'
  /** Irregular patches with soft edges. Damp and dry, moss, shagreen. */
  | 'dappled';

export interface FloorTextureRecipe {
  /** What the matter is meant to read as. */
  kind: FloorTextureKind;
  /**
   * Feature count across the floor: `[across the room's width, into its depth]`.
   * A strongly unequal pair is what makes a directional material: `[10, 1.4]`
   * stretches the grain so it runs away from the visitor, into the room.
   */
  scale: [number, number];
  /**
   * Height amplitude, 0–1. Both how far the reflection is displaced and how far
   * the sheen stands proud. Kept below 1 so the channel never spans its full
   * range — a channel that does displaces the reflection as much as it can, and
   * the reflection stops belonging to the room.
   */
  relief: number;
  /**
   * Green-channel range: the per-texel multiplier on the reflector's blur mix,
   * i.e. how sharp a patch of this surface gives the room back. `[1, 1]` (the
   * default) leaves the committed blur untouched.
   *
   * This is the one channel that is NOT free, and it is why this module has a
   * long comment. A sharper texel is a brighter texel — measured, not assumed —
   * so a band that is wide, or centred on a blur mix the room cannot go below,
   * lifts the whole floor. Keep it narrow and compensate the mean at the finish.
   */
  polish?: [number, number];
}

/** One RGBA 128² map. See the module note for what each channel drives. */
export const FLOOR_TEXTURE_SIZE = 128;

// Deterministic hash -> [0, 1), no Math.random, so a finish is reproducible.
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
  const a = hash2(x0, y0), b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** The matter itself, normalised to [0, 1], for one texel. */
function matterFor(kind: FloorTextureKind, u: number, v: number, scale: [number, number]): number {
  const x = u * scale[0];
  const y = v * scale[1];

  switch (kind) {
    case 'mineral':
      // Two scales of mottle and nothing else: no direction, no inclusions.
      return valueNoise(x, y) * 0.68 + valueNoise(x * 2.4 + 31, y * 2.4 + 17) * 0.32;

    case 'grain': {
      // The field must vary quickly across the narrow axis (x here) and slowly
      // along the long one, which `scale` already provides; the wander keeps the
      // streaks from being parallel lines — that regularity is the moiré risk.
      const wander = (valueNoise(x * 0.35 + 11, y * 0.35 + 7) - 0.5) * 0.9;
      return valueNoise(x + wander, y) * 0.72 + valueNoise(x * 2.6 + 41, y * 2.6 + 23) * 0.28;
    }

    case 'cloud':
      // Broad and soft, one octave carrying it, a second only breaking the sheen.
      return valueNoise(x, y) * 0.85 + valueNoise(x * 3.1 + 53, y * 3.1 + 71) * 0.15;

    case 'pooled':
      // Wider than the room reads as: a poured surface has no feature you can
      // point at, only pools.
      return valueNoise(x, y) * 0.62 + valueNoise(x * 0.45 + 101, y * 0.45 + 89) * 0.38;

    case 'dappled': {
      // Warp the field before thresholding, so the patches are torn rather than
      // round, and soften the edge: a hard contour would draw a line the eye
      // reads as a drawn edge instead of as a patch of the surface.
      const warp = valueNoise(x * 0.6 + 211, y * 0.6 + 173) * 2 - 1;
      const n = valueNoise(x + warp * 0.8, y + warp * 0.8);
      return smoothstep(clamp01((n - 0.3) / 0.5));
    }

    default:
      return 0.5;
  }
}

/**
 * Builds the matter map for one finish. Deterministic: the same recipe always
 * yields the same bytes, so a capture of a preview floor can be reproduced.
 *
 * Assign it as `bumpMap` and `distortionMap` on the same `MeshReflectorMaterial`;
 * keep it `NoColorSpace` (this is not colour data) and dispose it when the room
 * unmounts.
 */
export function createFloorSurfaceTexture(recipe: FloorTextureRecipe): THREE.DataTexture {
  const size = FLOOR_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  const relief = clamp01(recipe.relief);
  const [polishA, polishB] = recipe.polish ?? [1, 1];
  const polishLow = Math.min(polishA, polishB);
  const polishHigh = Math.max(polishA, polishB);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // (size - 1) so the field's own edges land on the edges of the texture.
      const u = x / (size - 1);
      const v = y / (size - 1);
      const matter = clamp01(matterFor(recipe.kind, u, v, recipe.scale));
      const i = (y * size + x) * 4;

      // R: height. Starts at zero, so the reflection's constant displacement is
      // always smaller than its varying part (the channel cannot go negative).
      data[i] = Math.round(matter * relief * 255);
      // G: the reflection's blur mix for this texel. 255 = the committed blur.
      data[i + 1] = Math.round((polishLow + matter * (polishHigh - polishLow)) * 255);
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
