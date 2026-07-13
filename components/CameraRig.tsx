'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import type { Viewpoint } from '@/lib/gallery';

const SMOOTH_POS   = 0.40;
const SMOOTH_ROT   = 0.40;
const SETTLE_DIST  = 0.15;   // metres — relaxed so walk settles cleanly
const SETTLE_ANGLE = 0.03;   // radians (~1.7°)
const LOOK_SENS    = 0.0038; // radians per pixel
const MAX_PITCH    = 0.45;   // ~26°

export function CameraRig({
  viewpoint,
  snap,
  onSettled,
}: {
  viewpoint: Viewpoint;
  snap: boolean;
  onSettled: () => void;
}) {
  const camera    = useThree(s => s.camera);
  const gl        = useThree(s => s.gl);
  const invalidate = useThree(s => s.invalidate);

  // Always-current callback ref — avoids stale closure in useFrame
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  // CameraRig state
  const helper      = useRef(new THREE.Object3D());
  const targetPos   = useRef(new THREE.Vector3(...viewpoint.position));
  const targetQuat  = useRef(new THREE.Quaternion());
  const initialized = useRef(false);
  const isMoving    = useRef(false);

  // Free-look state (drag to look around)
  const lookYaw   = useRef(0);
  const lookPitch = useRef(0);

  const computeTargetQuat = (pos: THREE.Vector3, look: [number,number,number]) => {
    helper.current.position.copy(pos);
    helper.current.lookAt(look[0], look[1], look[2]);
    return helper.current.quaternion.clone();
  };

  // ── Viewpoint changes ────────────────────────────────────────────────────────
  useEffect(() => {
    targetPos.current.set(...viewpoint.position);
    targetQuat.current.copy(computeTargetQuat(targetPos.current, viewpoint.look));

    // Reset free look whenever the guided viewpoint changes
    lookYaw.current   = 0;
    lookPitch.current = 0;

    if (!initialized.current || snap) {
      camera.position.copy(targetPos.current);
      camera.quaternion.copy(targetQuat.current);
      initialized.current = true;
      isMoving.current    = false;
      invalidate();
      return;
    }
    isMoving.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewpoint, snap, camera, invalidate]);

  // ── Drag-to-look: pointer events on the canvas ───────────────────────────────
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const onDown = (e: PointerEvent) => {
      if (isMoving.current) return; // block during guided animation
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging || isMoving.current) return;
      lookYaw.current  -= (e.clientX - lastX) * LOOK_SENS;
      lookPitch.current = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, lookPitch.current - (e.clientY - lastY) * LOOK_SENS),
      );
      lastX = e.clientX;
      lastY = e.clientY;
      invalidate();
    };

    const onUp = () => { dragging = false; };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup',   onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [gl.domElement, invalidate]);

  // ── Frame loop ────────────────────────────────────────────────────────────────
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);

    if (isMoving.current) {
      // Guided animation: damp toward target position + quaternion
      easing.damp3(camera.position, viewpoint.position, SMOOTH_POS, dt);

      helper.current.position.copy(camera.position);
      helper.current.lookAt(viewpoint.look[0], viewpoint.look[1], viewpoint.look[2]);
      easing.dampQ(camera.quaternion, helper.current.quaternion, SMOOTH_ROT, dt);

      const posOK = camera.position.distanceTo(targetPos.current) < SETTLE_DIST;
      const rotOK = camera.quaternion.angleTo(targetQuat.current)  < SETTLE_ANGLE;

      if (posOK && rotOK) {
        camera.position.copy(targetPos.current);
        camera.quaternion.copy(targetQuat.current);
        isMoving.current = false;
        onSettledRef.current();
      }
      return;
    }

    // Settled: apply free-look rotation on top of the base viewpoint quaternion.
    // This runs every frame that has a look offset — zero overhead otherwise.
    if (Math.abs(lookYaw.current) < 0.0002 && Math.abs(lookPitch.current) < 0.0002) return;

    // Base quaternion: camera at its current position, looking at the viewpoint target
    helper.current.position.copy(camera.position);
    helper.current.lookAt(viewpoint.look[0], viewpoint.look[1], viewpoint.look[2]);
    const baseQ = helper.current.quaternion;

    // Yaw around world Y, pitch around camera's local X
    const yawQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), lookYaw.current,
    );
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(baseQ);
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(right, lookPitch.current);

    camera.quaternion.copy(baseQ).premultiply(yawQ).multiply(pitchQ);
  });

  return null;
}
