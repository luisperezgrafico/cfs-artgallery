// Types for the museum components
export type FramePosition = [number, number, number];
export type FrameRotation = [number, number, number];

export interface RoomDimensions {
  width: number;
  length: number;
  height: number;
  wallTiltAngle: number;
}

export interface FramePositioningResult {
  framePositions: FramePosition[];
  frameRotations: FrameRotation[];
}

export interface ImageMetadata {
  url: string;
  title: string;
  artist: string;
  date: string;
  description: string;
  link: string;
  /** width / height — used by Frame to set size before texture loads */
  aspectRatio?: number;
  isEmpty?: true;
}
