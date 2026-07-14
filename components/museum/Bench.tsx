'use client';

import React from 'react';

interface BenchProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

const Bench: React.FC<BenchProps> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.07, 0.34]} />
        <meshStandardMaterial color="#1c120a" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Left support */}
      <mesh position={[-0.6, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.36, 0.3]} />
        <meshStandardMaterial color="#1c120a" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Right support */}
      <mesh position={[0.6, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.36, 0.3]} />
        <meshStandardMaterial color="#1c120a" roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  );
};

export default Bench;
