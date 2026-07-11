'use client';

import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import galleryData from '@/content/gallery.json';
import roomAData from '@/content/rooms/room-a.json';
import roomBData from '@/content/rooms/room-b.json';
import roomCData from '@/content/rooms/room-c.json';
import {
  LOBBY_OVERVIEW,
  ROOM_ENTRANCE,
  ROOM_OVERVIEW,
  viewpointForSlot,
  type GalleryManifest,
  type GalleryState,
  type RoomData,
  type Viewpoint,
} from '@/lib/gallery';
import { RoomScene } from '@/components/Scene';
import { LobbyScene } from '@/components/LobbyScene';
import { Overlay } from '@/components/Overlay';

const FADE_MS = 280;

const ROOMS: Record<string, RoomData> = {
  'room-a': roomAData as RoomData,
  'room-b': roomBData as RoomData,
  'room-c': roomCData as RoomData,
};

type GalleryAction =
  | { type: 'ENTER_ROOM'; roomSlug: string }
  | { type: 'ADVANCE_ENTRANCE' }
  | { type: 'EXIT_TO_LOBBY' }
  | { type: 'NAV'; delta: 1 | -1 };

function reduce(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'ENTER_ROOM':
      // slotIndex -1 = cinematic entrance; auto-advances to 0 (overview)
      return { scene: 'room', roomSlug: action.roomSlug, slotIndex: -1 };
    case 'ADVANCE_ENTRANCE':
      if (state.scene === 'room' && state.slotIndex === -1)
        return { ...state, slotIndex: 0 };
      return state;
    case 'EXIT_TO_LOBBY':
      return { scene: 'lobby' };
    case 'NAV': {
      if (state.scene !== 'room' || state.slotIndex < 0) return state;
      const room = ROOMS[state.roomSlug];
      const next = state.slotIndex + action.delta;
      if (next < 0) return { scene: 'lobby' };
      if (next > room.slots.length) return state;
      return { ...state, slotIndex: next };
    }
  }
}

export default function Gallery() {
  const [state, dispatch]     = useReducer(reduce, { scene: 'lobby' });
  const [moving, setMoving]   = useState(false);
  const [fading, setFading]   = useState(false);
  const [plaqueOpen, setPlaqueOpen] = useState(false);
  const [motionOn, setMotionOn]     = useState(true);
  const [ambientOn, setAmbientOn]   = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionOn(false);
      setAmbientOn(false);
    }
  }, []);

  // CameraRig always snaps on fresh mount (re-mounts on scene change),
  // so scene transitions (lobby↔room) get a free snap for free.
  // The only extra thing: when entering a room, auto-advance from entrance (-1)
  // to overview (0) after a short pause so the snap renders first.
  const isEntranceState = state.scene === 'room' && state.slotIndex === -1;
  useEffect(() => {
    if (!isEntranceState) return;
    const t = window.setTimeout(() => {
      dispatch({ type: 'ADVANCE_ENTRANCE' });
      setMoving(true);
    }, 160);
    return () => window.clearTimeout(t);
  }, [isEntranceState]);

  // Scene changes (lobby↔room) always fade so the snap isn't visible.
  // In-room navigation uses smooth camera movement when motionOn=true.
  const sceneChange = useCallback(
    (action: GalleryAction) => {
      if (fading) return;
      setPlaqueOpen(false);
      setFading(true);
      window.setTimeout(() => {
        dispatch(action);
        requestAnimationFrame(() => setFading(false));
      }, FADE_MS);
    },
    [fading],
  );

  const navAction = useCallback(
    (action: GalleryAction) => {
      if (fading) return;
      if (state.scene === 'room' && state.slotIndex === -1) return;
      setPlaqueOpen(false);
      if (motionOn) {
        dispatch(action);
        setMoving(true);
      } else {
        setFading(true);
        window.setTimeout(() => {
          dispatch(action);
          requestAnimationFrame(() => setFading(false));
        }, FADE_MS);
      }
    },
    [fading, motionOn, state],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navAction({ type: 'NAV', delta: 1 });
      if (e.key === 'ArrowLeft')  navAction({ type: 'NAV', delta: -1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navAction]);

  const viewpoint = useMemo<Viewpoint>(() => {
    if (state.scene === 'lobby') return LOBBY_OVERVIEW;
    const room = ROOMS[state.roomSlug];
    if (state.slotIndex === -1) return ROOM_ENTRANCE;
    if (state.slotIndex === 0)  return ROOM_OVERVIEW;
    return viewpointForSlot(room.slots[state.slotIndex - 1]);
  }, [state]);

  const fogColor   = state.scene === 'lobby' ? '#e8e4d8' : ROOMS[state.roomSlug]?.theme.fog ?? '#e8e4d8';
  const currentRoom = state.scene === 'room' ? ROOMS[state.roomSlug] : null;
  const snap = !motionOn;

  return (
    <div className="stage">
      <Canvas
        frameloop="always"
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: LOBBY_OVERVIEW.position, near: 0.1, far: 60 }}
      >
        <Suspense fallback={null}>
          {state.scene === 'lobby' ? (
            <LobbyScene
              viewpoint={viewpoint}
              moving={moving}
              snap={snap}
              ambient={ambientOn}
              onSettled={() => setMoving(false)}
            />
          ) : (
            <RoomScene
              room={ROOMS[state.roomSlug]}
              viewpoint={viewpoint}
              moving={moving}
              snap={snap}
              ambient={ambientOn}
              onSettled={() => setMoving(false)}
            />
          )}
        </Suspense>
      </Canvas>

      <Overlay
        state={state}
        gallery={galleryData as GalleryManifest}
        currentRoom={currentRoom}
        plaqueOpen={plaqueOpen}
        motionOn={motionOn}
        ambientOn={ambientOn}
        onEnterRoom={(slug) => sceneChange({ type: 'ENTER_ROOM', roomSlug: slug })}
        onExitToLobby={() => sceneChange({ type: 'EXIT_TO_LOBBY' })}
        onNav={(delta) => navAction({ type: 'NAV', delta })}
        onTogglePlaque={() => setPlaqueOpen((v) => !v)}
        onToggleMotion={() => setMotionOn((v) => !v)}
        onToggleAmbient={() => setAmbientOn((v) => !v)}
      />

      <div
        className={`fade${fading ? ' fade-on' : ''}`}
        style={{ background: fogColor }}
        aria-hidden="true"
      />
    </div>
  );
}
