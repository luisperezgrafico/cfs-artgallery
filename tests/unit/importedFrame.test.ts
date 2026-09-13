import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  adaptImportedFrameGeometry,
  IMPORTED_FRAME_APERTURE,
  IMPORTED_FRAME_BORDER,
  IMPORTED_FRAME_DEPTH,
} from '../../utils/importedFrame';

function sourceGeometry() {
  // Read the shipped mesh, not a synthetic ring: catch regressions in the asset itself.
  const glb = readFileSync('public/models/frames/fancy-picture-frame-01.glb');
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').trim());
  const binaryOffset = 20 + jsonLength + 8;
  const primitive = json.meshes[0].primitives[0];
  const positionAccessor = json.accessors[primitive.attributes.POSITION];
  const positionView = json.bufferViews[positionAccessor.bufferView];
  const start = binaryOffset + (positionView.byteOffset ?? 0) + (positionAccessor.byteOffset ?? 0);
  const positions = Array.from({ length: positionAccessor.count * 3 }, (_, i) => glb.readFloatLE(start + i * 4));
  const indexAccessor = json.accessors[primitive.indices];
  const indexView = json.bufferViews[indexAccessor.bufferView];
  const indexStart = binaryOffset + (indexView.byteOffset ?? 0) + (indexAccessor.byteOffset ?? 0);
  expect(indexAccessor.componentType).toBe(5123);
  const indices = Array.from({ length: indexAccessor.count }, (_, i) => glb.readUInt16LE(indexStart + i * 2));
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

describe('adaptImportedFrameGeometry', () => {
  it.each([[0.7, 1.4], [1, 1], [2.4, 1.2]])(
    'keeps a centered %sx%s aperture and a .10 border',
    (width, height) => {
      const source = sourceGeometry();
      const original = Array.from(source.getAttribute('position').array);
      const geometry = adaptImportedFrameGeometry(source, width, height);
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      expect(bounds.min.x).toBeCloseTo(-width / 2 - IMPORTED_FRAME_BORDER, 5);
      expect(bounds.max.x).toBeCloseTo(width / 2 + IMPORTED_FRAME_BORDER, 5);
      expect(bounds.min.y).toBeCloseTo(-height / 2 - IMPORTED_FRAME_BORDER, 5);
      expect(bounds.max.y).toBeCloseTo(height / 2 + IMPORTED_FRAME_BORDER, 5);
      expect(IMPORTED_FRAME_APERTURE.width).toBeCloseTo(0.4436208, 6);
      expect(IMPORTED_FRAME_APERTURE.height).toBeCloseTo(0.32496036, 6);
      expect(Array.from(source.getAttribute('position').array)).toEqual(original);
      expect(geometry.getAttribute('position')).not.toBe(source.getAttribute('position'));
      geometry.dispose(); source.dispose();
    },
  );

  it('has finite normals, bounded depth and stays below the frame triangle budget', () => {
    const source = sourceGeometry();
    const geometry = adaptImportedFrameGeometry(source, 1.5, 1);
    const normals = geometry.getAttribute('normal');
    for (let i = 0; i < normals.count; i++) {
      expect(Number.isFinite(normals.getX(i))).toBe(true);
      expect(Number.isFinite(normals.getY(i))).toBe(true);
      expect(Number.isFinite(normals.getZ(i))).toBe(true);
    }
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    expect(bounds.min.z).toBeGreaterThanOrEqual(IMPORTED_FRAME_DEPTH.back - 0.00001);
    expect(bounds.max.z).toBeLessThanOrEqual(IMPORTED_FRAME_DEPTH.front + 0.00001);
    expect((geometry.index?.count ?? 0) / 3).toBeLessThanOrEqual(936);
    geometry.dispose(); source.dispose();
  });

  it.each([[0.75, 1.5], [1.5, 1.5], [1.5, 0.6]])('leaves the actual %sx%s artwork plane unobstructed', (width, height) => {
    const source = sourceGeometry();
    const geometry = adaptImportedFrameGeometry(source, width, height);
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    for (let x = 0; x <= 20; x++) {
      for (let y = 0; y <= 20; y++) {
        const origin = new Vector3((x / 20 - .5) * width * .998, (y / 20 - .5) * height * .998, 1);
        const ray = new Raycaster(origin, new Vector3(0, 0, -1), 0, 1 - .051);
        expect(ray.intersectObject(mesh)).toHaveLength(0);
      }
    }
    geometry.dispose(); source.dispose(); material.dispose();
  });

  it('ships a frame-only GLB inside the 600 KB load budget', () => {
    const filename = 'public/models/frames/fancy-picture-frame-01.glb';
    expect(statSync(filename).size).toBeLessThanOrEqual(600 * 1024);
    const glb = readFileSync(filename);
    const jsonLength = glb.readUInt32LE(12);
    const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').trim());
    expect(json.nodes).toHaveLength(1);
    expect(json.meshes).toHaveLength(1);
    expect(json.accessors[3].count / 3).toBeLessThanOrEqual(936);
    expect(JSON.stringify(json)).not.toContain('canvas');
  });
});
