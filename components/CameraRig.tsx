'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import type { Viewpoint } from '@/lib/gallery';

const SMOOTH_POS = 0.52;
const SMOOTH_ROT = 0.38;
const SETTLE_DIST = 0.022;
const SETTLE_ANGLE = 0.006; // radians

export function CameraRig({
  viewpoint,
  snap,
  onSettled,
}: {
  viewpoint: Viewpoint;
  snap: boolean;
  onSettled: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  // Keep a ref so useFrame always calls the latest onSettled without re-registering.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  // Scratch object used to compute target quaternion from current position → look target
  const helper = useRef(new THREE.Object3D());
  const targetPos = useRef(new THREE.Vector3(...viewpoint.position));
  const targetQuat = useRef(new THREE.Quaternion());
  const initialized = useRef(false);
  const isMoving = useRef(false);

  const computeQuat = (fromPos: THREE.Vector3, look: [number, number, number]) => {
    helper.current.position.copy(fromPos);
    helper.current.lookAt(look[0], look[1], look[2]);
    return helper.current.quaternion.clone();
  };

  useEffect(() => {
    targetPos.current.set(...viewpoint.position);
    targetQuat.current.copy(
      computeQuat(targetPos.current, viewpoint.look),
    );

    if (!initialized.current || snap) {
      camera.position.copy(targetPos.current);
      camera.quaternion.copy(targetQuat.current);
      initialized.current = true;
      isMoving.current = false;
      invalidate();
      return;
    }
    isMoving.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewpoint, snap, camera, invalidate]);

  useFrame((_, rawDt) => {
    if (!isMoving.current) return;
    const dt = Math.min(rawDt, 0.05);

    // Smooth-damp position
    easing.damp3(camera.position, viewpoint.position, SMOOTH_POS, dt);

    // Compute target quaternion FROM CURRENT POSITION toward the look target.
    // This prevents the "ceiling glitch": the camera always rotates toward the
    // correct destination, never swinging through the ceiling during a transit.
    helper.current.position.copy(camera.position);
    helper.current.lookAt(viewpoint.look[0], viewpoint.look[1], viewpoint.look[2]);
    easing.dampQ(camera.quaternion, helper.current.quaternion, SMOOTH_ROT, dt);

    const posSettled = camera.position.distanceTo(targetPos.current) < SETTLE_DIST;
    const rotSettled = camera.quaternion.angleTo(targetQuat.current) < SETTLE_ANGLE;

    if (posSettled && rotSettled) {
      camera.position.copy(targetPos.current);
      camera.quaternion.copy(targetQuat.current);
      isMoving.current = false;
      onSettledRef.current();
    }
  });

  return null;
}
