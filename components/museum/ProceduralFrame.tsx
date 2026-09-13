'use client';

import React, { useMemo, useEffect } from 'react';
import { createFrameGeometry, FrameDesign } from '../../utils/frameDesign';
import { createFrameWoodTexture } from '../../utils/frameWoodTexture';

/** Static, mitred moulding; three material ranges irrespective of profile detail. */
export default function ProceduralFrame({ width, height, design }: {
  width: number;
  height: number;
  design: FrameDesign;
}) {
  const geometry = useMemo(() => createFrameGeometry(width, height, design.profile), [width, height, design]);
  const woodBump = useMemo(() => design.id === 'carved-oak' ? createFrameWoodTexture() : null, [design.id]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => woodBump?.dispose(), [woodBump]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {design.colors.map((color, index) => (
        <meshStandardMaterial
          key={index}
          attach={`material-${index}`}
          color={color}
          bumpMap={woodBump}
          bumpScale={0.004}
          metalness={index === 2 ? 0 : design.metalness}
          roughness={index === 2 ? .85 : design.roughness}
        />
      ))}
    </mesh>
  );
}
