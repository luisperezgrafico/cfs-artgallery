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
  /** box = plain block · taper = block with a scaled top face · lathe = turned leg · cushion = block with its long edges rounded. */
  shape: 'box' | 'taper' | 'lathe' | 'cushion';
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
  /** 'cushion' only — radius of the rounded edges, in metres. */
  round?: number;
  /**
   * 'box' / 'taper' — tilt of the part about its own centre, in radians. A
   * placement, like `position`: the part keeps its own true size, so a tilted
   * leg or a fan raker is still measured (and budgeted) as the block it is.
   */
  rotation?: [x: number, y: number, z: number];
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
    // Ardoise, the cantilever: one prow — narrow on the floor, wide under the
    // seat — carries a thin slab that overhangs it by half a metre at each end,
    // with the moulding's bright lip left as the gap between slab and base.
    id: 'floating', seatHeight: 0.42, width: 1.6, depth: 0.42,
    parts: [
      { shape: 'box', size: [1.6, 0.028, 0.42], position: [0, 0.406, 0], material: 0 },
      { shape: 'box', size: [1.52, 0.012, 0.4], position: [0, 0.385, 0], material: 1 },
      // Upside down on purpose: `taper` only narrows a part's top face, and
      // this prow has to stand on its narrow one.
      { shape: 'taper', size: [0.52, 0.335, 0.34], position: [0, 0.1825, 0], material: 0, taper: 0.45, rotation: [Math.PI, 0, 0] },
      // A dark sole under the prow: a shadow on the floor, not a white foot.
      { shape: 'box', size: [0.32, 0.015, 0.2], position: [0, 0.0075, 0], material: 2 },
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
    // Indigo, the cushion: four slim black posts under one thick champagne
    // cushion with its edges rounded, sitting in a copper tray. Nothing carries
    // the seat but the posts, and they land on the floor bare — a bench, not a
    // frame you sit on top of. The cushion is the room's accent colour, so the
    // seat reads against the indigo instead of melting into it.
    id: 'deco', seatHeight: 0.42, width: 1.54, depth: 0.4,
    parts: [
      // The copper tray the cushion sits in: set back, so its edge is the line
      // that stops the cushion from reading as one solid block.
      { shape: 'box', size: [1.4, 0.025, 0.38], position: [0, 0.3025, 0], material: 0 },
      // The cushion itself: champagne matte, edges broken by a radius, so it
      // reads as a seat and not as another block.
      { shape: 'cushion', size: [1.44, 0.105, 0.4], position: [0, 0.3675, 0], material: 1, round: 0.032 },
      // Four turned posts, straight-sided and black: the only thing under the seat.
      ...mirrored({
        shape: 'lathe', size: [0.042, 0.29, 0.042], material: 2,
        profile: [[0.021, 0], [0.021, 0.29]],
      }, 0.6, 0.145, 0.14),
      // One black rail per end, tying its two posts together under the tray.
      { shape: 'box', size: [0.036, 0.036, 0.33], position: [-0.6, 0.262, 0], material: 2 },
      { shape: 'box', size: [0.036, 0.036, 0.33], position: [0.6, 0.262, 0], material: 2 },
    ],
    materials: [
      // Copper tray, champagne cushion, black frame: one finish each.
      { color: '#b87333', metalness: 0.35, roughness: 0.5 },
      { color: '#c3a479', metalness: 0.05, roughness: 0.72 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },
};

/**
 * An éventail: four champagne rakers opening inwards from a shoe at one end of
 * the bench, spread across the two blade planes. Every raker is a thin bar
 * pivoting on the shoe's top and cut to reach the slab's underside exactly, so
 * the fan reads as one fan and not as four legs.
 */
function rakerFan(end: -1 | 1): BenchPart[] {
  const pivotX = 0.6 * end, pivotY = 0.066, underside = 0.347;
  return [0, 0.25, 0.48, 0.72].flatMap((lean): BenchPart[] =>
    [0.11, -0.11].map((z) => {
      const length = (underside - pivotY) / Math.cos(lean);
      return {
        shape: 'box' as const,
        size: [0.018, length, 0.045] as [number, number, number],
        position: [
          pivotX - end * (length / 2) * Math.sin(lean),
          pivotY + (length / 2) * Math.cos(lean),
          z,
        ] as [number, number, number],
        material: 1 as const,
        rotation: [0, 0, lean * end] as [number, number, number],
      };
    }),
  );
}

/**
 * One X: two bars crossing half way up the leg, in both depth planes.
 *
 * The bars are cut to the height they occupy and only then leaned, because the
 * envelope test measures a part twice — as the box it is drawn from and as the
 * box it ends up in — and a bar long enough to reach the floor along its own
 * axis pokes below it as a box. Leaning a 0.36 m bar by 0.42 rad lands its foot
 * at 16 mm, inside the 18 mm floor plate, which is the joint it should read as
 * anyway. A box turned about its own centre keeps its own size, so the length is
 * the span over the cosine of the lean.
 */
function crossedBars(x: number, height: number, lean: number): BenchPart[] {
  return [0.13, -0.13].flatMap((z) =>
    [1, -1].map((direction): BenchPart => ({
      shape: 'box',
      size: [0.035, height, 0.045],
      position: [x, height / 2, z],
      material: 0,
      rotation: [0, 0, lean * direction],
    })),
  );
}

/**
 * Prototype benches, in their own registry on purpose.
 *
 * `BENCH_DESIGNS` stays exactly one bench per room — that is the invariant the
 * gallery relies on and the one the tests police. These are proposals for a
 * room, not the room's bench: they share its materials and finish language, and
 * nothing in the visitor's path ever reaches them. They are keyed
 * `<roomId>-alt-<letter>` and reachable only through a preview URL
 * (see `utils/benchPreview`), so a room can be judged with two candidates side
 * by side and the room's own bench deleted nothing.
 */
export const BENCH_ALTERNATES: Record<string, BenchDesign> = {
  'room-4-alt-b': {
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
      { color: '#b87333', metalness: 0.35, roughness: 0.5 },
      { color: '#c3a479', metalness: 0.38, roughness: 0.45 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-2-alt-a': {
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


  'room-2-alt-b': {
    // Ardoise, legs over mass: the same brushed slab and slate as the room's
    // bench, but carried on two hairpin pairs per end — eight slender legs
    // instead of a plinth — so the room gets air under the seat.
    id: 'floating', seatHeight: 0.42, width: 1.6, depth: 0.42,
    parts: [
      { shape: 'box', size: [1.6, 0.032, 0.42], position: [0, 0.404, 0], material: 0 },
      { shape: 'box', size: [1.5, 0.012, 0.38], position: [0, 0.382, 0], material: 1 },
      { shape: 'box', size: [1.38, 0.028, 0.3], position: [0, 0.362, 0], material: 2 },
      // Each pair meets under the seat and lands splayed: a hairpin, not a post.
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [0.5683, 0.1808, 0.105], material: 0, rotation: [0, 0, -0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [0.6717, 0.1808, 0.105], material: 0, rotation: [0, 0, 0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [-0.5683, 0.1808, 0.105], material: 0, rotation: [0, 0, 0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [-0.6717, 0.1808, 0.105], material: 0, rotation: [0, 0, -0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [0.5683, 0.1808, -0.105], material: 0, rotation: [0, 0, -0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [0.6717, 0.1808, -0.105], material: 0, rotation: [0, 0, 0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [-0.5683, 0.1808, -0.105], material: 0, rotation: [0, 0, 0.3] },
      { shape: 'box', size: [0.022, 0.35, 0.022], position: [-0.6717, 0.1808, -0.105], material: 0, rotation: [0, 0, -0.3] },
      // One slate shoe per end, sized to the splay so both pairs land on it.
      { shape: 'box', size: [0.3, 0.014, 0.26], position: [0.62, 0.007, 0], material: 2 },
      { shape: 'box', size: [0.3, 0.014, 0.26], position: [-0.62, 0.007, 0], material: 2 },
    ],
    materials: [
      { color: '#7c8792', metalness: 0.45, roughness: 0.42 },
      { color: '#c8cfd4', metalness: 0.5, roughness: 0.42 },
      { color: '#12181e', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-4-alt-a': {
    // Indigo, the fan: nothing solid under the seat. Two éventails of champagne
    // rakers — each opening inwards from a low ebony shoe to the slab's
    // underside — hold a very thin slab, so the light passes under the bench.
    id: 'deco', seatHeight: 0.42, width: 1.54, depth: 0.4,
    parts: [
      { shape: 'box', size: [1.54, 0.045, 0.4], position: [0, 0.3975, 0], material: 0 },
      { shape: 'box', size: [1.48, 0.01, 0.36], position: [0, 0.37, 0], material: 1 },
      { shape: 'box', size: [1.42, 0.018, 0.34], position: [0, 0.356, 0], material: 2 },
      // One shoe per end, under both raker planes.
      { shape: 'box', size: [0.13, 0.062, 0.3], position: [-0.6, 0.031, 0], material: 2 },
      { shape: 'box', size: [0.13, 0.062, 0.3], position: [0.6, 0.031, 0], material: 2 },
      // One éventail per end, both raker planes each.
      ...rakerFan(-1),
      ...rakerFan(1),
    ],
    materials: [
      { color: '#b87333', metalness: 0.35, roughness: 0.5 },
      { color: '#c3a479', metalness: 0.38, roughness: 0.45 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-4-alt-c': {
    // Indigo, the cross: the sled's runners and blades traded for a crossed pair
    // of ebony bars at each end, bolted through the crossing by a champagne pin
    // and standing on champagne plates. Nothing vertical is solid, so the room
    // shows through the bench from any seat.
    id: 'deco', seatHeight: 0.42, width: 1.54, depth: 0.4,
    parts: [
      { shape: 'box', size: [1.54, 0.05, 0.4], position: [0, 0.395, 0], material: 0 },
      { shape: 'box', size: [1.48, 0.01, 0.36], position: [0, 0.365, 0], material: 1 },
      // The rail the bars die into: their tops stop inside it, so no bar tip
      // shows under the slab.
      { shape: 'box', size: [1.42, 0.018, 0.34], position: [0, 0.351, 0], material: 2 },
      ...crossedBars(-0.6, 0.36, 0.42),
      ...crossedBars(0.6, 0.36, 0.42),
      // The pin through each crossing, in place of a joint no one would see.
      { shape: 'box', size: [0.024, 0.024, 0.28], position: [-0.6, 0.18, 0], material: 1 },
      { shape: 'box', size: [0.024, 0.024, 0.28], position: [0.6, 0.18, 0], material: 1 },
      // Floor plates, wide enough to take the splay of both bars and tall enough
      // to swallow where they land.
      { shape: 'box', size: [0.3, 0.018, 0.3], position: [-0.6, 0.009, 0], material: 1 },
      { shape: 'box', size: [0.3, 0.018, 0.3], position: [0.6, 0.009, 0], material: 1 },
    ],
    materials: [
      { color: '#b87333', metalness: 0.35, roughness: 0.5 },
      { color: '#c3a479', metalness: 0.38, roughness: 0.45 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-4-alt-d': {
    // Indigo, the drum: one ebony mass under the middle of the slab instead of a
    // frame under all of it, grooved by two champagne lines and set on a
    // recessed plinth. The seat flies out better than half a metre at each end,
    // which is the whole idea — the bench reads as a slab, not as a seat.
    id: 'deco', seatHeight: 0.42, width: 1.54, depth: 0.4,
    parts: [
      { shape: 'box', size: [1.54, 0.05, 0.4], position: [0, 0.395, 0], material: 0 },
      { shape: 'box', size: [1.48, 0.01, 0.36], position: [0, 0.365, 0], material: 1 },
      { shape: 'box', size: [1.44, 0.014, 0.37], position: [0, 0.357, 0], material: 1 },
      { shape: 'box', size: [0.6, 0.33, 0.34], position: [0, 0.185, 0], material: 2 },
      // The plinth, narrower than the mass above it: its shadow is what lifts
      // the whole thing off the floor.
      { shape: 'box', size: [0.46, 0.026, 0.24], position: [0, 0.013, 0], material: 2 },
      // Two grooves, proud of the mass on every face they cross.
      { shape: 'box', size: [0.63, 0.012, 0.36], position: [0, 0.105, 0], material: 1 },
      { shape: 'box', size: [0.63, 0.012, 0.36], position: [0, 0.245, 0], material: 1 },
    ],
    materials: [
      { color: '#b87333', metalness: 0.35, roughness: 0.5 },
      { color: '#c3a479', metalness: 0.38, roughness: 0.45 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },

  'room-4-alt-e': {
    // Indigo, the sled: where the room sat before the cushion. Two champagne
    // patines with turned-up tips, a pair of flared ebony blades on each, and the
    // slab flying above them on a pinstripe.
    id: 'deco', seatHeight: 0.42, width: 1.54, depth: 0.4,
    parts: [
      { shape: 'box', size: [1.54, 0.05, 0.4], position: [0, 0.395, 0], material: 0 },
      { shape: 'box', size: [1.5, 0.012, 0.36], position: [0, 0.364, 0], material: 1 },
      { shape: 'box', size: [1.42, 0.02, 0.34], position: [0, 0.348, 0], material: 2 },
      // Blades flare upwards and lean outwards a little: corbels on a sled, not
      // posts. `taper` narrows a top face, so the flare is made by turning the
      // part over — the turn and the lean compose, verified in the unit test.
      { shape: 'taper', size: [0.06, 0.318, 0.046], position: [-0.63, 0.179, 0.14], material: 0, taper: 0.5, rotation: [Math.PI, 0, -0.12] },
      { shape: 'taper', size: [0.06, 0.318, 0.046], position: [0.63, 0.179, 0.14], material: 0, taper: 0.5, rotation: [Math.PI, 0, 0.12] },
      { shape: 'taper', size: [0.06, 0.318, 0.046], position: [-0.63, 0.179, -0.14], material: 0, taper: 0.5, rotation: [Math.PI, 0, -0.12] },
      { shape: 'taper', size: [0.06, 0.318, 0.046], position: [0.63, 0.179, -0.14], material: 0, taper: 0.5, rotation: [Math.PI, 0, 0.12] },
      { shape: 'box', size: [1.3, 0.02, 0.026], position: [0, 0.01, 0.155], material: 1 },
      { shape: 'box', size: [1.3, 0.02, 0.026], position: [0, 0.01, -0.155], material: 1 },
      // The upturned tip every sled has, in place of a blunt runner end: it
      // starts inside the runner and leaves it as one continuous line.
      { shape: 'box', size: [0.018, 0.1, 0.026], position: [0.6757, 0.0522, 0.155], material: 1, rotation: [0, 0, -0.7] },
      { shape: 'box', size: [0.018, 0.1, 0.026], position: [-0.6757, 0.0522, 0.155], material: 1, rotation: [0, 0, 0.7] },
      { shape: 'box', size: [0.018, 0.1, 0.026], position: [0.6757, 0.0522, -0.155], material: 1, rotation: [0, 0, -0.7] },
      { shape: 'box', size: [0.018, 0.1, 0.026], position: [-0.6757, 0.0522, -0.155], material: 1, rotation: [0, 0, 0.7] },
    ],
    materials: [
      { color: '#b87333', metalness: 0.35, roughness: 0.5 },
      { color: '#c3a479', metalness: 0.38, roughness: 0.45 },
      { color: '#13111b', metalness: 0, roughness: 0.88 },
    ],
  },

};

export function benchDesignForRoom(roomId?: string): BenchDesign {
  return BENCH_DESIGNS[roomId ?? 'room-1'] ?? BENCH_DESIGNS['room-1'];
}

/** Every bench the gallery can draw: the four of the rooms, then the prototypes. */
export function benchDesignForKey(key?: string | null): BenchDesign | null {
  if (!key) return null;
  return BENCH_DESIGNS[key] ?? BENCH_ALTERNATES[key] ?? null;
}

/** The whole bench vocabulary: a block, a block with a scaled top face, or a turned leg. */
export function createBenchPartGeometry(part: BenchPart): THREE.BufferGeometry {
  const [width, height, depth] = part.size;
  if (![width, height, depth].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Bench part dimensions must be positive and finite');
  }
  if (part.shape === 'lathe') return createLatheGeometry(part.profile, height);
  if (part.shape === 'cushion') return createCushionGeometry(width, height, depth, part.round ?? 0.025);
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
    const vertex = new THREE.Vector3();
    const vertexNormal = new THREE.Vector3();
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
        // A rotation is a placement, like the position: it turns the part
        // about its own centre — position and normal together, so the faces
        // stay lit — and the part itself is still built, measured and budgeted
        // at its own size.
        const rotation = part.rotation
          ? new THREE.Matrix4().makeRotationFromEuler(
              new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2]),
            )
          : null;
        for (let point = 0; point < position.count; point++) {
          vertex.set(position.getX(point), position.getY(point), position.getZ(point));
          vertexNormal.set(normal.getX(point), normal.getY(point), normal.getZ(point));
          if (rotation) {
            vertex.applyMatrix4(rotation);
            vertexNormal.applyMatrix4(rotation);
          }
          positions.push(vertex.x + x, vertex.y + y, vertex.z + z);
          normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
          uvs.push(uv.getX(point), uv.getY(point));
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
 * A cushion: the section across the seat with its corners broken by a radius,
 * extruded along the seat and inset at both ends. A plain block is what the seat
 * of a bench reads as when nobody is meant to sit on it; this is the one shape in
 * the vocabulary that says "cushion" from across the room. It stays a single
 * convex solid, so it bounds, tiles and casts like the block it replaces.
 */
function createCushionGeometry(width: number, height: number, depth: number, round: number): THREE.BufferGeometry {
  if (!Number.isFinite(round) || round <= 0) throw new Error('Bench cushion radius must be positive and finite');
  // The bevel grows the section outwards as it rounds the ends, so the profile
  // is cut back by that much to leave the part exactly the size it declares —
  // and the radius is measured on the finished edge, not on the profile.
  const bevel = Math.min(round, 0.022);
  if (depth <= 2 * bevel) throw new Error('Bench cushion is too short for its own bevel');
  const halfWidth = width / 2 - bevel, halfHeight = height / 2 - bevel;
  if (halfWidth <= 0 || halfHeight <= 0) throw new Error('Bench cushion is too small for its own bevel');
  const corner = Math.min(round - bevel, halfWidth / 2, halfHeight / 2);
  if (corner < 0.001) throw new Error('Bench cushion radius must survive its own bevel');
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + corner, -halfHeight);
  shape.lineTo(halfWidth - corner, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner);
  shape.lineTo(halfWidth, halfHeight - corner);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight);
  shape.lineTo(-halfWidth + corner, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner);
  shape.lineTo(-halfWidth, -halfHeight + corner);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight);
  const body = depth - 2 * bevel;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: body, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel,
    bevelSegments: 1, curveSegments: 2,
  });
  geometry.translate(0, 0, -body / 2);
  return geometry;
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
