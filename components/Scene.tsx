'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  artworkPlacement,
  type Artwork,
  type Room,
  type RoomTheme,
  type Viewpoint,
} from '@/lib/gallery';
import { CameraRig } from '@/components/CameraRig';

export function Scene({
  room,
  viewpoint,
  moving,
  snap,
  ambient,
  onSettled,
}: {
  room: Room;
  viewpoint: Viewpoint;
  moving: boolean;
  snap: boolean;
  ambient: boolean;
  onSettled: () => void;
}) {
  const n = room.artworks.length;

  return (
    <>
      <color attach="background" args={[room.theme.fog]} />
      <fog attach="fog" args={[room.theme.fog, 7, 30]} />

      <hemisphereLight args={['#ffffff', room.theme.floor, 1.0]} />
      <directionalLight position={[4, 8, 2]} intensity={1.1} />

      {/* floating floor disc */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[15, 48]} />
        <meshStandardMaterial color={room.theme.floor} />
      </mesh>

      {room.artworks.map((art, i) => (
        <ArtworkPanel
          key={art.slug}
          art={art}
          placement={artworkPlacement(i, n)}
          theme={room.theme}
        />
      ))}

      <Sparkles
        count={110}
        scale={[18, 6, 18]}
        position={[0, 3, 0]}
        size={2.2}
        speed={0.25}
        opacity={0.45}
        color="#ffffff"
      />

      <Crystal position={[-9, 0.8, 2]} scale={0.9} theme={room.theme} ambient={ambient} />
      <Crystal position={[9.5, 1.1, 0.5]} scale={1.2} theme={room.theme} ambient={ambient} />
      <Crystal position={[0, 0.6, -10.5]} scale={0.7} theme={room.theme} ambient={ambient} />

      <CameraRig viewpoint={viewpoint} moving={moving} snap={snap} onSettled={onSettled} />
    </>
  );
}

function ArtworkPanel({
  art,
  placement,
  theme,
}: {
  art: Artwork;
  placement: { position: [number, number, number]; rotY: number };
  theme: RoomTheme;
}) {
  const texture = useTexture(art.image);

  return (
    <group position={placement.position} rotation-y={placement.rotY}>
      {/* floating backing panel */}
      <mesh position-z={-0.09}>
        <planeGeometry args={[art.width + 0.8, art.height + 0.8]} />
        <meshStandardMaterial color={theme.panel} />
      </mesh>
      {/* frame */}
      <mesh position-z={-0.045}>
        <boxGeometry args={[art.width + 0.12, art.height + 0.12, 0.05]} />
        <meshStandardMaterial color={theme.frame} />
      </mesh>
      {/* the work itself, unlit so colors stay faithful */}
      <mesh>
        <planeGeometry args={[art.width, art.height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Crystal({
  position,
  scale,
  theme,
  ambient,
}: {
  position: [number, number, number];
  scale: number;
  theme: RoomTheme;
  ambient: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!ambient || !ref.current) return;
    const t = state.clock.elapsedTime + phase;
    ref.current.rotation.y = t * 0.12;
    ref.current.position.y = position[1] + Math.sin(t * 0.4) * 0.18;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={theme.accent} flatShading />
    </mesh>
  );
}
