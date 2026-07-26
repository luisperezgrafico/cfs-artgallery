'use client';

import React, { useRef, useCallback, useContext, useEffect } from 'react';
import * as THREE from 'three';
import { CameraControls, CameraControlsImpl, useDetectGPU } from '@react-three/drei';
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
const OVERVIEW_SMOOTH_TIME = 1.15;
const REST_VIEW_DURATION_MS = 1800;
const REST_SWITCH_DURATION_MS = 2600;
const REST_LOOK_DISTANCE = 4;
const REST_LOOK_SENSITIVITY = 0.003;
const REST_LOOK_MIN_PITCH = -0.45;
const REST_LOOK_MAX_PITCH = 0.45;
const CAMERA_FORWARD = new THREE.Vector3(0, 0, -1);
const DISABLED_MOUSE_BUTTONS = {
  left: CameraControlsImpl.ACTION.NONE,
  middle: CameraControlsImpl.ACTION.NONE,
  right: CameraControlsImpl.ACTION.NONE,
  wheel: CameraControlsImpl.ACTION.NONE,
};
const DISABLED_TOUCHES = {
  one: CameraControlsImpl.ACTION.NONE,
  two: CameraControlsImpl.ACTION.NONE,
  three: CameraControlsImpl.ACTION.NONE,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (t: number) => (
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
);

const quadraticBezier = (
  out: THREE.Vector3,
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
) => {
  const inverseT = 1 - t;
  out.set(
    inverseT * inverseT * start.x + 2 * inverseT * t * control.x + t * t * end.x,
    inverseT * inverseT * start.y + 2 * inverseT * t * control.y + t * t * end.y,
    inverseT * inverseT * start.z + 2 * inverseT * t * control.z + t * t * end.z,
  );
};

const getDirection = (position: THREE.Vector3, target: THREE.Vector3) => {
  const direction = target.clone().sub(position);
  if (direction.lengthSq() < 0.0001) return CAMERA_FORWARD.clone();
  return direction.normalize();
};

const CameraManager: React.FC<CameraManagerProps> = ({
  onFrameChange,
  currentFrameIndex,
  restView = null,
  frameRefs,
  imagesCount,
}) => {
  const { isMobile } = useDetectGPU();
  const cameraControlsRef = useRef<CameraControls>(null);
  const restAnimationFrameRef = useRef<number | null>(null);
  const cameraTransitionIdRef = useRef(0);
  const restLookRef = useRef({
    active: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    position: new THREE.Vector3(),
  });
  const { setZoomedFrameId } = useContext(ZoomContext);
  const { gl, viewport } = useThree();

  const cancelRestAnimation = useCallback(() => {
    if (restAnimationFrameRef.current === null) return;
    window.cancelAnimationFrame(restAnimationFrameRef.current);
    restAnimationFrameRef.current = null;
  }, []);

  const beginCameraTransition = useCallback(() => {
    cameraTransitionIdRef.current += 1;
    cancelRestAnimation();
    cameraControlsRef.current?.stop();
    return cameraTransitionIdRef.current;
  }, [cancelRestAnimation]);

  useEffect(() => cancelRestAnimation, [cancelRestAnimation]);

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

      const transitionId = beginCameraTransition();

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

      if (transitionId !== cameraTransitionIdRef.current) return;
      if (onFrameChange) onFrameChange(index);
    },
    [beginCameraTransition, frameRefs, onFrameChange, getScaleFactor, getYOffset],
  );

  const resetCamera = useCallback(async () => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    const transitionId = beginCameraTransition();

    const previousSmoothTime = controls.smoothTime;
    try {
      controls.smoothTime = OVERVIEW_SMOOTH_TIME;
      await controls.setLookAt(0, 2, 14, 0, 0, 0, true);
    } finally {
      controls.smoothTime = previousSmoothTime;
    }

    if (transitionId !== cameraTransitionIdRef.current) return;
    if (onFrameChange) onFrameChange(-1);
  }, [beginCameraTransition, onFrameChange]);

  const applyRestLook = useCallback(() => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    const look = restLookRef.current;
    const horizontal = Math.cos(look.pitch);
    const target = new THREE.Vector3(
      look.position.x + Math.sin(look.yaw) * horizontal * REST_LOOK_DISTANCE,
      look.position.y + Math.sin(look.pitch) * REST_LOOK_DISTANCE,
      look.position.z + Math.cos(look.yaw) * horizontal * REST_LOOK_DISTANCE,
    );

    controls.setLookAt(
      look.position.x,
      look.position.y,
      look.position.z,
      target.x,
      target.y,
      target.z,
      false,
    );
  }, []);

  const syncRestLook = useCallback((viewpoint: RestViewpoint) => {
    const position = new THREE.Vector3(...viewpoint.position);
    const target = new THREE.Vector3(...viewpoint.target);
    const direction = target.clone().sub(position).normalize();

    restLookRef.current.position.copy(position);
    restLookRef.current.yaw = Math.atan2(direction.x, direction.z);
    restLookRef.current.pitch = clamp(
      Math.asin(clamp(direction.y, -1, 1)),
      REST_LOOK_MIN_PITCH,
      REST_LOOK_MAX_PITCH,
    );
  }, []);

  const moveToRestView = useCallback((viewpoint: RestViewpoint) => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    const transitionId = beginCameraTransition();
    setZoomedFrameId(null);
    syncRestLook(viewpoint);

    const startPosition = controls.getPosition(new THREE.Vector3(), false);
    const startTarget = controls.getTarget(new THREE.Vector3(), false);
    const endPosition = new THREE.Vector3(...viewpoint.position);
    const endTarget = new THREE.Vector3(...viewpoint.target);
    const isBenchSwitch = (
      Math.abs(startPosition.y - endPosition.y) < 0.25
      && Math.abs(startPosition.z - endPosition.z) < 0.75
      && Math.abs(startPosition.x - endPosition.x) > 1
    );
    const duration = isBenchSwitch ? REST_SWITCH_DURATION_MS : REST_VIEW_DURATION_MS;
    const positionControl = new THREE.Vector3(
      clamp((startPosition.x + endPosition.x) * 0.2, -0.7, 0.7),
      Math.max(startPosition.y, endPosition.y, 1.45),
      (startPosition.z + endPosition.z) / 2,
    );
    const startDirection = getDirection(startPosition, startTarget);
    const endDirection = getDirection(endPosition, endTarget);
    const startQuaternion = new THREE.Quaternion().setFromUnitVectors(CAMERA_FORWARD, startDirection);
    const endQuaternion = new THREE.Quaternion().setFromUnitVectors(CAMERA_FORWARD, endDirection);
    const quaternion = new THREE.Quaternion();
    const direction = new THREE.Vector3();
    const position = new THREE.Vector3();
    const target = new THREE.Vector3();
    const startedAt = window.performance.now();

    const step = (now: number) => {
      if (transitionId !== cameraTransitionIdRef.current) return;

      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeInOutCubic(progress);

      quadraticBezier(position, startPosition, positionControl, endPosition, eased);
      quaternion.slerpQuaternions(startQuaternion, endQuaternion, eased);
      direction.copy(CAMERA_FORWARD).applyQuaternion(quaternion).normalize();
      target.copy(position).addScaledVector(direction, REST_LOOK_DISTANCE);
      controls.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        false,
      );

      if (progress < 1) {
        restAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      restAnimationFrameRef.current = null;
      applyRestLook();
    };

    restAnimationFrameRef.current = window.requestAnimationFrame(step);
  }, [applyRestLook, beginCameraTransition, setZoomedFrameId, syncRestLook]);

  useEffect(() => {
    if (!restView) return;

    const element = gl.domElement;
    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'none';

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      restLookRef.current.active = true;
      restLookRef.current.pointerId = e.pointerId;
      restLookRef.current.lastX = e.clientX;
      restLookRef.current.lastY = e.clientY;
      if (!element.hasPointerCapture(e.pointerId)) {
        element.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const look = restLookRef.current;
      if (!look.active || look.pointerId !== e.pointerId) return;

      e.preventDefault();
      const dx = e.clientX - look.lastX;
      const dy = e.clientY - look.lastY;
      look.lastX = e.clientX;
      look.lastY = e.clientY;
      look.yaw -= dx * REST_LOOK_SENSITIVITY;
      look.pitch = clamp(
        look.pitch - dy * REST_LOOK_SENSITIVITY,
        REST_LOOK_MIN_PITCH,
        REST_LOOK_MAX_PITCH,
      );
      applyRestLook();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const look = restLookRef.current;
      if (look.pointerId !== e.pointerId) return;
      look.active = false;
      look.pointerId = null;
      if (element.hasPointerCapture(e.pointerId)) {
        element.releasePointerCapture(e.pointerId);
      }
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.style.touchAction = previousTouchAction;
      restLookRef.current.active = false;
      restLookRef.current.pointerId = null;
    };
  }, [applyRestLook, gl.domElement, restView]);

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
      mouseButtons={DISABLED_MOUSE_BUTTONS}
      touches={DISABLED_TOUCHES}
    />
  );
};

export { CameraManager, type CameraManagerProps };
