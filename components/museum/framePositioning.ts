// Frame placement on tilted gallery walls.
// Wall planes are derived analytically from RoomDimensions so frames stay on-wall.

export interface RoomDimensions {
  width: number;
  length: number;
  height: number;
  wallTiltAngle: number; // radians — top leans inward
}

export interface FramePositioningResult {
  positions: [number, number, number][];
  rotations: [number, number, number][];
}

const FRAME_Y    = 1.85;  // artwork center height
const WALL_INSET = 0.08;  // how far the frame stands away from wall surface

// Left wall: mesh at (-width/2, h/2, length/2), rotY = +PI/2 - wta
// Plane normal in world: (cos(wta), 0, sin(wta))  → faces +X (into room)
// x on wall surface at depth z:  x = -width/2 - tan(wta)*(z - length/2)
function leftWallFrames(d: RoomDimensions, count: number): FramePositioningResult {
  const { width, length, wallTiltAngle } = d;
  const tanA = Math.tan(wallTiltAngle);
  const rotY  = Math.PI / 2 - wallTiltAngle;
  const positions: [number, number, number][] = [];
  const rotations: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const z   = length * (i + 1) / (count + 1);
    const xWall = -width / 2 - tanA * (z - length / 2);
    const x     = xWall + WALL_INSET; // step inward toward room center
    positions.push([x, FRAME_Y, z]);
    rotations.push([0, rotY, 0]);
  }
  return { positions, rotations };
}

// Right wall: mesh at (+width/2, h/2, length/2), rotY = -PI/2 + wta
// Plane normal in world: (-cos(wta), 0, sin(wta)) → faces -X (into room)
// x on wall surface at depth z:  x = +width/2 + tan(wta)*(z - length/2)
function rightWallFrames(d: RoomDimensions, count: number): FramePositioningResult {
  const { width, length, wallTiltAngle } = d;
  const tanA = Math.tan(wallTiltAngle);
  const rotY  = -Math.PI / 2 + wallTiltAngle;
  const positions: [number, number, number][] = [];
  const rotations: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const z    = length * (i + 1) / (count + 1);
    const xWall = width / 2 + tanA * (z - length / 2);
    const x     = xWall - WALL_INSET; // step inward toward room center
    positions.push([x, FRAME_Y, z]);
    rotations.push([0, rotY, 0]);
  }
  return { positions, rotations };
}

// Front wall (z ≈ 0): faces +Z toward camera
function frontWallFrames(d: RoomDimensions, count: number): FramePositioningResult {
  const frontWidth = d.width * 0.8; // use center 80% of front wall width
  const positions: [number, number, number][] = [];
  const rotations: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const x = -frontWidth / 2 + (frontWidth / (count + 1)) * (i + 1);
    positions.push([x, FRAME_Y, WALL_INSET]);
    rotations.push([0, 0, 0]);
  }
  return { positions, rotations };
}

export function calculateFramePositions(
  d: RoomDimensions,
  count: number,
): FramePositioningResult {
  const left  = Math.min(3, count);
  const right = Math.min(3, Math.max(0, count - left));
  const front = Math.min(2, Math.max(0, count - left - right));

  const l = leftWallFrames(d, left);
  const f = frontWallFrames(d, front);
  const r = rightWallFrames(d, right);

  return {
    positions: [...l.positions, ...f.positions, ...r.positions],
    rotations: [...l.rotations, ...f.rotations, ...r.rotations],
  };
}
