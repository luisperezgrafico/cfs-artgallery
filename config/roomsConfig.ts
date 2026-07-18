import { ImageMetadata, RoomTheme } from '../types/museum';
import { drawingImages } from './imagesConfig';

export interface RoomConfig {
  id: string;
  name: string;
  images: ImageMetadata[];
  theme: RoomTheme;
}

// ── Room themes ───────────────────────────────────────────────────────────────

const THEME_INDIGO: RoomTheme = {
  // Room I — original dark indigo / cinematic
  wallColor:        '#1A1637',
  ceilingColor:     '#1a1538',
  floorColor:       '#050505',
  hemisphereTop:    '#3d2b6b',
  hemisphereBottom: '#0a0816',
  ambientIntensity: 0.2,
};

const THEME_BLANCHE: RoomTheme = {
  // Room II — Galerie Blanche: warm ivory / classic Paris gallery
  wallColor:        '#ede8dc',
  ceilingColor:     '#e0dbd0',
  floorColor:       '#b8a888',
  hemisphereTop:    '#f5f0e8',
  hemisphereBottom: '#c4b89a',
  ambientIntensity: 0.55,
};

const THEME_FORET: RoomTheme = {
  // Room III — Vert Forêt: deep sage green / National Gallery dark rooms
  wallColor:        '#253028',
  ceilingColor:     '#1a221c',
  floorColor:       '#080e0a',
  hemisphereTop:    '#364838',
  hemisphereBottom: '#080e0a',
  ambientIntensity: 0.2,
};

const THEME_OCRE: RoomTheme = {
  // Room IV — Ocre Profond: warm sienna / Wallace Collection / Spanish museums
  wallColor:        '#2a1c14',
  ceilingColor:     '#1c1410',
  floorColor:       '#0a0806',
  hemisphereTop:    '#422a18',
  hemisphereBottom: '#0a0806',
  ambientIntensity: 0.2,
};

// ── Rooms ─────────────────────────────────────────────────────────────────────

export const rooms: RoomConfig[] = [
  { id: 'room-1', name: 'Room I',   images: drawingImages, theme: THEME_INDIGO  },
  { id: 'room-2', name: 'Room II',  images: [],            theme: THEME_BLANCHE },
  { id: 'room-3', name: 'Room III', images: [],            theme: THEME_FORET   },
  { id: 'room-4', name: 'Room IV',  images: [],            theme: THEME_OCRE    },
];
