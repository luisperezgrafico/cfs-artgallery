'use client';

import React from 'react';
import type { ThreeEvent } from '@react-three/fiber';

interface BenchProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
}

const Bench: React.FC<BenchProps> = ({ position, rotation = [0, 0, 0], onClick }) => {
  React.useEffect(() => {
    return () => {
      if (onClick) document.body.style.cursor = '';
    };
  }, [onClick]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onClick) return;
    e.stopPropagation();
    onClick();
  };

  const handlePointerOver = () => {
    if (onClick) document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    if (onClick) document.body.style.cursor = '';
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
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
