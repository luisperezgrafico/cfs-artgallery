'use client';

import { MeshReflectorMaterial, useDetectGPU } from '@react-three/drei';
import React from 'react';
import { floorDesignForRoom, floorMaterialProps, resolveFloorColor } from '../../utils/floorDesign';
import { createFloorSurfaceTexture } from '../../utils/floorTexture';

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
  // Preview only: `?floor=room-2-alt-a`. It is deliberately read here, inside
  // the client-only canvas tree, so ordinary visits retain the committed floor.
  const floorPreview = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('floor');
  const design = floorDesignForRoom(roomId, floorPreview);
  const material = React.useMemo(
    () => floorMaterialProps(design, lowConfig ? 'low' : 'standard'),
    [design, lowConfig],
  );
  const surface = React.useMemo(
    () => (design.texture ? createFloorSurfaceTexture(design.texture) : null),
    [design],
  );
  React.useEffect(() => () => {
    // The map belongs to this mounted floor only. Do not leave procedural GPU
    // textures alive after a room switch.
    surface?.dispose();
  }, [surface]);

  // The floor is near-black on purpose: what the visitor sees is the room
  // coming back at it. So the matter goes *into the reflection* — the same map
  // is the height the reflector displaces the reflected image by and the relief
  // the sheen catches — and never over it. No veil layer, no darkening of the
  // base colour to compensate for one, and deliberately no `roughnessMap`: drei
  // multiplies it into the reflector's blur mix, and because that blur pass
  // attenuates, any sharper texel is a brighter texel. See utils/floorTexture.ts.
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, length]} />
      <MeshReflectorMaterial
        {...material}
        color={resolveFloorColor(color, design)}
        roughnessMap={surface ?? null}
        bumpMap={surface ?? null}
        bumpScale={surface ? design.bumpScale : 0}
        distortionMap={surface}
        distortion={surface ? design.distortion : 0}
      />
    </mesh>
  );
};

export default Floor;
