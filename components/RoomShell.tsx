'use client';

import { Text } from '@react-three/drei';
import { ROOM, type RoomTheme, type RoomVariant } from '@/lib/gallery';

const { W, D, H, DOOR_W, DOOR_H } = ROOM;
const HALF_W = W / 2;
const HALF_D = D / 2;

// Architectural constants
const DADO_Y      = 1.05;  // dado rail center height
const DADO_H      = 0.10;  // dado rail strip height
const DADO_D      = 0.07;  // dado rail protrusion from wall
const TRIM_H      = 0.08;  // baseboard / crown height
const TRIM_D      = 0.06;  // baseboard / crown depth
const PIL_W       = 0.22;  // pilaster face width
const PIL_D       = 0.14;  // pilaster protrusion depth
const PANEL_INSET = 0.012; // how far recessed panels sit behind the wall plane

// Pilaster x-positions on the back wall (between artwork slots at -3.5, 0, +3.5)
const BACK_PIL_X  = [-4.8, -1.75, 1.75, 4.8] as const;
// Pilaster z-positions on the side walls
const SIDE_PIL_Z  = [-2.6, 0, 2.6] as const;

function shiftHex(hex: string, delta: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + delta);
  const g = clamp(((n >> 8)  & 0xff) + delta);
  const b = clamp(( n        & 0xff) + delta);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const WALL_POEMS: Record<string, string> = {
  warm: '"In stillness, we find\nwhat movement cannot reach."',
  cool: '"Some walls hold us.\nSome walls hold light for us."',
  dark: '"The dark is patient.\nSo are we."',
};

export function RoomShell({ theme, variant }: { theme: RoomTheme; variant: RoomVariant }) {
  const pilasterColor = shiftHex(theme.walls, -18);
  const panelColor    = shiftHex(theme.walls, -10);

  return (
    <group>
      <Floor theme={theme} />
      <Ceiling theme={theme} variant={variant} />
      <BackWall theme={theme} panelColor={panelColor} pilasterColor={pilasterColor} />
      <LeftWall theme={theme} panelColor={panelColor} pilasterColor={pilasterColor} />
      <RightWall theme={theme} panelColor={panelColor} pilasterColor={pilasterColor} />
      <FrontWall theme={theme} variant={variant} />
      <Trims theme={theme} />
      <DadoRail theme={theme} />
      {variant !== 'lobby' && (
        <WallPoem variant={variant as 'warm' | 'cool' | 'dark'} theme={theme} />
      )}
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

// ── Back wall with pilasters and recessed panels ──────────────────────────────

function BackWall({
  theme, panelColor, pilasterColor,
}: { theme: RoomTheme; panelColor: string; pilasterColor: string }) {
  // Panels: sections between consecutive pilasters (and wall edges)
  const edgeXs = [-HALF_W, ...BACK_PIL_X, HALF_W];
  const panels: { cx: number; w: number }[] = [];
  for (let i = 0; i < edgeXs.length - 1; i++) {
    const left  = edgeXs[i]  + (i === 0 ? 0 : PIL_W / 2);
    const right = edgeXs[i + 1] - (i === edgeXs.length - 2 ? 0 : PIL_W / 2);
    panels.push({ cx: (left + right) / 2, w: right - left });
  }

  return (
    <group position={[0, H / 2, -HALF_D]}>
      {/* base wall */}
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>

      {/* recessed panels (above dado rail) */}
      {panels.map(({ cx, w }) => (
        <mesh key={cx} position={[cx, (H - DADO_Y) / 2 - (H / 2 - H + (H - DADO_Y) / 2), -PANEL_INSET]}>
          <planeGeometry args={[Math.max(0.01, w - 0.08), H - DADO_Y - 0.22]} />
          <meshStandardMaterial color={panelColor} roughness={0.9} />
        </mesh>
      ))}

      {/* pilasters */}
      {BACK_PIL_X.map((x) => (
        <mesh key={x} position={[x, 0, PIL_D / 2]}>
          <boxGeometry args={[PIL_W, H, PIL_D]} />
          <meshStandardMaterial color={pilasterColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Side walls with pilasters ─────────────────────────────────────────────────

function LeftWall({
  theme, panelColor, pilasterColor,
}: { theme: RoomTheme; panelColor: string; pilasterColor: string }) {
  return (
    <group position={[-HALF_W, H / 2, 0]} rotation-y={Math.PI / 2}>
      <mesh>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {SIDE_PIL_Z.map((z) => (
        <mesh key={z} position={[z, 0, PIL_D / 2]}>
          <boxGeometry args={[PIL_W, H, PIL_D]} />
          <meshStandardMaterial color={pilasterColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function RightWall({
  theme, panelColor, pilasterColor,
}: { theme: RoomTheme; panelColor: string; pilasterColor: string }) {
  return (
    <group position={[HALF_W, H / 2, 0]} rotation-y={-Math.PI / 2}>
      <mesh>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={theme.walls} roughness={0.85} />
      </mesh>
      {SIDE_PIL_Z.map((z) => (
        <mesh key={z} position={[z, 0, PIL_D / 2]}>
          <boxGeometry args={[PIL_W, H, PIL_D]} />
          <meshStandardMaterial color={pilasterColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Front wall (with doorway) ─────────────────────────────────────────────────

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

// ── Dado rail (horizontal band at ~1m height on all walls) ────────────────────

function DadoRail({ theme }: { theme: RoomTheme }) {
  const color = theme.trim;
  return (
    <group>
      {/* back wall */}
      <mesh position={[0, DADO_Y, -HALF_D + DADO_D / 2]}>
        <boxGeometry args={[W, DADO_H, DADO_D]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* left wall */}
      <mesh position={[-HALF_W + DADO_D / 2, DADO_Y, 0]}>
        <boxGeometry args={[DADO_D, DADO_H, D]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* right wall */}
      <mesh position={[HALF_W - DADO_D / 2, DADO_Y, 0]}>
        <boxGeometry args={[DADO_D, DADO_H, D]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ── Baseboard and crown molding ───────────────────────────────────────────────

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
  // Text color: light for dark rooms, dark for light rooms
  const textColor = variant === 'dark' ? '#8090c0' : shiftHex(theme.trim, -30);

  return (
    <Text
      position={[0, 3.1, -HALF_D + 0.05]}
      fontSize={0.16}
      color={textColor}
      anchorX="center"
      anchorY="middle"
      textAlign="center"
      maxWidth={4.5}
      lineHeight={1.6}
      letterSpacing={0.02}
    >
      {poem}
    </Text>
  );
}

// ── Variant-specific details ──────────────────────────────────────────────────

function WarmDetails({ theme }: { theme: RoomTheme }) {
  const winW = 0.9;
  const winH = 1.6;
  const winY = 2.4;
  const winZ = [-1.8, 1.2];

  return (
    <group>
      {winZ.map((z, i) => (
        <group key={i}>
          <mesh position={[-HALF_W + 0.04, winY, z]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial color="#ffcc80" emissive="#ffcc80" emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[HALF_W - 0.04, winY, z]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial color="#ffcc80" emissive="#ffcc80" emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <pointLight position={[-HALF_W + 0.8, winY, -1.8]} color="#ffcc80" intensity={1.2} distance={5} />
      <pointLight position={[HALF_W - 0.8, winY, 1.2]}  color="#ffcc80" intensity={1.2} distance={5} />
    </group>
  );
}

function CoolDetails({ theme }: { theme: RoomTheme }) {
  return (
    <group>
      {[-2.0, 2.0].map((x, i) => (
        <mesh key={i} position={[x, H - 0.02, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[3.0, 1.2]} />
          <meshStandardMaterial color="#e0eeff" emissive="#c0d8ff" emissiveIntensity={0.5} roughness={0.2} />
        </mesh>
      ))}
      <pointLight position={[-2.0, H - 0.3, 0]} color="#c8e0ff" intensity={1.5} distance={6} />
      <pointLight position={[ 2.0, H - 0.3, 0]} color="#c8e0ff" intensity={1.5} distance={6} />
    </group>
  );
}

function DarkDetails({ theme }: { theme: RoomTheme }) {
  const nicheW     = 0.7;
  const nicheH     = 0.9;
  const nicheDepth = 0.18;
  const nicheY     = 2.2;

  return (
    <group>
      {[-1.6, 1.6].map((z, i) => (
        <group key={i}>
          <mesh position={[-HALF_W + nicheDepth / 2 + 0.02, nicheY, z]}>
            <boxGeometry args={[nicheDepth, nicheH, nicheW]} />
            <meshStandardMaterial color="#2e3a58" roughness={0.9} />
          </mesh>
          <mesh position={[-HALF_W + nicheDepth + 0.01, nicheY, z]}>
            <planeGeometry args={[nicheW, nicheH]} />
            <meshStandardMaterial color="#384870" emissive="#304068" emissiveIntensity={0.3} roughness={0.5} />
          </mesh>
        </group>
      ))}
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
