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
}

const Room: React.FC<RoomProps> = ({
  width, length, height, wallTiltAngle = 0.15,
  wallColor    = '#1A1637',
  ceilingColor = '#1a1538',
  floorColor   = '#050505',
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
    </group>
  );
};

export default Room;
