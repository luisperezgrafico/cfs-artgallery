import * as THREE from 'three';

/**
 * Skirting and cornice sections, extruded along the wall.
 *
 * The trims used to be plain boxes, which read as a strip of colour rather than
 * as joinery: a real skirting has a chamfer where it meets the wall and a
 * cornice has a cavetto, and it is that profile — catching the spotlight at
 * different angles — that makes them legible in a dark room.
 *
 * Both profiles are defined in a section plane and extruded, one mesh per wall
 * segment:
 *
 *   - local **+X** is along the wall (the extrusion direction, from 0 to the
 *     wall's span),
 *   - **+Y** is up, from the trim's own base,
 *   - **+Z** is away from the wall, into the room.
 *
 * The section is written with x = how far the profile stands off the wall and
 * y = its height, which is how a joiner would draw it. `curveSegments` is kept
 * low on purpose: these are seen from a couple of metres away at most in a room
 * where the visitor never leaves the rails.
 */

const CURVE_SEGMENTS = 5;

/** Height of the skirting profile. */
export const SKIRTING_HEIGHT = 0.17;
/** How far the skirting stands off the wall. */
export const SKIRTING_DEPTH = 0.055;

/** Height of the cornice profile. */
export const CORNICE_HEIGHT = 0.24;
/** How far the cornice stands off the wall at its deepest. */
export const CORNICE_DEPTH = 0.11;

/** The section, drawn in the XY plane: x = stand-off from the wall, y = height. */
function skirtingSection(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(SKIRTING_DEPTH, 0);
  shape.lineTo(SKIRTING_DEPTH, 0.10);
  shape.lineTo(0.028, 0.145);
  shape.lineTo(0.028, SKIRTING_HEIGHT);
  shape.lineTo(0, SKIRTING_HEIGHT);
  shape.closePath();
  return shape;
}

function corniceSection(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(CORNICE_DEPTH, 0);
  shape.lineTo(CORNICE_DEPTH, 0.035);
  shape.lineTo(0.06, 0.05);
  shape.lineTo(0.06, 0.065);
  // Cavetto: the concave sweep that reads as light rolling off the moulding.
  shape.quadraticCurveTo(0.055, 0.165, 0, 0.18);
  shape.lineTo(0, CORNICE_HEIGHT);
  shape.closePath();
  return shape;
}

function extrudeAlongWall(section: THREE.Shape, length: number): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(section, {
    depth: length,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  // The section is extruded along +Z; the wall needs it along +X, with the
  // profile standing off the wall towards +Z.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(length, 0, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/** Skirting for a wall segment `length` metres long; origin at the wall's base. */
export function createSkirtingGeometry(length: number): THREE.ExtrudeGeometry {
  return extrudeAlongWall(skirtingSection(), length);
}

/**
 * Cornice for a wall segment `length` metres long; the origin is the *bottom* of
 * the profile, so a caller hangs it by offsetting `CORNICE_HEIGHT` down from the
 * ceiling.
 */
export function createCorniceGeometry(length: number): THREE.ExtrudeGeometry {
  return extrudeAlongWall(corniceSection(), length);
}
