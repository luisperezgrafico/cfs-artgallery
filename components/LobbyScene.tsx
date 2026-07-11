'use client';

import { LOBBY_THEME } from '@/lib/lobbyTheme';
import { RoomShell } from '@/components/RoomShell';
import { CameraRig } from '@/components/CameraRig';
import type { Viewpoint } from '@/lib/gallery';

export function LobbyScene({
  viewpoint,
  moving,
  snap,
  ambient,
  onSettled,
}: {
  viewpoint: Viewpoint;
  moving: boolean;
  snap: boolean;
  ambient: boolean;
  onSettled: () => void;
}) {
  return (
    <>
      <color attach="background" args={[LOBBY_THEME.fog]} />
      <fog attach="fog" args={[LOBBY_THEME.fog, LOBBY_THEME.fogNear, LOBBY_THEME.fogFar]} />

      <ambientLight color={LOBBY_THEME.ambientColor} intensity={LOBBY_THEME.ambientIntensity} />
      <directionalLight
        position={[2, 5, 3]}
        color={LOBBY_THEME.dirLightColor}
        intensity={LOBBY_THEME.dirLightIntensity}
      />

      <RoomShell theme={LOBBY_THEME} variant="lobby" />

      <CameraRig viewpoint={viewpoint} moving={moving} snap={snap} onSettled={onSettled} />
    </>
  );
}
