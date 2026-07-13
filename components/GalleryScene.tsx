'use client';

import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { RoomShell } from '@/components/RoomShell';
import { CameraRig } from '@/components/CameraRig';
import { LOBBY_THEME } from '@/lib/lobbyTheme';
import {
  slotPlacement,
  ROOM,
  type Artwork,
  type RoomData,
  type RoomTheme,
  type Viewpoint,
  type WallSlot,
} from '@/lib/gallery';

const { W, D, H, DOOR_W } = ROOM;
const HALF_W = W / 2;
const HALF_D = D / 2;

// World positions of each room
const ROOM_A_OFFSET: [number, number, number] = [-16, 0, 0];
const ROOM_B_OFFSET: [number, number, number] = [0, 0, -16];
const ROOM_C_OFFSET: [number, number, number] = [16, 0, 0];

interface Props {
  rooms: Record<string, RoomData>;
  viewpoint: Viewpoint;
  snap: boolean;
  onSettled: () => void;
  ambient: boolean;
}

export function GalleryScene({ rooms, viewpoint, snap, onSettled, ambient }: Props) {
  const roomA = rooms['room-a'];
  const roomB = rooms['room-b'];
  const roomC = rooms['room-c'];

  return (
    <>
      <color attach="background" args={['#e0dcd4']} />
      <fog attach="fog" args={['#e0dcd4', 28, 58]} />

      {/* Global lighting — room accent lights come from each room's group */}
      <ambientLight intensity={ambient ? 0.55 : 0.25} color="#fff8ee" />
      <directionalLight position={[4, 8, 5]} intensity={0.9} color="#fff5e0" />

      {/* ── Lobby ── */}
      <RoomShell theme={LOBBY_THEME} variant="lobby" />

      {/* ── Corridors ── */}
      {/* Corridor A: lobby left wall → Room A entrance */}
      <Corridor cx={-(HALF_W + 12) / 2} cz={0} len={12 - HALF_W} axis="x" theme={LOBBY_THEME} />
      {/* Corridor B: lobby back wall → Room B entrance */}
      <Corridor cx={0} cz={-(HALF_D + 12) / 2} len={12 - HALF_D} axis="z" theme={LOBBY_THEME} />
      {/* Corridor C: lobby right wall → Room C entrance */}
      <Corridor cx={(HALF_W + 12) / 2} cz={0} len={12 - HALF_W} axis="x" theme={LOBBY_THEME} />

      {/* ── Room A — warm, left side, rotated +90° so door faces +x ── */}
      <group position={ROOM_A_OFFSET} rotation-y={Math.PI / 2}>
        <RoomShell theme={roomA.theme} variant={roomA.variant} />
        <Suspense fallback={null}>
          {roomA.slots.map((slot, i) => (
            <ArtworkPanel key={i} slot={slot} artwork={slot.artworkSlug ? roomA.artworks[slot.artworkSlug] : null} theme={roomA.theme} />
          ))}
        </Suspense>
      </group>

      {/* ── Room B — cool/neutral, straight back, no rotation ── */}
      <group position={ROOM_B_OFFSET}>
        <RoomShell theme={roomB.theme} variant={roomB.variant} />
        <Suspense fallback={null}>
          {roomB.slots.map((slot, i) => (
            <ArtworkPanel key={i} slot={slot} artwork={slot.artworkSlug ? roomB.artworks[slot.artworkSlug] : null} theme={roomB.theme} />
          ))}
        </Suspense>
      </group>

      {/* ── Room C — dark, right side, rotated −90° so door faces −x ── */}
      <group position={ROOM_C_OFFSET} rotation-y={-Math.PI / 2}>
        <RoomShell theme={roomC.theme} variant={roomC.variant} />
        <Suspense fallback={null}>
          {roomC.slots.map((slot, i) => (
            <ArtworkPanel key={i} slot={slot} artwork={slot.artworkSlug ? roomC.artworks[slot.artworkSlug] : null} theme={roomC.theme} />
          ))}
        </Suspense>
      </group>

      <CameraRig viewpoint={viewpoint} snap={snap} onSettled={onSettled} />
    </>
  );
}

// ── Corridor geometry ─────────────────────────────────────────────────────────
// Simple 4-plane tunnel (floor, ceiling, two side walls) using lobby colours.

function Corridor({
  cx, cz, len, axis, theme,
}: {
  cx: number;
  cz: number;
  len: number;
  axis: 'x' | 'z';
  theme: RoomTheme;
}) {
  const hw = DOOR_W / 2; // half-width = 1.1

  if (axis === 'x') {
    return (
      <group position={[cx, 0, cz]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
          <planeGeometry args={[len, DOOR_W]} />
          <meshStandardMaterial color={theme.floor} roughness={0.82} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, H, 0]}>
          <planeGeometry args={[len, DOOR_W]} />
          <meshStandardMaterial color={theme.ceiling} roughness={0.9} />
        </mesh>
        {/* south wall (z = −hw) faces +z into corridor */}
        <mesh position={[0, H / 2, -hw]}>
          <planeGeometry args={[len, H]} />
          <meshStandardMaterial color={theme.walls} roughness={0.85} />
        </mesh>
        {/* north wall (z = +hw) faces −z into corridor */}
        <mesh rotation-y={Math.PI} position={[0, H / 2, hw]}>
          <planeGeometry args={[len, H]} />
          <meshStandardMaterial color={theme.walls} roughness={0.85} />
        </mesh>
      </group>
    );
  }

  // axis === 'z'
  return (
    <group position={[cx, 0, cz]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
        <planeGeometry args={[DOOR_W, len]} />
        <meshStandardMaterial color={theme.floor} roughness={0.82} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[DOOR_W, len]} />
        <meshStandardMaterial color={theme.ceiling} roughness={0.9} />
      </mesh>
      {/* west wall (x = −hw) faces +x into corridor */}
      <mesh rotation-y={-Math.PI / 2} position={[-hw, H / 2, 0]}>
        <planeGeometry args={[len, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {/* east wall (x = +hw) faces −x into corridor */}
      <mesh rotation-y={Math.PI / 2} position={[hw, H / 2, 0]}>
        <planeGeometry args={[len, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ── Artwork panel (same as in Scene.tsx) ──────────────────────────────────────

function ArtworkPanel({
  slot, artwork, theme,
}: {
  slot: WallSlot;
  artwork: Artwork | null;
  theme: RoomTheme;
}) {
  const p = slotPlacement(slot);
  const w = artwork?.width  ?? 1.1;
  const h = artwork?.height ?? 1.1;

  return (
    <group position={p.position} rotation-y={p.rotY}>
      <mesh position-z={-0.08}>
        <planeGeometry args={[w + 0.7, h + 0.7]} />
        <meshStandardMaterial color={artwork ? '#f4f0e8' : '#e8e4dc'} roughness={0.9} />
      </mesh>
      <mesh position-z={-0.04}>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.04]} />
        <meshStandardMaterial color={theme.trim} roughness={0.7} metalness={0.1} />
      </mesh>
      {artwork ? <FilledCanvas artwork={artwork} /> : <BlankCanvas w={w} h={h} accent={theme.accent} />}
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
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.95} />
      </mesh>
      <mesh position-z={0.002}>
        <boxGeometry args={[w - 0.06, h - 0.06, 0.004]} />
        <meshStandardMaterial color={accent} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
