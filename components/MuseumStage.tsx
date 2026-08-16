'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveEvents, Environment, Preload } from '@react-three/drei';
import Museum from './Museum';
import { ImageMetadata, RoomTheme } from '../types/museum';
import { useAnimation } from '../contexts/AnimationContext';

interface MuseumStageProps {
  images: ImageMetadata[];
  theme?: RoomTheme;
  roomId?: string;
}

// Signals "assets loaded" from inside the Suspense boundary, not from its
// fallback. The previous approach (mounting an empty fallback and firing on
// its *unmount*) only works if Suspense actually falls back on the first
// render — if everything inside is already warm in three.js's caches (e.g.
// revisiting a room already loaded earlier in the same tab), React never
// mounts the fallback at all, so that unmount-triggered signal never fires
// and assetsReady is stuck false forever behind a loading screen that's
// otherwise already at 100%. A component rendered as a *child* of the
// boundary only mounts once every suspended promise above it has resolved,
// so its own mount effect fires exactly once either way.
const AssetsLoadedSignal = ({ onLoaded }: { onLoaded: () => void }) => {
  React.useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  return null;
};

const MuseumStage: React.FC<MuseumStageProps> = ({ images, theme, roomId }) => {
  const { sceneOpacity, sceneBlur, handleAssetsLoaded } = useAnimation();

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{
        opacity: sceneOpacity,
        filter: `blur(${sceneBlur}px)`,
        transition: 'opacity 1.8s ease-in-out, filter 1.4s ease-out',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 2, 14], fov: 60 }}
        dpr={[1.5, 2.5]}
      >
        <Preload all />
        <AdaptiveEvents />
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <Museum images={images} theme={theme} roomId={roomId} />
          <Environment preset="city" />
          <AssetsLoadedSignal onLoaded={handleAssetsLoaded} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default MuseumStage;
