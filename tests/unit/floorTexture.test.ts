import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FLOOR_DESIGNS } from '../../utils/floorDesign';
import { FLOOR_TEXTURE_SIZE, createFloorSurfaceTexture } from '../../utils/floorTexture';

const STUDIES = [
  'room-1-alt-study', 'room-2-alt-study', 'room-3-alt-study', 'room-4-alt-study',
];

const data = (texture: THREE.DataTexture) => texture.image.data as Uint8Array;

describe('procedural floor matter', () => {
  it('builds one small deterministic map for every preview finish', () => {
    for (const key of STUDIES) {
      const recipe = FLOOR_DESIGNS[key].texture;
      expect(recipe, `${key} recipe`).not.toBeNull();
      const a = createFloorSurfaceTexture(recipe!);
      const b = createFloorSurfaceTexture(recipe!);

      expect(a).toBeInstanceOf(THREE.DataTexture);
      expect(a.image.width).toBe(FLOOR_TEXTURE_SIZE);
      expect(a.image.height).toBe(FLOOR_TEXTURE_SIZE);
      expect(a.wrapS).toBe(THREE.RepeatWrapping);
      expect(a.wrapT).toBe(THREE.RepeatWrapping);
      // Not colour data: the same map is the height the reflection is displaced by.
      expect(a.colorSpace).toBe(THREE.NoColorSpace);
      // Mips on, so a floor seen down the room cannot crawl while the camera moves.
      expect(a.generateMipmaps).toBe(true);
      expect(a.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(Array.from(data(a))).toEqual(Array.from(data(b)));

      a.dispose();
      b.dispose();
    }
  });

  it('keeps one map per finish at 64 KiB, against a 2 MB room budget', () => {
    for (const key of STUDIES) {
      const texture = createFloorSurfaceTexture(FLOOR_DESIGNS[key].texture!);
      expect(data(texture).byteLength, key).toBeLessThanOrEqual(64 * 1024);
      texture.dispose();
    }
  });

  it('carries real relief, and leaves the channels that cost brightness alone', () => {
    for (const key of STUDIES) {
      const recipe = FLOOR_DESIGNS[key].texture!;
      const texture = createFloorSurfaceTexture(recipe);
      const bytes = data(texture);

      let min = 255, max = 0;
      for (let i = 0; i < bytes.length; i += 4) {
        min = Math.min(min, bytes[i]);
        max = Math.max(max, bytes[i]);
        // Green is the reflector's blur channel and it is deliberately constant:
        // any sharper texel would render as a brighter texel. Blue is unused.
        expect(bytes[i + 1], `${key} green channel`).toBe(255);
        expect(bytes[i + 2], `${key} blue channel`).toBe(0);
        expect(bytes[i + 3], `${key} alpha channel`).toBe(255);
      }

      // This is the whole point of the map: a finish whose height channel barely
      // moves is a veil with extra steps, which is what the superseded set shipped.
      expect(max - min, `${key} height range`).toBeGreaterThan(24);
      // The height channel never spans its range: the reflection needs a
      // constant part it does not move, or the floor stops belonging to the room.
      expect(min, `${key} height floor`).toBeLessThan(40);
      expect(max, `${key} height peak`).toBeLessThanOrEqual(recipe.relief * 255 + 1);
      // ...but it does reach most of the way up, or the relief is decorative.
      expect(max, `${key} height peak reached`).toBeGreaterThan(recipe.relief * 255 * 0.7);
      texture.dispose();
    }
  });

  it('reads each material as its own field, not one noise scaled', () => {
    const signatures = STUDIES.map(key => {
      const recipe = FLOOR_DESIGNS[key].texture!;
      const texture = createFloorSurfaceTexture(recipe);
      const bytes = data(texture);
      const signature = `${recipe.kind}|${recipe.scale.join()}|${recipe.relief}|${bytes[0]},${bytes[1000]},${bytes[8000]}`;
      texture.dispose();
      return signature;
    });
    expect(new Set(signatures).size).toBe(STUDIES.length);
  });
});
