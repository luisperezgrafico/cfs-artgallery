'use client';

// src/contexts/TourContext.tsx
import React, { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { ImageMetadata, RestViewpoint } from "../types/museum";
import { findNextRealIndex, findPreviousRealIndex } from "../utils/roomLayout";
import { DEFAULT_REST_VIEW } from '../utils/restView';

interface TourContextType {
  isTourStarted: boolean;
  isResting: boolean;
  restView: RestViewpoint | null;
  currentFrameIndex: number;
  setCurrentFrameIndex: (index: number) => void;
  totalFrames: number;
  images: ImageMetadata[];
  startTour: (atIndex?: number) => void;
  nextFrame: () => void;
  previousFrame: () => void;
  sitAtRestView: (viewpoint: RestViewpoint) => void;
  quitTour: () => void;
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

  const setCurrentFrameIndex = useCallback((index: number) => {
    setRestView(null);
    setCurrentFrameIndexState(index);
  }, []);

  // Tour control functions
  const startTour = useCallback((atIndex?: number) => {
    if (totalFrames <= 0) return;
    const start = atIndex !== undefined && atIndex >= 0 && atIndex < totalFrames ? atIndex : 0;
    setRestView(null);
    setIsTourStarted(true);
    setCurrentFrameIndexState(start);
  }, [totalFrames]);

  const nextFrame = useCallback(() => {
    setRestView(null);
    setCurrentFrameIndexState(prev => {
      const next = findNextRealIndex(images, prev);
      if (next !== -1) return next;
      setIsTourStarted(false);
      setRestView(DEFAULT_REST_VIEW);
      return -1;
    });
  }, [images]);

  const previousFrame = useCallback(() => {
    setRestView(null);
    setCurrentFrameIndexState(prev => {
      const previous = findPreviousRealIndex(images, prev);
      return previous === -1 ? prev : previous;
    });
  }, [images]);

  const sitAtRestView = useCallback((viewpoint: RestViewpoint) => {
    const [px, py, pz] = viewpoint.position;
    const [tx, ty, tz] = viewpoint.target;

    setIsTourStarted(false);
    setCurrentFrameIndexState(-1);
    setRestView({
      position: [px, py, pz],
      target: [tx, ty, tz],
    });
  }, []);

  const quitTour = useCallback(() => {
    setRestView(null);
    setIsTourStarted(false);
    setCurrentFrameIndexState(-1);
  }, []);

  const value = {
    isTourStarted,
    isResting: restView !== null,
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
