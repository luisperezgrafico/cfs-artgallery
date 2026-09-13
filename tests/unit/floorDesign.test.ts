import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  FLOOR_DESIGNS,
  floorDesignForRoom,
  floorMaterialProps,
  resolveFloorColor,
  type FloorDesign,
  type FloorFinish,
} from '../../utils/floorDesign';

const ROOM_IDS = ['room-1', 'room-2', 'room-3', 'room-4'];
const FINISH_KEYS = [
  'mirror', 'roughness', 'metalness', 'mixBlur', 'mixStrength',
  'blur', 'depthScale', 'minDepthThreshold', 'maxDepthThreshold', 'resolution',
];

/** Hue families the four rooms already carry; a tint must stay inside one of them. */
const HEX = /^#[0-9a-f]{6}$/;

/** Plain Euclidean distance in the working colour space — enough to say "nearer". */
function distance(a: THREE.Color, b: THREE.Color): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function finishes(design: FloorDesign): [FloorFinish, FloorFinish] {
  return [design.standard, design.low];
}

describe('room floors', () => {
  it('gives all four rooms a floor finish of their own and falls back to Room I', () => {
    expect(Object.keys(FLOOR_DESIGNS).sort()).toEqual([...ROOM_IDS].sort());
    for (const roomId of ROOM_IDS) expect(FLOOR_DESIGNS[roomId]).toBeDefined();
    // Four distinct finishes, one per room.
    expect(new Set(ROOM_IDS.map(roomId => FLOOR_DESIGNS[roomId].id)).size).toBe(4);
    expect(floorDesignForRoom('room-3')).toBe(FLOOR_DESIGNS['room-3']);
    expect(floorDesignForRoom('room-99')).toBe(FLOOR_DESIGNS['room-1']);
    expect(floorDesignForRoom()).toBe(FLOOR_DESIGNS['room-1']);
  });

  it('keeps every value the reflector shader takes inside a sane, finite range', () => {
    for (const [roomId, design] of Object.entries(FLOOR_DESIGNS)) {
      for (const [tier, finish] of [['standard', design.standard], ['low', design.low]] as const) {
        const label = `${roomId} ${tier}`;
        const scalars = {
          mirror: finish.mirror, roughness: finish.roughness, metalness: finish.metalness,
          mixBlur: finish.mixBlur, mixStrength: finish.mixStrength,
          depthScale: finish.depthScale,
          minDepthThreshold: finish.minDepthThreshold, maxDepthThreshold: finish.maxDepthThreshold,
          resolution: finish.resolution,
        };
        for (const [key, value] of Object.entries(scalars)) {
          expect(Number.isFinite(value), `${label} ${key} must be finite`).toBe(true);
        }
        expect(finish.blur.every(Number.isFinite), `${label} blur must be finite`).toBe(true);
        // mirror = how much of the base colour the reflection replaces.
        expect(finish.mirror, `${label} mirror`).toBeGreaterThan(0.05);
        expect(finish.mirror, `${label} mirror`).toBeLessThanOrEqual(0.75);
        // roughness = share of the blurred reflection (blurFactor = mixBlur * roughness).
        expect(finish.roughness, `${label} roughness`).toBeGreaterThanOrEqual(0.3);
        expect(finish.roughness, `${label} roughness`).toBeLessThanOrEqual(1);
        expect(finish.metalness, `${label} metalness`).toBeGreaterThanOrEqual(0.05);
        expect(finish.metalness, `${label} metalness`).toBeLessThanOrEqual(0.6);
        expect(finish.mixBlur, `${label} mixBlur`).toBeGreaterThanOrEqual(0.3);
        expect(finish.mixBlur, `${label} mixBlur`).toBeLessThanOrEqual(1.6);
        expect(finish.mixStrength, `${label} mixStrength`).toBeGreaterThanOrEqual(5);
        expect(finish.mixStrength, `${label} mixStrength`).toBeLessThanOrEqual(22);
        // blur magnitude is free (fixed five-tap passes) but must stay on: a zero
        // pair silently switches the reflector onto a different shader path.
        expect(finish.blur[0], `${label} blur x`).toBeGreaterThanOrEqual(0);
        expect(finish.blur[1], `${label} blur y`).toBeGreaterThanOrEqual(0);
        expect(finish.blur[0], `${label} blur x`).toBeLessThanOrEqual(600);
        expect(finish.blur[1], `${label} blur y`).toBeLessThanOrEqual(600);
        expect(finish.blur[0] + finish.blur[1], `${label} blur`).toBeGreaterThan(0);
        expect(finish.depthScale, `${label} depthScale`).toBeGreaterThanOrEqual(0.5);
        expect(finish.depthScale, `${label} depthScale`).toBeLessThanOrEqual(2);
        // A narrow depth band pops where the reflection fades; keep it gradual.
        expect(finish.minDepthThreshold, `${label} min depth`).toBeGreaterThan(0);
        expect(finish.minDepthThreshold, `${label} max depth`).toBeLessThan(finish.maxDepthThreshold);
        expect(finish.maxDepthThreshold, `${label} max depth`).toBeLessThanOrEqual(2);
        expect(
          finish.maxDepthThreshold - finish.minDepthThreshold,
          `${label} depth band`,
        ).toBeGreaterThanOrEqual(0.8);
        expect(Number.isInteger(finish.resolution), `${label} resolution`).toBe(true);
        expect(finish.resolution, `${label} resolution`).toBeGreaterThanOrEqual(64);
        expect(finish.resolution, `${label} resolution`).toBeLessThanOrEqual(2048);
      }

      // The tint only nudges the theme's floor colour; it never repaints it.
      if (design.tint === null) {
        expect(design.tintMix, `${roomId} tintMix without tint`).toBe(0);
      } else {
        expect(design.tint, `${roomId} tint`).toMatch(HEX);
        expect(design.tintMix, `${roomId} tintMix`).toBeGreaterThan(0);
      }
      expect(design.tintMix, `${roomId} tintMix`).toBeGreaterThanOrEqual(0);
      expect(design.tintMix, `${roomId} tintMix`).toBeLessThanOrEqual(0.2);
    }
  });

  it('never asks the cheap tier to render more than the full one', () => {
    for (const [roomId, design] of Object.entries(FLOOR_DESIGNS)) {
      const { standard, low } = design;
      // The reflection pass is the cost: same scene, fewer pixels.
      expect(low.resolution, `${roomId} resolution`).toBeLessThan(standard.resolution);
      // At 124 px a sharp reflection crawls, so mobile leans on the blurred one.
      expect(low.roughness, `${roomId} roughness`).toBeGreaterThanOrEqual(standard.roughness);
      expect(
        low.blur[0] + low.blur[1],
        `${roomId} blur`,
      ).toBeGreaterThanOrEqual(standard.blur[0] + standard.blur[1]);
      // Same finish, cheaper: intensity is a look, not a cost.
      expect(low.mirror, `${roomId} mirror`).toBe(standard.mirror);
      expect(low.metalness, `${roomId} metalness`).toBe(standard.metalness);
      expect(low.mixStrength, `${roomId} mixStrength`).toBe(standard.mixStrength);
      expect(low.mixBlur, `${roomId} mixBlur`).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('hands the reflector a complete prop bag, straight from the registry', () => {
    for (const [roomId, design] of Object.entries(FLOOR_DESIGNS)) {
      for (const tier of ['standard', 'low'] as const) {
        const props = floorMaterialProps(design, tier);
        expect(Object.keys(props).sort(), `${roomId} ${tier} props`).toEqual([...FINISH_KEYS].sort());
        expect(props, `${roomId} ${tier} values`).toEqual(finishes(design)[tier === 'low' ? 1 : 0]);
        // A copy, so the component can never mutate the registry.
        expect(props).not.toBe(finishes(design)[tier === 'low' ? 1 : 0]);
      }
      // Default tier is the full one.
      expect(floorMaterialProps(design)).toEqual(design.standard);
    }
  });

  it('reads as four different floors, not one floor retuned', () => {
    const designs = ROOM_IDS.map(roomId => FLOOR_DESIGNS[roomId]);
    const signatures = designs.map(design => {
      const { standard } = design;
      return [
        design.tint,
        standard.mirror, standard.roughness, standard.metalness,
        standard.mixBlur, standard.mixStrength,
        standard.blur.join(), standard.depthScale,
      ].join('|');
    });
    expect(new Set(signatures).size).toBe(4);
    // Spread, not four shades of the same reflection.
    const mirrors = designs.map(design => design.standard.mirror);
    const blurFactors = designs.map(design => design.standard.mixBlur * design.standard.roughness);
    const strengths = designs.map(design => design.standard.mixStrength);
    expect(new Set(mirrors).size).toBe(4);
    expect(Math.max(...mirrors) - Math.min(...mirrors)).toBeGreaterThanOrEqual(0.4);
    // How sharp the reflection is, not how rough the slab. Roughness alone is a
    // bad proxy: a low value blows out the specular highlight and washes the
    // room to light grey, so pinning a spread on it forces one room to go pale.
    // Sharpness is what actually tells the four floors apart.
    expect(Math.max(...blurFactors) - Math.min(...blurFactors)).toBeGreaterThanOrEqual(0.4);
    expect(Math.max(...strengths) - Math.min(...strengths)).toBeGreaterThanOrEqual(6);
    expect(new Set(designs.map(design => design.tint)).size).toBe(4);
    // One wet mirror and one absorbent matte, as the brief asks.
    expect(mirrors.some(mirror => mirror >= 0.6)).toBe(true);
    expect(mirrors.some(mirror => mirror <= 0.2)).toBe(true);
    expect(new Set(designs.map(design => design.standard.blur.join())).size).toBe(4);
  });

  it('tints the room palette a shade or two, never repaints it', () => {
    const themeFloor = '#0a0806';
    for (const [roomId, design] of Object.entries(FLOOR_DESIGNS)) {
      const resolved = resolveFloorColor(themeFloor, design);
      expect(resolved, `${roomId} colour`).toMatch(HEX);
      if (design.tint === null) {
        expect(resolved, `${roomId} untinted`).toBe(themeFloor);
        continue;
      }
      expect(resolved, `${roomId} untinted`).not.toBe(themeFloor);
      // Still the room's own colour: nearer the theme's floor than the tint itself.
      const base = new THREE.Color(themeFloor);
      const tint = new THREE.Color(design.tint);
      const result = new THREE.Color(resolved);
      expect(distance(result, base), `${roomId} drift`).toBeLessThan(distance(result, tint));
      expect(distance(result, base), `${roomId} drift`).toBeGreaterThan(0);
    }
  });

  it('leaves a colour it cannot parse exactly as it found it', () => {
    for (const design of Object.values(FLOOR_DESIGNS)) {
      for (const value of ['', 'not-a-colour', '#0a08', 'rgb(10, 8, 6)', 'var(--floor)']) {
        expect(resolveFloorColor(value, design)).toBe(value);
      }
    }
    // No tint at all: the theme colour passes straight through.
    const untinted = { ...FLOOR_DESIGNS['room-1'], tint: null, tintMix: 0 } as FloorDesign;
    expect(resolveFloorColor('#123456', untinted)).toBe('#123456');
  });
});
