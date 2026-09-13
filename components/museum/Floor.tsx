'use client';

import { MeshReflectorMaterial, useDetectGPU } from '@react-three/drei';
import React from 'react';
import * as THREE from 'three';
import { floorDesignForRoom, floorMaterialProps, resolveFloorColor } from '../../utils/floorDesign';
import { createFloorPatternTexture, floorPatternForRoom, type FloorPattern } from '../../utils/floorPattern';

interface FloorProps {
  width: number;
  length: number;
  position: [number, number, number];
  color?: string;
  /** Room whose finish to lay down. Unknown or absent falls back to Room I. */
  roomId?: string;
}

/** How far the overlay layer floats above the reflector, in metres. */
const PATTERN_LIFT = 0.004;

/**
 * Loads an imported pattern photograph. Deliberately not drei's `useTexture`:
 * this is a preview path and it must not suspend the whole scene to fetch an
 * optional image — a failure simply leaves the room with its own floor.
 */
function usePatternPhoto(file?: string): THREE.Texture | null {
  const [photo, setPhoto] = React.useState<THREE.Texture | null>(null);
  const loaded = React.useRef<THREE.Texture | null>(null);

  React.useEffect(() => {
    if (!file) return;
    let alive = true;
    new THREE.TextureLoader().load(
      file,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
        loaded.current = texture;
        if (alive) setPhoto(texture);
      },
      undefined,
      () => { if (alive) setPhoto(null); },
    );
    return () => {
      alive = false;
      loaded.current?.dispose();
      loaded.current = null;
      setPhoto(null);
    };
  }, [file]);

  return photo;
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
  const baseColor = resolveFloorColor(color, design);

  // `?floor=<key>` previews a pattern, and only in the room it was designed for.
  // Every ordinary visit resolves to null or the room's own stone. See
  // `utils/floorPattern.ts` for the two techniques.
  const pattern = React.useMemo(
    () => floorPatternForRoom(typeof window === 'undefined' ? null : window.location.search, roomId),
    [roomId],
  );

  const imported = pattern?.source === 'imported' ? pattern.file : undefined;
  const photo = usePatternPhoto(imported);
  React.useEffect(() => {
    if (photo && pattern) photo.repeat.set(width / pattern.tile, length / pattern.tile);
  }, [photo, pattern, width, length]);

  const patterned = React.useMemo(() => {
    if (!pattern || pattern.source === 'imported') return null;
    const built = createFloorPatternTexture(pattern);
    built.texture.repeat.set(width / pattern.tile, length / pattern.tile);
    return built;
  }, [pattern, width, length]);
  React.useEffect(() => () => { patterned?.texture.dispose(); }, [patterned]);

  // A map on this material is not paint: it scales the floor colour *and* the
  // reflection folded into it, so the colour has to give back what the field's
  // mean takes away. See the module comment in `utils/floorPattern.ts`.
  const surfaceColor = React.useMemo(() => {
    if (!pattern || !patterned || pattern.technique !== 'albedo-map') return baseColor;
    const lifted = new THREE.Color(baseColor).multiplyScalar(pattern.gain / patterned.mean);
    return `#${lifted.getHexString()}`;
  }, [baseColor, pattern, patterned]);

  const layer = layerTexture(pattern, patterned, photo);
  const surfaceMap = pattern?.technique === 'albedo-map' ? patterned?.texture : undefined;

  return (
    <group>
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <MeshReflectorMaterial {...material} color={surfaceColor} map={surfaceMap} />
      </mesh>

      {layer && pattern && (
        <mesh
          position={[position[0], position[1] + PATTERN_LIFT, position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, length]} />
          {/* The reflector keeps its reflection; this layer only puts stone where
              the pattern sits and lets the mirror through everywhere else. Drawn
              without depth writes so it never occludes the floor. */}
          <meshStandardMaterial
            map={layer}
            color={pattern.tint}
            transparent
            opacity={pattern.opacity}
            roughness={pattern.roughness}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

/**
 * The texture the overlay layer draws with: the generated mask, or the imported
 * photograph — and nothing until the photograph has arrived.
 */
function layerTexture(
  pattern: FloorPattern | null | undefined,
  patterned: { texture: THREE.Texture } | null,
  photo: THREE.Texture | null,
): THREE.Texture | null {
  if (!pattern || pattern.technique !== 'overlay-mesh') return null;
  return pattern.source === 'imported' ? photo : patterned?.texture ?? null;
}

export default Floor;
