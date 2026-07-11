'use client';

import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import galleryData from '@/content/gallery.json';
import roomAData from '@/content/rooms/room-a.json';
import roomBData from '@/content/rooms/room-b.json';
import roomCData from '@/content/rooms/room-c.json';
import {
  LOBBY_OVERVIEW,
  ROOM_OVERVIEW,
  viewpointForSlot,
  type GalleryManifest,
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

type GalleryState =
  | { scene: 'lobby' }
  | { scene: 'room'; roomSlug: string; slotIndex: number };

type GalleryAction =
  | { type: 'ENTER_ROOM'; roomSlug: string }
  | { type: 'EXIT_TO_LOBBY' }
  | { type: 'NAV'; delta: 1 | -1 };

function reduce(state: GalleryState, action: GalleryAction): GalleryState {
  if (action.type === 'ENTER_ROOM') {
    return { scene: 'room', roomSlug: action.roomSlug, slotIndex: 0 };
  }
  if (action.type === 'EXIT_TO_LOBBY') {
    return { scene: 'lobby' };
  }
  if (action.type === 'NAV' && state.scene === 'room') {
    const room = ROOMS[state.roomSlug];
    const total = room.slots.length;
    const next = state.slotIndex + action.delta;
    if (next < 0) return { scene: 'lobby' }; // back from overview → lobby
    if (next > total) return state;           // past last slot → clamp
    return { ...state, slotIndex: next };
  }
  return state;
}

export default function Gallery() {
  const [state, dispatch] = useReducer(reduce, { scene: 'lobby' });
  const [moving, setMoving] = useState(false);
  const [fading, setFading] = useState(false);
  const [plaqueOpen, setPlaqueOpen] = useState(false);
  const [motionOn, setMotionOn] = useState(true);
  const [ambientOn, setAmbientOn] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionOn(false);
      setAmbientOn(false);
    }
  }, []);

  const transition = useCallback(
    (action: GalleryAction) => {
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
    [fading, motionOn],
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
    const room = ROOMS[state.roomSlug];
    if (state.slotIndex === 0) return ROOM_OVERVIEW;
    return viewpointForSlot(room.slots[state.slotIndex - 1]);
  }, [state]);

  const fogColor =
    state.scene === 'lobby'
      ? '#e8e4d8'
      : ROOMS[state.roomSlug].theme.fog;

  const currentRoom = state.scene === 'room' ? ROOMS[state.roomSlug] : null;

  return (
    <div className="stage">
      <Canvas
        frameloop={ambientOn || moving ? 'always' : 'demand'}
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: LOBBY_OVERVIEW.position, near: 0.1, far: 60 }}
      >
        <Suspense fallback={null}>
          {state.scene === 'lobby' ? (
            <LobbyScene
              viewpoint={viewpoint}
              moving={moving}
              snap={!motionOn}
              ambient={ambientOn}
              onSettled={() => setMoving(false)}
            />
          ) : (
            <RoomScene
              room={ROOMS[state.roomSlug]}
              viewpoint={viewpoint}
              moving={moving}
              snap={!motionOn}
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
