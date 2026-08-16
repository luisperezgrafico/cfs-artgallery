'use client';

// src/contexts/TourContext.tsx
import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { ImageMetadata, RestViewpoint } from "../types/museum";
import { nextNavigableIndex, previousNavigableIndex } from "../utils/roomLayout";
import { DEFAULT_REST_VIEW } from '../utils/restView';

interface TourContextType {
  isTourStarted: boolean;
  isResting: boolean;
  /** True once the camera has actually finished arriving at restView — not just been told to. */
  isSeated: boolean;
  /** True only for this mounted room after its final stop led to the rest view. */
  hasCompletedRoom: boolean;
  restView: RestViewpoint | null;
  currentFrameIndex: number;
  setCurrentFrameIndex: (index: number) => void;
  totalFrames: number;
  images: ImageMetadata[];
  startTour: (atIndex?: number) => void;
  /** Auto navigation skips empty submit canvases; manual navigation includes them. */
  nextFrame: (includeEmpty?: boolean) => void;
  previousFrame: (includeEmpty?: boolean) => void;
  sitAtRestView: (viewpoint: RestViewpoint) => void;
  quitTour: () => void;
  /** CameraManager calls this when the arrival animation completes. */
  markSeated: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
  totalFrames: number;
  initialFrameIndex?: number;
  images?: ImageMetadata[];
}

export const TourProvider: React.FC<TourProviderProps> = ({
  children,
  totalFrames,
  initialFrameIndex = -1,
  images = [],
}) => {
  const initialIndex =
    initialFrameIndex >= 0 && initialFrameIndex < totalFrames ? initialFrameIndex : -1;
  const [isTourStarted, setIsTourStarted] = useState(initialIndex >= 0);
  const [currentFrameIndexState, setCurrentFrameIndexState] = useState(initialIndex);
  // Navigation can be requested again before React has committed the previous
  // frame. Keeping the authoritative in-flight index here lets us calculate
  // the next destination without nesting state writes inside a state updater.
  const currentFrameIndexRef = useRef(initialIndex);
  const [restView, setRestView] = useState<RestViewpoint | null>(null);
  const [hasCompletedRoom, setHasCompletedRoom] = useState(false);
  // Cleared every time restView changes (a fresh sit or a bench switch), so
  // free look and the rest-view controls both wait for the arrival animation
  // rather than appearing the instant a bench is tapped.
  const [isSeated, setIsSeated] = useState(false);

  const setCurrentFrameIndex = useCallback((index: number) => {
    setRestView(null);
    setIsSeated(false);
    setHasCompletedRoom(false);
    currentFrameIndexRef.current = index;
    setCurrentFrameIndexState(index);
  }, []);

  // Tour control functions
  const startTour = useCallback((atIndex?: number) => {
    if (totalFrames <= 0) return;
    const start = atIndex !== undefined && atIndex >= 0 && atIndex < totalFrames ? atIndex : 0;
    setRestView(null);
    setIsSeated(false);
    setHasCompletedRoom(false);
    setIsTourStarted(true);
    currentFrameIndexRef.current = start;
    setCurrentFrameIndexState(start);
  }, [totalFrames]);

  const nextFrame = useCallback((includeEmpty = false) => {
    const next = nextNavigableIndex(images, currentFrameIndexRef.current, includeEmpty);
    setIsSeated(false);

    if (next !== -1) {
      setRestView(null);
      setHasCompletedRoom(false);
      currentFrameIndexRef.current = next;
      setCurrentFrameIndexState(next);
      return;
    }

    // Keep the end-of-room state in one React update batch. Previously this
    // was set from inside `setCurrentFrameIndexState`'s updater, which could
    // expose a one-render gap where neither an artwork nor the rest view was
    // active — visible as a random overview/lightbox-style blink.
    setIsTourStarted(false);
    setHasCompletedRoom(true);
    currentFrameIndexRef.current = -1;
    setCurrentFrameIndexState(-1);
    setRestView(DEFAULT_REST_VIEW);
  }, [images]);

  const previousFrame = useCallback((includeEmpty = false) => {
    const previous = previousNavigableIndex(images, currentFrameIndexRef.current, includeEmpty);
    if (previous === -1) return;
    setRestView(null);
    setIsSeated(false);
    setHasCompletedRoom(false);
    currentFrameIndexRef.current = previous;
    setCurrentFrameIndexState(previous);
  }, [images]);

  const sitAtRestView = useCallback((viewpoint: RestViewpoint) => {
    const [px, py, pz] = viewpoint.position;
    const [tx, ty, tz] = viewpoint.target;

    setIsTourStarted(false);
    setHasCompletedRoom(false);
    currentFrameIndexRef.current = -1;
    setCurrentFrameIndexState(-1);
    setIsSeated(false);
    setRestView({
      position: [px, py, pz],
      target: [tx, ty, tz],
    });
  }, []);

  const quitTour = useCallback(() => {
    setRestView(null);
    setIsSeated(false);
    setIsTourStarted(false);
    currentFrameIndexRef.current = -1;
    setCurrentFrameIndexState(-1);
  }, []);

  const markSeated = useCallback(() => setIsSeated(true), []);

  const value = {
    isTourStarted,
    isResting: restView !== null,
    isSeated: restView !== null && isSeated,
    hasCompletedRoom,
    restView,
    currentFrameIndex: currentFrameIndexState,
    setCurrentFrameIndex,
    totalFrames,
    images,
    startTour,
    nextFrame,
    previousFrame,
    sitAtRestView,
    quitTour,
    markSeated,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

// Custom hook to use the tour context
export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};
