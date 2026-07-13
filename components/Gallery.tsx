'use client';

import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import galleryData from '@/content/gallery.json';
import roomAData from '@/content/rooms/room-a.json';
import roomBData from '@/content/rooms/room-b.json';
import roomCData from '@/content/rooms/room-c.json';
import {
  LOBBY_OVERVIEW,
  ROOM_TRANSFORMS,
  worldRoomOverview,
  worldViewpointForSlot,
  type GalleryManifest,
  type GalleryState,
  type RoomData,
  type Viewpoint,
} from '@/lib/gallery';
import { GalleryScene } from '@/components/GalleryScene';
import { Overlay } from '@/components/Overlay';

const FADE_MS = 280;

const ROOMS: Record<string, RoomData> = {
  'room-a': roomAData as RoomData,
  'room-b': roomBData as RoomData,
  'room-c': roomCData as RoomData,
};

type GalleryAction =
  | { type: 'WALK_TO';  roomSlug: string }
  | { type: 'ARRIVE';   roomSlug: string }
  | { type: 'EXIT_TO_LOBBY' }
  | { type: 'NAV'; delta: 1 | -1 };

function reduce(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'WALK_TO':
      return { scene: 'walking', to: action.roomSlug };
    case 'ARRIVE':
      return { scene: 'room', roomSlug: action.roomSlug, slotIndex: 0 };
    case 'EXIT_TO_LOBBY':
      return { scene: 'lobby' };
    case 'NAV': {
      if (state.scene !== 'room') return state;
      const room = ROOMS[state.roomSlug];
      const next = state.slotIndex + action.delta;
      if (next < 0) return state;
      if (next > room.slots.length) return state;
      return { ...state, slotIndex: next };
    }
  }
}

export default function Gallery() {
  const [state, dispatch]           = useReducer(reduce, { scene: 'lobby' });
  const [fading, setFading]         = useState(false);
  const [plaqueOpen, setPlaqueOpen] = useState(false);
  const [motionOn, setMotionOn]     = useState(true);
  const [ambientOn, setAmbientOn]   = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionOn(false);
      setAmbientOn(false);
    }
  }, []);

  // Compute target viewpoint from state — all coordinates in world space
  const viewpoint = useMemo<Viewpoint>(() => {
    if (state.scene === 'lobby') return LOBBY_OVERVIEW;
    const slug = state.scene === 'walking' ? state.to : state.roomSlug;
    const t    = ROOM_TRANSFORMS[slug];
    if (state.scene === 'walking') return worldRoomOverview(t);
    if (state.slotIndex === 0)     return worldRoomOverview(t);
    return worldViewpointForSlot(ROOMS[slug].slots[state.slotIndex - 1], t);
  }, [state]);

  // CameraRig fires this when it finishes animating
  const handleSettled = useCallback(() => {
    if (state.scene === 'walking') {
      dispatch({ type: 'ARRIVE', roomSlug: state.to });
    }
  }, [state]);

  // Enter a room: smooth walk (motionOn) or instant fade
  const enterRoom = useCallback((slug: string) => {
    if (fading) return;
    setPlaqueOpen(false);
    if (motionOn) {
      dispatch({ type: 'WALK_TO', roomSlug: slug });
    } else {
      setFading(true);
      window.setTimeout(() => {
        dispatch({ type: 'ARRIVE', roomSlug: slug });
        requestAnimationFrame(() => setFading(false));
      }, FADE_MS);
    }
  }, [fading, motionOn]);

  // Exit back to lobby — always fades (no corridor walk-back yet)
  const exitToLobby = useCallback(() => {
    if (fading) return;
    setPlaqueOpen(false);
    setFading(true);
    window.setTimeout(() => {
      dispatch({ type: 'EXIT_TO_LOBBY' });
      requestAnimationFrame(() => setFading(false));
    }, FADE_MS);
  }, [fading]);

  // In-room artwork navigation
  const nav = useCallback((delta: 1 | -1) => {
    if (fading || state.scene !== 'room') return;
    setPlaqueOpen(false);
    if (motionOn) {
      dispatch({ type: 'NAV', delta });
    } else {
      setFading(true);
      window.setTimeout(() => {
        dispatch({ type: 'NAV', delta });
        requestAnimationFrame(() => setFading(false));
      }, FADE_MS);
    }
  }, [fading, motionOn, state.scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'ArrowLeft')  nav(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  const snap        = !motionOn;
  const currentRoom = state.scene === 'room' ? ROOMS[state.roomSlug] : null;

  return (
    <div className="stage">
      <Canvas
        frameloop="always"
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: LOBBY_OVERVIEW.position, near: 0.1, far: 65 }}
      >
        <Suspense fallback={null}>
          <GalleryScene
            rooms={ROOMS}
            viewpoint={viewpoint}
            snap={snap}
            onSettled={handleSettled}
            ambient={ambientOn}
          />
        </Suspense>
      </Canvas>

      <Overlay
        state={state}
        gallery={galleryData as GalleryManifest}
        currentRoom={currentRoom}
        plaqueOpen={plaqueOpen}
        motionOn={motionOn}
        ambientOn={ambientOn}
        onEnterRoom={enterRoom}
        onExitToLobby={exitToLobby}
        onNav={nav}
        onTogglePlaque={() => setPlaqueOpen(v => !v)}
        onToggleMotion={() => setMotionOn(v => !v)}
        onToggleAmbient={() => setAmbientOn(v => !v)}
      />

      <div
        className={`fade${fading ? ' fade-on' : ''}`}
        style={{ background: '#e0dcd4' }}
        aria-hidden="true"
      />
    </div>
  );
}
