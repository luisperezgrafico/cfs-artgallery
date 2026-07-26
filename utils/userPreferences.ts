type StoredVisitPosition = {
  roomId: string;
  frameIndex: number;
  updatedAt: number;
};

export interface ShelfItem {
  id: string;
  title: string;
  artist: string;
  url: string;
  roomId: string;
  frameIndex: number;
}

const VISIT_POSITION_KEY = 'cfs-gallery:visit-position:v1';
const MENU_TAB_Y_KEY = 'cfs-gallery:menu-tab-y:v1';
const SHELF_KEY = 'cfs-gallery:shelf:v1';
const DEFAULT_MENU_TAB_Y = 0.5;
const MIN_MENU_TAB_Y = 0.18;
const MAX_MENU_TAB_Y = 0.82;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readVisitPosition(): StoredVisitPosition | null {
  const localStorage = storage();
  if (!localStorage) return null;

  try {
    const raw = localStorage.getItem(VISIT_POSITION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredVisitPosition>;
    const frameIndex = parsed.frameIndex;
    const updatedAt = parsed.updatedAt;
    if (
      typeof parsed.roomId !== 'string' ||
      typeof frameIndex !== 'number' ||
      !Number.isInteger(frameIndex) ||
      typeof updatedAt !== 'number'
    ) {
      return null;
    }

    return {
      roomId: parsed.roomId,
      frameIndex: Math.max(-1, frameIndex),
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveVisitPosition(roomId: string, frameIndex: number) {
  const localStorage = storage();
  if (!localStorage || !roomId || !Number.isInteger(frameIndex)) return;

  const position: StoredVisitPosition = {
    roomId,
    frameIndex: Math.max(-1, frameIndex),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(VISIT_POSITION_KEY, JSON.stringify(position));
  } catch {
    /* storage disabled/full - preference persistence is optional */
  }
}

export function getInitialRoomIndex(rooms: { id: string }[]): number {
  const saved = readVisitPosition();
  if (!saved) return 0;

  const index = rooms.findIndex((room) => room.id === saved.roomId);
  return index >= 0 ? index : 0;
}

export function getInitialFrameIndex(roomId: string, totalFrames: number): number {
  const saved = readVisitPosition();
  if (!saved || saved.roomId !== roomId || saved.frameIndex < 0 || totalFrames <= 0) {
    return -1;
  }

  return Math.min(saved.frameIndex, totalFrames - 1);
}

export function clampMenuTabY(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MENU_TAB_Y;
  return Math.min(MAX_MENU_TAB_Y, Math.max(MIN_MENU_TAB_Y, value));
}

export function readMenuTabY(): number {
  const localStorage = storage();
  if (!localStorage) return DEFAULT_MENU_TAB_Y;

  try {
    const raw = localStorage.getItem(MENU_TAB_Y_KEY);
    if (!raw) return DEFAULT_MENU_TAB_Y;
    return clampMenuTabY(Number(raw));
  } catch {
    return DEFAULT_MENU_TAB_Y;
  }
}

export function saveMenuTabY(value: number) {
  const localStorage = storage();
  if (!localStorage) return;

  try {
    localStorage.setItem(MENU_TAB_Y_KEY, String(clampMenuTabY(value)));
  } catch {
    /* storage disabled/full - preference persistence is optional */
  }
}

export function readShelf(): ShelfItem[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(SHELF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ShelfItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.roomId === 'string' &&
        typeof item.frameIndex === 'number',
    );
  } catch {
    return [];
  }
}

export function writeShelf(items: ShelfItem[]): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(SHELF_KEY, JSON.stringify(items));
  } catch {
    /* storage disabled/full */
  }
}
