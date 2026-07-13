'use client';

import { useHelper } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";

type SpotLightProps = {
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lightAngle?: number;
};

export default function SpotLight({
  height,
  position = [-2, 0, 0],
  rotation = [0, 0, 0],
  lightAngle = 0.5,
}: SpotLightProps) {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  //useHelper(spotLightRef, THREE.SpotLightHelper, "red");

  useEffect(() => {
    if (spotLightRef.current && targetRef.current) {
      spotLightRef.current.target = targetRef.current;
    }
  }, []);

  const finalPosition: [number, number, number] = [
    position[0],
    height - 0.05,
    position[2],
  ];

  return (
    <group position={finalPosition} rotation={rotation}>
      <mesh position={[0, -0.1, 0.01]} rotation={[-Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.2, 16]} />
        <meshStandardMaterial color="#444" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 16]} />
        <meshStandardMaterial color="#444" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.17, 0.08]} rotation={[-Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 16]} />
        <meshBasicMaterial color="#f0e199" />
      </mesh>

      <object3D ref={targetRef} position={[0, -5, 5]} />

      <spotLight
        ref={spotLightRef}
        position={[0, -0.2, 0.07]}
        intensity={80}
        angle={lightAngle}
        penumbra={1}
        decay={2}
        distance={20}
        castShadow
      />
    </group>
  );
}
