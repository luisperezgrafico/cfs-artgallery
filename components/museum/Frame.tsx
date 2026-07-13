'use client';

import React, { useState, useRef, useContext, forwardRef } from 'react';
import { useTexture, Text, useCursor, useFont } from '@react-three/drei';
import * as THREE from 'three';
import { ImageMetadata } from '../../types/museum';
import { ZoomContext } from '../../contexts/ZoomContext';

interface FrameProps {
  position: [number, number, number];
  rotation: [number, number, number];
  image: ImageMetadata;
  index: number;
  onFrameClick?: (index: number) => void;
}

useFont.preload('/fonts/Inter_28pt-SemiBold.ttf');

const Frame = forwardRef<THREE.Mesh, FrameProps>(
  ({ position, rotation, image, index, onFrameClick }, ref) => {
    const [hovered, setHovered] = useState(false);
    const [linkHovered, setLinkHovered] = useState(false);
    const [error, setError] = useState(false);
    const internalRef = useRef<THREE.Mesh>(null);

    const { zoomedFrameId } = useContext(ZoomContext);
    const isZoomed = zoomedFrameId === index;

    useCursor(hovered);
    useCursor(linkHovered);

    const texture = useTexture(image.url);

    React.useEffect(() => {
      const handleError = () => {
        console.warn(`Failed to load image ${index + 1}`);
        setError(true);
      };
      if (texture && texture.source) {
        texture.source.data.addEventListener('error', handleError);
        return () => {
          texture.source.data.removeEventListener('error', handleError);
        };
      }
    }, [texture, index]);

    if (texture) {
      texture.minFilter = THREE.LinearFilter;
    }

    const aspectRatio =
      texture && texture.image ? texture.image.width / texture.image.height : 1;
    const width = 1.5;
    const height = width / aspectRatio;

    React.useEffect(() => {
      if (!internalRef.current) return;
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<THREE.Mesh>).current = internalRef.current;
      }
    }, [ref]);

    const handleClick = () => {
      if (onFrameClick) onFrameClick(index);
    };

    return (
      <group position={position} rotation={rotation}>
        <mesh
          ref={internalRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={handleClick}
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
                  font="Times New Roman"
                >
                  Image not available
                </Text>
              </meshBasicMaterial>
            ) : (
              <meshBasicMaterial map={texture} toneMapped={true} color="#ddd" />
            )}
          </mesh>
        </mesh>

        <mesh position={[width / 2 + 0.2, height / 2 - 0.2, -0.05]}>
          <Text
            position={[0, 0, 0.015]}
            fontSize={0.06}
            color="#eee"
            anchorX="left"
            anchorY="middle"
            maxWidth={0.7}
            textAlign="left"
            lineHeight={1.3}
            font="/fonts/Inter_28pt-SemiBold.ttf"
          >
            {`${image.title}\n${image.artist}\n${image.date}`}
          </Text>
        </mesh>

        {isZoomed && (
          <mesh
            position={[0, -height / 2 - 0.2, -0.04]}
            onClick={() => {
              if (image.link !== '#') {
                window.open(image.link, '_blank', 'noopener,noreferrer');
              }
            }}
            onPointerOver={() => setLinkHovered(true)}
            onPointerOut={() => setLinkHovered(false)}
          >
            <group position={[0, 0, 0.06]}>
              <Text
                fontSize={0.08}
                color={linkHovered ? '#fff' : '#aaa'}
                font="/fonts/Inter_28pt-SemiBold.ttf"
              >
                {image.link !== '#' ? 'Open link →' : ''}
              </Text>
            </group>
            <boxGeometry args={[1, 0.2, 0.1]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        )}
      </group>
    );
  },
);

Frame.displayName = 'Frame';

export default Frame;
