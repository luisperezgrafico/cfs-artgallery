'use client';

import React, { useState, useRef, forwardRef, useMemo, useEffect } from 'react';
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

// Tiny 1×1 white PNG used as placeholder URL so useTexture always gets a valid string
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function createLinenTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#cdc3b5';
  ctx.fillRect(0, 0, size, size);
  // horizontal warp threads
  for (let y = 0; y < size; y += 2) {
    ctx.strokeStyle = `rgba(100,88,72,${(0.07 + Math.random() * 0.07).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  // vertical weft threads
  for (let x = 0; x < size; x += 2) {
    ctx.strokeStyle = `rgba(80,70,55,${(0.04 + Math.random() * 0.05).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

const Frame = forwardRef<THREE.Mesh, FrameProps>(
  ({ position, rotation, image, index, onFrameClick }, ref) => {
    const [error, setError] = useState(false);
    const internalRef = useRef<THREE.Mesh>(null);

    const textureUrl = image.isEmpty ? BLANK_PNG : image.url;
    const texture = useTexture(textureUrl);

    // Linen canvas texture for empty slots
    const linenTexture = useMemo<THREE.CanvasTexture | null>(() => {
      if (!image.isEmpty) return null;
      return createLinenTexture();
    }, [image.isEmpty]);

    useEffect(() => {
      return () => { linenTexture?.dispose(); };
    }, [linenTexture]);

    React.useEffect(() => {
      if (image.isEmpty) return;
      const handleError = () => {
        console.warn(`Failed to load image ${index + 1}`);
        setError(true);
      };
      if (texture?.source) {
        texture.source.data.addEventListener('error', handleError);
        return () => texture.source.data.removeEventListener('error', handleError);
      }
    }, [texture, index, image.isEmpty]);

    React.useEffect(() => {
      if (!internalRef.current) return;
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<THREE.Mesh>).current = internalRef.current;
      }
    }, [ref]);

    if (texture) texture.minFilter = THREE.LinearFilter;

    // Priority: explicit metadata (deterministic, no async) → texture dimensions → 4:3 fallback
    const aspectRatio =
      image.aspectRatio ??
      (texture?.image?.width && texture.image.height
        ? texture.image.width / texture.image.height
        : 4 / 3);
    const width = 1.5;
    const height = width / aspectRatio;

    const frameBottom = (height + 0.1) / 2;

    const plaqueW = 0.90;
    const plaqueH = 0.28;
    const titleOffsetY  =  0.062;
    const artistOffsetY = -0.020;
    const dotsOffsetY   = -0.088;
    const plaqueY = -(frameBottom + plaqueH / 2 + 0.18);
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

    const handleSubmitClick = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
      e.stopPropagation();
      const native = e.nativeEvent as PointerEvent;
      const x = native?.clientX ?? window.innerWidth / 2;
      const y = native?.clientY ?? window.innerHeight * 0.75;
      window.dispatchEvent(
        new CustomEvent('open-submit-artwork', { detail: { x, y } }),
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
            {image.isEmpty ? (
              <meshBasicMaterial map={linenTexture ?? undefined} />
            ) : error ? (
              <meshBasicMaterial color="#444">
                <Text position={[0, 0, 0.01]} fontSize={0.1} color="white" anchorX="center" anchorY="middle">
                  Image not available
                </Text>
              </meshBasicMaterial>
            ) : (
              <meshBasicMaterial map={texture} toneMapped={false} />
            )}
          </mesh>
        </mesh>

        {image.isEmpty ? (
          /* ── Submit-artwork button (empty slot) ── */
          <>
            {/* Cream background — same as filled plaque */}
            <mesh position={[0, plaqueY, plaqueZ]}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial color="#ede6d8" transparent opacity={0.93} />
            </mesh>
            {/* Shadow border — same as filled plaque */}
            <mesh position={[0, plaqueY, plaqueZ - 0.001]}>
              <planeGeometry args={[plaqueW + 0.02, plaqueH + 0.02]} />
              <meshBasicMaterial color="#b8a890" transparent opacity={0.35} />
            </mesh>
            {/* Main label — centered for 2-line layout */}
            <Text
              position={[0, plaqueY + 0.030, plaqueZ + 0.002]}
              fontSize={0.092}
              color="#2b3644"
              anchorX="center"
              anchorY="middle"
              maxWidth={plaqueW - 0.1}
              textAlign="center"
            >
              {'Submit artwork'}
            </Text>
            {/* Subtitle */}
            <Text
              position={[0, plaqueY - 0.070, plaqueZ + 0.002]}
              fontSize={0.042}
              color="#a8bcc8"
              anchorX="center"
              anchorY="middle"
            >
              {'tap to contribute'}
            </Text>
            {/* Invisible click surface */}
            <mesh position={[0, plaqueY, plaqueZ + 0.003]} onClick={handleSubmitClick}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </>
        ) : (
          /* ── Museum plaque (filled slot) ── */
          <>
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
              position={[0, plaqueY + titleOffsetY, plaqueZ + 0.002]}
              fontSize={0.075}
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
              position={[0, plaqueY + artistOffsetY, plaqueZ + 0.002]}
              fontSize={0.058}
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
              position={[0, plaqueY + dotsOffsetY, plaqueZ + 0.002]}
              fontSize={0.042}
              color="#a8bcc8"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.25}
            >
              {'...'}
            </Text>
            {/* Invisible click surface for the plaque */}
            <mesh position={[0, plaqueY, plaqueZ + 0.003]} onClick={handlePlaqueClick}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </>
        )}
      </group>
    );
  },
);

Frame.displayName = 'Frame';
export default Frame;
