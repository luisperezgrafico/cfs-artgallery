'use client';

import { useRef } from 'react';
import { Environment, BakeShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { RoomData } from '@/lib/gallery';
import { MuseumRoom } from './museum/MuseumRoom';
import { MuseumLights } from './museum/MuseumLights';
import { MuseumCamera } from './museum/MuseumCamera';
import { ArtworkFrame } from './museum/ArtworkFrame';
import { calculateFramePositions, type RoomDimensions } from './museum/framePositioning';

const ROOM_DIMS: RoomDimensions = {
  width: 10,
  length: 16,
  height: 4.5,
  wallTiltAngle: 0.12,
};

interface Props {
  roomData: RoomData;
  frameIndex: number;
  animated: boolean;
  onFrameClick: (index: number) => void;
  onSettled?: () => void;
}

export function MuseumScene({ roomData, frameIndex, animated, onFrameClick, onSettled }: Props) {
  const frameRefs = useRef<(THREE.Mesh | null)[]>([]);

  const artworks = roomData.slots.map(slot =>
    slot.artworkSlug ? roomData.artworks[slot.artworkSlug] : null,
  );

  const { positions, rotations } = calculateFramePositions(ROOM_DIMS, artworks.length);

  return (
    <>
      <color attach="background" args={['#080810']} />
      <fog attach="fog" args={['#080810', 12, 32]} />

      <Environment preset="city" />
      <MuseumLights dimensions={ROOM_DIMS} />
      <MuseumRoom dimensions={ROOM_DIMS} variant={roomData.variant} />

      {artworks.map((artwork, i) => (
        <ArtworkFrame
          key={i}
          ref={(el) => { frameRefs.current[i] = el; }}
          position={positions[i]}
          rotation={rotations[i]}
          artwork={artwork}
          index={i}
          isZoomed={frameIndex === i}
          onFrameClick={onFrameClick}
        />
      ))}

      <MuseumCamera
        frameIndex={frameIndex}
        frameRefs={frameRefs}
        dimensions={ROOM_DIMS}
        animated={animated}
        onSettled={onSettled}
      />

      <BakeShadows />
    </>
  );
}
