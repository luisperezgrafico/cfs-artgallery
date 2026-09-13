import { BufferGeometry } from 'three';

/** Measured from the inner edge vertices of Poly Haven's source mesh. */
export const IMPORTED_FRAME_APERTURE = {
  width: 0.4436208,
  height: 0.32496036,
} as const;

export const IMPORTED_FRAME_BORDER = 0.1;
export const IMPORTED_FRAME_DEPTH = { back: -0.045, front: 0.13 } as const;

const SOURCE = {
  halfApertureX: IMPORTED_FRAME_APERTURE.width / 2,
  halfApertureY: IMPORTED_FRAME_APERTURE.height / 2,
  outerX: 0.301515132188797,
  outerY: 0.23206323385238647,
  back: 0.001899046590551734,
  front: 0.0218921210616827,
} as const;

function mapNineSlice(value: number, sourceHalf: number, sourceOuter: number, targetHalf: number) {
  if (value < -sourceHalf) {
    return -targetHalf + (value + sourceHalf) * (IMPORTED_FRAME_BORDER / (sourceOuter - sourceHalf));
  }
  if (value > sourceHalf) {
    return targetHalf + (value - sourceHalf) * (IMPORTED_FRAME_BORDER / (sourceOuter - sourceHalf));
  }
  return value * (targetHalf / sourceHalf);
}

/**
 * Clones and remaps only the frame geometry. Materials and textures remain owned
 * by useGLTF's cache, so varying artwork dimensions do not duplicate textures.
 */
export function adaptImportedFrameGeometry(source: BufferGeometry, width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Imported frame width and height must be positive finite numbers.');
  }

  const geometry = source.clone();
  const positions = geometry.getAttribute('position');
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const depthScale = (IMPORTED_FRAME_DEPTH.front - IMPORTED_FRAME_DEPTH.back) / (SOURCE.front - SOURCE.back);

  for (let index = 0; index < positions.count; index++) {
    positions.setXYZ(
      index,
      mapNineSlice(positions.getX(index), SOURCE.halfApertureX, SOURCE.outerX, halfWidth),
      mapNineSlice(positions.getY(index), SOURCE.halfApertureY, SOURCE.outerY, halfHeight),
      IMPORTED_FRAME_DEPTH.back + (positions.getZ(index) - SOURCE.back) * depthScale,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
