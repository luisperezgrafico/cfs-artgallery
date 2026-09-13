'use client';

import { MeshReflectorMaterial, useDetectGPU } from '@react-three/drei';
import React from 'react';
import { floorDesignForRoom, floorMaterialProps, resolveFloorColor } from '../../utils/floorDesign';

interface FloorProps {
  width: number;
  length: number;
  position: [number, number, number];
  color?: string;
  /** Room whose finish to lay down. Unknown or absent falls back to Room I. */
  roomId?: string;
}

const Floor: React.FC<FloorProps> = ({ width, length, position, color = '#050505', roomId }) => {
  const GPUTier = useDetectGPU();
  const lowConfig = GPUTier.isMobile || GPUTier.tier <= 2;
  // Every finish is data in `utils/floorDesign.ts`; the device only picks which
  // of its two tiers to lay down. See that file for what each value costs.
  const design = floorDesignForRoom(roomId);
  const material = React.useMemo(
    () => floorMaterialProps(design, lowConfig ? 'low' : 'standard'),
    [design, lowConfig],
  );
  const floorColor = resolveFloorColor(color, design);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, length]} />
      <MeshReflectorMaterial {...material} color={floorColor} />
    </mesh>
  );
};

export default Floor;
