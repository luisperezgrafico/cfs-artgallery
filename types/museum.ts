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

export interface RoomTheme {
  wallColor: string;
  ceilingColor: string;
  floorColor: string;
  hemisphereTop: string;
  hemisphereBottom: string;
  ambientIntensity: number;
}

export interface RestViewpoint {
  position: FramePosition;
  target: FramePosition;
}

export interface ImageMetadata {
  /** Stable identifier (copied from submission.id at approval time) — used for favourites */
  id?: string;
  url: string;
  title: string;
  artist: string;
  /** Year or date of the work (e.g. "2024", "March 2024") */
  date: string;
  /** Technique or material (e.g. "Watercolour on paper") — shown on the plaque */
  medium?: string;
  /** One or two sentences shown immediately when the plaque is opened */
  shortDescription?: string;
  /** Full artist statement — shown behind a "Read more" toggle */
  longDescription?: string;
  link: string;
  /** width / height — used by Frame to set size before texture loads */
  aspectRatio?: number;
  /**
   * Wall position the artwork was hung at, 0-based within the room's slots.
   * Set from the empty canvas the artist submitted through, so the piece ends up
   * where they put it. Undefined means "anywhere free", in order.
   */
  slot?: number;
  isEmpty?: true;
}
