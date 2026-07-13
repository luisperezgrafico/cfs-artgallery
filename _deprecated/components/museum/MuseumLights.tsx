'use client';

import type { RoomDimensions } from './framePositioning';

interface Props {
  dimensions: RoomDimensions;
}

export function MuseumLights({ dimensions }: Props) {
  const { width, length, height } = dimensions;
  const cy = height - 0.3;

  // Point lights spread across ceiling + mid-height fill lights near side walls
  const points: [number, number, number][] = [
    // Ceiling row
    [ 0,           cy, length * 0.12],
    [-width * 0.35, cy, length * 0.25],
    [ width * 0.35, cy, length * 0.25],
    [-width * 0.35, cy, length * 0.55],
    [ width * 0.35, cy, length * 0.55],
    [ 0,           cy, length * 0.40],
    // Mid-height fill lights close to each side wall to ensure artwork visibility
    [-width * 0.1, height * 0.45, length * 0.18],
    [ width * 0.1, height * 0.45, length * 0.18],
    [-width * 0.1, height * 0.45, length * 0.48],
    [ width * 0.1, height * 0.45, length * 0.48],
  ];

  return (
    <>
      <ambientLight intensity={0.55} color="#e8e0d8" />
      {points.map(([x, y, z], i) => (
        <pointLight
          key={i}
          position={[x, y, z]}
          intensity={3.5}
          distance={12}
          decay={2}
          color="#fff5e8"
          castShadow={i < 2}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.001}
        />
      ))}
    </>
  );
}
