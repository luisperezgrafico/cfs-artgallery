'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { useTexture, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ImageMetadata } from '../../types/museum';

interface FrameProps {
  position: [number, number, number];
  rotation: [number, number, number];
  image: ImageMetadata;
  index: number;
  onFrameClick?: (index: number) => void;
}

const Frame = forwardRef<THREE.Mesh, FrameProps>(
  ({ position, rotation, image, index, onFrameClick }, ref) => {
    const [error, setError] = useState(false);
    const internalRef = useRef<THREE.Mesh>(null);

    const texture = useTexture(image.url);

    React.useEffect(() => {
      const handleError = () => {
        console.warn(`Failed to load image ${index + 1}`);
        setError(true);
      };
      if (texture?.source) {
        texture.source.data.addEventListener('error', handleError);
        return () => texture.source.data.removeEventListener('error', handleError);
      }
    }, [texture, index]);

    React.useEffect(() => {
      if (!internalRef.current) return;
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<THREE.Mesh>).current = internalRef.current;
      }
    }, [ref]);

    if (texture) texture.minFilter = THREE.LinearFilter;

    const aspectRatio = texture?.image ? texture.image.width / texture.image.height : 1;
    const width = 1.5;
    const height = width / aspectRatio;

    // Y of the bottom edge of the frame box
    const frameBottom = (height + 0.1) / 2;

    // Plaque geometry
    const plaqueW = Math.min(width + 0.1, 1.4);
    const plaqueH = 0.30;
    // 0.12 gap between frame bottom and plaque top
    const plaqueY = -(frameBottom + plaqueH / 2 + 0.12);
    // Wall surface is at local z ≈ -0.05 (back face of 0.1-deep frame box).
    // Plaque at -0.03 sits flush on the wall with a tiny relief, no z-fighting.
    const plaqueZ = -0.03;

    const handlePlaqueClick = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
      e.stopPropagation();
      const native = e.nativeEvent as PointerEvent;
      const x = native?.clientX ?? window.innerWidth / 2;
      const y = native?.clientY ?? window.innerHeight * 0.75;
      window.dispatchEvent(
        new CustomEvent('open-artwork-info', { detail: { x, y } }),
      );
    };

    const artistLine = [image.artist, image.date].filter(Boolean).join(' · ');

    return (
      <group position={position} rotation={rotation}>
        {/* Frame box */}
        <mesh
          ref={internalRef}
          onClick={() => onFrameClick?.(index)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width + 0.1, height + 0.1, 0.1]} />
          <meshStandardMaterial color="#222" />

          <mesh position={[0, 0, 0.051]}>
            <planeGeometry args={[width, height]} />
            {error ? (
              <meshBasicMaterial color="#444">
                <Text
                  position={[0, 0, 0.01]}
                  fontSize={0.1}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                >
                  Image not available
                </Text>
              </meshBasicMaterial>
            ) : (
              <meshBasicMaterial map={texture} toneMapped={true} color="#ddd" />
            )}
          </mesh>
        </mesh>

        {/* ── Museum plaque (pure 3D) ── */}

        {/* Cream background */}
        <mesh position={[0, plaqueY, plaqueZ]}>
          <planeGeometry args={[plaqueW, plaqueH]} />
          <meshBasicMaterial color="#ede6d8" transparent opacity={0.93} />
        </mesh>

        {/* Subtle shadow border */}
        <mesh position={[0, plaqueY, plaqueZ - 0.001]}>
          <planeGeometry args={[plaqueW + 0.02, plaqueH + 0.02]} />
          <meshBasicMaterial color="#b8a890" transparent opacity={0.35} />
        </mesh>

        {/* Title */}
        <Text
          position={[0, plaqueY + 0.065, plaqueZ + 0.002]}
          fontSize={0.065}
          color="#2b3644"
          anchorX="center"
          anchorY="middle"
          maxWidth={plaqueW - 0.1}
          textAlign="center"
          font={undefined}
        >
          {image.title}
        </Text>

        {/* Artist · Year */}
        <Text
          position={[0, plaqueY - 0.02, plaqueZ + 0.002]}
          fontSize={0.05}
          color="#5a6878"
          anchorX="center"
          anchorY="middle"
          maxWidth={plaqueW - 0.1}
          textAlign="center"
        >
          {artistLine}
        </Text>

        {/* Indicator dots */}
        <Text
          position={[0, plaqueY - 0.095, plaqueZ + 0.002]}
          fontSize={0.036}
          color="#a8bcc8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.25}
        >
          {'...'}
        </Text>

        {/* Invisible click surface for the plaque */}
        <mesh
          position={[0, plaqueY, plaqueZ + 0.003]}
          onClick={handlePlaqueClick}
        >
          <planeGeometry args={[plaqueW, plaqueH]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>
    );
  },
);

Frame.displayName = 'Frame';
export default Frame;
