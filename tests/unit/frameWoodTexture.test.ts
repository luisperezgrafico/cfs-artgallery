import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createFrameWoodTexture } from '../../utils/frameWoodTexture';

describe('createFrameWoodTexture', () => {
  it('returns a small deterministic grayscale DataTexture', () => {
    const texture = createFrameWoodTexture();
    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture.image.width).toBeLessThanOrEqual(128);
    expect(texture.image.height).toBeLessThanOrEqual(128);
    expect(texture.image.width).toBeGreaterThan(0);
    expect(texture.image.height).toBeGreaterThan(0);
  });

  it('repeats seamlessly on both axes', () => {
    const texture = createFrameWoodTexture();
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    expect(texture.version).toBeGreaterThan(0);
  });

  it('is fully deterministic across calls', () => {
    const a = createFrameWoodTexture();
    const b = createFrameWoodTexture();
    expect(a.image.width).toBe(b.image.width);
    expect(a.image.height).toBe(b.image.height);
    expect(Array.from(a.image.data as Uint8Array)).toEqual(Array.from(b.image.data as Uint8Array));
  });

  it('produces usable single-channel grayscale data with real variation, not flat noise', () => {
    const texture = createFrameWoodTexture();
    const data = texture.image.data as Uint8Array;
    const width = texture.image.width;
    const height = texture.image.height;
    const channels = data.length / (width * height);
    expect(Number.isInteger(channels)).toBe(true);
    expect(channels).toBeLessThanOrEqual(1);

    let min = 255, max = 0, sum = 0;
    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
      sum += data[i];
    }
    const mean = sum / data.length;
    expect(max - min).toBeGreaterThan(40);

    let variance = 0;
    for (let i = 0; i < data.length; i++) variance += (data[i] - mean) ** 2;
    variance /= data.length;
    expect(Math.sqrt(variance)).toBeGreaterThan(5);
  });

  it('has longitudinal grain running along u: neighbouring rows along v differ more than neighbouring columns along u', () => {
    const texture = createFrameWoodTexture();
    const data = texture.image.data as Uint8Array;
    const width = texture.image.width;
    const height = texture.image.height;

    let alongU = 0, uCount = 0;
    let alongV = 0, vCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        alongU += Math.abs(data[y * width + x] - data[y * width + x + 1]);
        uCount++;
      }
    }
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        alongV += Math.abs(data[y * width + x] - data[(y + 1) * width + x]);
        vCount++;
      }
    }
    const avgAlongU = alongU / uCount;
    const avgAlongV = alongV / vCount;
    expect(avgAlongU).toBeLessThan(avgAlongV);
  });
});
