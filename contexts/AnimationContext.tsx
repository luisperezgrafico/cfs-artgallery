'use client';

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";

type ScreenState = "loading" | "title" | "scene";

interface AnimationContextType {
  currentScreen: ScreenState;
  assetsReady: boolean;
  sceneOpacity: number;
  sceneBlur: number;
  setCurrentScreen: (screen: ScreenState) => void;
  setAssetsReady: (ready: boolean) => void;
  handleLoadingComplete: () => void;
  handleTitleFading: () => void;
  handleTitleComplete: () => void;
  handleAssetsLoaded: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(
  undefined
);

export const AnimationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("loading");
  const [assetsReady, setAssetsReady] = useState(false);
  const [sceneOpacity, setSceneOpacity] = useState(0);
  const [sceneBlur, setSceneBlur] = useState(8);

  useEffect(() => {
    if (currentScreen === "title") {
      setSceneOpacity(1);
      setSceneBlur(8);
    } else if (currentScreen === "scene") {
      setSceneOpacity(1);
      setSceneBlur(0);
    } else {
      setSceneOpacity(0);
      setSceneBlur(8);
    }
  }, [currentScreen]);

  const handleLoadingComplete = () => {
    setCurrentScreen("title");
  };

  const handleTitleFading = () => {
    setSceneBlur(0);
  };

  const handleTitleComplete = () => {
    setCurrentScreen("scene");
  };

  const handleAssetsLoaded = () => {
    setAssetsReady(true);
  };

  return (
    <AnimationContext.Provider
      value={{
        currentScreen,
        assetsReady,
        sceneOpacity,
        sceneBlur,
        setCurrentScreen,
        setAssetsReady,
        handleLoadingComplete,
        handleTitleFading,
        handleTitleComplete,
        handleAssetsLoaded,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error("useAnimation must be used within an AnimationProvider");
  }
  return context;
};
