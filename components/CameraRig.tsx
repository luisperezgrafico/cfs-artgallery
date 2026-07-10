'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import type { Viewpoint } from '@/lib/gallery';

const SMOOTH = 0.55; // seconds-ish; higher = slower, gentler glide
const SETTLE_DIST = 0.015;

export function CameraRig({
  viewpoint,
  moving,
  snap,
  onSettled,
}: {
  viewpoint: Viewpoint;
  moving: boolean;
  snap: boolean;
  onSettled: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const look = useRef(new THREE.Vector3(...viewpoint.look));
  const target = useRef(new THREE.Vector3(...viewpoint.position));
  const initialized = useRef(false);

  useEffect(() => {
    target.current.set(...viewpoint.position);
    if (!initialized.current || snap) {
      camera.position.copy(target.current);
      look.current.set(...viewpoint.look);
      camera.lookAt(look.current);
      initialized.current = true;
      invalidate();
    }
  }, [viewpoint, snap, camera, invalidate]);

  useFrame((_, rawDt) => {
    if (!moving || snap) return;
    const dt = Math.min(rawDt, 0.05); // ignore tab-switch time jumps
    easing.damp3(camera.position, viewpoint.position, SMOOTH, dt);
    easing.damp3(look.current, viewpoint.look, SMOOTH, dt);
    camera.lookAt(look.current);
    if (camera.position.distanceTo(target.current) < SETTLE_DIST) {
      onSettled();
    }
  });

  return null;
}
