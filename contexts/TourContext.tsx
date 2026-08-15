'use client';

// src/contexts/TourContext.tsx
import React, { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { ImageMetadata, RestViewpoint } from "../types/museum";
import { nextNavigableIndex, previousNavigableIndex } from "../utils/roomLayout";
import { DEFAULT_REST_VIEW } from '../utils/restView';

interface TourContextType {
  isTourStarted: boolean;
  isResting: boolean;
  /** True once the camera has actually finished arriving at restView — not just been told to. */
  isSeated: boolean;
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
  const [restView, setRestView] = useState<RestViewpoint | null>(null);
  // Cleared every time restView changes (a fresh sit or a bench switch), so
  // free look and the rest-view controls both wait for the arrival animation
  // rather than appearing the instant a bench is tapped.
  const [isSeated, setIsSeated] = useState(false);

  const setCurrentFrameIndex = useCallback((index: number) => {
    setRestView(null);
    setIsSeated(false);
    setCurrentFrameIndexState(index);
  }, []);

  // Tour control functions
  const startTour = useCallback((atIndex?: number) => {
    if (totalFrames <= 0) return;
    const start = atIndex !== undefined && atIndex >= 0 && atIndex < totalFrames ? atIndex : 0;
    setRestView(null);
    setIsSeated(false);
    setIsTourStarted(true);
    setCurrentFrameIndexState(start);
  }, [totalFrames]);

  const nextFrame = useCallback((includeEmpty = false) => {
    setRestView(null);
    setIsSeated(false);
    setCurrentFrameIndexState(prev => {
      const next = nextNavigableIndex(images, prev, includeEmpty);
      if (next !== -1) return next;
      setIsTourStarted(false);
      setRestView(DEFAULT_REST_VIEW);
      return -1;
    });
  }, [images]);

  const previousFrame = useCallback((includeEmpty = false) => {
    setRestView(null);
    setIsSeated(false);
    setCurrentFrameIndexState(prev => {
      const previous = previousNavigableIndex(images, prev, includeEmpty);
      return previous === -1 ? prev : previous;
    });
  }, [images]);

  const sitAtRestView = useCallback((viewpoint: RestViewpoint) => {
    const [px, py, pz] = viewpoint.position;
    const [tx, ty, tz] = viewpoint.target;

    setIsTourStarted(false);
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
    setCurrentFrameIndexState(-1);
  }, []);

  const markSeated = useCallback(() => setIsSeated(true), []);

  const value = {
    isTourStarted,
    isResting: restView !== null,
    isSeated: restView !== null && isSeated,
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
