'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Decoration for the wall behind the visitor (z = length).
 *
 * Every artwork, spotlight and ceiling fixture lives in the front two thirds of
 * the room, so from a bench the 180° turn used to land on a bare, unlit plane.
 * This is a closed entrance portal — the door the visitor "came in" through —
 * plus two pilasters, two sconces and a soft wall wash. Purely decorative: it is
 * never clickable and never animated.
 */

/** Outer width of the door frame — the gap the back baseboard leaves for it. */
export const PORTAL_OUTER_WIDTH = 2.6;

interface WallWashProps {
  position: [number, number, number];
  target: [number, number, number];
  color: string;
}

/** A bare spotlight (no housing) grazing the wall from just under the ceiling. */
const WallWash: React.FC<WallWashProps> = ({ position, target, color }) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <object3D ref={targetRef} position={target} />
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={25}
        angle={0.6}
        penumbra={1}
        decay={2}
        distance={12}
        castShadow={false}
      />
    </>
  );
};

interface EntranceWallProps {
  /** Room depth — the wall sits at z = length */
  length: number;
  trimColor?: string;
  doorColor?: string;
  glowColor?: string;
}

const EntranceWall: React.FC<EntranceWallProps> = ({
  length,
  trimColor = '#3b2a1e',
  doorColor = '#241610',
  glowColor = '#f0e199',
}) => {
  // Same transform as the back wall in Room.tsx: local +Z points into the room,
  // so every offset below is "how far this part stands off the wall".
  return (
    <group position={[0, 0, length]} rotation={[0, Math.PI, 0]}>
      {/* Left door leaf */}
      <mesh position={[-0.55, 1.38, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 2.75, 0.08]} />
        <meshStandardMaterial color={doorColor} roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Right door leaf */}
      <mesh position={[0.55, 1.38, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 2.75, 0.08]} />
        <meshStandardMaterial color={doorColor} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Door panels — four shallow insets that break up the flat leaves */}
      {[-0.55, 0.55].map((x) =>
        [0.78, 2.02].map((y) => (
          <mesh key={`${x}:${y}`} position={[x, y, 0.25]} receiveShadow>
            <boxGeometry args={[0.72, 0.9, 0.02]} />
            <meshStandardMaterial color={trimColor} roughness={0.85} metalness={0.05} />
          </mesh>
        )),
      )}

      {/* Handles */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 1.35, 0.26]}>
          <cylinderGeometry args={[0.02, 0.02, 0.14, 12]} />
          <meshStandardMaterial color="#7a6748" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}

      {/* Door jambs */}
      {[-1.19, 1.19].map((x) => (
        <mesh key={x} position={[x, 1.5, 0.14]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 3.0, 0.16]} />
          <meshStandardMaterial color={trimColor} roughness={0.8} metalness={0.05} />
        </mesh>
      ))}
      {/* Lintel */}
      <mesh position={[0, 2.91, 0.14]} castShadow receiveShadow>
        <boxGeometry args={[2.56, 0.18, 0.16]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Transom — a warm sliver that reads as light on the other side */}
      <mesh position={[0, 3.06, 0.07]}>
        <planeGeometry args={[2.2, 0.18]} />
        <meshBasicMaterial color={glowColor} toneMapped={false} />
      </mesh>

      {/* Pilasters flanking the portal */}
      {[-2.1, 2.1].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* Shaft */}
          <mesh position={[0, 1.85, 0.09]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 3.4, 0.18]} />
            <meshStandardMaterial color={trimColor} roughness={0.85} metalness={0.05} />
          </mesh>
          {/* Base */}
          <mesh position={[0, 0.08, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.16, 0.24]} />
            <meshStandardMaterial color={trimColor} roughness={0.85} metalness={0.05} />
          </mesh>
          {/* Capital */}
          <mesh position={[0, 3.62, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.14, 0.24]} />
            <meshStandardMaterial color={trimColor} roughness={0.85} metalness={0.05} />
          </mesh>
        </group>
      ))}

      {/* Sconces */}
      {[-3.4, 3.4].map((x) => (
        <group key={x} position={[x, 2.35, 0]}>
          {/* Housing */}
          <mesh position={[0, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.28, 12]} />
            <meshStandardMaterial color="#444" roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Lens */}
          <mesh position={[0, 0, 0.22]}>
            <planeGeometry args={[0.14, 0.24]} />
            <meshBasicMaterial color={glowColor} toneMapped={false} />
          </mesh>
          <pointLight
            position={[0, 0, 0.3]}
            color={glowColor}
            intensity={6}
            distance={7}
            decay={2}
            castShadow={false}
          />
        </group>
      ))}

      {/* Wall wash — keeps the plane from reading as a black void */}
      <WallWash position={[-2.4, 3.9, 1.8]} target={[-2.4, 1.6, 0.05]} color={glowColor} />
      <WallWash position={[2.4, 3.9, 1.8]} target={[2.4, 1.6, 0.05]} color={glowColor} />
    </group>
  );
};

export default EntranceWall;
