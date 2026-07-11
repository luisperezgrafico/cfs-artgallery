'use client';

import { Text } from '@react-three/drei';
import { ROOM, type RoomTheme, type RoomVariant } from '@/lib/gallery';

const { W, D, H, DOOR_W, DOOR_H } = ROOM;
const HALF_W = W / 2;
const HALF_D = D / 2;

// Trim
const TRIM_H = 0.08;
const TRIM_D = 0.06;

// Dado rail — horizontal band at ~1m height
const DADO_Y = 1.05;  // center height
const DADO_H = 0.09;
const DADO_D = 0.07;

// Pilasters — vertical strips between artwork slots
const PIL_W = 0.20;   // face width
const PIL_D = 0.13;   // protrusion depth
// Back wall (artworks at x ≈ −3.5, 0, +3.5)
const BACK_PIL_X = [-4.1, -1.6, 1.6, 4.1] as const;
// Side walls (z range −4 to +4)
const SIDE_PIL_Z = [-2.5, 0, 2.5] as const;

// Recessed panels on back wall — between pilasters
// [centerX, width] — values account for PIL_W/2 on each side
const BACK_PANELS: readonly [number, number][] = [
  [-4.78, 1.18],
  [-2.85, 2.10],
  [0,     2.72],
  [2.85,  2.10],
  [4.78,  1.18],
] as const;

function shiftHex(hex: string, delta: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + delta);
  const g = clamp(((n >> 8)  & 0xff) + delta);
  const b = clamp(( n        & 0xff) + delta);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const WALL_POEMS: Record<string, string> = {
  warm: '"En el silencio encontramos\nlo que el movimiento no puede alcanzar."',
  cool: '"Algunos muros nos sostienen.\nOtros guardan la luz para nosotros."',
  dark: '"La oscuridad es paciente.\nNosotros también."',
};

export function RoomShell({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  const pilColor   = shiftHex(theme.walls, -16);
  const panelColor = shiftHex(theme.walls, -9);

  return (
    <group>
      <Floor theme={theme} />
      <Ceiling theme={theme} />
      <BackWall  theme={theme} pilColor={pilColor} panelColor={panelColor} />
      <LeftWall  theme={theme} pilColor={pilColor} />
      <RightWall theme={theme} pilColor={pilColor} />
      <FrontWall theme={theme} variant={variant} />
      <Trims theme={theme} />
      <DadoRail theme={theme} />
      {variant !== 'lobby' && (
        <WallPoem variant={variant as 'warm' | 'cool' | 'dark'} theme={theme} />
      )}
      {variant === 'warm'  && <WarmDetails  theme={theme} />}
      {variant === 'cool'  && <CoolDetails  theme={theme} />}
      {variant === 'dark'  && <DarkDetails  theme={theme} />}
      {variant === 'lobby' && <LobbyDetails theme={theme} />}
    </group>
  );
}

// ── Floor & Ceiling ───────────────────────────────────────────────────────────

function Floor({ theme }: { theme: RoomTheme }) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial color={theme.floor} roughness={0.82} />
    </mesh>
  );
}

function Ceiling({ theme }: { theme: RoomTheme }) {
  return (
    <mesh position={[0, H, 0]} rotation-x={Math.PI / 2}>
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial color={theme.ceiling} roughness={0.9} />
    </mesh>
  );
}

// ── Back wall: base plane + pilasters + recessed panels ───────────────────────
// The group sits at world [0, H/2, -HALF_D].
// Inside it, local y=0 is the wall's vertical centre (world y=H/2).
// To convert a world-y target to local-y: local = world - H/2.

function BackWall({
  theme, pilColor, panelColor,
}: { theme: RoomTheme; pilColor: string; panelColor: string }) {
  // Panel vertical placement (world space):
  //   from DADO_Y + 0.13  to  H - 0.15
  // Centre in world: (DADO_Y + H) / 2  ≈  2.425
  // Centre in local: (DADO_Y + H) / 2 − H/2  =  DADO_Y/2  ≈  0.525
  const panelLocalY = DADO_Y / 2;
  const panelH      = H - DADO_Y - 0.28;

  return (
    <group position={[0, H / 2, -HALF_D]}>
      {/* base wall */}
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>

      {/* recessed panels above dado rail */}
      {BACK_PANELS.map(([cx, pw]) => (
        <mesh key={cx} position={[cx, panelLocalY, -0.012]}>
          <planeGeometry args={[pw - 0.10, panelH]} />
          <meshStandardMaterial color={panelColor} roughness={0.9} />
        </mesh>
      ))}

      {/* pilasters */}
      {BACK_PIL_X.map((x) => (
        <mesh key={x} position={[x, 0, PIL_D / 2]}>
          <boxGeometry args={[PIL_W, H, PIL_D]} />
          <meshStandardMaterial color={pilColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Side walls with pilasters ─────────────────────────────────────────────────

function LeftWall({
  theme, pilColor,
}: { theme: RoomTheme; pilColor: string }) {
  return (
    <group position={[-HALF_W, H / 2, 0]} rotation-y={Math.PI / 2}>
      <mesh>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {SIDE_PIL_Z.map((z) => (
        <mesh key={z} position={[z, 0, PIL_D / 2]}>
          <boxGeometry args={[PIL_W, H, PIL_D]} />
          <meshStandardMaterial color={pilColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function RightWall({
  theme, pilColor,
}: { theme: RoomTheme; pilColor: string }) {
  return (
    <group position={[HALF_W, H / 2, 0]} rotation-y={-Math.PI / 2}>
      <mesh>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {SIDE_PIL_Z.map((z) => (
        <mesh key={z} position={[z, 0, PIL_D / 2]}>
          <boxGeometry args={[PIL_W, H, PIL_D]} />
          <meshStandardMaterial color={pilColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Front wall (doorway) ──────────────────────────────────────────────────────

function FrontWall({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  const sideW = (W - DOOR_W) / 2;
  const topH  = H - DOOR_H;

  return (
    <group position={[0, 0, HALF_D]} rotation-y={Math.PI}>
      <mesh position={[-(DOOR_W / 2 + sideW / 2), H / 2, 0]}>
        <planeGeometry args={[sideW, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      <mesh position={[(DOOR_W / 2 + sideW / 2), H / 2, 0]}>
        <planeGeometry args={[sideW, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      <mesh position={[0, DOOR_H + topH / 2, 0]}>
        <planeGeometry args={[DOOR_W, topH]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      <DoorwayTrim theme={theme} variant={variant} />
    </group>
  );
}

function DoorwayTrim({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  const t = 0.12;
  const d = 0.08;

  if (variant === 'warm') {
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
        <mesh position={[0, DOOR_H, -d / 2]} rotation-z={Math.PI}>
          <torusGeometry args={[DOOR_W / 2, t / 2, 8, 20, Math.PI]} />
          <meshStandardMaterial color={theme.trim} roughness={0.7} />
        </mesh>
      </group>
    );
  }

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

// ── Dado rail ─────────────────────────────────────────────────────────────────

function DadoRail({ theme }: { theme: RoomTheme }) {
  const color = theme.trim;
  return (
    <group>
      <mesh position={[0, DADO_Y, -HALF_D + DADO_D / 2]}>
        <boxGeometry args={[W, DADO_H, DADO_D]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[-HALF_W + DADO_D / 2, DADO_Y, 0]}>
        <boxGeometry args={[DADO_D, DADO_H, D]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[HALF_W - DADO_D / 2, DADO_Y, 0]}>
        <boxGeometry args={[DADO_D, DADO_H, D]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ── Baseboard + crown molding ─────────────────────────────────────────────────

function Trims({ theme }: { theme: RoomTheme }) {
  const color = theme.trim;
  return (
    <group>
      {/* baseboard */}
      <mesh position={[0, TRIM_H / 2, -HALF_D + 0.01]}>
        <boxGeometry args={[W, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-HALF_W + 0.01, TRIM_H / 2, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[HALF_W - 0.01, TRIM_H / 2, 0]} rotation-y={-Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* crown */}
      <mesh position={[0, H - TRIM_H / 2, -HALF_D + 0.01]}>
        <boxGeometry args={[W, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-HALF_W + 0.01, H - TRIM_H / 2, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[HALF_W - 0.01, H - TRIM_H / 2, 0]} rotation-y={-Math.PI / 2}>
        <boxGeometry args={[D, TRIM_H, TRIM_D]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// ── Wall poem (back wall, above artworks) ─────────────────────────────────────

function WallPoem({
  variant, theme,
}: { variant: 'warm' | 'cool' | 'dark'; theme: RoomTheme }) {
  const poem = WALL_POEMS[variant];
  const textColor = variant === 'dark' ? '#8090c0' : shiftHex(theme.trim, -35);

  return (
    <Text
      position={[0, 3.15, -HALF_D + 0.06]}
      fontSize={0.15}
      color={textColor}
      anchorX="center"
      anchorY="middle"
      textAlign="center"
      maxWidth={5}
      lineHeight={1.7}
      letterSpacing={0.02}
    >
      {poem}
    </Text>
  );
}

// ── Variant-specific details ──────────────────────────────────────────────────

function WarmDetails({ theme }: { theme: RoomTheme }) {
  const winW = 0.9;
  const winH = 1.5;
  const winY = 2.5;
  const winZs = [-1.8, 1.4];

  return (
    <group>
      {winZs.map((z, i) => (
        <group key={i}>
          <mesh position={[-HALF_W + 0.04, winY, z]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial color="#ffcc80" emissive="#ffcc80" emissiveIntensity={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[HALF_W - 0.04, winY, z]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial color="#ffcc80" emissive="#ffcc80" emissiveIntensity={0.55} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <pointLight position={[-HALF_W + 0.9, winY, -1.8]} color="#ffcc80" intensity={1.2} distance={5} />
      <pointLight position={[HALF_W - 0.9, winY,  1.4]} color="#ffcc80" intensity={1.2} distance={5} />
    </group>
  );
}

function CoolDetails({ theme }: { theme: RoomTheme }) {
  return (
    <group>
      {[-2.2, 2.2].map((x, i) => (
        <mesh key={i} position={[x, H - 0.02, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[2.8, 1.2]} />
          <meshStandardMaterial color="#e0eeff" emissive="#c0d8ff" emissiveIntensity={0.5} roughness={0.2} />
        </mesh>
      ))}
      <pointLight position={[-2.2, H - 0.3, 0]} color="#c8e0ff" intensity={1.5} distance={6} />
      <pointLight position={[ 2.2, H - 0.3, 0]} color="#c8e0ff" intensity={1.5} distance={6} />
    </group>
  );
}

function DarkDetails({ theme }: { theme: RoomTheme }) {
  return (
    <group>
      {[-1.6, 1.6].map((z, i) => (
        <group key={i}>
          <mesh position={[-HALF_W + 0.11, 2.2, z]}>
            <boxGeometry args={[0.18, 0.9, 0.7]} />
            <meshStandardMaterial color="#2e3a58" roughness={0.9} />
          </mesh>
          <mesh position={[-HALF_W + 0.20, 2.2, z]}>
            <planeGeometry args={[0.7, 0.9]} />
            <meshStandardMaterial color="#384870" emissive="#304068" emissiveIntensity={0.3} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <spotLight
        position={[0, H - 0.3, -1.5]}
        target-position={[0, 1.85, -HALF_D + 0.5]}
        color="#b0b8e8" intensity={8} angle={0.3} penumbra={0.6} distance={8}
      />
      <spotLight
        position={[-2, H - 0.3, -1.5]}
        target-position={[-3.2, 1.85, -HALF_D + 0.5]}
        color="#b0b8e8" intensity={6} angle={0.3} penumbra={0.6} distance={8}
      />
      <spotLight
        position={[2, H - 0.3, -1.5]}
        target-position={[3.2, 1.85, -HALF_D + 0.5]}
        color="#b0b8e8" intensity={6} angle={0.3} penumbra={0.6} distance={8}
      />
    </group>
  );
}

/** Lobby: 3 coloured portal frames on the back wall */
export function LobbyDetails({ theme }: { theme: RoomTheme }) {
  const portals: { x: number; color: string }[] = [
    { x: -3.6, color: '#c4704a' },
    { x: 0,    color: '#a8b8c4' },
    { x: 3.6,  color: '#1e2840' },
  ];
  const pH    = 2.6;
  const pW    = 1.8;
  const frameT = 0.12;

  return (
    <group>
      {portals.map((p) => (
        <group key={p.x} position={[p.x, pH / 2 + 0.2, -HALF_D + 0.06]}>
          <mesh>
            <planeGeometry args={[pW, pH]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.08} roughness={0.9} />
          </mesh>
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
          <pointLight position={[0, 0, 0.5]} color={p.color} intensity={0.8} distance={3} />
        </group>
      ))}
    </group>
  );
}
