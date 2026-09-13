import * as THREE from 'three';

/**
 * Bench designs, one per room — the seating counterpart of `frameDesign.ts`.
 *
 * Same solution shape as the mouldings: a registry keyed by `roomId`, pure
 * data, geometry built in code from that data, one unit test on the registry.
 * Four rooms cost four data entries here — no models, no image textures, no
 * dependencies.
 *
 * Local space: x runs along the seat, y is up with y = 0 on the floor, z points
 * to the room side of the bench. Every design stands on the floor and tops out
 * at `seatHeight`, which is what the rest-view camera and the tap target are
 * measured against — keep a new bench inside that envelope.
 *
 * Restraint is the brief: a bench suggests a room's material language, it does
 * not perform it. Dull finishes, no saturated colour, no animation.
 */

export interface BenchMaterial {
  color: string;
  metalness: number;
  roughness: number;
}

export interface BenchPart {
  /** box = plain block · taper = block with a scaled top face · lathe = turned leg. */
  shape: 'box' | 'taper' | 'lathe';
  /** Bounding size: [along the seat, height, depth]. */
  size: [width: number, height: number, depth: number];
  /** Centre of the part, in bench-local metres. */
  position: [x: number, y: number, z: number];
  /** Index into `materials`: 0 surface · 1 accent · 2 body. */
  material: 0 | 1 | 2;
  /** 'taper' only — top face scale, 1 = straight sides. */
  taper?: number;
  /** 'lathe' only — half cross-section, from the part's base (y = 0) up to size[1]. */
  profile?: [radius: number, y: number][];
}

export interface BenchDesign {
  id: 'gilt' | 'floating' | 'carved-oak' | 'deco';
  seatHeight: number;
  width: number;
  depth: number;
  parts: BenchPart[];
  /**
   * Exactly three (surface, accent, body). The moulding keeps one metalness and
   * roughness for the whole profile; a bench mixes wood, metal and stone in a
   * single object, so each of the three slots carries its own finish.
   */
  materials: [BenchMaterial, BenchMaterial, BenchMaterial];
}

/** The repeated shapes: four copies of a part at ±x / ±z. */
function mirrored(part: Omit<BenchPart, 'position'>, x: number, y: number, z: number): BenchPart[] {
  const offsets: [number, number][] = [[x, z], [-x, z], [x, -z], [-x, -z]];
  return offsets.map(([offsetX, offsetZ]) => ({
    ...part,
    position: [offsetX, y, offsetZ] as [number, number, number],
  }));
}

export const BENCH_DESIGNS: Record<string, BenchDesign> = {
  'room-1': {
    // Ocre Profond: walnut plank and apron, one dull gilt moulding line, turned legs.
    id: 'gilt', seatHeight: 0.42, width: 1.52, depth: 0.4,
    parts: [
      { shape: 'box', size: [1.52, 0.06, 0.4], position: [0, 0.39, 0], material: 0 },
      // Set back 0.03, so the plank edge leaves its own thin shadow line.
      { shape: 'box', size: [1.44, 0.09, 0.34], position: [0, 0.3, 0], material: 2 },
      { shape: 'box', size: [1.47, 0.022, 0.36], position: [0, 0.3, 0], material: 1 },
      ...mirrored({
        shape: 'lathe', size: [0.075, 0.26, 0.075], material: 0,
        // Baluster: waist below the apron, slight swell at the foot.
        profile: [[0.028, 0], [0.036, 0.018], [0.024, 0.075], [0.037, 0.105], [0.028, 0.17], [0.033, 0.205], [0.024, 0.26]],
      }, 0.63, 0.13, 0.13),
    ],
    materials: [
      { color: '#3f2a1a', metalness: 0.04, roughness: 0.62 },
      { color: '#9c7539', metalness: 0.42, roughness: 0.52 },
      { color: '#241609', metalness: 0, roughness: 0.85 },
    ],
  },

  'room-2': {
    // Ardoise: a brushed aluminium slab floating over a slate plinth, with the
    // same recessed reveal and fine bright lip as the floating moulding.
    id: 'floating', seatHeight: 0.42, width: 1.6, depth: 0.42,
    parts: [
      { shape: 'box', size: [1.6, 0.05, 0.42], position: [0, 0.395, 0], material: 0 },
      { shape: 'box', size: [1.56, 0.014, 0.38], position: [0, 0.363, 0], material: 1 },
      { shape: 'box', size: [1.24, 0.056, 0.26], position: [0, 0.328, 0], material: 2 },
      { shape: 'box', size: [1.1, 0.3, 0.24], position: [0, 0.15, 0], material: 2 },
    ],
    materials: [
      { color: '#7c8792', metalness: 0.45, roughness: 0.42 },
      { color: '#c8cfd4', metalness: 0.5, roughness: 0.42 },
      { color: '#12181e', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-3': {
    // Vert Forêt: solid oak, a scooped shadow line under the plank and the
    // moulding's three reeded ridges carried onto the apron.
    id: 'carved-oak', seatHeight: 0.42, width: 1.48, depth: 0.42,
    parts: [
      { shape: 'box', size: [1.48, 0.075, 0.42], position: [0, 0.3825, 0], material: 0 },
      { shape: 'box', size: [1.4, 0.028, 0.34], position: [0, 0.331, 0], material: 2 },
      { shape: 'box', size: [1.44, 0.115, 0.36], position: [0, 0.2595, 0], material: 0 },
      // Three ridges proud of the apron's front face (z = 0.18).
      { shape: 'box', size: [1.4, 0.018, 0.018], position: [0, 0.225, 0.183], material: 1 },
      { shape: 'box', size: [1.4, 0.018, 0.018], position: [0, 0.2575, 0.183], material: 1 },
      { shape: 'box', size: [1.4, 0.018, 0.018], position: [0, 0.29, 0.183], material: 1 },
      // Two trestle panels, sloped inwards like a hand-cut block.
      { shape: 'taper', size: [0.1, 0.202, 0.36], position: [-0.64, 0.101, 0], material: 0, taper: 0.86 },
      { shape: 'taper', size: [0.1, 0.202, 0.36], position: [0.64, 0.101, 0], material: 0, taper: 0.86 },
    ],
    materials: [
      { color: '#6f4c31', metalness: 0.03, roughness: 0.68 },
      { color: '#b28b5f', metalness: 0.03, roughness: 0.62 },
      { color: '#352519', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-4': {
    // Indigo: ebony terraces stepping inwards, separated by champagne
    // pinstripes and stopped by short vertical flutes — the deco moulding's
    // terraces turned into a base.
    id: 'deco', seatHeight: 0.42, width: 1.54, depth: 0.4,
    parts: [
      { shape: 'taper', size: [1.54, 0.06, 0.4], position: [0, 0.39, 0], material: 0, taper: 0.97 },
      { shape: 'box', size: [1.5, 0.012, 0.38], position: [0, 0.354, 0], material: 1 },
      { shape: 'box', size: [1.42, 0.106, 0.36], position: [0, 0.295, 0], material: 2 },
      { shape: 'box', size: [1.28, 0.012, 0.3], position: [0, 0.236, 0], material: 1 },
      { shape: 'box', size: [1.16, 0.1, 0.3], position: [0, 0.18, 0], material: 2 },
      { shape: 'box', size: [0.9, 0.13, 0.24], position: [0, 0.065, 0], material: 2 },
      ...mirrored({
        shape: 'box', size: [0.014, 0.106, 0.014], material: 1,
      }, 0.52, 0.295, 0.183),
    ],
    materials: [
      { color: '#201e2e', metalness: 0.05, roughness: 0.6 },
      { color: '#c3a479', metalness: 0.38, roughness: 0.45 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },
};

export function benchDesignForRoom(roomId?: string): BenchDesign {
  return BENCH_DESIGNS[roomId ?? 'room-1'] ?? BENCH_DESIGNS['room-1'];
}

/** The whole bench vocabulary: a block, a block with a scaled top face, or a turned leg. */
export function createBenchPartGeometry(part: BenchPart): THREE.BufferGeometry {
  const [width, height, depth] = part.size;
  if (![width, height, depth].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Bench part dimensions must be positive and finite');
  }
  if (part.shape === 'lathe') return createLatheGeometry(part.profile, height);
  if (part.shape === 'taper') return createTaperedGeometry(width, height, depth, part.taper ?? 1);
  return new THREE.BoxGeometry(width, height, depth);
}

/**
 * One merged, non-indexed geometry with up to three groups, one per material —
 * so a bench costs the same three draw calls a moulding does, however many
 * parts its design lists.
 */
export function createBenchGeometry(design: BenchDesign): THREE.BufferGeometry {
  const parts = design.parts.map(createBenchPartGeometry);
  try {
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [];
    const geometry = new THREE.BufferGeometry();
    for (const material of [0, 1, 2]) {
      const start = positions.length / 3;
      design.parts.forEach((part, index) => {
        if (part.material !== material) return;
        const partGeometry = parts[index];
        const flat = partGeometry.index ? partGeometry.toNonIndexed() : partGeometry;
        const position = flat.getAttribute('position');
        const normal = flat.getAttribute('normal');
        const uv = flat.getAttribute('uv');
        const [x, y, z] = part.position;
        for (let vertex = 0; vertex < position.count; vertex++) {
          positions.push(position.getX(vertex) + x, position.getY(vertex) + y, position.getZ(vertex) + z);
          normals.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
          uvs.push(uv.getX(vertex), uv.getY(vertex));
        }
        if (flat !== partGeometry) flat.dispose();
      });
      const count = positions.length / 3 - start;
      if (count) geometry.addGroup(start, count, material);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  } finally {
    for (const part of parts) part.dispose();
  }
}

/**
 * A truncated block. The chamfered slabs and the inward-leaning panels both
 * come out of the same eight-vertex solid, built by hand so the faces stay flat
 * and the part keeps its true bounding size.
 */
function createTaperedGeometry(width: number, height: number, depth: number, taper: number): THREE.BufferGeometry {
  if (!Number.isFinite(taper) || taper <= 0) throw new Error('Bench taper must be positive and finite');
  const halfWidth = width / 2, halfHeight = height / 2, halfDepth = depth / 2;
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const top = corners.map(([x, z]) => [x * halfWidth * taper, halfHeight, z * halfDepth * taper]);
  const bottom = corners.map(([x, z]) => [x * halfWidth, -halfHeight, z * halfDepth]);
  const positions: number[] = [], uvs: number[] = [];
  const push = ([x, y, z]: number[]) => {
    positions.push(x, y, z);
    // Non-degenerate planar UVs are all the shared oak grain bump map needs.
    uvs.push(x / width + 0.5, (y + halfHeight) / height + z / depth);
  };
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    for (const vertex of [a, b, c, a, c, d]) push(vertex);
  };
  quad(bottom[0], bottom[1], bottom[2], bottom[3]);
  quad(top[0], top[3], top[2], top[1]);
  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    quad(bottom[next], bottom[side], top[side], top[next]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A turned leg: the half-profile revolved eight times — `createFrameGeometry`'s
 * sweep, one axis instead of four mitred corners. Centred like every other part.
 */
function createLatheGeometry(profile: [number, number][] | undefined, height: number): THREE.BufferGeometry {
  if (!profile || profile.length < 2) throw new Error('A lathed bench part needs a profile of at least two points');
  const points = profile.map(([radius, y]) => {
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(y)) {
      throw new Error('Bench lathe profile must be positive and finite');
    }
    return new THREE.Vector2(radius, y);
  });
  if (points[0].y !== 0 || Math.abs(points[points.length - 1].y - height) > 1e-6) {
    throw new Error('Bench lathe profile must run from y = 0 to the part height');
  }
  const geometry = new THREE.LatheGeometry(points, 8);
  geometry.translate(0, -height / 2, 0);
  return geometry;
}
