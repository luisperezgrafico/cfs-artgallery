'use client';

import React from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { benchDesignForRoom } from '../../utils/benchDesign';
import { useRoom } from '../../contexts/RoomContext';
import ProceduralBench from './ProceduralBench';

/** Slack above the seat: thumbs are imprecise and a bench top is a thin edge. */
const HIT_MARGIN = 0.04;

interface BenchProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
  /** Room whose bench to build; defaults to the room on stage. */
  roomId?: string;
}

const Bench: React.FC<BenchProps> = ({ position, rotation = [0, 0, 0], onClick, roomId }) => {
  // Museum hands the room down to Frame but not to its benches, and the room is
  // already in context, so take it from there unless a caller passes one —
  // `benchDesignForRoom` still falls back to Room I for an unknown id.
  const { rooms, activeRoomIndex } = useRoom();
  const design = benchDesignForRoom(roomId ?? rooms[activeRoomIndex]?.id);

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
      <ProceduralBench design={design} />
      {/* A bench is openwork — legs, reveals, thin lips — so one invisible
          volume over the whole silhouette keeps sitting down a comfortable tap
          on a phone, in every room. */}
      <mesh position={[0, (design.seatHeight + HIT_MARGIN) / 2, 0]}>
        <boxGeometry args={[design.width, design.seatHeight + HIT_MARGIN, design.depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

export default Bench;
