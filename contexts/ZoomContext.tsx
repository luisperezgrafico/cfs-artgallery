'use client';

import React, { useState } from "react";

export const ZoomContext = React.createContext<{
  zoomedFrameId: number | null;
  setZoomedFrameId: (id: number | null) => void;
}>({
  zoomedFrameId: null,
  setZoomedFrameId: () => {},
});

export const ZoomProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [zoomedFrameId, setZoomedFrameId] = useState<number | null>(null);
  return (
    <ZoomContext.Provider value={{ zoomedFrameId, setZoomedFrameId }}>
      {children}
    </ZoomContext.Provider>
  );
};
