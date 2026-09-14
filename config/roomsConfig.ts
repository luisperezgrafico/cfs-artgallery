import { ImageMetadata, RoomTheme } from '../types/museum';
import { drawingImages } from './imagesConfig';

export interface RoomConfig {
  id: string;
  name: string;
  images: ImageMetadata[];
  theme: RoomTheme;
}

// ── Room themes ───────────────────────────────────────────────────────────────

// Skirting and cornice in every room are the room's own hue taken down to a
// near-black (L5.5% and L10%), which is what a museum does: the trim separates
// the wall from the floor and the ceiling without competing with the art. They
// used to be *lighter* than the wall, which is why they read as a strip of
// paint. The cornice carries a little more light than the skirting so its
// profile still catches the spotlight against an almost black ceiling.
// `trimColor` is the portal joinery (jambs, lintel, pilasters, panel mouldings)
// and `doorColor` the leaves. Both are the same in the four rooms on purpose —
// the doors are the museum's own joinery, not part of a room's colour scheme —
// and they live here, not as constants in the component, so a single room can
// still be pulled apart later without touching code.

const THEME_INDIGO: RoomTheme = {
  // Dark indigo / cinematic. Wall and hemisphere desaturated twice over — S43%
  // shouted, and S22% still read loud: the indigo is now almost a grey-violet.
  // The skirting and cornice stay as they are; they were already right.
  wallColor:        '#23212c',   // was #201e2f, and #1A1637 before that (S43% -> S13%)
  ceilingColor:     '#0a0916',
  floorColor:       '#050505',
  hemisphereTop:    '#34303f',   // was #312b44, and #2a1f50 before that
  hemisphereBottom: '#08060f',
  ambientIntensity: 0.2,
  trimColor:        '#ece6da',
  skirtingColor:    '#0a0814',
  corniceColor:     '#120f24',
  doorColor:        '#7d5a38',
  glowColor:        '#d8ccf0',
};

const THEME_ARDOISE: RoomTheme = {
  // Room II — Ardoise: deep blue-slate / contemporary museum
  wallColor:        '#1c2230',
  ceilingColor:     '#0e111a',
  floorColor:       '#07080c',
  hemisphereTop:    '#252e40',
  hemisphereBottom: '#07080c',
  ambientIntensity: 0.2,
  trimColor:        '#ece6da',
  skirtingColor:    '#080c14',
  corniceColor:     '#0f1524',
  doorColor:        '#7d5a38',
  glowColor:        '#cfe0f0',
};

const THEME_FORET: RoomTheme = {
  // Room III — Vert Forêt: deep sage green / National Gallery dark rooms.
  // Desaturated by half (wall S13% -> S6%): the green looked loud, and most of
  // that came from the coloured hemisphere light, so that comes down too.
  wallColor:        '#282d29',   // was #253028
  ceilingColor:     '#131814',
  floorColor:       '#080e0a',
  hemisphereTop:    '#3b443c',   // was #364838
  hemisphereBottom: '#080e0a',
  ambientIntensity: 0.2,
  trimColor:        '#ece6da',
  skirtingColor:    '#0a120c',
  corniceColor:     '#122115',
  doorColor:        '#7d5a38',
  glowColor:        '#e8dfb8',
};

const THEME_OCRE: RoomTheme = {
  // Ocre Profond: warm sienna / Wallace Collection / Spanish museums
  wallColor:        '#2a1c14',
  ceilingColor:     '#140e0c',
  floorColor:       '#0a0806',
  hemisphereTop:    '#422a18',
  hemisphereBottom: '#0a0806',
  ambientIntensity: 0.2,
  trimColor:        '#ece6da',
  skirtingColor:    '#140c08',
  corniceColor:     '#24170f',
  doorColor:        '#7d5a38',
  glowColor:        '#f0d9a0',
};

// ── Rooms ─────────────────────────────────────────────────────────────────────

export const rooms: RoomConfig[] = [
  { id: 'room-1', name: 'Room I',   images: drawingImages, theme: THEME_OCRE    },
  { id: 'room-2', name: 'Room II',  images: [],            theme: THEME_ARDOISE },
  { id: 'room-3', name: 'Room III', images: [],            theme: THEME_FORET   },
  { id: 'room-4', name: 'Room IV',  images: [],            theme: THEME_INDIGO  },
];
