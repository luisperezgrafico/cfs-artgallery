'use client';

import React, { useRef, useCallback, useContext, useEffect } from 'react';
import * as THREE from 'three';
import { CameraControls, CameraControlsImpl, useDetectGPU } from '@react-three/drei';
import { ZoomContext } from '../../contexts/ZoomContext';
import { useThree } from '@react-three/fiber';
import { RestViewpoint } from '../../types/museum';

interface CameraManagerProps {
  onFrameChange?: (index: number) => void;
  /** Called once the camera has actually finished arriving at a bench, not when it was merely told to. */
  onRestArrival?: () => void;
  currentFrameIndex: number;
  restView?: RestViewpoint | null;
  frameRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
  imagesCount: number;
  /** Bumped after a room's frames have mounted, so an initial tour target is not missed. */
  targetRevision?: number;
}

// CameraControls reaches its target in roughly the same time regardless of
// distance. Scale its smoothing for longer moves so skipping across empty
// frames does not make the gallery suddenly feel fast or frantic.
const CAMERA_SMOOTH_TIME = 0.95;
const MAX_TRAVEL_SMOOTH_TIME = 2.1;
const SMOOTH_TIME_PER_WORLD_UNIT = 0.095;
const MAX_CAMERA_SPEED = 5.5;
const REST_VIEW_DURATION_MS = 4200;
const REST_SWITCH_DURATION_MS = 5800;
const REST_LOOK_SENSITIVITY = 0.003;
const REST_LOOK_MIN_PITCH = -0.45;
const REST_LOOK_MAX_PITCH = 0.45;
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

function smoothTimeForTravel(
  controls: CameraControls,
  endPosition: THREE.Vector3,
  endTarget: THREE.Vector3,
): number {
  const position = controls.getPosition(new THREE.Vector3(), false);
  const target = controls.getTarget(new THREE.Vector3(), false);
  const travel = Math.max(position.distanceTo(endPosition), target.distanceTo(endTarget));
  return clamp(
    CAMERA_SMOOTH_TIME + travel * SMOOTH_TIME_PER_WORLD_UNIT,
    CAMERA_SMOOTH_TIME,
    MAX_TRAVEL_SMOOTH_TIME,
  );
}

const CameraManager: React.FC<CameraManagerProps> = ({
  onFrameChange,
  onRestArrival,
  currentFrameIndex,
  restView = null,
  frameRefs,
  imagesCount,
  targetRevision = 0,
}) => {
  const { isMobile } = useDetectGPU();
  const cameraControlsRef = useRef<CameraControls>(null);
  const restAnimationFrameRef = useRef<number | null>(null);
  const cameraTransitionIdRef = useRef(0);
  // While the camera is still animating toward a bench, pointer drags must
  // not drive free look too — the two would fight over the same
  // controls.setLookAt call every frame, producing the jittery "still moving
  // in on its own while I'm dragging" conflict. Gate input until the arrival
  // animation actually finishes.
  const restLookEnabledRef = useRef(false);
  const restLookRef = useRef({
    active: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    distance: 4,
    position: new THREE.Vector3(),
  });
  const { setZoomedFrameId } = useContext(ZoomContext);
  const { gl, viewport } = useThree();

  // Remembers the rest viewpoint we were just sitting at, across the render
  // where restView clears — so the very next transition (to a frame or the
  // overview) knows it is leaving a bench and needs the same wall-avoiding
  // arc used to arrive at one, instead of CameraControls' own interpolation.
  const previousRestViewRef = useRef<RestViewpoint | null>(null);

  const cancelRestAnimation = useCallback(() => {
    if (restAnimationFrameRef.current === null) return;
    window.cancelAnimationFrame(restAnimationFrameRef.current);
    restAnimationFrameRef.current = null;
  }, []);

  const beginCameraTransition = useCallback((stopActiveTransition = false) => {
    cameraTransitionIdRef.current += 1;
    cancelRestAnimation();
    if (stopActiveTransition) cameraControlsRef.current?.stop();
    return cameraTransitionIdRef.current;
  }, [cancelRestAnimation]);

  useEffect(() => cancelRestAnimation, [cancelRestAnimation]);

  // CameraControls animations survive longer than a React render. When a room
  // changes, prevent an unfinished transition from the old room (especially a
  // reset to overview) from completing over the new room's destination.
  useEffect(() => () => {
    cameraTransitionIdRef.current += 1;
    cameraControlsRef.current?.stop();
  }, []);

  useEffect(() => {
    if (currentFrameIndex >= 0) {
      setZoomedFrameId(currentFrameIndex);
    } else {
      setZoomedFrameId(null);
    }
  }, [currentFrameIndex, setZoomedFrameId]);

  // A bench sits close to a side wall, looking sideways at it. Leaving one
  // for a distant frame or the overview means a large simultaneous move +
  // rotation — left entirely to CameraControls' own interpolation, that path
  // can swing wide enough in x to cross the frame wall before curving back
  // in. Bowing the path toward room-center x and lifting it in y (the same
  // control-point trick moveToRestView uses to arrive at a bench) keeps the
  // camera clear of the wall on the way out too.
  const runArcTransition = useCallback((
    transitionId: number,
    startPosition: THREE.Vector3,
    startTarget: THREE.Vector3,
    endPosition: THREE.Vector3,
    endTarget: THREE.Vector3,
    duration: number,
  ) => new Promise<void>((resolve) => {
    const controls = cameraControlsRef.current;
    if (!controls) {
      resolve();
      return;
    }

    const positionControl = new THREE.Vector3(
      clamp((startPosition.x + endPosition.x) * 0.2, -0.7, 0.7),
      Math.max(startPosition.y, endPosition.y, 1.45),
      (startPosition.z + endPosition.z) / 2,
    );
    const targetControl = new THREE.Vector3(
      clamp((startTarget.x + endTarget.x) * 0.2, -0.7, 0.7),
      (startTarget.y + endTarget.y) / 2,
      (startTarget.z + endTarget.z) / 2,
    );

    const position = new THREE.Vector3();
    const target = new THREE.Vector3();
    const startedAt = window.performance.now();

    const step = (now: number) => {
      if (transitionId !== cameraTransitionIdRef.current) {
        resolve();
        return;
      }

      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeInOutCubic(progress);

      quadraticBezier(position, startPosition, positionControl, endPosition, eased);
      quadraticBezier(target, startTarget, targetControl, endTarget, eased);
      controls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);

      if (progress < 1) {
        restAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      restAnimationFrameRef.current = null;
      resolve();
    };

    restAnimationFrameRef.current = window.requestAnimationFrame(step);
  }), []);

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
    async (index: number, arcFromRest = false) => {
      const controls = cameraControlsRef.current;
      if (!controls) return;
      const mesh = frameRefs.current[index];
      if (!mesh) return;

      const transitionId = beginCameraTransition(arcFromRest);

      const frameWorldPosition = new THREE.Vector3();
      mesh.getWorldPosition(frameWorldPosition);

      const localFrontPoint = new THREE.Vector3(0, 0, 1);
      const worldFrontPoint = localFrontPoint.clone();
      mesh.localToWorld(worldFrontPoint);

      const frontDirection = worldFrontPoint.clone().sub(frameWorldPosition).normalize();
      frontDirection.multiplyScalar(getScaleFactor());

      const targetPosition = frameWorldPosition.clone().add(frontDirection);

      const endPosition = targetPosition.clone();
      endPosition.y -= getYOffset();
      const endTarget = frameWorldPosition.clone();
      endTarget.y -= getYOffset();

      if (arcFromRest) {
        const startPosition = controls.getPosition(new THREE.Vector3(), false);
        const startTarget = controls.getTarget(new THREE.Vector3(), false);
        const duration = smoothTimeForTravel(controls, endPosition, endTarget) * 1000;
        await runArcTransition(transitionId, startPosition, startTarget, endPosition, endTarget, duration);
      } else {
        const previousSmoothTime = controls.smoothTime;
        try {
          controls.smoothTime = smoothTimeForTravel(controls, endPosition, endTarget);
          await controls.setLookAt(
            endPosition.x,
            endPosition.y,
            endPosition.z,
            endTarget.x,
            endTarget.y,
            endTarget.z,
            true,
          );
        } finally {
          controls.smoothTime = previousSmoothTime;
        }
      }

      if (transitionId !== cameraTransitionIdRef.current) return;
      if (onFrameChange) onFrameChange(index);
    },
    [beginCameraTransition, frameRefs, onFrameChange, getScaleFactor, getYOffset, runArcTransition],
  );

  const resetCamera = useCallback(async (arcFromRest = false) => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    const transitionId = beginCameraTransition(arcFromRest);

    const overviewPosition = new THREE.Vector3(0, 2, 14);
    const overviewTarget = new THREE.Vector3(0, 0, 0);

    if (arcFromRest) {
      const startPosition = controls.getPosition(new THREE.Vector3(), false);
      const startTarget = controls.getTarget(new THREE.Vector3(), false);
      const duration = smoothTimeForTravel(controls, overviewPosition, overviewTarget) * 1000;
      await runArcTransition(transitionId, startPosition, startTarget, overviewPosition, overviewTarget, duration);
    } else {
      const previousSmoothTime = controls.smoothTime;
      try {
        controls.smoothTime = smoothTimeForTravel(controls, overviewPosition, overviewTarget);
        await controls.setLookAt(0, 2, 14, 0, 0, 0, true);
      } finally {
        controls.smoothTime = previousSmoothTime;
      }
    }

    if (transitionId !== cameraTransitionIdRef.current) return;
    if (onFrameChange) onFrameChange(-1);
  }, [beginCameraTransition, onFrameChange, runArcTransition]);

  const applyRestLook = useCallback(() => {
    const controls = cameraControlsRef.current;
    if (!controls) return;

    const look = restLookRef.current;
    const horizontal = Math.cos(look.pitch);
    const target = new THREE.Vector3(
      look.position.x + Math.sin(look.yaw) * horizontal * look.distance,
      look.position.y + Math.sin(look.pitch) * look.distance,
      look.position.z + Math.cos(look.yaw) * horizontal * look.distance,
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
    const offset = target.clone().sub(position);
    const direction = offset.clone().normalize();

    restLookRef.current.position.copy(position);
    restLookRef.current.distance = Math.max(offset.length(), 0.0001);
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

    const transitionId = beginCameraTransition(true);
    setZoomedFrameId(null);
    syncRestLook(viewpoint);
    restLookEnabledRef.current = false;

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
    // The look target gets its own Bezier arc rather than being rebuilt each
    // frame from a slerped direction and a separately lerped distance —
    // reconstructing it that way let the target point swing far off the
    // straight path (most visibly arriving from the wide overview, where the
    // look distance shrinks from ~14 units to a bench's ~3.4), reading as the
    // camera lurching forward and snapping back mid-transition.
    const targetControl = new THREE.Vector3(
      clamp((startTarget.x + endTarget.x) * 0.2, -0.7, 0.7),
      (startTarget.y + endTarget.y) / 2,
      (startTarget.z + endTarget.z) / 2,
    );
    const position = new THREE.Vector3();
    const target = new THREE.Vector3();
    const startedAt = window.performance.now();

    const step = (now: number) => {
      if (transitionId !== cameraTransitionIdRef.current) return;

      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeInOutCubic(progress);

      quadraticBezier(position, startPosition, positionControl, endPosition, eased);
      quadraticBezier(target, startTarget, targetControl, endTarget, eased);
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
      restLookEnabledRef.current = true;
      onRestArrival?.();
    };

    restAnimationFrameRef.current = window.requestAnimationFrame(step);
  }, [beginCameraTransition, onRestArrival, setZoomedFrameId, syncRestLook]);

  useEffect(() => {
    if (!restView) return;

    const element = gl.domElement;
    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'none';

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!restLookEnabledRef.current) return;
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
    const leavingRestView = previousRestViewRef.current !== null && !restView;
    previousRestViewRef.current = restView ?? null;

    if (restView) {
      moveToRestView(restView);
    } else if (currentFrameIndex >= 0 && currentFrameIndex < imagesCount) {
      zoomToFrame(currentFrameIndex, leavingRestView);
    } else if (currentFrameIndex === -1) {
      resetCamera(leavingRestView);
    }
  }, [currentFrameIndex, imagesCount, restView, targetRevision, zoomToFrame, resetCamera, moveToRestView]);

  return (
    <CameraControls
      ref={cameraControlsRef}
      smoothTime={CAMERA_SMOOTH_TIME}
      maxSpeed={MAX_CAMERA_SPEED}
      mouseButtons={DISABLED_MOUSE_BUTTONS}
      touches={DISABLED_TOUCHES}
    />
  );
};

export { CameraManager, type CameraManagerProps };
