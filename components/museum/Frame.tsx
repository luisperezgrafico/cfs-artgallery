'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { useTexture, Text, Html } from '@react-three/drei';
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

    // Bottom edge of the frame box
    const frameBottom = (height + 0.1) / 2;

    return (
      <group position={position} rotation={rotation}>
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

        {/* Museum plaque — DOM overlay positioned below the frame */}
        <Html
          center
          position={[0, -(frameBottom + 0.18), 0.06]}
          zIndexRange={[10, 20]}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent('open-artwork-info', {
                detail: {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                },
              }));
            }}
            style={{
              background: 'rgba(238, 230, 215, 0.94)',
              border: '1px solid rgba(175, 160, 138, 0.45)',
              borderRadius: '3px',
              padding: '7px 16px 9px',
              cursor: 'pointer',
              minWidth: '108px',
              maxWidth: '200px',
              textAlign: 'center',
              userSelect: 'none',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 1px 10px rgba(0,0,0,0.14)',
              whiteSpace: 'nowrap',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#2b3644', lineHeight: 1.3, margin: 0 }}>
              {image.title}
            </p>
            <p style={{ fontSize: '10px', color: '#5a6878', margin: '2px 0 0', lineHeight: 1.2 }}>
              {image.artist}
              {image.date ? <span style={{ color: '#8a9aa8' }}>{` · ${image.date}`}</span> : null}
            </p>
            <p style={{ fontSize: '8px', color: '#a0b0bc', margin: '6px 0 0', letterSpacing: '0.16em' }}>
              · · ·
            </p>
          </div>
        </Html>
      </group>
    );
  },
);

Frame.displayName = 'Frame';
export default Frame;
