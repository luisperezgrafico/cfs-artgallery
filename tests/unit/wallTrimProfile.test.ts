import { describe, expect, it } from 'vitest';
import {
  CORNICE_DEPTH,
  CORNICE_HEIGHT,
  createCorniceGeometry,
  createSkirtingGeometry,
  SKIRTING_DEPTH,
  SKIRTING_HEIGHT,
} from '../../utils/wallTrimProfile';

/**
 * The bounding box is the whole point of these tests: the profile is written in
 * one plane and rotated into the wall's, so an orientation slip would put the
 * trim inside the wall or across the room, and nothing in the source would look
 * wrong.
 */
function bounds(geometry: { computeBoundingBox: () => void; boundingBox: any }) {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  return {
    length: b.max.x - b.min.x,
    height: b.max.y - b.min.y,
    depth: b.max.z - b.min.z,
    minX: b.min.x,
    minY: b.min.y,
    minZ: b.min.z,
  };
}

describe('createSkirtingGeometry', () => {
  it('runs along +X for the given length, up from y=0, out towards +Z', () => {
    const b = bounds(createSkirtingGeometry(9.4));
    expect(b.length).toBeCloseTo(9.4, 4);
    expect(b.minX).toBeCloseTo(0, 4);
    expect(b.minY).toBeCloseTo(0, 4);
    expect(b.minZ).toBeCloseTo(0, 4);
    expect(b.height).toBeCloseTo(SKIRTING_HEIGHT, 4);
    expect(b.depth).toBeCloseTo(SKIRTING_DEPTH, 4);
  });

  it('is shallower than it is tall, and shorter than a wall', () => {
    const b = bounds(createSkirtingGeometry(4));
    expect(b.depth).toBeLessThan(b.height);
    expect(b.length).toBeCloseTo(4, 4);
  });
});

describe('createCorniceGeometry', () => {
  it('hangs from its own base with the profile standing off the wall', () => {
    const b = bounds(createCorniceGeometry(12));
    expect(b.length).toBeCloseTo(12, 4);
    expect(b.minX).toBeCloseTo(0, 4);
    expect(b.minY).toBeCloseTo(0, 4);
    expect(b.minZ).toBeCloseTo(0, 4);
    expect(b.height).toBeCloseTo(CORNICE_HEIGHT, 4);
    expect(b.depth).toBeCloseTo(CORNICE_DEPTH, 4);
  });

  it('is a deeper profile than the skirting, as a cornice should be', () => {
    expect(CORNICE_DEPTH).toBeGreaterThan(SKIRTING_DEPTH);
    expect(CORNICE_HEIGHT).toBeGreaterThan(SKIRTING_HEIGHT);
  });

  it('has the cavetto: the sweep means the profile is not a plain box', () => {
    // A box would have 24 vertices; the curve adds geometry of its own.
    const curved = createCorniceGeometry(8);
    const position = curved.getAttribute('position');
    expect(position.count).toBeGreaterThan(24);
    // Every vertex stays inside the section's own footprint.
    const b = bounds(curved);
    expect(b.depth).toBeLessThanOrEqual(CORNICE_DEPTH + 1e-6);
    expect(b.height).toBeLessThanOrEqual(CORNICE_HEIGHT + 1e-6);
  });
});
