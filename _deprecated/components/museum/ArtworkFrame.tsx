'use client';

import { forwardRef, useState } from 'react';
import { useTexture, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import type { Artwork } from '@/lib/gallery';

interface Props {
  position: [number, number, number];
  rotation: [number, number, number];
  artwork: Artwork | null;
  index: number;
  isZoomed: boolean;
  onFrameClick: (index: number) => void;
}

const FRAME_W     = 1.4;
const FRAME_COLOR = '#2a2118';

export const ArtworkFrame = forwardRef<THREE.Mesh, Props>(function ArtworkFrame(
  { position, rotation, artwork, index, isZoomed, onFrameClick },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !isZoomed);

  const texture = useTexture(artwork?.image ?? '/art/placeholder-abstract.svg');
  const aspectRatio =
    artwork
      ? artwork.width / artwork.height
      : (texture.image?.width ?? 1) / (texture.image?.height ?? 1);
  const w = FRAME_W;
  const h = w / aspectRatio;

  return (
    <group position={position} rotation={rotation}>
      {/* Backing panel — ref used by camera for getWorldPosition/getWorldQuaternion */}
      <mesh
        ref={ref}
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onFrameClick(index)}
      >
        <boxGeometry args={[w + 0.14, h + 0.14, 0.06]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />

        {/* Image */}
        <mesh position-z={0.035}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>

        {/* Hover ring — don't show when already zoomed */}
        {hovered && !isZoomed && (
          <mesh position-z={0.032}>
            <planeGeometry args={[w + 0.06, h + 0.06]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
          </mesh>
        )}
      </mesh>
    </group>
  );
});
