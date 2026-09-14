'use client';

import React, { useEffect, useMemo } from 'react';
import Floor from './Floor';
import { createPlasterMaterial } from '../../utils/wallPlasterShader';
import {
  CORNICE_HEIGHT,
  createCorniceGeometry,
  createSkirtingGeometry,
} from '../../utils/wallTrimProfile';

/**
 * How far the trims stand off the wall plane. The profiles are drawn from the
 * wall outwards, so this only needs to beat z-fighting against the wall itself.
 */
const WALL_CLEARANCE = 0.005;

/** Warm dark wood, used when a theme does not spell out its trims. */
const DEFAULT_SKIRTING = '#0d0b08';
const DEFAULT_CORNICE = '#171310';

interface RoomProps {
  width: number;
  length: number;
  height: number;
  wallTiltAngle: number;
  wallColor?: string;
  ceilingColor?: string;
  floorColor?: string;
  skirtingColor?: string;
  corniceColor?: string;
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
  skirtingColor: string;
  corniceColor: string;
  /** Leave this much free in the middle (for a door) */
  gap?: number;
}

/**
 * Skirting + cornice along one wall, as extruded profiles rather than boxes —
 * it is the section that reads as joinery under a spotlight (see
 * `utils/wallTrimProfile.ts`). Shares the wall's own transform, so the profile's
 * own +Z already points into the room and a small offset keeps it off the plane.
 */
const WallTrim: React.FC<WallTrimProps> = ({
  position, rotation = [0, 0, 0], span, height, skirtingColor, corniceColor, gap = 0,
}) => {
  const segmentWidth = gap > 0 ? (span - gap) / 2 : span;
  const segmentOffset = gap > 0 ? (span + gap) / 4 : 0;
  const offsets = gap > 0 ? [-segmentOffset, segmentOffset] : [0];

  const skirtingGeometry = useMemo(() => createSkirtingGeometry(segmentWidth), [segmentWidth]);
  const corniceGeometry = useMemo(() => createCorniceGeometry(span), [span]);

  // Geometries built here are handed to meshes and would otherwise leak on every
  // room change.
  useEffect(() => () => skirtingGeometry.dispose(), [skirtingGeometry]);
  useEffect(() => () => corniceGeometry.dispose(), [corniceGeometry]);

  return (
    <group position={position} rotation={rotation}>
      {/* Skirting */}
      {offsets.map((x) => (
        <mesh key={x} geometry={skirtingGeometry} position={[x, 0, WALL_CLEARANCE]} receiveShadow>
          <meshStandardMaterial color={skirtingColor} metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
      {/* Cornice — hangs to the ceiling, and runs unbroken over a doorway */}
      <mesh
        geometry={corniceGeometry}
        position={[0, height - CORNICE_HEIGHT, WALL_CLEARANCE]}
        receiveShadow
      >
        <meshStandardMaterial color={corniceColor} metalness={0.05} roughness={0.85} />
      </mesh>
    </group>
  );
};

const Room: React.FC<RoomProps> = ({
  width, length, height, wallTiltAngle = 0.15,
  wallColor    = '#1A1637',
  ceilingColor = '#130f28',
  floorColor   = '#050505',
  skirtingColor = DEFAULT_SKIRTING,
  corniceColor  = DEFAULT_CORNICE,
  roomId,
  portalGap    = 0,
}) => {
  const frontWidth     = width - 1 * (length * Math.sin(wallTiltAngle));
  const ceilingWidth   = width + 1 * (length * Math.tan(wallTiltAngle));
  const sideWallLength = length / Math.cos(wallTiltAngle);

  // Painted plaster, not a flat plane. The grain is evaluated in the shader on
  // world position, so there is no tile to repeat and the same material can be
  // shared by every wall of the room.
  const wallMaterial = useMemo(() => createPlasterMaterial(wallColor), [wallColor]);

  // The material is handed to the meshes as a prop, so React Three Fiber does not
  // own it and will not free it when the room unmounts.
  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);

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
        material={wallMaterial}
        position={[-width / 2, height / 2, length / 2]}
        rotation={[0, Math.PI / 2 - wallTiltAngle, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallLength, height]} />
      </mesh>

      {/* Right Wall */}
      <mesh
        material={wallMaterial}
        position={[width / 2, height / 2, length / 2]}
        rotation={[0, -Math.PI / 2 + wallTiltAngle, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallLength, height]} />
      </mesh>

      {/* Front Wall */}
      <mesh material={wallMaterial} position={[0, height / 2, 0]} receiveShadow>
        <planeGeometry args={[frontWidth, height]} />
      </mesh>

      {/* Back Wall */}
      <mesh
        material={wallMaterial}
        position={[0, height / 2, length]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[ceilingWidth, height]} />
      </mesh>

      {/* Skirting + cornice, so the bare rear of the room still reads as a room */}
      <WallTrim
        position={[-width / 2, 0, length / 2]}
        rotation={[0, Math.PI / 2 - wallTiltAngle, 0]}
        span={sideWallLength}
        height={height}
        skirtingColor={skirtingColor}
        corniceColor={corniceColor}
      />
      <WallTrim
        position={[width / 2, 0, length / 2]}
        rotation={[0, -Math.PI / 2 + wallTiltAngle, 0]}
        span={sideWallLength}
        height={height}
        skirtingColor={skirtingColor}
        corniceColor={corniceColor}
      />
      <WallTrim
        position={[0, 0, 0]}
        span={frontWidth}
        height={height}
        skirtingColor={skirtingColor}
        corniceColor={corniceColor}
      />
      <WallTrim
        position={[0, 0, length]}
        rotation={[0, Math.PI, 0]}
        span={ceilingWidth}
        height={height}
        skirtingColor={skirtingColor}
        corniceColor={corniceColor}
        gap={portalGap}
      />
    </group>
  );
};

export default Room;
