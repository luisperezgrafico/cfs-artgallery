'use client';

import React, { useRef, useCallback, useContext, useEffect } from 'react';
import * as THREE from 'three';
import { CameraControls, useDetectGPU } from '@react-three/drei';
import { ZoomContext } from '../../contexts/ZoomContext';
import { useThree } from '@react-three/fiber';
import { RestViewpoint } from '../../types/museum';

interface CameraManagerProps {
  onFrameChange?: (index: number) => void;
  currentFrameIndex: number;
  restView?: RestViewpoint | null;
  frameRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
  imagesCount: number;
}

const CAMERA_SMOOTH_TIME = 0.85;
const REST_TRAVEL_SMOOTH_TIME = 1.35;
const REST_SETTLE_SMOOTH_TIME = 1.1;
const OVERVIEW_SMOOTH_TIME = 1.15;

const CameraManager: React.FC<CameraManagerProps> = ({
  onFrameChange,
  currentFrameIndex,
  restView = null,
  frameRefs,
  imagesCount,
}) => {
  const { isMobile } = useDetectGPU();
  const cameraControlsRef = useRef<CameraControls>(null);
  const { setZoomedFrameId } = useContext(ZoomContext);
  const { viewport } = useThree();

  useEffect(() => {
    if (currentFrameIndex >= 0) {
      setZoomedFrameId(currentFrameIndex);
    } else {
      setZoomedFrameId(null);
    }
  }, [currentFrameIndex, setZoomedFrameId]);

  const getScaleFactor = useCallback(() => {
    const baseScale = 2.5;
    const isLandscape = viewport.width > viewport.height;
    if (isMobile) {
      if (isLandscape) return 3.0;
      if (viewport.width < 2) return 6.5;
      if (viewport.width < 4) return 5;
      return 4.5;
    }
    const aspectRatio = viewport.width / viewport.height;
    if (aspectRatio > 2) return baseScale * 1.2;
    return baseScale;
  }, [isMobile, viewport.width, viewport.height]);

  const getYOffset = useCallback(() => {
    if (isMobile) {
      if (viewport.width < 2) return 0.4;
      if (viewport.width < 4) return 0.35;
      return 0.3;
    }
    return 0.1;
  }, [isMobile, viewport.width]);

  const zoomToFrame = useCallback(
    async (index: number) => {
      if (!cameraControlsRef.current) return;
      const mesh = frameRefs.current[index];
      if (!mesh) return;

      const frameWorldPosition = new THREE.Vector3();
      mesh.getWorldPosition(frameWorldPosition);

      const localFrontPoint = new THREE.Vector3(0, 0, 1);
      const worldFrontPoint = localFrontPoint.clone();
      mesh.localToWorld(worldFrontPoint);

      const frontDirection = worldFrontPoint.clone().sub(frameWorldPosition).normalize();
      frontDirection.multiplyScalar(getScaleFactor());

      const targetPosition = frameWorldPosition.clone().add(frontDirection);

      await cameraControlsRef.current.setLookAt(
        targetPosition.x,
        targetPosition.y - getYOffset(),
        targetPosition.z,
        frameWorldPosition.x,
        frameWorldPosition.y - getYOffset(),
        frameWorldPosition.z,
        true,
      );

      if (onFrameChange) onFrameChange(index);
    },
    [frameRefs, onFrameChange, getScaleFactor, getYOffset],
  );

  const resetCamera = useCallback(async () => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    const previousSmoothTime = controls.smoothTime;
    try {
      controls.smoothTime = OVERVIEW_SMOOTH_TIME;
      await controls.setLookAt(0, 2, 14, 0, 0, 0, true);
    } finally {
      controls.smoothTime = previousSmoothTime;
    }

    if (onFrameChange) onFrameChange(-1);
  }, [onFrameChange]);

  const moveToRestView = useCallback(async (viewpoint: RestViewpoint) => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    setZoomedFrameId(null);

    const previousSmoothTime = controls.smoothTime;
    const approachPosition: [number, number, number] = [
      viewpoint.position[0],
      viewpoint.position[1] + 0.4,
      viewpoint.position[2] + 0.75,
    ];

    try {
      controls.smoothTime = REST_TRAVEL_SMOOTH_TIME;
      await controls.setPosition(
        approachPosition[0],
        approachPosition[1],
        approachPosition[2],
        true,
      );

      controls.smoothTime = REST_SETTLE_SMOOTH_TIME;
      await controls.setLookAt(
        viewpoint.position[0],
        viewpoint.position[1],
        viewpoint.position[2],
        viewpoint.target[0],
        viewpoint.target[1],
        viewpoint.target[2],
        true,
      );
    } finally {
      controls.smoothTime = previousSmoothTime;
    }
  }, [setZoomedFrameId]);

  useEffect(() => {
    if (restView) {
      moveToRestView(restView);
    } else if (currentFrameIndex >= 0 && currentFrameIndex < imagesCount) {
      zoomToFrame(currentFrameIndex);
    } else if (currentFrameIndex === -1) {
      resetCamera();
    }
  }, [currentFrameIndex, imagesCount, restView, zoomToFrame, resetCamera, moveToRestView]);

  return (
    <CameraControls
      ref={cameraControlsRef}
      smoothTime={CAMERA_SMOOTH_TIME}
      mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
      touches={{ one: 0, two: 0, three: 0 }}
    />
  );
};

export { CameraManager, type CameraManagerProps };
