import * as THREE from 'three';

/**
 * Floor finishes, one per room — the same solution shape as `frameDesign.ts`
 * and `benchDesign.ts`: a registry keyed by `roomId`, pure data, and one unit
 * test on the registry. Four rooms cost four data entries here — no textures,
 * no models, no dependencies, nothing drawn on the floor.
 *
 * The brief is deliberate: the floor must never compete with the artwork, so
 * there are **no tiles, no checkerboard, no seams, no inlays**. What changes
 * from room to room is only how the light behaves on it — how much of the room
 * it gives back (`mirror`, `mixStrength`), how sharp that reflection is
 * (`roughness`, `mixBlur`, `blur`), how far it carries (`depthScale`,
 * `min`/`maxDepthThreshold`), the sheen (`metalness`) and a hue nudge
 * (`tint`). Two rooms are a shade apart; the wet slate room is a mirror and
 * the forest room absorbs almost everything.
 *
 * Cost, in the reflector's own terms:
 *  - `resolution` is the expensive one — it sizes the reflection render target
 *    and the depth texture, so cost grows with its square. It is the only knob
 *    that needs a cheaper tier per device, which is what `low` is for.
 *  - `blur` magnitude is free: the pass always runs five taps, and its offsets
 *    are just scaled by these numbers. Only a `blur` of `0, 0` would switch to
 *    a different shader path, so every finish keeps it on.
 *  - the moment a value changes, drei rebuilds the render targets, so these are
 *    read once per room mount — not animated, not per frame.
 *
 * `low` is not a second design: it is the same finish at 124 px, where a sharp
 * reflection crawls, so it leans harder on the blurred one (more roughness,
 * wider blur). Mirror, strength, metalness, tint and the depth fade stay put,
 * so the room still reads as itself on a phone.
 */

export interface FloorFinish {
  /** How much of the base colour the reflection replaces (0–1). */
  mirror: number;
  /** Share of the blurred reflection: blurFactor = mixBlur * roughness. */
  roughness: number;
  /** Specular sheen on top of the reflection. */
  metalness: number;
  /** How much of the blurred copy is mixed in at full roughness. */
  mixBlur: number;
  /** Reflection brightness. The reflection is multiplied into the base colour. */
  mixStrength: number;
  /** Reflection blur spread, in reflector texels: [x, y]. Magnitude is free. */
  blur: [number, number];
  /** Overall attenuation of the depth fade. */
  depthScale: number;
  /** Near end of the depth fade — below this the reflection is at full strength. */
  minDepthThreshold: number;
  /** Far end of the depth fade — past this the reflection is gone. */
  maxDepthThreshold: number;
  /** Reflection render-target size in pixels; the cost lever. */
  resolution: number;
}

export interface FloorDesign {
  id: 'waxed-sienna' | 'wet-slate' | 'matte-stone' | 'polished-resin';
  /** Full-quality finish, for a desktop GPU. */
  standard: FloorFinish;
  /** Same finish at 124 px for phones and low-tier GPUs. Never costlier. */
  low: FloorFinish;
  /**
   * Hue nudge toward a colour of the room's own family, at `tintMix`. Null
   * keeps the theme's `floorColor` untouched. Deliberately a nudge: the theme
   * still owns the palette.
   */
  tint: string | null;
  /** Interpolation toward `tint`, kept low so the floor stays near-black. */
  tintMix: number;
}

export const FLOOR_DESIGNS: Record<string, FloorDesign> = {
  'room-1': {
    // Ocre Profond: sealed, waxed sienna stone. A mid-strength, wide, soft
    // reflection that still shows the room — the finish the other three move
    // away from, kept as the comfortable centre of the range.
    id: 'waxed-sienna',
    tint: '#2e1a0e', tintMix: 0.16,
    standard: {
      mirror: 0.42, roughness: 0.95, metalness: 0.34,
      mixBlur: 1.05, mixStrength: 13, blur: [340, 120],
      depthScale: 1.2, minDepthThreshold: 0.4, maxDepthThreshold: 1.4,
      resolution: 1024,
    },
    low: {
      mirror: 0.42, roughness: 1, metalness: 0.34,
      mixBlur: 1.15, mixStrength: 13, blur: [420, 150],
      depthScale: 1.2, minDepthThreshold: 0.4, maxDepthThreshold: 1.4,
      resolution: 124,
    },
  },

  'room-2': {
    // Ardoise: wet polished slate. The mirror of the four — most of the
    // reflection is the sharp copy, the paint laid over a shallow, long fade
    // that carries to the far wall. The one finish that shows the scene twice.
    // Its intensity sits with the rest of the range and the blurred copy takes
    // nearly all of the mix (blurFactor 0.96 -> 1), so the reflection stays
    // legible without washing the room out. Measured on the real renders: what
    // brightens a floor under these lights is the sheen a low roughness
    // concentrates, not the reflection's strength — `mixStrength` 19 and 5
    // render the same floor. This finish keeps the lowest roughness of the four
    // (its identity) and gives up surface sheen to the reflection.
    id: 'wet-slate',
    tint: '#101c2c', tintMix: 0.14,
    standard: {
      mirror: 0.68, roughness: 0.9, metalness: 0.52,
      mixBlur: 0.45, mixStrength: 9, blur: [150, 60],
      depthScale: 0.9, minDepthThreshold: 0.45, maxDepthThreshold: 1.45,
      resolution: 1024,
    },
    low: {
      // 124 px of reflection runs and crawls, so the cheap tier leans on the
      // blurred copy (blurFactor 0.41 -> 0.43).
      mirror: 0.68, roughness: 0.95, metalness: 0.52,
      mixBlur: 0.45, mixStrength: 9, blur: [220, 90],
      depthScale: 0.9, minDepthThreshold: 0.45, maxDepthThreshold: 1.45,
      resolution: 124,
    },
  },

  'room-3': {
    // Vert Forêt: matte, absorbent stone. Almost no reflection and what little
    // there is arrives fully blurred, so the room reads as dry stone rather
    // than as a polished slab — the cheapest-looking floor, at the same cost.
    id: 'matte-stone',
    tint: '#0c1c12', tintMix: 0.15,
    standard: {
      mirror: 0.14, roughness: 1, metalness: 0.1,
      mixBlur: 1.2, mixStrength: 6, blur: [520, 190],
      depthScale: 1.5, minDepthThreshold: 0.35, maxDepthThreshold: 1.45,
      resolution: 1024,
    },
    low: {
      mirror: 0.14, roughness: 1, metalness: 0.1,
      mixBlur: 1.25, mixStrength: 6, blur: [560, 210],
      depthScale: 1.5, minDepthThreshold: 0.35, maxDepthThreshold: 1.45,
      resolution: 124,
    },
  },

  'room-4': {
    // Indigo: dark polished resin. A strong reflection with a short reach: the
    // fade starts well before the far wall, and the blur is near-isotropic, so
    // it reads as damp resin under the visitor's feet, not as a long wet mirror.
    // Short and diffuse, and matte enough to keep out of the artwork's way: the
    // scattered reflection the room is known for, on a floor that stays dark.
    id: 'polished-resin',
    tint: '#160f30', tintMix: 0.14,
    standard: {
      mirror: 0.5, roughness: 0.94, metalness: 0.44,
      mixBlur: 1.3, mixStrength: 11, blur: [300, 240],
      depthScale: 1.35, minDepthThreshold: 0.55, maxDepthThreshold: 1.5,
      resolution: 1024,
    },
    low: {
      mirror: 0.5, roughness: 0.98, metalness: 0.44,
      mixBlur: 1.4, mixStrength: 11, blur: [360, 280],
      depthScale: 1.35, minDepthThreshold: 0.55, maxDepthThreshold: 1.5,
      resolution: 124,
    },
  },
};

export function floorDesignForRoom(roomId?: string): FloorDesign {
  return FLOOR_DESIGNS[roomId ?? 'room-1'] ?? FLOOR_DESIGNS['room-1'];
}

export type FloorQuality = 'standard' | 'low';

/** The reflector's own props, straight from the registry — a copy, not the data. */
export function floorMaterialProps(design: FloorDesign, quality: FloorQuality = 'standard'): FloorFinish {
  return { ...(quality === 'low' ? design.low : design.standard) };
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The theme's `floorColor` with the finish's tint mixed in. Pure, and a no-op
 * for an untinted finish or a colour it cannot parse — a theme colour is never
 * lost to a typo.
 */
export function resolveFloorColor(themeColor: string, design: FloorDesign): string {
  if (!design.tint || design.tintMix <= 0) return themeColor;
  if (!HEX_COLOR.test(themeColor)) return themeColor;
  const base = new THREE.Color(themeColor);
  const tint = new THREE.Color(design.tint);
  const mix = Math.min(1, Math.max(0, design.tintMix));
  return `#${base.lerp(tint, mix).getHexString()}`;
}
