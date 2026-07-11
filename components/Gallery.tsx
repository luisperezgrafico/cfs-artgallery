'use client';

import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import galleryData from '@/content/gallery.json';
import roomAData from '@/content/rooms/room-a.json';
import roomBData from '@/content/rooms/room-b.json';
import roomCData from '@/content/rooms/room-c.json';
import {
  LOBBY_EXITS,
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

const FADE_MS = 260;

const ROOMS: Record<string, RoomData> = {
  'room-a': roomAData as RoomData,
  'room-b': roomBData as RoomData,
  'room-c': roomCData as RoomData,
};

type GalleryAction =
  | { type: 'ENTER_ROOM'; roomSlug: string }
  | { type: 'ROOM_ENTER'; roomSlug: string }
  | { type: 'ADVANCE_ENTRANCE' }
  | { type: 'EXIT_TO_LOBBY' }
  | { type: 'NAV'; delta: 1 | -1 };

function reduce(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'ENTER_ROOM':
      return { scene: 'lobby-exit', targetRoom: action.roomSlug };
    case 'ROOM_ENTER':
      return { scene: 'room', roomSlug: action.roomSlug, slotIndex: -1 };
    case 'ADVANCE_ENTRANCE':
      if (state.scene === 'room' && state.slotIndex === -1)
        return { ...state, slotIndex: 0 };
      return state;
    case 'EXIT_TO_LOBBY':
      return { scene: 'lobby' };
    case 'NAV': {
      if (state.scene !== 'room' || state.slotIndex === -1) return state;
      const room = ROOMS[state.roomSlug];
      const next = state.slotIndex + action.delta;
      if (next < 0) return { scene: 'lobby' };
      if (next > room.slots.length) return state;
      return { ...state, slotIndex: next };
    }
  }
}

export default function Gallery() {
  const [state, dispatch] = useReducer(reduce, { scene: 'lobby' });
  const [moving, setMoving]     = useState(false);
  const [fading, setFading]     = useState(false);
  const [snapOnce, setSnapOnce] = useState(false);
  const [plaqueOpen, setPlaqueOpen] = useState(false);
  const [motionOn, setMotionOn] = useState(true);
  const [ambientOn, setAmbientOn] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionOn(false);
      setAmbientOn(false);
    }
  }, []);

  // When camera enters the room (slotIndex = -1 / snapped to entrance),
  // auto-advance to overview after a short delay so the snap renders first.
  const isEntranceState = state.scene === 'room' && state.slotIndex === -1;
  useEffect(() => {
    if (!isEntranceState) return;
    const t = window.setTimeout(() => {
      setSnapOnce(false);
      dispatch({ type: 'ADVANCE_ENTRANCE' });
      setMoving(true);
    }, 120);
    return () => window.clearTimeout(t);
  }, [isEntranceState]);

  // Called by CameraRig when the camera finishes travelling to a viewpoint.
  const onSettled = useCallback(() => {
    setMoving(false);
    if (state.scene === 'lobby-exit') {
      // Camera reached the portal — swap to room, snap camera to entrance position.
      setSnapOnce(true);
      dispatch({ type: 'ROOM_ENTER', roomSlug: state.targetRoom });
      setMoving(true);
    }
  }, [state]);

  const transition = useCallback(
    (action: GalleryAction) => {
      // Ignore user input during automated walk-through sequences.
      if (state.scene === 'lobby-exit') return;
      if (state.scene === 'room' && state.slotIndex === -1) return;
      if (fading) return;
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
      if (e.key === 'ArrowRight') transition({ type: 'NAV', delta: 1 });
      if (e.key === 'ArrowLeft')  transition({ type: 'NAV', delta: -1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [transition]);

  const viewpoint = useMemo<Viewpoint>(() => {
    if (state.scene === 'lobby') return LOBBY_OVERVIEW;
    if (state.scene === 'lobby-exit') return LOBBY_EXITS[state.targetRoom];
    const room = ROOMS[state.roomSlug];
    if (state.slotIndex === -1) return ROOM_ENTRANCE;
    if (state.slotIndex === 0)  return ROOM_OVERVIEW;
    return viewpointForSlot(room.slots[state.slotIndex - 1]);
  }, [state]);

  const isInLobby  = state.scene === 'lobby' || state.scene === 'lobby-exit';
  const roomSlug   = state.scene === 'room' ? state.roomSlug : null;
  const fogColor   = isInLobby ? '#e8e4d8' : (ROOMS[roomSlug!]?.theme.fog ?? '#e8e4d8');
  const currentRoom = state.scene === 'room' ? ROOMS[state.roomSlug] : null;
  const snap = !motionOn || snapOnce;

  return (
    <div className="stage">
      <Canvas
        frameloop={ambientOn || moving ? 'always' : 'demand'}
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: LOBBY_OVERVIEW.position, near: 0.1, far: 60 }}
      >
        <Suspense fallback={null}>
          {isInLobby ? (
            <LobbyScene
              viewpoint={viewpoint}
              moving={moving}
              snap={snap}
              ambient={ambientOn}
              onSettled={onSettled}
            />
          ) : (
            <RoomScene
              room={ROOMS[state.scene === 'room' ? state.roomSlug : '']}
              viewpoint={viewpoint}
              moving={moving}
              snap={snap}
              ambient={ambientOn}
              onSettled={onSettled}
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
        onEnterRoom={(slug) => transition({ type: 'ENTER_ROOM', roomSlug: slug })}
        onExitToLobby={() => transition({ type: 'EXIT_TO_LOBBY' })}
        onNav={(delta) => transition({ type: 'NAV', delta })}
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
