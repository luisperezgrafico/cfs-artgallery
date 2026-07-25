type StoredVisitPosition = {
  roomId: string;
  frameIndex: number;
  updatedAt: number;
};

const VISIT_POSITION_KEY = 'cfs-gallery:visit-position:v1';

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
