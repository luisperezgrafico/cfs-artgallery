import { ImageMetadata } from '../types/museum';
import { drawingImages } from './imagesConfig';

export interface RoomConfig {
  id: string;
  name: string;
  images: ImageMetadata[];
}

export const rooms: RoomConfig[] = [
  { id: 'room-1', name: 'Room I',   images: drawingImages },
  { id: 'room-2', name: 'Room II',  images: [] },
  { id: 'room-3', name: 'Room III', images: [] },
  { id: 'room-4', name: 'Room IV',  images: [] },
];
