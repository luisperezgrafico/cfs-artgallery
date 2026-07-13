'use client';

import * as THREE from 'three';
import { type RoomDimensions } from './framePositioning';

const WALL_COLORS: Record<string, { walls: string; ceiling: string; floor: string }> = {
  warm: { walls: '#3a1c10', ceiling: '#2a1408', floor: '#1a0e06' },
  cool: { walls: '#0d1e30', ceiling: '#091520', floor: '#070f18' },
  dark: { walls: '#0c0c18', ceiling: '#080810', floor: '#060608' },
};

interface Props {
  dimensions: RoomDimensions;
  variant: string;
}

export function MuseumRoom({ dimensions, variant }: Props) {
  const { width, length, height, wallTiltAngle } = dimensions;
  const colors = WALL_COLORS[variant] ?? WALL_COLORS.cool;

  const frontWidth    = width + 2 - length * Math.sin(wallTiltAngle);
  const ceilingWidth  = width + 2 * (length * Math.tan(wallTiltAngle));
  const sideWallLen   = length / Math.cos(wallTiltAngle);

  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ceilingWidth, length]} />
        <meshStandardMaterial color={colors.floor} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, height, length / 2]} rotation-x={Math.PI / 2} receiveShadow>
        <planeGeometry args={[ceilingWidth, length]} />
        <meshStandardMaterial color={colors.ceiling} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall (far end — artwork wall) */}
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <planeGeometry args={[frontWidth, height]} />
        <meshStandardMaterial color={colors.walls} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh
        position={[-width / 2, height / 2, length / 2]}
        rotation-y={Math.PI / 2 - wallTiltAngle}
        receiveShadow
      >
        <planeGeometry args={[sideWallLen, height]} />
        <meshStandardMaterial color={colors.walls} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[width / 2, height / 2, length / 2]}
        rotation-y={-Math.PI / 2 + wallTiltAngle}
        receiveShadow
      >
        <planeGeometry args={[sideWallLen, height]} />
        <meshStandardMaterial color={colors.walls} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall (entrance end) */}
      <mesh position={[0, height / 2, length]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[width + 2, height]} />
        <meshStandardMaterial color={colors.walls} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
