'use client';

import React from 'react';

interface FloorProps {
  width: number;
  length: number;
  position: [number, number, number];
  color?: string;
}

const Floor: React.FC<FloorProps> = ({ width, length, position, color = '#050505' }) => {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        color={color}
        metalness={0.7}
        roughness={0.25}
        envMapIntensity={0.6}
      />
    </mesh>
  );
};

export default Floor;
