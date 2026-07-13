import {
  FramePosition,
  FrameRotation,
  RoomDimensions,
  FramePositioningResult,
} from "../types/museum";

const HEIGHT_OF_FRAMES = 2;

/**
 * Calculate the front width of the room based on dimensions and tilt angle
 */
export const calculateFrontWidth = (
  width: number,
  length: number,
  wallTiltAngle: number
): number => {
  return width + 2 - length * Math.sin(wallTiltAngle);
};

/**
 * Calculate frame positions for the left wall
 */
export const calculateLeftWallFrames = (
  roomDimensions: RoomDimensions,
  count: number
): { positions: FramePosition[]; rotations: FrameRotation[] } => {
  const { width, length, wallTiltAngle } = roomDimensions;
  const positions: FramePosition[] = [];
  const rotations: FrameRotation[] = [];

  for (let i = count - 1; i >= 0; i--) {
    // Calculate position along the inclined wall
    const wallProgress = (i + 1) / (count + length / 5);

    // Calculate position on the inclined wall
    const z = length * wallProgress;

    // Offset from the wall surface (perpendicular to the wall)
    const offsetFromWall = 0.1;

    // Calculate the actual x position considering the wall tilt
    const x =
      -width / 2 +
      z * -Math.sin(wallTiltAngle) +
      offsetFromWall * Math.cos(wallTiltAngle) +
      wallTiltAngle * 10;

    const y = HEIGHT_OF_FRAMES;

    positions.push([x, y, z]);
    // Adjust rotation to be perpendicular to the inclined wall
    rotations.push([0, Math.PI / 2 - wallTiltAngle, 0]);
  }

  return { positions, rotations };
};

/**
 * Calculate frame positions for the front wall
 */
export const calculateFrontWallFrames = (
  roomDimensions: RoomDimensions,
  count: number
): { positions: FramePosition[]; rotations: FrameRotation[] } => {
  const { width, length, wallTiltAngle } = roomDimensions;
  const positions: FramePosition[] = [];
  const rotations: FrameRotation[] = [];

  const frontWidth = calculateFrontWidth(width, length, wallTiltAngle);

  for (let i = 0; i < count; i++) {
    // Use the frontWidth for proper spacing
    const x = -frontWidth / 2 + (frontWidth / (count + 1)) * (i + 1);
    const z = 0 + 0.1; // Slightly offset from wall
    const y = HEIGHT_OF_FRAMES;
    positions.push([x, y, z]);
    rotations.push([0, 0, 0]);
  }

  return { positions, rotations };
};

/**
 * Calculate frame positions for the right wall
 */
export const calculateRightWallFrames = (
  roomDimensions: RoomDimensions,
  count: number
): { positions: FramePosition[]; rotations: FrameRotation[] } => {
  const { width, length, wallTiltAngle } = roomDimensions;
  const positions: FramePosition[] = [];
  const rotations: FrameRotation[] = [];

  for (let i = 0; i < count; i++) {
    // Calculate position along the inclined wall
    const wallProgress = (i + 1) / (count + length / 5);

    // Calculate position on the inclined wall
    const z = length * wallProgress;

    // Offset from the wall surface (perpendicular to the wall)
    const offsetFromWall = 0.1;

    // Calculate the actual x position considering the wall tilt
    const x =
      width / 2 -
      (length - z) * Math.sin(wallTiltAngle) -
      offsetFromWall * Math.cos(wallTiltAngle) +
      wallTiltAngle * 10;
    const y = HEIGHT_OF_FRAMES;

    positions.push([x, y, z]);
    // Adjust rotation to be perpendicular to the inclined wall
    rotations.push([0, -Math.PI / 2 + wallTiltAngle, 0]);
  }

  return { positions, rotations };
};

/**
 * Calculate all frame positions for the museum
 */
export const calculateFramePositions = (
  roomDimensions: RoomDimensions,
  imageCount: number
): FramePositioningResult => {
  // Fixed distribution: 3 on left wall, 3 on right wall, 2 on front wall
  const leftWallFrames = Math.min(3, imageCount);
  const rightWallFrames = Math.min(3, Math.max(0, imageCount - leftWallFrames));
  const frontWallFrames = Math.min(
    2,
    Math.max(0, imageCount - leftWallFrames - rightWallFrames)
  );

  // Calculate positions for each wall
  const leftWall = calculateLeftWallFrames(roomDimensions, leftWallFrames);
  const rightWall = calculateRightWallFrames(roomDimensions, rightWallFrames);
  const frontWall = calculateFrontWallFrames(roomDimensions, frontWallFrames);

  // Combine all positions and rotations
  return {
    framePositions: [
      ...leftWall.positions,
      ...frontWall.positions,
      ...rightWall.positions,
    ],
    frameRotations: [
      ...leftWall.rotations,
      ...frontWall.rotations,

      ...rightWall.rotations,
    ],
  };
};
