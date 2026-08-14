import { RoomConfig } from '../config/roomsConfig';
import { ImageMetadata } from '../types/museum';
import { layoutRoom } from './roomLayout';

/**
 * Per room: live/submitted artworks win over the static placeholder set, laid
 * out over the room's wall slots. Shared by the 3D gallery (RoomContext) and
 * the list view, so both read the exact same catalog.
 */
export function mergeRoomArtworks(
  rooms: RoomConfig[],
  liveArtworks: Record<string, ImageMetadata[]>,
): Record<string, ImageMetadata[]> {
  const map: Record<string, ImageMetadata[]> = {};
  for (const room of rooms) {
    const live = liveArtworks[room.id];
    const base = live && live.length > 0 ? live : room.images;
    map[room.id] = layoutRoom(base);
  }
  return map;
}
