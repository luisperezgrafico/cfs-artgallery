'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Environment, Preload } from '@react-three/drei';
import Museum from './Museum';
import { ImageMetadata, RoomTheme } from '../types/museum';
import { useAnimation } from '../contexts/AnimationContext';

interface MuseumStageProps {
  images: ImageMetadata[];
  theme?: RoomTheme;
}

const EmptyFallback = ({ onLoaded }: { onLoaded: () => void }) => {
  React.useEffect(() => {
    return () => { onLoaded(); };
  }, [onLoaded]);
  return null;
};

const MuseumStage: React.FC<MuseumStageProps> = ({ images, theme }) => {
  const { sceneOpacity, sceneBlur, handleAssetsLoaded } = useAnimation();

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{
        opacity: sceneOpacity,
        filter: `blur(${sceneBlur}px)`,
        transition: 'opacity 1.5s ease-in-out, filter 1s ease-out',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 2, 14], fov: 60 }}
        dpr={[1.5, 2.5]}
      >
        <Preload all />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <color attach="background" args={['#000000']} />
        <Suspense fallback={<EmptyFallback onLoaded={handleAssetsLoaded} />}>
          <Museum images={images} theme={theme} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default MuseumStage;
