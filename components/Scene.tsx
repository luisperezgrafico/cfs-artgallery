'use client';

import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { RoomShell } from '@/components/RoomShell';
import { CameraRig } from '@/components/CameraRig';
import {
  slotPlacement,
  type Artwork,
  type RoomData,
  type RoomTheme,
  type Viewpoint,
  type WallSlot,
} from '@/lib/gallery';

export function RoomScene({
  room,
  viewpoint,
  moving,
  snap,
  ambient,
  onSettled,
}: {
  room: RoomData;
  viewpoint: Viewpoint;
  moving: boolean;
  snap: boolean;
  ambient: boolean;
  onSettled: () => void;
}) {
  return (
    <>
      <color attach="background" args={[room.theme.fog]} />
      <fog attach="fog" args={[room.theme.fog, room.theme.fogNear, room.theme.fogFar]} />

      <ambientLight color={room.theme.ambientColor} intensity={room.theme.ambientIntensity} />
      <directionalLight
        position={[3, 6, 2]}
        color={room.theme.dirLightColor}
        intensity={room.theme.dirLightIntensity}
      />

      <RoomShell theme={room.theme} variant={room.variant} />

      <Suspense fallback={null}>
        {room.slots.map((slot, i) => {
          const art = slot.artworkSlug ? room.artworks[slot.artworkSlug] : null;
          return (
            <ArtworkPanel
              key={i}
              slot={slot}
              artwork={art}
              theme={room.theme}
            />
          );
        })}
      </Suspense>

      <CameraRig viewpoint={viewpoint} moving={moving} snap={snap} onSettled={onSettled} />
    </>
  );
}

function ArtworkPanel({
  slot,
  artwork,
  theme,
}: {
  slot: WallSlot;
  artwork: Artwork | null;
  theme: RoomTheme;
}) {
  const p = slotPlacement(slot);
  const w = artwork?.width ?? 1.1;
  const h = artwork?.height ?? 1.1;

  return (
    <group position={p.position} rotation-y={p.rotY}>
      {/* backing panel with generous mount border */}
      <mesh position-z={-0.08}>
        <planeGeometry args={[w + 0.7, h + 0.7]} />
        <meshStandardMaterial color={artwork ? '#f4f0e8' : '#e8e4dc'} roughness={0.9} />
      </mesh>
      {/* frame */}
      <mesh position-z={-0.04}>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.04]} />
        <meshStandardMaterial color={theme.trim} roughness={0.7} metalness={0.1} />
      </mesh>
      {artwork ? (
        <FilledCanvas artwork={artwork} />
      ) : (
        <BlankCanvas w={w} h={h} accent={theme.accent} />
      )}
    </group>
  );
}

function FilledCanvas({ artwork }: { artwork: Artwork }) {
  const texture = useTexture(artwork.image);
  return (
    <mesh>
      <planeGeometry args={[artwork.width, artwork.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function BlankCanvas({ w, h, accent }: { w: number; h: number; accent: string }) {
  return (
    <group>
      {/* cream canvas surface */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.95} />
      </mesh>
      {/* subtle inner border hinting at the empty space */}
      <mesh position-z={0.002}>
        <boxGeometry args={[w - 0.06, h - 0.06, 0.004]} />
        <meshStandardMaterial color={accent} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
