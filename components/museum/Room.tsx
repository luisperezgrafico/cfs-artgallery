'use client';

import React, { useMemo } from 'react';
import Floor from './Floor';
import { getWallPlasterTexture, wallTextureTile } from '../../utils/wallPlasterTexture';

interface RoomProps {
  width: number;
  length: number;
  height: number;
  wallTiltAngle: number;
  wallColor?: string;
  ceilingColor?: string;
  floorColor?: string;
  trimColor?: string;
  /** Room whose finishes to use (floor, and anything else keyed by room id) */
  roomId?: string;
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
        <mesh key={x} position={[x, 0.075, 0.035]} receiveShadow>
          <boxGeometry args={[segmentWidth, 0.15, 0.05]} />
          <meshStandardMaterial color={color} metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
      {/* Cornice — flush against the ceiling, same 0.05 clearance convention as the ceiling fixtures */}
      <mesh position={[0, height - 0.05, 0.035]} receiveShadow>
        <boxGeometry args={[span, 0.1, 0.05]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.85} />
      </mesh>
    </group>
  );
};

const Room: React.FC<RoomProps> = ({
  width, length, height, wallTiltAngle = 0.15,
  wallColor    = '#1A1637',
  ceilingColor = '#130f28',
  floorColor   = '#050505',
  trimColor    = '#3b2a1e',
  roomId,
  portalGap    = 0,
}) => {
  const frontWidth     = width - 1 * (length * Math.sin(wallTiltAngle));
  const ceilingWidth   = width + 1 * (length * Math.tan(wallTiltAngle));
  const sideWallLength = length / Math.cos(wallTiltAngle);

  // Painted plaster, not a flat plane: one tile always covers the same number of
  // metres, so the grain is the same size on every wall of every room. Clones
  // share the base image, so this costs a single 256 KB texture for the gallery.
  const plaster = useMemo(() => getWallPlasterTexture(), []);
  const sideWallPlaster = useMemo(
    () => wallTextureTile(plaster, sideWallLength, height),
    [plaster, sideWallLength, height],
  );
  const endWallPlaster = useMemo(
    () => wallTextureTile(plaster, Math.max(frontWidth, ceilingWidth), height),
    [plaster, frontWidth, ceilingWidth, height],
  );

  return (
    <group>
      {/* Floor */}
      <Floor
        width={ceilingWidth}
        length={length}
        position={[0, 0, length / 2]}
        color={floorColor}
        roomId={roomId}
      />

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
        <meshStandardMaterial
          color={wallColor}
          metalness={0}
          roughness={1}
          bumpMap={sideWallPlaster}
          bumpScale={0.04}
          roughnessMap={sideWallPlaster}
        />
      </mesh>

      {/* Right Wall */}
      <mesh
        position={[width / 2, height / 2, length / 2]}
        rotation={[0, -Math.PI / 2 + wallTiltAngle, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallLength, height]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0}
          roughness={1}
          bumpMap={sideWallPlaster}
          bumpScale={0.04}
          roughnessMap={sideWallPlaster}
        />
      </mesh>

      {/* Front Wall */}
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <planeGeometry args={[frontWidth, height]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0}
          roughness={1}
          bumpMap={endWallPlaster}
          bumpScale={0.04}
          roughnessMap={endWallPlaster}
        />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, height / 2, length]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ceilingWidth, height]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0}
          roughness={1}
          bumpMap={endWallPlaster}
          bumpScale={0.04}
          roughnessMap={endWallPlaster}
        />
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
