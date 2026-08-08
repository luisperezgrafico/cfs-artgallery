import { RoomDimensions } from "../types/museum";

// Number of wall slots per room; empty slots render as "submit your work" canvases.
export const ROOM_CAPACITY = 8;

// Default room dimensions
export const defaultRoomDimensions: RoomDimensions = {
  width: 10,
  length: 20,
  height: 4,
  wallTiltAngle: 0.22,
};
