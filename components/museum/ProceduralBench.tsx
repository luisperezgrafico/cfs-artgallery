'use client';

import React, { useMemo, useEffect } from 'react';
import { BenchDesign, createBenchGeometry } from '../../utils/benchDesign';
import { createFrameWoodTexture } from '../../utils/frameWoodTexture';

/**
 * A room's bench, built from its design — the seating counterpart of
 * `ProceduralFrame`, and three material ranges for the same reason: design
 * data in, geometry out, no assets.
 */
export default function ProceduralBench({ design }: { design: BenchDesign }) {
  const geometry = useMemo(() => createBenchGeometry(design), [design]);
  // Room III's bench is the same oak as its moulding, so it shares its grain.
  const woodBump = useMemo(() => design.id === 'carved-oak' ? createFrameWoodTexture() : null, [design.id]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => woodBump?.dispose(), [woodBump]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {design.materials.map((material, index) => (
        <meshStandardMaterial
          key={index}
          attach={`material-${index}`}
          color={material.color}
          bumpMap={woodBump}
          bumpScale={0.004}
          metalness={material.metalness}
          roughness={material.roughness}
        />
      ))}
    </mesh>
  );
}
