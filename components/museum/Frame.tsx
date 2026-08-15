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
  roomId?: string;
  onFrameClick?: (index: number) => void;
}

// Tiny 1×1 white PNG used as placeholder URL so useTexture always gets a valid string
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PLAQUE_TEXTURE_WIDTH = 768;
// Height (and the font sizes/baselines below) scaled up ~20% from the
// original 240 for legibility — width stays put so the text-fitting/
// maxTextWidth math is unaffected.
const PLAQUE_TEXTURE_HEIGHT = 288;
const PLAQUE_FONT_STACK = 'Inter, "Segoe UI", Arial, sans-serif';

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

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  fontSize: number,
  fontWeight: number,
  color: string,
  maxWidth: number,
) {
  let size = fontSize;
  do {
    ctx.font = `${fontWeight} ${size}px ${PLAQUE_FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth || size <= 20) break;
    size -= 1;
  } while (size > 20);

  ctx.fillStyle = color;
  ctx.fillText(text, PLAQUE_TEXTURE_WIDTH / 2, y);
}

function createPlaqueTexture({
  title,
  subtitle,
  footer,
  isSubmit,
}: {
  title: string;
  subtitle: string;
  footer?: string;
  isSubmit: boolean;
}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = PLAQUE_TEXTURE_WIDTH;
  canvas.height = PLAQUE_TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const maxTextWidth = PLAQUE_TEXTURE_WIDTH - 96;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ede6d8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(184, 168, 144, 0.35)';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, canvas.width - 5, canvas.height - 5);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isSubmit) {
    drawFittedText(ctx, title, 106, 82, 600, '#2b3644', maxTextWidth);
    drawFittedText(ctx, subtitle, 192, 58, 500, '#637687', maxTextWidth);
  } else {
    drawFittedText(ctx, title, 98, 86, 600, '#2b3644', maxTextWidth);
    drawFittedText(ctx, subtitle, 175, 67, 500, '#5a6878', maxTextWidth);
    if (footer) {
      drawFittedText(ctx, footer, 245, 53, 500, '#7d8f9f', maxTextWidth);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return tex;
}

const Frame = forwardRef<THREE.Mesh, FrameProps>(
  ({ position, rotation, image, index, roomId, onFrameClick }, ref) => {
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
    const plaqueH = 0.34;
    const plaqueY = -(frameBottom + plaqueH / 2 + 0.18);
    const plaqueZ = -0.03;
    const artistLine = [image.artist, image.date].filter(Boolean).join(' · ');
    const plaqueTexture = useMemo(
      () => createPlaqueTexture({
        title: image.isEmpty ? 'Submit Your Artwork' : image.title,
        subtitle: image.isEmpty ? 'Tap to Contribute' : artistLine,
        footer: undefined,
        isSubmit: Boolean(image.isEmpty),
      }),
      [artistLine, image.isEmpty, image.title],
    );

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
        new CustomEvent('open-submit-artwork', { detail: { x, y, roomId, slot: index } }),
      );
    };

    useEffect(() => {
      return () => { plaqueTexture.dispose(); };
    }, [plaqueTexture]);

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
            {/* Plaque texture — stable raster text avoids SDF weight shifts at distance */}
            <mesh position={[0, plaqueY, plaqueZ]}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial map={plaqueTexture} transparent opacity={0.96} toneMapped={false} />
            </mesh>
            {/* Shadow border — same as filled plaque */}
            <mesh position={[0, plaqueY, plaqueZ - 0.001]}>
              <planeGeometry args={[plaqueW + 0.02, plaqueH + 0.02]} />
              <meshBasicMaterial color="#b8a890" transparent opacity={0.35} />
            </mesh>
            {/* Invisible click surface */}
            <mesh position={[0, plaqueY, plaqueZ + 0.003]} onClick={handleSubmitClick}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </>
        ) : (
          /* ── Museum plaque (filled slot) ── */
          <>
            {/* Plaque texture — stable raster text avoids SDF weight shifts at distance */}
            <mesh position={[0, plaqueY, plaqueZ]}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial map={plaqueTexture} transparent opacity={0.96} toneMapped={false} />
            </mesh>
            {/* Subtle shadow border */}
            <mesh position={[0, plaqueY, plaqueZ - 0.001]}>
              <planeGeometry args={[plaqueW + 0.02, plaqueH + 0.02]} />
              <meshBasicMaterial color="#b8a890" transparent opacity={0.35} />
            </mesh>
            {/* Invisible click surface for the plaque */}
            <mesh position={[0, plaqueY, plaqueZ + 0.003]} onClick={handlePlaqueClick}>
              <planeGeometry args={[plaqueW, plaqueH]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </>
        )}
      </group>
    );
  },
);

Frame.displayName = 'Frame';
export default Frame;
