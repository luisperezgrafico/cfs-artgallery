'use client';

// src/contexts/TourContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface TourContextType {
  isTourStarted: boolean;
  currentFrameIndex: number;
  setCurrentFrameIndex: (index: number) => void;
  totalFrames: number;
  startTour: () => void;
  nextFrame: () => void;
  previousFrame: () => void;
  quitTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
  totalFrames: number;
}

export const TourProvider: React.FC<TourProviderProps> = ({
  children,
  totalFrames,
}) => {
  const [isTourStarted, setIsTourStarted] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1);

  // Tour control functions
  const startTour = () => {
    setIsTourStarted(true);
    setCurrentFrameIndex(0);
  };

  const nextFrame = () => {
    if (currentFrameIndex < totalFrames - 1) {
      setCurrentFrameIndex((prev) => prev + 1);
    }
  };

  const previousFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex((prev) => prev - 1);
    }
  };

  const quitTour = () => {
    setIsTourStarted(false);
    setCurrentFrameIndex(-1);
  };

  const value = {
    isTourStarted,
    currentFrameIndex,
    setCurrentFrameIndex,
    totalFrames,
    startTour,
    nextFrame,
    previousFrame,
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
