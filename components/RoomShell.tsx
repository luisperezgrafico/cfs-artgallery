'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM, type RoomTheme, type RoomVariant } from '@/lib/gallery';

const { W, D, H, DOOR_W, DOOR_H } = ROOM;
const TRIM_H = 0.08;
const TRIM_D = 0.06;
const HALF_W = W / 2;
const HALF_D = D / 2;

export function RoomShell({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  return (
    <group>
      <Floor theme={theme} />
      <Ceiling theme={theme} variant={variant} />
      <BackWall theme={theme} />
      <LeftWall theme={theme} />
      <RightWall theme={theme} />
      <FrontWall theme={theme} variant={variant} />
      <Trims theme={theme} />
      {variant === 'warm' && <WarmDetails theme={theme} />}
      {variant === 'cool' && <CoolDetails theme={theme} />}
      {variant === 'dark' && <DarkDetails theme={theme} />}
      {variant === 'lobby' && <LobbyDetails theme={theme} />}
    </group>
  );
}

function Floor({ theme }: { theme: RoomTheme }) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial color={theme.floor} roughness={0.8} />
    </mesh>
  );
}

function Ceiling({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  return (
    <mesh position={[0, H, 0]} rotation-x={Math.PI / 2}>
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial color={theme.ceiling} roughness={0.9} />
    </mesh>
  );
}

function BackWall({ theme }: { theme: RoomTheme }) {
  return (
    <mesh position={[0, H / 2, -HALF_D]}>
      <planeGeometry args={[W, H]} />
      <meshStandardMaterial color={theme.walls} roughness={0.85} />
    </mesh>
  );
}

function LeftWall({ theme }: { theme: RoomTheme }) {
  return (
    <mesh position={[-HALF_W, H / 2, 0]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[D, H]} />
      <meshStandardMaterial color={theme.walls} roughness={0.85} />
    </mesh>
  );
}

function RightWall({ theme }: { theme: RoomTheme }) {
  return (
    <mesh position={[HALF_W, H / 2, 0]} rotation-y={-Math.PI / 2}>
      <planeGeometry args={[D, H]} />
      <meshStandardMaterial color={theme.walls} roughness={0.85} />
    </mesh>
  );
}

function FrontWall({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  const sideW = (W - DOOR_W) / 2; // width of each panel flanking the doorway
  const topH = H - DOOR_H;        // height above the door

  return (
    <group position={[0, 0, HALF_D]} rotation-y={Math.PI}>
      {/* left panel */}
      <mesh position={[-(DOOR_W / 2 + sideW / 2), H / 2, 0]}>
        <planeGeometry args={[sideW, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {/* right panel */}
      <mesh position={[(DOOR_W / 2 + sideW / 2), H / 2, 0]}>
        <planeGeometry args={[sideW, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {/* top panel above the door */}
      <mesh position={[0, DOOR_H + topH / 2, 0]}>
        <planeGeometry args={[DOOR_W, topH]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {/* doorway arch trim */}
      <DoorwayTrim theme={theme} variant={variant} />
    </group>
  );
}

function DoorwayTrim({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  const t = 0.12; // trim thickness
  const d = 0.08; // trim depth

  if (variant === 'warm') {
    // Rounded arch: half-torus over the doorway
    return (
      <group>
        {/* left jamb */}
        <mesh position={[-(DOOR_W / 2 + t / 2), DOOR_H / 2, -d / 2]}>
          <boxGeometry args={[t, DOOR_H, d]} />
          <meshStandardMaterial color={theme.trim} roughness={0.7} />
        </mesh>
        {/* right jamb */}
        <mesh position={[(DOOR_W / 2 + t / 2), DOOR_H / 2, -d / 2]}>
          <boxGeometry args={[t, DOOR_H, d]} />
          <meshStandardMaterial color={theme.trim} roughness={0.7} />
        </mesh>
        {/* arch curve (half torus) */}
        <mesh position={[0, DOOR_H, -d / 2]} rotation-z={Math.PI}>
          <torusGeometry args={[DOOR_W / 2, t / 2, 8, 20, Math.PI]} />
          <meshStandardMaterial color={theme.trim} roughness={0.7} />
        </mesh>
      </group>
    );
  }

  // Cool and dark: simple rectangular lintel
  return (
    <group>
      <mesh position={[-(DOOR_W / 2 + t / 2), DOOR_H / 2, -d / 2]}>
        <boxGeometry args={[t, DOOR_H, d]} />
        <meshStandardMaterial color={theme.trim} roughness={0.7} />
      </mesh>
      <mesh position={[(DOOR_W / 2 + t / 2), DOOR_H / 2, -d / 2]}>
        <boxGeometry args={[t, DOOR_H, d]} />
        <meshStandardMaterial color={theme.trim} roughness={0.7} />
      </mesh>
      <mesh position={[0, DOOR_H + t / 2, -d / 2]}>
        <boxGeometry args={[DOOR_W + t * 2, t, d]} />
        <meshStandardMaterial color={theme.trim} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Baseboard and crown molding strips on all walls */
function Trims({ theme }: { theme: RoomTheme }) {
  const color = theme.trim;
  return (
    <group>
      {/* baseboard — back wall */}
      <mesh position={[0, TRIM_H / 2, -HALF_D + 0.01]}>
        <boxGeometry args={[W, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* baseboard — left wall */}
      <mesh position={[-HALF_W + 0.01, TRIM_H / 2, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* baseboard — right wall */}
      <mesh position={[HALF_W - 0.01, TRIM_H / 2, 0]} rotation-y={-Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* crown — back wall */}
      <mesh position={[0, H - TRIM_H / 2, -HALF_D + 0.01]}>
        <boxGeometry args={[W, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* crown — left wall */}
      <mesh position={[-HALF_W + 0.01, H - TRIM_H / 2, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* crown — right wall */}
      <mesh position={[HALF_W - 0.01, H - TRIM_H / 2, 0]} rotation-y={-Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Room A extras: tall arched windows on side walls, warm light glow */
function WarmDetails({ theme }: { theme: RoomTheme }) {
  const winW = 0.9;
  const winH = 1.6;
  const winY = 2.4;
  const winZ = [-1.8, 1.2];

  return (
    <group>
      {winZ.map((z, i) => (
        <group key={i}>
          {/* left wall window */}
          <mesh position={[-HALF_W + 0.04, winY, z]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial
              color="#ffcc80"
              emissive="#ffcc80"
              emissiveIntensity={0.6}
              roughness={0.4}
            />
          </mesh>
          {/* right wall window */}
          <mesh position={[HALF_W - 0.04, winY, z]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial
              color="#ffcc80"
              emissive="#ffcc80"
              emissiveIntensity={0.6}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
      {/* point lights from windows */}
      <pointLight position={[-HALF_W + 0.8, winY, -1.8]} color="#ffcc80" intensity={1.2} distance={5} />
      <pointLight position={[HALF_W - 0.8, winY, 1.2]} color="#ffcc80" intensity={1.2} distance={5} />
    </group>
  );
}

/** Room B extras: ceiling skylights, cool north light */
function CoolDetails({ theme }: { theme: RoomTheme }) {
  const skyW = 3.0;
  const skyD = 1.2;

  return (
    <group>
      {/* two skylight panels in the ceiling */}
      {[-2.0, 2.0].map((x, i) => (
        <mesh key={i} position={[x, H - 0.02, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[skyW, skyD]} />
          <meshStandardMaterial
            color="#e0eeff"
            emissive="#c0d8ff"
            emissiveIntensity={0.5}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* cool ambient from skylights */}
      <pointLight position={[-2.0, H - 0.3, 0]} color="#c8e0ff" intensity={1.5} distance={6} />
      <pointLight position={[2.0, H - 0.3, 0]} color="#c8e0ff" intensity={1.5} distance={6} />
    </group>
  );
}

/** Room C extras: wall niches, dramatic spot lighting */
function DarkDetails({ theme }: { theme: RoomTheme }) {
  const nicheW = 0.7;
  const nicheH = 0.9;
  const nicheDepth = 0.18;
  const nicheY = 2.2;

  return (
    <group>
      {/* niches in left wall: a recessed box suggesting depth */}
      {[-1.6, 1.6].map((z, i) => (
        <group key={i}>
          <mesh position={[-HALF_W + nicheDepth / 2 + 0.02, nicheY, z]}>
            <boxGeometry args={[nicheDepth, nicheH, nicheW]} />
            <meshStandardMaterial color="#2e3a58" roughness={0.9} />
          </mesh>
          <mesh position={[-HALF_W + nicheDepth + 0.01, nicheY, z]}>
            <planeGeometry args={[nicheW, nicheH]} />
            <meshStandardMaterial
              color="#384870"
              emissive="#304068"
              emissiveIntensity={0.3}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
      {/* spot lights aimed at artwork zones */}
      <spotLight
        position={[0, H - 0.3, -1.5]}
        target-position={[0, 1.85, -HALF_D + 0.5]}
        color="#b0b8e8"
        intensity={8}
        angle={0.3}
        penumbra={0.6}
        distance={8}
      />
      <spotLight
        position={[-2, H - 0.3, -1.5]}
        target-position={[-3.2, 1.85, -HALF_D + 0.5]}
        color="#b0b8e8"
        intensity={6}
        angle={0.3}
        penumbra={0.6}
        distance={8}
      />
      <spotLight
        position={[2, H - 0.3, -1.5]}
        target-position={[3.2, 1.85, -HALF_D + 0.5]}
        color="#b0b8e8"
        intensity={6}
        angle={0.3}
        penumbra={0.6}
        distance={8}
      />
    </group>
  );
}

/** Lobby extras: 3 coloured portal frames on the back wall */
export function LobbyDetails({ theme }: { theme: RoomTheme }) {
  const portals: { x: number; color: string; label: string }[] = [
    { x: -3.6, color: '#c4704a', label: 'Warm Room' },
    { x: 0,    color: '#a8b8c4', label: 'Stone Room' },
    { x: 3.6,  color: '#1e2840', label: 'Night Room' },
  ];
  const pH = 2.6;
  const pW = 1.8;
  const frameT = 0.12;

  return (
    <group>
      {portals.map((p) => (
        <group key={p.x} position={[p.x, pH / 2 + 0.2, -HALF_D + 0.06]}>
          {/* colored backing */}
          <mesh>
            <planeGeometry args={[pW, pH]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.08} roughness={0.9} />
          </mesh>
          {/* frame — top, bottom, left, right strips */}
          {[
            { pos: [0,  pH / 2 + frameT / 2, 0.02] as [number,number,number], args: [pW + frameT * 2, frameT, 0.06] as [number,number,number] },
            { pos: [0, -pH / 2 - frameT / 2, 0.02] as [number,number,number], args: [pW + frameT * 2, frameT, 0.06] as [number,number,number] },
            { pos: [-pW / 2 - frameT / 2, 0, 0.02] as [number,number,number], args: [frameT, pH, 0.06] as [number,number,number] },
            { pos: [ pW / 2 + frameT / 2, 0, 0.02] as [number,number,number], args: [frameT, pH, 0.06] as [number,number,number] },
          ].map((f, i) => (
            <mesh key={i} position={f.pos}>
              <boxGeometry args={f.args} />
              <meshStandardMaterial color={theme.trim} roughness={0.7} />
            </mesh>
          ))}
          {/* subtle glow from portal */}
          <pointLight position={[0, 0, 0.5]} color={p.color} intensity={0.8} distance={3} />
        </group>
      ))}
    </group>
  );
}
