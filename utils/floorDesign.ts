import * as THREE from 'three';
import type { FloorTextureRecipe } from './floorTexture';

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
 *
 * ## Preview studies, and what three attempts got wrong
 *
 * The four committed entries above are the gallery's floors and stay as they
 * are. Alongside them, `?floor=room-N-alt-study` lays down a *material study* for
 * that room — the same reflector, plus the matter in `texture`.
 *
 * Two earlier preview sets are not in this file any more, and both were removed
 * rather than retuned because the *approach* was the problem:
 *
 *  - `room-1-alt-a` … `room-4-alt-b` (visible in
 *    `tests/suelos-ok/sala-*-alt-{a,b}.png`) came out of a brief that measured
 *    the floor's luma and asked for nothing brighter than the committed one. It
 *    met that number by lowering `mirror` and `mixStrength` and laying a dark
 *    multiply veil over the plane: the rooms lost their benches, frames and light
 *    pools and gained no material — the veil was invisible as texture and legible
 *    only as a grey wash over an indigo floor.
 *  - A second set put the matter in `roughnessMap` and in per-texel displacement,
 *    at every amplitude from 0.008 to 0.5. It is measured in the comment above the
 *    studies below. Short version: this shader's blur pass attenuates, so a
 *    sharper texel is a brighter texel (room I went from luma 35.8 to 90.8), and
 *    displacing a reflection that is already a heavy blur is invisible while
 *    displacing a sharp one reads as a mirror that has been moved.
 *
 * The honest conclusion, and the reason the committed four are still the
 * gallery's floors: a floor whose albedo is `#050505`–`#0a0806` has no surface to
 * dress — its appearance *is* the reflection — and every per-texel lever on the
 * reflection costs either its brightness, its sharpness or its alignment. The
 * studies below are the best attempt per room, kept so the claim can be checked
 * in the browser rather than believed. See `utils/floorTexture.ts` for the
 * mechanism and its limits.
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
  id: string;
  /** Full-quality finish, for a desktop GPU. */
  standard: FloorFinish;
  /** Same finish at 124 px for phones and low-tier GPUs. Never costlier. */
  low: FloorFinish;
  /**
   * Low-frequency matter for a preview finish. Null keeps the committed
   * reflector-only floor precisely as it was. The map's channels are read by
   * the reflection, never painted over it — see `utils/floorTexture.ts`.
   */
  texture: FloorTextureRecipe | null;
  /**
   * How far `texture` warps the reflected image, in the reflection's projected
   * coordinates (0 = a perfect mirror). This is the material's own unevenness
   * acting on the light it gives back, so it is a property of the finish, not
   * of the quality tier. Only read when `texture` is set.
   */
  distortion: number;
  /**
   * Relief of `texture` in the sheen and the specular pools. Zero on the
   * committed floors, which are flat by design. Only read with `texture` set.
   */
  bumpScale: number;
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
    texture: null, distortion: 0, bumpScale: 0,
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
    texture: null, distortion: 0, bumpScale: 0,
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
    texture: null, distortion: 0, bumpScale: 0,
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
    texture: null, distortion: 0, bumpScale: 0,
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

  // ── Preview studies: one per room, none of them recommended ────────────────
  //
  // The committed floors above stay exactly as they are, and this is the honest
  // result of trying to give them a material: **none of these studies is better
  // than the floor it previews**, so none of them is proposed as a replacement.
  // They are kept because they are the strongest attempt per room, and because
  // a preview you can open is worth more than a paragraph of argument:
  //
  //     ?floor=room-2-alt-study
  //
  // Every one of them keeps its room's committed `standard` and `low` blocks
  // verbatim — same `mirror`, same `mixStrength`, same sharpness, same fade —
  // and differs only in the matter added on top. The unit test enforces that
  // equality, because it is the whole point: matter is added *inside* the
  // reflection, never paid for out of it.
  //
  // What they are is a single field of relief, handed to the reflector twice:
  // as `bumpMap` for the sheen, and as `distortionMap` so the reflected image is
  // displaced where the surface stands proud — the surface breaks the reflection
  // instead of mirroring it perfectly. It is the only lever on this floor that
  // costs no brightness, and the measurements say what it is worth:
  //
  //   room I    floor band 35.8 → 36.0 luma, mean |Δ| 1.1, peak  67
  //   room II   floor band 32.2 → 32.2 luma, mean |Δ| 1.3, peak 122
  //   room III  floor band 39.8 → 39.9 luma, mean |Δ| 0.5, peak  42
  //   room IV   floor band 30.7 → 30.7 luma, mean |Δ| 0.7, peak  23
  // (band = mean luma of the floor region of a 1280×960 capture; Δ measured
  //  against the same room's committed floor captured in the same run.)
  //
  // In room II, whose reflection is the sharp one, the peak is real and the eye
  // reads it — as a *displaced* mirror, not as cleft stone. In rooms I, III and
  // IV the reflection is a heavy blur, and displacing a blur is invisible; the
  // amplitudes that would be visible there tear the reflected room off its own
  // furniture. The floor's albedo is near-black, so its appearance *is* the
  // reflection, and every per-texel lever on the reflection is a regression:
  // dim it and the floor dies, sharpen it and the pale upper room washes the
  // ochre/indigo out of it, displace it and the mirror looks wrong. See
  // `utils/floorTexture.ts` for the same finding written down next to the code
  // that would otherwise repeat it.

  'room-1-alt-study': {
    // Sala I — sienna apomazada: a fine mineral mottle, no direction, deep enough
    // to ripple the pools of light the spotlights lay on the ochre floor. The
    // most plausible of the four and still not a match for the committed waxed
    // sienna: the ripple is a whisper in the haze, and at an amplitude where it
    // reads it starts to look like the reflection is sliding.
    id: 'honed-sienna-ripple',
    texture: { kind: 'mineral', scale: [14, 14], relief: 0.85 },
    distortion: 0.09, bumpScale: 0.02,
    tint: '#2e1a0e', tintMix: 0.16,
    standard: {
      mirror: .42, roughness: .95, metalness: .34,
      mixBlur: 1.05, mixStrength: 13, blur: [340, 120],
      depthScale: 1.2, minDepthThreshold: 0.4, maxDepthThreshold: 1.4,
      resolution: 1024,
    },
    low: {
      mirror: .42, roughness: 1, metalness: .34,
      mixBlur: 1.15, mixStrength: 13, blur: [420, 150],
      depthScale: 1.2, minDepthThreshold: 0.4, maxDepthThreshold: 1.4,
      resolution: 124,
    },
  },
  'room-2-alt-study': {
    // Sala II — pizarra hendida: the cleave runs away from the visitor and this is
    // where the matter shows most, because the reflection it breaks is the sharp
    // one. The plaques and pools quench along the riven bands — the floor stops
    // being a perfect mirror. It still reads as a mirror that has been *moved*,
    // so it is not proposed; it is the clearest demonstration of the ceiling.
    id: 'riven-slate-ripple',
    texture: { kind: 'grain', scale: [12, 1.4], relief: 0.9 },
    distortion: 0.09, bumpScale: 0.02,
    tint: '#101c2c', tintMix: 0.14,
    standard: {
      mirror: .68, roughness: .9, metalness: .52,
      mixBlur: 0.45, mixStrength: 9, blur: [150, 60],
      depthScale: 0.9, minDepthThreshold: 0.45, maxDepthThreshold: 1.45,
      resolution: 1024,
    },
    low: {
      mirror: .68, roughness: .95, metalness: .52,
      mixBlur: 0.45, mixStrength: 9, blur: [220, 90],
      depthScale: 0.9, minDepthThreshold: 0.45, maxDepthThreshold: 1.45,
      resolution: 124,
    },
  },
  'room-3-alt-study': {
    // Sala III — roble del bosque: the same grain direction as the room's own
    // timber, on a floor that gives back almost nothing. On a reflection this
    // matte and this blurred there is nothing for the grain to displace, so the
    // study is indistinguishable from the committed stone in a capture. Kept as
    // the evidence for that: measured mean |Δ| 0.5 luma.
    id: 'oak-grain-ripple',
    texture: { kind: 'grain', scale: [10, 1.3], relief: 0.85 },
    distortion: 0.045, bumpScale: 0.02,
    tint: '#0c1c12', tintMix: 0.15,
    standard: {
      mirror: .14, roughness: 1, metalness: .1,
      mixBlur: 1.2, mixStrength: 6, blur: [520, 190],
      depthScale: 1.5, minDepthThreshold: 0.35, maxDepthThreshold: 1.45,
      resolution: 1024,
    },
    low: {
      mirror: .14, roughness: 1, metalness: .1,
      mixBlur: 1.25, mixStrength: 6, blur: [560, 210],
      depthScale: 1.5, minDepthThreshold: 0.35, maxDepthThreshold: 1.45,
      resolution: 124,
    },
  },
  'room-4-alt-study': {
    // Sala IV — laca vertida: the broadest field of the four, at the deepest
    // displacement, on the room whose reflection is short and diffuse. Even at
    // this amplitude the floor barely moves: measured peak |Δ| 23 out of 255.
    // The indigo room's floor is the most resistant of the four to being given a
    // material, which is the finding, not a shortcoming of the field.
    id: 'poured-lacquer-ripple',
    texture: { kind: 'pooled', scale: [2.2, 2.4], relief: 0.85 },
    distortion: 0.16, bumpScale: 0.02,
    tint: '#160f30', tintMix: 0.14,
    standard: {
      mirror: .5, roughness: .94, metalness: .44,
      mixBlur: 1.3, mixStrength: 11, blur: [300, 240],
      depthScale: 1.35, minDepthThreshold: 0.55, maxDepthThreshold: 1.5,
      resolution: 1024,
    },
    low: {
      mirror: .5, roughness: .98, metalness: .44,
      mixBlur: 1.4, mixStrength: 11, blur: [360, 280],
      depthScale: 1.35, minDepthThreshold: 0.55, maxDepthThreshold: 1.5,
      resolution: 124,
    },
  },

};

/**
 * Default room finish, or an explicitly requested alternative belonging to that
 * same room. This validation keeps `?floor=` a preview hook rather than a way
 * to leak another room's palette into the visitor's current room.
 */
export function floorDesignForRoom(roomId?: string, previewId?: string | null): FloorDesign {
  const baseId = roomId ?? 'room-1';
  const preview = previewId && previewId.startsWith(`${baseId}-alt-`)
    ? FLOOR_DESIGNS[previewId]
    : null;
  return preview ?? FLOOR_DESIGNS[baseId] ?? FLOOR_DESIGNS['room-1'];
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
