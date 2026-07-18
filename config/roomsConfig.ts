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
  // Dark indigo / cinematic — ceiling darkened to match other dark themes
  wallColor:        '#1A1637',
  ceilingColor:     '#0e0c1e',
  floorColor:       '#050505',
  hemisphereTop:    '#2a1f50',
  hemisphereBottom: '#08060f',
  ambientIntensity: 0.2,
};

const THEME_ARDOISE: RoomTheme = {
  // Room II — Ardoise: deep blue-slate / contemporary museum
  wallColor:        '#1c2230',
  ceilingColor:     '#131824',
  floorColor:       '#07080c',
  hemisphereTop:    '#252e40',
  hemisphereBottom: '#07080c',
  ambientIntensity: 0.2,
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
  // Ocre Profond: warm sienna / Wallace Collection / Spanish museums
  wallColor:        '#2a1c14',
  ceilingColor:     '#1c1410',
  floorColor:       '#0a0806',
  hemisphereTop:    '#422a18',
  hemisphereBottom: '#0a0806',
  ambientIntensity: 0.2,
};

// ── Rooms ─────────────────────────────────────────────────────────────────────

export const rooms: RoomConfig[] = [
  { id: 'room-1', name: 'Room I',   images: drawingImages, theme: THEME_OCRE    },
  { id: 'room-2', name: 'Room II',  images: [],            theme: THEME_ARDOISE },
  { id: 'room-3', name: 'Room III', images: [],            theme: THEME_FORET   },
  { id: 'room-4', name: 'Room IV',  images: [],            theme: THEME_INDIGO  },
];
