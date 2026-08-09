import { defaultRoomDimensions } from '../config/roomConfig';
import { RestViewpoint } from '../types/museum';

const sideWallTilt = defaultRoomDimensions.wallTiltAngle;
const leftWallBenchRotation: [number, number, number] = [0, Math.PI / 2 - sideWallTilt, 0];
const rightWallBenchRotation: [number, number, number] = [0, -Math.PI / 2 + sideWallTilt, 0];

export const BENCH_LAYOUT: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
  restView: RestViewpoint;
}> = [
  {
    position: [-1.75, 0, 5.7],
    rotation: leftWallBenchRotation,
    restView: {
      position: [-1.75, 1.05, 5.7],
      target: [1.6, 1.45, 5.2],
    },
  },
  {
    position: [1.75, 0, 5.7],
    rotation: rightWallBenchRotation,
    restView: {
      position: [1.75, 1.05, 5.7],
      target: [-1.6, 1.45, 5.2],
    },
  },
];

/** Where the camera settles when a room ends on its own (guided/silent auto-advance). */
export const DEFAULT_REST_VIEW: RestViewpoint = BENCH_LAYOUT[0].restView;
