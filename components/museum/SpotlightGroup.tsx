'use client';

import React from "react";
import SpotLight from "./SpotLight";

interface SpotlightGroupProps {
  roomHeight: number;
}

const SpotlightGroup: React.FC<SpotlightGroupProps> = ({ roomHeight }) => {
  return (
    <>
      <SpotLight
        height={roomHeight}
        position={[-1.25, 0, 1.5]}
        rotation={[0, Math.PI, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[1.25, 0, 1.5]}
        rotation={[0, Math.PI, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[1.75, 0, 2.85]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[2.5, 0, 5.75]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[3.25, 0, 8.55]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[-1.75, 0, 2.85]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[-2.5, 0, 5.75]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[-3.25, 0, 8.55]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      {/* Center Lights */}
      <SpotLight
        height={roomHeight}
        position={[-1.7, 0, 1.5]}
        rotation={[0, Math.PI / 10, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[1.7, 0, 1.5]}
        rotation={[0, -Math.PI / 10, 0]}
      />
      <SpotLight
        height={roomHeight}
        position={[0, 0, 1.5]}
        rotation={[0, 0, 0]}
        lightAngle={0.6}
      />
    </>
  );
};

export default SpotlightGroup;
