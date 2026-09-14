import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createWallPlasterTexture,
  getWallPlasterTexture,
  wallTextureTile,
  WALL_TEXTURE_TILE_M,
} from '../../utils/wallPlasterTexture';

describe('createWallPlasterTexture', () => {
  it('returns a small deterministic RGBA DataTexture', () => {
    const texture = createWallPlasterTexture();
    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture.image.width).toBeLessThanOrEqual(256);
    expect(texture.image.height).toBeLessThanOrEqual(256);
    expect(texture.image.width).toBeGreaterThan(0);
    expect(texture.image.height).toBeGreaterThan(0);
    expect((texture.image.data as Uint8Array).length).toBe(256 * 256 * 4);
  });

  it('repeats seamlessly on both axes', () => {
    const texture = createWallPlasterTexture();
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    expect(texture.version).toBeGreaterThan(0);
  });

  it('is fully deterministic across calls', () => {
    const a = createWallPlasterTexture();
    const b = createWallPlasterTexture();
    expect(Array.from(a.image.data as Uint8Array)).toEqual(Array.from(b.image.data as Uint8Array));
  });

  it('puts relief in r and an identical sheen in g/b, the channels three reads', () => {
    const data = createWallPlasterTexture().image.data as Uint8Array;
    let reliefDiffersFromSheen = 0;
    for (let i = 0; i < data.length; i += 4) {
      // roughnessMap reads g, so g and b must agree...
      expect(data[i + 1]).toBe(data[i + 2]);
      expect(data[i + 3]).toBe(255);
      // ...and the relief must be its own, wider signal for the bumpMap (r).
      if (data[i] !== data[i + 1]) reliefDiffersFromSheen++;
    }
    expect(reliefDiffersFromSheen).toBeGreaterThan((data.length / 4) * 0.9);
  });

  it('gives the bump a wide range and the sheen a narrow, high one', () => {
    const data = createWallPlasterTexture().image.data as Uint8Array;
    let reliefMin = 255, reliefMax = 0;
    let sheenMin = 255, sheenMax = 0, sheenSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      reliefMin = Math.min(reliefMin, data[i]);
      reliefMax = Math.max(reliefMax, data[i]);
      sheenMin = Math.min(sheenMin, data[i + 1]);
      sheenMax = Math.max(sheenMax, data[i + 1]);
      sheenSum += data[i + 1];
      count++;
    }

    // The bump needs gradients to perturb normals with at all.
    expect(reliefMin).toBeGreaterThanOrEqual(70);
    expect(reliefMax - reliefMin).toBeGreaterThan(120);

    // The sheen multiplies roughness={1}: kept near the flat 0.85-0.9 the walls
    // were tuned with, so enabling this does not relight a room.
    expect(sheenMin).toBeGreaterThanOrEqual(150);
    expect(sheenMax).toBeLessThanOrEqual(255);
    expect(sheenMax - sheenMin).toBeGreaterThan(40);
    expect(sheenSum / count).toBeGreaterThan(205);
  });

  it('has no seam: the facing edges differ no more than neighbouring columns do', () => {
    const texture = createWallPlasterTexture();
    const data = texture.image.data as Uint8Array;
    const size = texture.image.width;
    const at = (x: number, y: number) => data[(y * size + x) * 4];

    let seam = 0, interior = 0;
    for (let y = 0; y < size; y++) {
      seam += Math.abs(at(0, y) - at(size - 1, y));
      interior += Math.abs(at(0, y) - at(1, y));
    }
    expect(seam / size).toBeLessThan((interior / size) * 1.6);
  });
});

describe('getWallPlasterTexture', () => {
  it('hands out one shared instance', () => {
    expect(getWallPlasterTexture()).toBe(getWallPlasterTexture());
  });
});

describe('wallTextureTile', () => {
  it('keeps one tile at a fixed number of metres whatever the wall size', () => {
    const base = createWallPlasterTexture();
    const small = wallTextureTile(base, WALL_TEXTURE_TILE_M, WALL_TEXTURE_TILE_M);
    const wide = wallTextureTile(base, WALL_TEXTURE_TILE_M * 4, WALL_TEXTURE_TILE_M * 2);
    expect(small.repeat.x).toBeCloseTo(1);
    expect(small.repeat.y).toBeCloseTo(1);
    expect(wide.repeat.x).toBeCloseTo(4);
    expect(wide.repeat.y).toBeCloseTo(2);
  });

  it('shares the base image so extra walls cost no texture memory', () => {
    const base = createWallPlasterTexture();
    const tiled = wallTextureTile(base, 10, 5);
    expect(tiled.source).toBe(base.source);
    expect(tiled.image.data).toBe(base.image.data);
  });
});
