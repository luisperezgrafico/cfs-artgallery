import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FLOOR_PATTERNS,
  FLOOR_PATTERN_STUDIES,
  createFloorPatternTexture,
  floorPatternDesign,
  floorPatternForRoom,
  floorPatternPreviewKey,
  type FloorPattern,
} from '../../utils/floorPattern';

const ALL = [...Object.values(FLOOR_PATTERNS), ...Object.values(FLOOR_PATTERN_STUDIES)];
const HEX = /^#[0-9a-f]{6}$/;
const SIZE = 256;

describe('floor patterns', () => {
  it('keys every pattern to the room it belongs to', () => {
    for (const [key, pattern] of Object.entries(FLOOR_PATTERNS)) {
      expect(pattern.room, key).toBe(key);
      expect(pattern.id, key).toBe(key);
    }
    // A study declares its room in the key, so one can never be laid by accident.
    for (const [key, pattern] of Object.entries(FLOOR_PATTERN_STUDIES)) {
      expect(pattern.id, key).toBe(key);
      expect(pattern.room, key).toMatch(/^room-\d$/);
      expect(key.startsWith(`${pattern.room}-pat-`), key).toBe(true);
    }
    expect(ALL.length).toBeGreaterThan(0);
  });

  it('keeps every field inside what the shader, the tiling and the compensation take', () => {
    for (const pattern of ALL) {
      const at = pattern.id;
      expect(Number.isFinite(pattern.tile), at).toBe(true);
      expect(pattern.tile, at).toBeGreaterThanOrEqual(0.5);
      expect(pattern.tile, at).toBeLessThanOrEqual(8);
      expect(pattern.depth, at).toBeGreaterThan(0);
      expect(pattern.depth, at).toBeLessThanOrEqual(1);
      // Both band counts are integers, or the field stops wrapping at the tile edge.
      expect(Number.isInteger(pattern.bands), at).toBe(true);
      expect(Number.isInteger(pattern.cross), at).toBe(true);
      expect(pattern.bands, at).toBeGreaterThanOrEqual(0);
      expect(pattern.cross, at).toBeGreaterThanOrEqual(0);
      expect(pattern.bands + pattern.cross, at).toBeGreaterThan(0);
      expect(pattern.bands + pattern.cross, at).toBeLessThanOrEqual(48);
      expect(pattern.sharpness, at).toBeGreaterThanOrEqual(2);
      expect(pattern.sharpness, at).toBeLessThanOrEqual(40);
      expect(pattern.warp, at).toBeGreaterThanOrEqual(0);
      expect(pattern.warp, at).toBeLessThanOrEqual(2);
      expect(pattern.grain, at).toBeGreaterThanOrEqual(0);
      expect(pattern.grain, at).toBeLessThanOrEqual(1);
      expect(pattern.tint, at).toMatch(HEX);

      // An imported pattern points at a file that has to exist: a typo would
      // otherwise fall back to a plain floor in silence.
      if (pattern.source === 'imported') {
        expect(pattern.technique, at).toBe('overlay-mesh');
        expect(pattern.file, at).toMatch(/^\/[\w./-]+\.(jpg|jpeg|png|webp)$/i);
        expect(existsSync(join(process.cwd(), 'public', pattern.file!)), `${at} file`).toBe(true);
      } else {
        expect(pattern.file, at).toBeUndefined();
      }

      if (pattern.technique === 'albedo-map') {
        // The gain is the extra push on top of the 1/mean fix; below 1 it would
        // darken the room, and a large one would defeat the point of the fix.
        expect(pattern.gain, at).toBeGreaterThanOrEqual(1);
        expect(pattern.gain, at).toBeLessThanOrEqual(1.6);
        expect(pattern.opacity, at).toBe(0);
        expect(pattern.roughness, at).toBe(0);
      } else {
        expect(pattern.opacity, at).toBeGreaterThan(0);
        expect(pattern.opacity, at).toBeLessThanOrEqual(0.6);
        expect(pattern.roughness, at).toBeGreaterThan(0);
        expect(pattern.roughness, at).toBeLessThanOrEqual(1);
        expect(pattern.gain, at).toBe(1);
      }
    }
  });

  it('builds a texture deterministically, and reports the mean it actually has', () => {
    const pattern = Object.values(FLOOR_PATTERNS)[0];
    const a = createFloorPatternTexture(pattern);
    const b = createFloorPatternTexture(pattern);

    expect(a.texture.image.width).toBe(SIZE);
    expect(a.texture.image.height).toBe(SIZE);
    // Power of two, and it repeats the tile rather than clamping a half tile.
    expect(a.texture.wrapS).toBe(a.texture.wrapT);
    expect(a.texture.minFilter).not.toBe(a.texture.magFilter);

    const pixels = a.texture.image.data as Uint8Array;
    const again = b.texture.image.data as Uint8Array;
    let sum = 0;
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] !== again[i]) throw new Error(`not deterministic at byte ${i}`);
      // RGB is a grey multiplier, A is where the pattern sits.
      if (pixels[i] !== pixels[i + 1] || pixels[i] !== pixels[i + 2]) {
        throw new Error(`RGB is not grey at byte ${i}`);
      }
      sum += pixels[i] / 255;
      min = Math.min(min, pixels[i]);
      max = Math.max(max, pixels[i]);
    }
    // A flat field would be a pattern that does nothing.
    expect(max - min).toBeGreaterThan(10);
    // The darkest value is bounded by depth: value = 1 - depth * field.
    expect(min / 255).toBeGreaterThanOrEqual(1 - pattern.depth - 0.01);
    expect(max / 255).toBeLessThanOrEqual(1);
    // Floor.tsx divides the floor colour by this, so it has to be the real mean.
    expect(a.mean).toBeCloseTo(sum / (SIZE * SIZE), 6);
  });

  it('wraps without a seam — the floor repeats the tile eight times', () => {
    for (const pattern of Object.values(FLOOR_PATTERNS)) {
      const { texture } = createFloorPatternTexture(pattern);
      const data = texture.image.data as Uint8Array;
      let wrapSum = 0;
      let stepSum = 0;
      for (let y = 0; y < SIZE; y++) {
        const at = (x: number) => data[(y * SIZE + x) * 4];
        // The step across the seam should look like any other step of the field.
        wrapSum += Math.abs(at(0) - at(SIZE - 1));
        for (let x = 0; x < SIZE - 1; x++) stepSum += Math.abs(at(x + 1) - at(x));
      }
      const wrapMean = wrapSum / SIZE;
      const stepMean = stepSum / (SIZE * (SIZE - 1));
      expect(wrapMean, `${pattern.id} seam`).toBeLessThan(stepMean * 4 + 1);
    }
  });

  it('lays a room its own stone, and a study only in the room it was cut for', () => {
    expect(floorPatternPreviewKey(null)).toBeNull();
    expect(floorPatternPreviewKey('')).toBeNull();
    expect(floorPatternPreviewKey('?room=room-1')).toBeNull();
    // A typo is ignored, never guessed at.
    expect(floorPatternPreviewKey('?floor=nope')).toBeNull();
    expect(floorPatternForRoom('?floor=nope', 'room-1')).toBe(FLOOR_PATTERNS['room-1']);

    const study = FLOOR_PATTERN_STUDIES['room-1-pat-smoke'];
    expect(floorPatternForRoom('?floor=room-1-pat-smoke', 'room-1')).toBe(study);
    // The same key in another room resolves to that room's floor, never to this stone.
    expect(floorPatternForRoom('?floor=room-1-pat-smoke', 'room-2')).toBe(floorPatternDesign('room-2'));
    expect(floorPatternForRoom('?floor=room-1-pat-smoke', 'room-3')).toBe(floorPatternDesign('room-3'));
    // Only a room with no stone of its own falls all the way back to nothing —
    // now that all four have one, that means an unknown room id.
    expect(floorPatternForRoom('?floor=room-1-pat-smoke', 'room-9')).toBeNull();
    // An ordinary visit: no parameter, the room's own stone.
    expect(floorPatternForRoom('?room=room-1', 'room-1')).toBe(FLOOR_PATTERNS['room-1']);
    expect(floorPatternForRoom(null, 'room-1')).toBe(FLOOR_PATTERNS['room-1']);

    // A room with no stone of its own draws a plain floor, not someone else's.
    expect(floorPatternDesign('room-99')).toBeNull();
    expect(floorPatternDesign()).toBeNull();
  });

  it('gives every room with a floor of its own a stone of its own', () => {
    const ids = Object.values(FLOOR_PATTERNS).map((p: FloorPattern) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
