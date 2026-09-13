import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BENCH_ALTERNATES,
  BENCH_DESIGNS,
  benchDesignForKey,
  benchDesignForRoom,
  createBenchGeometry,
  createBenchPartGeometry,
} from '../../utils/benchDesign';
import { BENCH_PREVIEW_PARAM, benchPreviewDesign, benchPreviewKey } from '../../utils/benchPreview';

const ROOM_IDS = ['room-1', 'room-2', 'room-3', 'room-4'];

/** The rooms' own benches plus the prototypes: every invariant applies to both. */
const ALL_DESIGNS: Record<string, (typeof BENCH_DESIGNS)[string]> = {
  ...BENCH_DESIGNS,
  ...BENCH_ALTERNATES,
};

/** Every part, including the ones a rotated prototype places at an angle. */
function placedParts(design: (typeof BENCH_DESIGNS)[string]) {
  return design.parts.map((part) => {
    const geometry = createBenchPartGeometry(part);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    const rotation = part.rotation
      ? new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2]),
        )
      : null;
    let minY = Infinity, maxY = -Infinity;
    const vertex = new THREE.Vector3();
    for (const corner of [
      [bounds.min.x, bounds.min.y, bounds.min.z], [bounds.max.x, bounds.min.y, bounds.min.z],
      [bounds.min.x, bounds.max.y, bounds.min.z], [bounds.max.x, bounds.max.y, bounds.min.z],
      [bounds.min.x, bounds.min.y, bounds.max.z], [bounds.max.x, bounds.min.y, bounds.max.z],
      [bounds.min.x, bounds.max.y, bounds.max.z], [bounds.max.x, bounds.max.y, bounds.max.z],
    ]) {
      vertex.set(corner[0], corner[1], corner[2]);
      if (rotation) vertex.applyMatrix4(rotation);
      minY = Math.min(minY, vertex.y + part.position[1]);
      maxY = Math.max(maxY, vertex.y + part.position[1]);
    }
    geometry.dispose();
    return { minY, maxY };
  });
}

/** A convex solid (box, tapered block) must have every face pointing away from its centre. */
function expectOutwardFaces(geometry: THREE.BufferGeometry, label: string) {
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, index);
    const b = new THREE.Vector3().fromBufferAttribute(positions, index + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, index + 2);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, b));
    const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    expect(normal.dot(centroid), `${label} triangle ${index / 3} faces inwards`).toBeGreaterThan(0);
  }
}

describe('room benches', () => {
  it('gives all four rooms a bench of their own and falls back to Room I', () => {
    expect(Object.keys(BENCH_DESIGNS).sort()).toEqual([...ROOM_IDS].sort());
    for (const roomId of ROOM_IDS) expect(BENCH_DESIGNS[roomId]).toBeDefined();
    // Four distinct material languages, one per room.
    expect(new Set(ROOM_IDS.map(roomId => BENCH_DESIGNS[roomId].id)).size).toBe(4);
    expect(benchDesignForRoom('room-3')).toBe(BENCH_DESIGNS['room-3']);
    expect(benchDesignForRoom('room-99')).toBe(BENCH_DESIGNS['room-1']);
    expect(benchDesignForRoom()).toBe(BENCH_DESIGNS['room-1']);
  });

  it('keeps the prototypes beside the rooms, one per room they are proposed for', () => {
    // A prototype is an extra bench for a room, never that room's bench: the
    // room map above still holds exactly one bench per room.
    expect(Object.keys(BENCH_ALTERNATES).length).toBeGreaterThan(0);
    for (const [key, design] of Object.entries(BENCH_ALTERNATES)) {
      const room = key.match(/^(room-\d)-alt-[a-z]$/);
      expect(room, `${key} is not named <roomId>-alt-<letter>`).not.toBeNull();
      const roomId = room![1];
      expect(BENCH_DESIGNS[roomId], `${key} names a room that has no bench`).toBeDefined();
      // Same material language as the room's own bench, colour for colour.
      expect(design.materials.map(material => material.color))
        .toEqual(BENCH_DESIGNS[roomId].materials.map(material => material.color));
      expect(design.id).toBe(BENCH_DESIGNS[roomId].id);
    }
    expect(benchDesignForKey('room-2')).toBe(BENCH_DESIGNS['room-2']);
    expect(benchDesignForKey('room-2-alt-a')).toBe(BENCH_ALTERNATES['room-2-alt-a']);
    expect(benchDesignForKey('room-2-alt-z')).toBeNull();
    expect(benchDesignForKey(null)).toBeNull();
  });

  it('keeps every design inside the seating envelope the rest view relies on', () => {
    for (const [roomId, design] of Object.entries(ALL_DESIGNS)) {
      expect(Number.isFinite(design.seatHeight)).toBe(true);
      // Below the seated camera, tall enough to be furniture.
      expect(design.seatHeight).toBeGreaterThan(0.3);
      expect(design.seatHeight).toBeLessThan(0.55);
      // Wide enough to stay a comfortable tap target on a phone.
      expect(Number.isFinite(design.width)).toBe(true);
      expect(design.width).toBeGreaterThanOrEqual(1.2);
      expect(Number.isFinite(design.depth)).toBe(true);
      expect(design.depth).toBeGreaterThan(0);
      expect(design.depth).toBeLessThan(0.6);

      for (const part of design.parts) {
        expect(part.size.every(value => Number.isFinite(value) && value > 0), `${roomId} ${part.shape}`).toBe(true);
        expect(part.position.every(Number.isFinite), `${roomId} ${part.shape} position`).toBe(true);
        expect([0, 1, 2]).toContain(part.material);
        // Nothing floats and nothing pokes up past the seat. A tilted part is
        // measured where it actually ends up, not as the box it was cut from.
        const bottom = part.position[1] - part.size[1] / 2;
        const top = part.position[1] + part.size[1] / 2;
        expect(bottom, `${roomId} ${part.shape} floor`).toBeGreaterThanOrEqual(-1e-6);
        expect(top, `${roomId} ${part.shape} seat`).toBeLessThanOrEqual(design.seatHeight + 1e-6);
      }
      for (const [index, placed] of placedParts(design).entries()) {
        expect(placed.minY, `${roomId} part ${index} under the floor`).toBeGreaterThanOrEqual(-1e-6);
        expect(placed.maxY, `${roomId} part ${index} above the seat`).toBeLessThanOrEqual(design.seatHeight + 1e-6);
      }
    }
  });

  it('keeps each bench to three materials, all of them dull', () => {
    for (const [roomId, design] of Object.entries(ALL_DESIGNS)) {
      expect(design.materials).toHaveLength(3);
      expect(new Set(design.parts.map(part => part.material)).size).toBe(3);
      for (const material of design.materials) {
        expect(material.color, `${roomId} colour`).toMatch(/^#[0-9a-f]{6}$/);
        expect(material.metalness).toBeGreaterThanOrEqual(0);
        // No glints in a quiet room.
        expect(material.metalness).toBeLessThanOrEqual(0.6);
        expect(material.roughness).toBeGreaterThanOrEqual(0.4);
      }
    }
  });

  it('builds one merged, low-poly mesh per bench, in at most three draw calls', () => {
    for (const [roomId, design] of Object.entries(ALL_DESIGNS)) {
      const geometry = createBenchGeometry(design);
      const positions = geometry.getAttribute('position');
      expect(geometry.groups.length).toBeLessThanOrEqual(3);
      expect(geometry.groups.map(group => group.materialIndex)).toEqual([0, 1, 2]);
      const grouped = geometry.groups.reduce((total, group) => total + group.count, 0);
      expect(grouped, `${roomId} groups cover every vertex`).toBe(positions.count);
      expect(positions.count, `${roomId} vertex budget`).toBeLessThan(1600);
      for (let index = 0; index < positions.count; index++) {
        expect(Number.isFinite(positions.getX(index))).toBe(true);
        expect(Number.isFinite(positions.getY(index))).toBe(true);
        expect(Number.isFinite(positions.getZ(index))).toBe(true);
      }
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      expect(bounds.max.y).toBeCloseTo(design.seatHeight, 5);
      expect(bounds.min.y).toBeCloseTo(0, 5);
      expect(bounds.max.x - bounds.min.x).toBeLessThanOrEqual(design.width + 1e-6);
      expect(bounds.max.z - bounds.min.z).toBeLessThanOrEqual(design.depth + 1e-6);
      geometry.dispose();
    }
  });

  it('builds each part at its own size, with outward faces', () => {
    for (const [roomId, design] of Object.entries(ALL_DESIGNS)) {
      for (const part of design.parts) {
        const label = `${roomId} ${part.shape}`;
        const geometry = createBenchPartGeometry(part);
        const positions = geometry.getAttribute('position');
        expect(positions.count, `${label} vertices`).toBeGreaterThan(0);
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox!;
        // Parts are centred on their own origin, so a part can be positioned by its design.
        expect(bounds.max.y - bounds.min.y).toBeCloseTo(part.size[1], 5);
        expect(bounds.max.x - bounds.min.x, `${label} width`).toBeLessThanOrEqual(part.size[0] + 1e-6);
        expect(bounds.max.z - bounds.min.z, `${label} depth`).toBeLessThanOrEqual(part.size[2] + 1e-6);
        // Face winding is only readable once the triangles are unrolled.
        const flat = geometry.index ? geometry.toNonIndexed() : geometry;
        const flatPositions = flat.getAttribute('position');
        expect(flatPositions.count, `${label} vertex budget`).toBeLessThanOrEqual(400);
        for (let index = 0; index < flatPositions.count; index++) {
          expect(Number.isFinite(flatPositions.getY(index)), `${label} position`).toBe(true);
        }
        if (part.shape !== 'lathe') expectOutwardFaces(flat, label);
        if (flat !== geometry) flat.dispose();
        geometry.dispose();
      }
    }
  });

  it('turns a tilted part about its own centre, without changing what the part is', () => {
    const upright: Parameters<typeof createBenchGeometry>[0] = {
      id: 'floating', seatHeight: 0.42, width: 1.6, depth: 0.42,
      parts: [{ shape: 'box', size: [0.02, 0.4, 0.02], position: [0.5, 0.2, 0], material: 0 }],
      materials: BENCH_DESIGNS['room-2'].materials,
    };
    const uprightGeometry = createBenchGeometry(upright);
    uprightGeometry.computeBoundingBox();
    const uprightBox = uprightGeometry.boundingBox!;
    expect(uprightBox.max.y - uprightBox.min.y).toBeCloseTo(0.4, 5);

    // A quarter turn about z lays the same rod flat, and `taper` parts can
    // stand on their narrow face by turning them over.
    const laid = createBenchGeometry({
      ...upright,
      parts: [{ ...upright.parts[0], rotation: [0, 0, Math.PI / 2] }],
    });
    laid.computeBoundingBox();
    expect(laid.boundingBox!.max.y - laid.boundingBox!.min.y).toBeCloseTo(0.02, 5);
    expect(laid.boundingBox!.max.x - laid.boundingBox!.min.x).toBeCloseTo(0.4, 5);

    // The part itself is still built, measured and budgeted at its own size.
    const part = createBenchPartGeometry({ ...upright.parts[0], rotation: [0, 0, Math.PI / 2] });
    part.computeBoundingBox();
    expect(part.boundingBox!.max.y - part.boundingBox!.min.y).toBeCloseTo(0.4, 5);
  });

  it('reads as eight different benches, not one bench recoloured', () => {
    const signature = (design: (typeof BENCH_DESIGNS)[string]) => [
      design.materials.map(material => material.color).join(),
      design.parts.map(part => `${part.shape}:${part.size.join()}`).join(),
    ].join('|');
    expect(new Set(ROOM_IDS.map(roomId => signature(BENCH_DESIGNS[roomId]))).size).toBe(4);
    // No prototype is a recolour (or a copy) of the bench it is proposed for.
    for (const [key, design] of Object.entries(BENCH_ALTERNATES)) {
      const roomId = key.slice(0, key.indexOf('-alt-'));
      expect(signature(design), `${key} repeats the room's bench`).not.toBe(signature(BENCH_DESIGNS[roomId]));
    }
    expect(new Set(Object.entries(ALL_DESIGNS).map(([, design]) => signature(design))).size)
      .toBe(Object.keys(ALL_DESIGNS).length);
  });

  it('refuses a degenerate part instead of building a broken bench', () => {
    expect(() => createBenchPartGeometry({ shape: 'box', size: [0, 1, 1], position: [0, 0, 0], material: 0 })).toThrow();
    expect(() => createBenchPartGeometry({ shape: 'box', size: [1, NaN, 1], position: [0, 0, 0], material: 0 })).toThrow();
    expect(() => createBenchPartGeometry({ shape: 'taper', size: [1, 1, 1], position: [0, 0, 0], material: 0, taper: 0 })).toThrow();
    expect(() => createBenchPartGeometry({ shape: 'lathe', size: [1, 1, 1], position: [0, 0, 0], material: 0 })).toThrow();
    // A profile that does not span the part's height would sit wrong on the floor.
    expect(() => createBenchPartGeometry({
      shape: 'lathe', size: [0.1, 0.2, 0.1], position: [0, 0.1, 0], material: 0,
      profile: [[0.04, 0.05], [0.03, 0.2]],
    })).toThrow();
  });
});

describe('bench preview', () => {
  it('reads a prototype out of the URL and nothing else', () => {
    expect(BENCH_PREVIEW_PARAM).toBe('bench');
    expect(benchPreviewKey('?room=room-4&bench=room-4-alt-a')).toBe('room-4-alt-a');
    expect(benchPreviewDesign('?bench=room-2-alt-b')).toBe(BENCH_ALTERNATES['room-2-alt-b']);
    // The benches already in the rooms can be forced the same way.
    expect(benchPreviewDesign('?bench=room-2')).toBe(BENCH_DESIGNS['room-2']);
    // URLs a visitor actually produces resolve to nothing at all.
    expect(benchPreviewDesign('')).toBeNull();
    expect(benchPreviewDesign('?room=room-2')).toBeNull();
    expect(benchPreviewDesign(undefined)).toBeNull();
    expect(benchPreviewDesign(null)).toBeNull();
    // A typo previews nothing rather than a bench from another room.
    expect(benchPreviewKey('?bench=room-4-alt-c')).toBeNull();
    expect(benchPreviewDesign('?bench=')).toBeNull();
    expect(benchPreviewDesign('?bench=%20')).toBeNull();
  });
});
