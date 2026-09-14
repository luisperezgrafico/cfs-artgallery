'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createDoorGrainTexture } from '../../utils/frameWoodTexture';

/**
 * Decoration for the wall behind the visitor (z = length).
 *
 * Every artwork, spotlight and ceiling fixture lives in the front two thirds of
 * the room, so from a bench the 180° turn used to land on a bare, unlit plane.
 * This is a closed entrance portal — the door the visitor "came in" through —
 * plus two pilasters, two sconces and a soft wall wash. Purely decorative: it is
 * never clickable and never animated.
 *
 * The portal is the museum's own joinery, not part of a room's palette: the
 * jambs, lintel, pilasters and mouldings are cream and the leaves are walnut in
 * every room (`trimColor` / `doorColor` in `config/roomsConfig.ts`, the same four
 * values on purpose). Both used to be tinted per room, which is why a door could
 * come out indigo. The grain on the leaves is the same procedural one the frames
 * use (`createDoorGrainTexture`) — boarded up the door, not along a rail — so the
 * wood needs no asset and no download.
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

/** Leaf positions and the two inset panels each one carries. */
const LEAF_X = [-0.55, 0.55];
const PANEL_Y = [0.78, 2.02];

const EntranceWall: React.FC<EntranceWallProps> = ({
  length,
  trimColor = '#ece6da',
  doorColor = '#7d5a38',
  glowColor = '#f0e199',
}) => {
  // One grain map and two shared materials for the whole portal: a dozen meshes
  // otherwise mean a dozen materials, and the drawer of the room is shared.
  const grain = useMemo(() => createDoorGrainTexture(), []);
  const joinery = useMemo(
    () => new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.8, metalness: 0.05 }),
    [trimColor],
  );
  const wood = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: doorColor, map: grain, roughness: 0.62, metalness: 0.04,
    }),
    [doorColor, grain],
  );

  // Materials handed to meshes as props are not owned by React Three Fiber, so
  // they are freed here rather than on every room change.
  useEffect(() => () => {
    joinery.dispose();
    wood.dispose();
    grain.dispose();
  }, [joinery, wood, grain]);

  // Same transform as the back wall in Room.tsx: local +Z points into the room,
  // so every offset below is "how far this part stands off the wall".
  return (
    <group position={[0, 0, length]} rotation={[0, Math.PI, 0]}>
      {/* Door leaves, boarded with the frame's own grain */}
      {LEAF_X.map((x) => (
        <mesh key={`leaf:${x}`} position={[x, 1.38, 0.2]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[1.05, 2.75, 0.08]} />
        </mesh>
      ))}

      {/* Door panels — four shallow insets that break up the flat leaves, each
          one trimmed by a cream bead so the leaf reads as a panelled door and
          not as a plank with pads on it. */}
      {LEAF_X.map((x) =>
        PANEL_Y.map((y) => (
          <group key={`panel:${x}:${y}`} position={[x, y, 0]}>
            <mesh position={[0, 0, 0.25]} material={wood} receiveShadow>
              <boxGeometry args={[0.72, 0.9, 0.02]} />
            </mesh>
            {[
              { size: [0.78, 0.03, 0.026], at: [0, 0.465, 0.245] },
              { size: [0.78, 0.03, 0.026], at: [0, -0.465, 0.245] },
              { size: [0.03, 0.96, 0.026], at: [0.375, 0, 0.245] },
              { size: [0.03, 0.96, 0.026], at: [-0.375, 0, 0.245] },
            ].map((bead, index) => (
              <mesh key={index} position={bead.at as [number, number, number]} material={joinery}>
                <boxGeometry args={bead.size as [number, number, number]} />
              </mesh>
            ))}
          </group>
        )),
      )}

      {/* Handles */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 1.35, 0.26]}>
          <cylinderGeometry args={[0.02, 0.02, 0.14, 12]} />
          <meshStandardMaterial color="#7a6748" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}

      {/* Meeting stile between the two leaves, so the pair reads as one door */}
      <mesh position={[0, 1.38, 0.19]} material={joinery} castShadow receiveShadow>
        <boxGeometry args={[0.06, 2.75, 0.10]} />
      </mesh>

      {/* Door jambs */}
      {[-1.19, 1.19].map((x) => (
        <mesh key={x} position={[x, 1.5, 0.14]} material={joinery} castShadow receiveShadow>
          <boxGeometry args={[0.18, 3.0, 0.16]} />
        </mesh>
      ))}
      {/* Lintel */}
      <mesh position={[0, 2.91, 0.14]} material={joinery} castShadow receiveShadow>
        <boxGeometry args={[2.56, 0.18, 0.16]} />
      </mesh>
      {/* Threshold — a cream sill instead of the leaves meeting the floor bare */}
      <mesh position={[0, 0.012, 0.16]} material={joinery} receiveShadow>
        <boxGeometry args={[2.5, 0.024, 0.32]} />
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
          <mesh position={[0, 1.85, 0.09]} material={joinery} castShadow receiveShadow>
            <boxGeometry args={[0.34, 3.4, 0.18]} />
          </mesh>
          {/* Base */}
          <mesh position={[0, 0.08, 0.12]} material={joinery} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.16, 0.24]} />
          </mesh>
          {/* Capital */}
          <mesh position={[0, 3.62, 0.12]} material={joinery} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.14, 0.24]} />
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
