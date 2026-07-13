'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import type { RoomDimensions } from './framePositioning';

const OVERVIEW_Z = 13.5;
const OVERVIEW_Y = 2.2;
const OVERVIEW_LOOK_Z = 4;

interface Props {
  frameIndex: number;    // -1 = panorama overview, 0+ = zoomed to frame N
  frameRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
  dimensions: RoomDimensions;
  animated: boolean;     // false = snap (reduced motion)
  onSettled?: () => void;
}

export function MuseumCamera({ frameIndex, frameRefs, dimensions, animated, onSettled }: Props) {
  const controlsRef = useRef<CameraControls>(null);
  const { size } = useThree();
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const getZoomDistance = useCallback(() => {
    // More distance on narrow/small screens so artwork fits in view
    const px = size.width;
    if (px < 420) return 4.8;
    if (px < 768) return 3.5;
    return 2.4;
  }, [size.width]);

  const zoomToFrame = useCallback(
    async (index: number) => {
      const ctrl = controlsRef.current;
      const mesh = frameRefs.current[index];
      if (!ctrl || !mesh) return;

      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);

      // Step out from the frame surface along its normal
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
      const camPos = worldPos.clone().addScaledVector(normal, getZoomDistance());
      const lookAt = worldPos.clone().add(new THREE.Vector3(0, -0.05, 0)); // slight downward offset

      await ctrl.setLookAt(
        camPos.x, camPos.y, camPos.z,
        lookAt.x, lookAt.y, lookAt.z,
        animated,
      );

      onSettledRef.current?.();
    },
    [frameRefs, animated, getZoomDistance],
  );

  const resetToOverview = useCallback(
    async () => {
      const ctrl = controlsRef.current;
      if (!ctrl) return;
      await ctrl.setLookAt(
        0, OVERVIEW_Y, OVERVIEW_Z,
        0, OVERVIEW_Y - 0.3, OVERVIEW_LOOK_Z,
        animated,
      );
      onSettledRef.current?.();
    },
    [animated],
  );

  // Snap to overview on first mount (no animation)
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.setLookAt(
      0, OVERVIEW_Y, OVERVIEW_Z,
      0, OVERVIEW_Y - 0.3, OVERVIEW_LOOK_Z,
      false, // always snap on mount
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (frameIndex === -1) {
      resetToOverview();
    } else if (frameIndex >= 0) {
      zoomToFrame(frameIndex);
    }
  }, [frameIndex, zoomToFrame, resetToOverview]);

  return (
    <CameraControls
      ref={controlsRef}
      // All user-driven orbit/pan disabled — camera is on rails
      mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
      touches={{ one: 0, two: 0, three: 0 }}
    />
  );
}
