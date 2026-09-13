import * as THREE from 'three';

/** Distance out from the artwork, front depth, material on the following band. */
export type MouldingPoint = readonly [outset: number, z: number, material: number];
export interface FrameDesign {
  id: 'gilt' | 'floating' | 'carved-oak' | 'deco';
  border: number;
  profile: readonly MouldingPoint[];
  colors: readonly [string, string, string];
  metalness: number;
  roughness: number;
}

export const FRAME_DESIGNS: Record<string, FrameDesign> = {
  'room-1': {
    id: 'gilt', border: 0.115,
    profile: [[0,.045,0],[.014,.071,1],[.023,.071,0],[.034,.052,0],[.074,.104,1],[.095,.11,0],[.115,.076,0],[.115,-.04,0],[0,-.04,0]],
    colors: ['#99703b','#d9b976','#37281b'], metalness: .45, roughness: .42,
  },
  'room-2': {
    id: 'floating', border: 0.085,
    // Recessed black reveal, raised fine aluminium lip, deep dark sides.
    profile: [[0,.025,2],[.037,.025,2],[.037,.088,0],[.047,.101,1],[.071,.101,0],[.085,.083,0],[.085,-.044,2],[0,-.044,2]],
    colors: ['#747f8b','#ced4d7','#12181e'], metalness: .62, roughness: .32,
  },
  'room-3': {
    id: 'carved-oak', border: 0.12,
    // A broad scooped cove and three physically modelled reeded ridges.
    profile: [[0,.045,2],[.014,.065,1],[.025,.057,0],[.037,.043,0],[.053,.045,0],[.071,.066,0],[.079,.087,1],[.087,.078,0],[.095,.10,1],[.104,.09,0],[.112,.113,1],[.12,.10,0],[.12,-.04,0],[0,-.04,0]],
    colors: ['#785136','#b28b5f','#352519'], metalness: .03, roughness: .68,
  },
  'room-4': {
    id: 'deco', border: 0.12,
    // Ebony terraces separated by a pair of raised champagne pinstripes.
    profile: [[0,.046,1],[.012,.07,1],[.02,.07,0],[.02,.048,0],[.049,.048,0],[.049,.09,1],[.058,.09,0],[.058,.065,0],[.091,.065,0],[.091,.111,1],[.103,.111,0],[.12,.084,0],[.12,-.04,0],[0,-.04,0]],
    colors: ['#201e2e','#c3a479','#13111b'], metalness: .35, roughness: .38,
  },
};

export function frameDesignForRoom(roomId?: string): FrameDesign {
  return FRAME_DESIGNS[roomId ?? 'room-1'] ?? FRAME_DESIGNS['room-1'];
}

/** Sweep a closed cross-section around four mitred corners. No solid face hides the art. */
export function createFrameGeometry(width: number, height: number, profile: readonly MouldingPoint[]): THREE.BufferGeometry {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
    throw new Error('Frame dimensions must be positive and finite');
  }
  const positions: number[] = [], uvs: number[] = [];
  const geometry = new THREE.BufferGeometry();
  const corners = [[1,1],[-1,1],[-1,-1],[1,-1]] as const;
  const point = (corner: number, p: MouldingPoint) => [
    corners[corner][0] * (width / 2 + p[0]),
    corners[corner][1] * (height / 2 + p[0]), p[1],
  ];
  for (let band = 0; band < profile.length; band++) {
    const a = profile[band], b = profile[(band + 1) % profile.length];
    const start = positions.length / 3;
    for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      const vertices = [point(side,a),point(side,b),point(next,b),point(next,a)];
      const length = side % 2 === 0 ? width : height;
      const tex = [[0,a[0]*8],[0,b[0]*8],[length*3,b[0]*8],[length*3,a[0]*8]];
      for (const i of [0,1,2,0,2,3]) {
        positions.push(...vertices[i]); uvs.push(...tex[i]);
      }
    }
    geometry.addGroup(start, positions.length / 3 - start, a[2]);
  }
  // Coalesce every band using a material into one contiguous draw range.
  const orderedPositions: number[] = [], orderedUvs: number[] = [];
  const bands = [...geometry.groups];
  geometry.clearGroups();
  for (const material of [0, 1, 2]) {
    const start = orderedPositions.length / 3;
    for (const band of bands.filter(group => group.materialIndex === material)) {
      orderedPositions.push(...positions.slice(band.start * 3, (band.start + band.count) * 3));
      orderedUvs.push(...uvs.slice(band.start * 2, (band.start + band.count) * 2));
    }
    const count = orderedPositions.length / 3 - start;
    if (count) geometry.addGroup(start, count, material);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(orderedPositions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(orderedUvs,2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
