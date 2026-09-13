import { describe, expect, it } from 'vitest';
import { createFrameGeometry, FRAME_DESIGNS } from '../../utils/frameDesign';

describe('room frame mouldings', () => {
  it('keeps each moulding to at most three material draw calls', () => {
    for (const design of Object.values(FRAME_DESIGNS)) {
      const geometry = createFrameGeometry(1.5, 1, design.profile);
      expect(geometry.groups.length).toBeLessThanOrEqual(3);
      geometry.dispose();
    }
  });

  it('builds a hollow, dimension-driven moulding with distinct profiles for each room', () => {
    expect(new Set(Object.values(FRAME_DESIGNS).map(d => d.id)).size).toBe(4);
    for (const design of Object.values(FRAME_DESIGNS)) {
      for (const aspect of [0.5, 1, 4 / 3, 2.5]) {
        const width = 1.5, height = width / aspect;
        const geometry = createFrameGeometry(width, height, design.profile);
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox!;
        expect(bounds.max.x).toBeCloseTo(width / 2 + design.border, 5);
        expect(bounds.max.y).toBeCloseTo(height / 2 + design.border, 5);
        const positions = geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          const x = Math.abs(positions.getX(i)), y = Math.abs(positions.getY(i));
          expect(x >= width / 2 - 0.00001 || y >= height / 2 - 0.00001).toBe(true);
          expect(Number.isFinite(positions.getZ(i))).toBe(true);
        }
        expect(positions.count).toBeLessThan(1200);
        geometry.dispose();
      }
    }
  });
});
