'use client';

import React from 'react';
import Floor from './Floor';

interface RoomProps {
  width: number;
  length: number;
  height: number;
  wallTiltAngle: number;
  wallColor?: string;
  ceilingColor?: string;
  floorColor?: string;
  trimColor?: string;
  /** Width to leave free in the middle of the back baseboard, for the entrance portal */
  portalGap?: number;
}

interface WallTrimProps {
  /** Transform of the wall this trim runs along — same values as the wall mesh */
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Length of the wall */
  span: number;
  height: number;
  color: string;
  /** Leave this much free in the middle (for a door) */
  gap?: number;
}

/**
 * Skirting + cornice along one wall. Shares the wall's own transform, so local
 * +Z is always "into the room" and a single 0.05 offset keeps it off the plane.
 */
const WallTrim: React.FC<WallTrimProps> = ({
  position, rotation = [0, 0, 0], span, height, color, gap = 0,
}) => {
  const segmentWidth = gap > 0 ? (span - gap) / 2 : span;
  const segmentOffset = gap > 0 ? (span + gap) / 4 : 0;
  const offsets = gap > 0 ? [-segmentOffset, segmentOffset] : [0];

  return (
    <group position={position} rotation={rotation}>
      {/* Skirting */}
      {offsets.map((x) => (
        <mesh key={x} position={[x, 0.075, 0.05]} receiveShadow>
          <boxGeometry args={[segmentWidth, 0.15, 0.08]} />
          <meshStandardMaterial color={color} metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
      {/* Cornice */}
      <mesh position={[0, height - 0.18, 0.05]} receiveShadow>
        <boxGeometry args={[span, 0.1, 0.08]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.85} />
      </mesh>
    </group>
  );
};

const Room: React.FC<RoomProps> = ({
  width, length, height, wallTiltAngle = 0.15,
  wallColor    = '#1A1637',
  ceilingColor = '#1a1538',
  floorColor   = '#050505',
  trimColor    = '#3b2a1e',
  portalGap    = 0,
}) => {
  const frontWidth     = width - 1 * (length * Math.sin(wallTiltAngle));
  const ceilingWidth   = width + 1 * (length * Math.tan(wallTiltAngle));
  const sideWallLength = length / Math.cos(wallTiltAngle);

  return (
    <group>
      {/* Floor */}
      <Floor width={ceilingWidth} length={length} position={[0, 0, length / 2]} color={floorColor} />

      {/* Ceiling */}
      <mesh position={[0, height, length / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ceilingWidth, length]} />
        <meshStandardMaterial color={ceilingColor} metalness={0} roughness={0.9} />
      </mesh>

      {/* Left Wall */}
      <mesh
        position={[-width / 2, height / 2, length / 2]}
        rotation={[0, Math.PI / 2 - wallTiltAngle, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallLength, height]} />
        <meshStandardMaterial color={wallColor} metalness={0} roughness={0.9} />
      </mesh>

      {/* Right Wall */}
      <mesh
        position={[width / 2, height / 2, length / 2]}
        rotation={[0, -Math.PI / 2 + wallTiltAngle, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallLength, height]} />
        <meshStandardMaterial color={wallColor} metalness={0} roughness={0.9} />
      </mesh>

      {/* Front Wall */}
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <planeGeometry args={[frontWidth, height]} />
        <meshStandardMaterial color={wallColor} metalness={0} roughness={0.75} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, height / 2, length]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ceilingWidth, height]} />
        <meshStandardMaterial color={wallColor} metalness={0} roughness={0.85} />
      </mesh>

      {/* Skirting + cornice, so the bare rear of the room still reads as a room */}
      <WallTrim
        position={[-width / 2, 0, length / 2]}
        rotation={[0, Math.PI / 2 - wallTiltAngle, 0]}
        span={sideWallLength}
        height={height}
        color={trimColor}
      />
      <WallTrim
        position={[width / 2, 0, length / 2]}
        rotation={[0, -Math.PI / 2 + wallTiltAngle, 0]}
        span={sideWallLength}
        height={height}
        color={trimColor}
      />
      <WallTrim position={[0, 0, 0]} span={frontWidth} height={height} color={trimColor} />
      <WallTrim
        position={[0, 0, length]}
        rotation={[0, Math.PI, 0]}
        span={ceilingWidth}
        height={height}
        color={trimColor}
        gap={portalGap}
      />
    </group>
  );
};

export default Room;
