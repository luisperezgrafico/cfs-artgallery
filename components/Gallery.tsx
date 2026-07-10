'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import roomData from '@/content/room.json';
import { OVERVIEW, viewpoints, type Room } from '@/lib/gallery';
import { Scene } from '@/components/Scene';
import { Overlay } from '@/components/Overlay';

const FADE_MS = 260;

export default function Gallery() {
  const room = roomData as Room;
  const vps = useMemo(() => viewpoints(room), [room]);
  const total = room.artworks.length;

  // 0 = room overview, 1..total = each artwork
  const [index, setIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const [plaqueOpen, setPlaqueOpen] = useState(false);
  const [motionOn, setMotionOn] = useState(true);
  const [ambientOn, setAmbientOn] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionOn(false);
      setAmbientOn(false);
    }
  }, []);

  const go = useCallback(
    (next: number) => {
      if (fading) return; // ignore input mid-fade so a jump can't double-fire
      const clamped = Math.max(0, Math.min(total, next));
      if (clamped === index) return;
      setPlaqueOpen(false);
      if (motionOn) {
        setIndex(clamped);
        setMoving(true);
      } else {
        // reduced motion: fade out, jump, fade back in
        setFading(true);
        window.setTimeout(() => {
          setIndex(clamped);
          requestAnimationFrame(() => setFading(false));
        }, FADE_MS);
      }
    },
    [index, total, motionOn, fading],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  return (
    <div className="stage">
      <Canvas
        frameloop={ambientOn || moving ? 'always' : 'demand'}
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: OVERVIEW.position, near: 0.1, far: 60 }}
      >
        <Suspense fallback={null}>
          <Scene
            room={room}
            viewpoint={vps[index]}
            moving={moving}
            snap={!motionOn}
            ambient={ambientOn}
            onSettled={() => setMoving(false)}
          />
        </Suspense>
      </Canvas>

      <Overlay
        room={room}
        index={index}
        total={total}
        onGo={go}
        plaqueOpen={plaqueOpen}
        onTogglePlaque={() => setPlaqueOpen((v) => !v)}
        motionOn={motionOn}
        onToggleMotion={() => setMotionOn((v) => !v)}
        ambientOn={ambientOn}
        onToggleAmbient={() => setAmbientOn((v) => !v)}
      />

      <div
        className={`fade${fading ? ' fade-on' : ''}`}
        style={{ background: room.theme.fog }}
        aria-hidden="true"
      />
    </div>
  );
}
