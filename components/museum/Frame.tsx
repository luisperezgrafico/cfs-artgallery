'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { useTexture, Text } from '@react-three/drei';
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
    const [hovered, setHovered] = useState(false);
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

    return (
      <group position={position} rotation={rotation}>
        <mesh
          ref={internalRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
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
      </group>
    );
  },
);

Frame.displayName = 'Frame';
export default Frame;
