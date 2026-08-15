'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import Frame from './museum/Frame';
import Room from './museum/Room';
import { calculateFramePositions } from '../utils/framePositioning';
import { defaultRoomDimensions } from '../config/roomConfig';
import { ImageMetadata, RoomTheme } from '../types/museum';
import { ZoomProvider } from '../contexts/ZoomContext';
import { CameraManager } from './museum/CameraManager';
import SpotlightGroup from './museum/SpotlightGroup';
import { useTour } from '../contexts/TourContext';
import CeilingLight from './museum/CeilingLight';
import Bench from './museum/Bench';
import EntranceWall, { PORTAL_OUTER_WIDTH } from './museum/EntranceWall';
import { BENCH_LAYOUT } from '../utils/restView';

const DEFAULT_THEME: RoomTheme = {
  wallColor: '#1A1637', ceilingColor: '#1a1538', floorColor: '#050505',
  hemisphereTop: '#3d2b6b', hemisphereBottom: '#0a0816', ambientIntensity: 0.2,
  trimColor: '#2c2550', doorColor: '#171331', glowColor: '#d8ccf0',
};

interface MuseumProps {
  images: ImageMetadata[];
  theme?: RoomTheme;
  roomId?: string;
}

const Museum: React.FC<MuseumProps> = ({ images, theme = DEFAULT_THEME, roomId }) => {
  const {
    currentFrameIndex,
    restView,
    setCurrentFrameIndex,
    startTour,
    sitAtRestView,
    quitTour,
  } = useTour();
  const frameRefs = useRef<(THREE.Mesh | null)[]>([]);
  const [targetRevision, setTargetRevision] = React.useState(0);

  React.useEffect(() => {
    frameRefs.current = frameRefs.current.slice(0, images.length);
    while (frameRefs.current.length < images.length) {
      frameRefs.current.push(null);
    }
  }, []);

  // A shelf jump creates the TourProvider for the new room already focused on
  // its artwork. In that first render the camera effect can run before R3F has
  // attached the frame mesh, so there is nothing to focus and it stays on the
  // overview. Run the target effect once again after this room's frames mount.
  React.useEffect(() => {
    setTargetRevision(revision => revision + 1);
  }, [roomId]);

  const { framePositions, frameRotations } = calculateFramePositions(
    defaultRoomDimensions,
    images.length,
  );

  return (
    <ZoomProvider>
      <CameraManager
        onFrameChange={setCurrentFrameIndex}
        currentFrameIndex={currentFrameIndex}
        restView={restView}
        frameRefs={frameRefs as React.MutableRefObject<THREE.Mesh[]>}
        imagesCount={images.length}
        targetRevision={targetRevision}
      />
      <group>
        <Room
          width={defaultRoomDimensions.width}
          length={defaultRoomDimensions.length}
          height={defaultRoomDimensions.height}
          wallTiltAngle={defaultRoomDimensions.wallTiltAngle}
          wallColor={theme.wallColor}
          ceilingColor={theme.ceilingColor}
          floorColor={theme.floorColor}
          trimColor={theme.trimColor}
          portalGap={PORTAL_OUTER_WIDTH}
        />

        {/* The wall behind the visitor — only ever seen from a bench */}
        <EntranceWall
          length={defaultRoomDimensions.length}
          trimColor={theme.trimColor}
          doorColor={theme.doorColor}
          glowColor={theme.glowColor}
        />

        {images.map((image, index) => {
          if (index < framePositions.length) {
            return (
              <React.Fragment key={index}>
                <Frame
                  position={framePositions[index]}
                  rotation={frameRotations[index]}
                  image={image}
                  index={index}
                  roomId={roomId}
                  ref={(el) => {
                    frameRefs.current[index] = el;
                  }}
                  onFrameClick={(idx) => {
                    if (setCurrentFrameIndex) {
                      // Zooming in to look closer, or jumping to a frame you
                      // clicked directly, are navigation — same as arrows or
                      // swipe, neither forces Manual. See the lightbox pause
                      // in GuidedTourContext for what keeps the room from
                      // changing underneath a zoomed-in image.
                      if (idx === currentFrameIndex) {
                        if (images[idx]?.isEmpty) {
                          window.dispatchEvent(new CustomEvent('open-submit-artwork', { detail: { roomId, slot: idx } }));
                        } else {
                          window.dispatchEvent(new CustomEvent('open-artwork-lightbox'));
                        }
                      } else {
                        startTour();
                        setCurrentFrameIndex(idx);
                      }
                    }
                  }}
                />
              </React.Fragment>
            );
          }
          return null;
        })}

        <ambientLight intensity={theme.ambientIntensity} />
        <hemisphereLight args={[theme.hemisphereTop, theme.hemisphereBottom, 0.25]} />
        <directionalLight intensity={2.5} position={[0, -100, 5]} />

        <SpotlightGroup roomHeight={defaultRoomDimensions.height} />
        <CeilingLight position={[-0.75, 3.95, 5]} />
        <CeilingLight position={[0.75, 3.95, 5]} />
        <CeilingLight position={[-0.95, 3.95, 8]} />
        <CeilingLight position={[0.95, 3.95, 8]} />
        <CeilingLight position={[-1.15, 3.95, 11]} />
        <CeilingLight position={[1.15, 3.95, 11]} />

        {/* Benches — quiet central pairs, rotated parallel to the tilted side walls */}
        {BENCH_LAYOUT.map((bench) => (
          <Bench
            key={bench.position.join(':')}
            position={bench.position}
            rotation={bench.rotation}
            onClick={() => sitAtRestView(bench.restView)}
          />
        ))}
      </group>
    </ZoomProvider>
  );
};

export default Museum;
