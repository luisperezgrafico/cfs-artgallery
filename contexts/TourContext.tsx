'use client';

// src/contexts/TourContext.tsx
import React, { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { ImageMetadata, RestViewpoint } from "../types/museum";

interface TourContextType {
  isTourStarted: boolean;
  isResting: boolean;
  restView: RestViewpoint | null;
  currentFrameIndex: number;
  setCurrentFrameIndex: (index: number) => void;
  totalFrames: number;
  images: ImageMetadata[];
  startTour: () => void;
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
  const startTour = useCallback(() => {
    if (totalFrames <= 0) return;
    setRestView(null);
    setIsTourStarted(true);
    setCurrentFrameIndexState(0);
  }, [totalFrames]);

  const nextFrame = useCallback(() => {
    if (currentFrameIndexState < totalFrames - 1) {
      setRestView(null);
      setCurrentFrameIndexState((prev) => prev + 1);
    }
  }, [currentFrameIndexState, totalFrames]);

  const previousFrame = useCallback(() => {
    if (currentFrameIndexState > 0) {
      setRestView(null);
      setCurrentFrameIndexState((prev) => prev - 1);
    }
  }, [currentFrameIndexState]);

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
