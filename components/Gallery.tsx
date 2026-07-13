'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import galleryData from '@/content/gallery.json';
import roomAData from '@/content/rooms/room-a.json';
import roomBData from '@/content/rooms/room-b.json';
import roomCData from '@/content/rooms/room-c.json';
import type { GalleryManifest, RoomData } from '@/lib/gallery';
import { MuseumScene } from '@/components/MuseumScene';
import { Overlay } from '@/components/Overlay';

const FADE_MS = 260;

const ROOMS: Record<string, RoomData> = {
  'room-a': roomAData as RoomData,
  'room-b': roomBData as RoomData,
  'room-c': roomCData as RoomData,
};

const DEFAULT_ROOM = 'room-a';

export default function Gallery() {
  const [roomSlug,    setRoomSlug]    = useState(DEFAULT_ROOM);
  const [frameIndex,  setFrameIndex]  = useState(-1);   // -1 = overview
  const [fading,      setFading]      = useState(false);
  const [motionOn,    setMotionOn]    = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionOn(false);
    }
  }, []);

  const roomData   = ROOMS[roomSlug];
  const totalFrames = roomData.slots.length;
  const animated   = motionOn;

  // Smooth (or snap) transition helper
  const transition = useCallback((fn: () => void) => {
    if (fading) return;
    if (motionOn) {
      fn();
    } else {
      setFading(true);
      window.setTimeout(() => {
        fn();
        requestAnimationFrame(() => setFading(false));
      }, FADE_MS);
    }
  }, [fading, motionOn]);

  const handleFrameClick = useCallback((index: number) => {
    transition(() => setFrameIndex(index));
  }, [transition]);

  const handleOverview = useCallback(() => {
    transition(() => setFrameIndex(-1));
  }, [transition]);

  const handleNav = useCallback((delta: 1 | -1) => {
    transition(() => {
      setFrameIndex(prev => {
        const next = prev + delta;
        if (next < 0 || next >= totalFrames) return prev;
        return next;
      });
    });
  }, [transition, totalFrames]);

  const handleSwitchRoom = useCallback((slug: string) => {
    if (fading || slug === roomSlug) return;
    setFading(true);
    window.setTimeout(() => {
      setRoomSlug(slug);
      setFrameIndex(-1);
      requestAnimationFrame(() => setFading(false));
    }, FADE_MS);
  }, [fading, roomSlug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNav(1);
      if (e.key === 'ArrowLeft')  handleNav(-1);
      if (e.key === 'Escape')     handleOverview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNav, handleOverview]);

  return (
    <div className="stage">
      <Canvas
        frameloop="always"
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: [0, 2.2, 13.5], near: 0.1, far: 80 }}
        shadows
      >
        <Suspense fallback={null}>
          <MuseumScene
            key={roomSlug}
            roomData={roomData}
            frameIndex={frameIndex}
            animated={animated}
            onFrameClick={handleFrameClick}
          />
        </Suspense>
      </Canvas>

      <Overlay
        roomSlug={roomSlug}
        frameIndex={frameIndex}
        roomData={roomData}
        gallery={galleryData as GalleryManifest}
        motionOn={motionOn}
        onSwitchRoom={handleSwitchRoom}
        onOverview={handleOverview}
        onNav={handleNav}
        onToggleMotion={() => setMotionOn(v => !v)}
      />

      <div
        className={`fade${fading ? ' fade-on' : ''}`}
        style={{ background: '#080810' }}
        aria-hidden="true"
      />
    </div>
  );
}
