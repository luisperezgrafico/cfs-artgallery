import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BENCH_DESIGNS,
  benchDesignForRoom,
  createBenchGeometry,
  createBenchPartGeometry,
} from '../../utils/benchDesign';

const ROOM_IDS = ['room-1', 'room-2', 'room-3', 'room-4'];

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

  it('keeps every design inside the seating envelope the rest view relies on', () => {
    for (const [roomId, design] of Object.entries(BENCH_DESIGNS)) {
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
        // Nothing floats and nothing pokes up past the seat.
        const bottom = part.position[1] - part.size[1] / 2;
        const top = part.position[1] + part.size[1] / 2;
        expect(bottom, `${roomId} ${part.shape} floor`).toBeGreaterThanOrEqual(-1e-6);
        expect(top, `${roomId} ${part.shape} seat`).toBeLessThanOrEqual(design.seatHeight + 1e-6);
      }
    }
  });

  it('keeps each bench to three materials, all of them dull', () => {
    for (const [roomId, design] of Object.entries(BENCH_DESIGNS)) {
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
    for (const [roomId, design] of Object.entries(BENCH_DESIGNS)) {
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
    for (const [roomId, design] of Object.entries(BENCH_DESIGNS)) {
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

  it('reads as four different benches, not one bench recoloured', () => {
    const signatures = ROOM_IDS.map(roomId => {
      const design = BENCH_DESIGNS[roomId];
      return [
        design.materials.map(material => material.color).join(),
        design.parts.map(part => `${part.shape}:${part.size.join()}`).join(),
      ].join('|');
    });
    expect(new Set(signatures).size).toBe(4);
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
