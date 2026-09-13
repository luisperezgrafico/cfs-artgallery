'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { Mesh } from 'three';
import { adaptImportedFrameGeometry } from '@/utils/importedFrame';

const ASSET_URL = '/models/frames/fancy-picture-frame-01.glb';

export default function ImportedFrame({ width, height }: { width: number; height: number }) {
  const gltf = useGLTF(ASSET_URL);
  const source = useMemo(() => {
    let mesh: Mesh | undefined;
    gltf.scene.traverse((object) => {
      if (!mesh && object instanceof Mesh) mesh = object;
    });
    if (!mesh) throw new Error('Imported frame asset has no mesh.');
    return mesh;
  }, [gltf]);
  const geometry = useMemo(() => adaptImportedFrameGeometry(source.geometry, width, height), [source, width, height]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Cache-owned material/textures must survive room unmounts. Geometry is disposed above.
  return <mesh geometry={geometry} material={source.material} dispose={null} castShadow receiveShadow />;
}
