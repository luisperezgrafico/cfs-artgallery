# AGENTS.md — ME/CFS Community Gallery

Technical guide for agents/contributors working in this repo.
For the product vision, principles and phase plan, **`SCOPE.md` is the source of truth** — read it before proposing architecture. This file describes *how the code is actually built today*.

> **Note:** the old Phase 0 code (the earlier non-working museum, plus a `_deprecated/` folder and a `content/*.json` data model) has been removed — the live app is entirely under `app/`, `components/`, `config/`, `contexts/`, `types/`, `utils/`. Rooms are now data in `config/*.ts`, not `content/*.json`.

## What this is

A calm, dreamlike **virtual 3D art gallery** for the ME/CFS community. Visitors *attend* an exhibition on rails — they never control the camera. The core visitor may be in bed, on an old phone, with brain fog: **accessibility and low energy cost are the value proposition, not features.** Both maintainers have ME/CFS — small milestones, no deadlines, heavy AI assistance.

## Stack

- **Next.js 15** (App Router) — currently **static export** (`output: 'export'` in `next.config.mjs`, images unoptimized). No backend yet.
- **React Three Fiber v9 + drei v10 + three 0.178** for the 3D scene.
- **Tailwind CSS v4** for the HTML overlay UI.
- `react-swipeable` (touch nav), `maath` (easing/math), `lucide-react` (icons).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in out/  (deployable to Vercel / any static host)
```

## Architecture / data flow

```
app/page.tsx (the "door")
  └─ Gallery.tsx (dynamic import, ssr:false)
       ├─ AnimationProvider / TourProvider / RoomProvider   (contexts/)
       └─ SwipeableContainer
            ├─ MuseumStage.tsx  → <Canvas> → Museum.tsx → museum/* (3D scene)
            └─ UIElements.tsx   → ui/*      (HTML overlay, on top of canvas)
```

- **Rooms are data.** New rooms cost curation, not engineering:
  - `config/roomsConfig.ts` — the room list: `{ id, name, images, theme }` + the per-room color `RoomTheme`s. Currently 4 rooms; **only `room-1` has artworks**, II–IV are empty.
  - `config/imagesConfig.ts` — artwork metadata (`ImageMetadata`: url, `aspectRatio`, title, artist, date, link, description). Frame size is derived from `aspectRatio`.
  - `config/roomConfig.ts` — default room dimensions.
  - `types/museum.ts` — shared types.
- Rooms are padded to `ROOM_CAPACITY = 8` slots in `Gallery.tsx`; unfilled slots render as **empty "submit your work" canvases**.
- **3D scene:** `components/museum/` — `Room`, `Frame`, `Floor`, `Bench`, `CeilingLight`, `SpotLight`/`SpotlightGroup`, `CameraManager`. Camera runs on rails via drei `CameraControls` (`CameraManager.tsx`) — **never free-roam.** `utils/framePositioning.ts` lays frames along the walls.
- **UI overlay:** `components/ui/` — all HTML over the canvas. `HamburgerMenu` (room selector + comfort controls), `TourControls`, `ArtworkInfoModal` (plaque/description), `ArtworkLightbox` (tap zoomed art → pinch/double-tap zoom), `SubmitArtworkModal`, `LoadingScreen`, `TitleOverlay`.
- **Contexts:** `AnimationContext` (loading→title→scene transitions, scene opacity/blur), `TourContext` (current frame index, prev/next), `RoomContext` (active room), `ZoomContext` (artwork zoom state).

## Non-negotiable constraints (from SCOPE.md)

1. **On rails.** The visitor never controls the camera. ← / → move artwork-to-artwork; room select jumps rooms.
2. **All navigation UI is HTML over the canvas, never inside the 3D scene** — screen readers must traverse the gallery as a list. Keyboard-navigable.
3. **Respect `prefers-reduced-motion`** for every animation (glides become crossfades).
4. **Energy/performance is the value prop, not an afterthought.** Low-poly, no photorealism, no 4K textures; keep GPU cost near zero while the visitor is still. Load budget: door+lobby ≤ 5 MB, each room ≤ 2 MB. Target: a 4-year-old mid-range Android.
5. **No autoplay** of sound/video. No flashing content. Calm typography, generous spacing.
6. A plain **list view** fallback is a first-class requirement (not built yet).

## Pending / known state

- **Real submission system is NOT implemented.** `SubmitArtworkModal` is UI-only. The real flow (Vercel Blob upload + pending queue + `/admin` approval) is Phase 2 in `SCOPE.md`. Building it will require dropping `output: 'export'` for server actions/API routes.
- **Floor reflection flicker** (`MeshReflectorMaterial` on the floor) is a known issue — parked, not being worked on right now.
- Rooms II–IV have no artworks yet; filled with submit canvases.

## Theming (dark / light)

- **Source of truth:** the `data-theme` attribute on `<html>` (`"dark"` | `"light"`), **default dark**, persisted in `localStorage` under the key `theme`. An inline script in `app/layout.tsx` applies it before first paint (no flash); `<html>` is rendered with `data-theme="dark"` + `suppressHydrationWarning`.
- **Tokens live in `app/globals.css`:** dark values are the defaults in `:root`; light values override under `:root[data-theme='light']`. Three groups — `--door-*` (landing), `--panel-*` (overlay modals: surface/border/shadow/title/subtitle/text/separator/button), `--field-*` (form inputs inside modals). There's also a global `::placeholder` rule using `--field-hint`.
- **Toggle:** `components/ui/ThemeToggle.tsx` — an icon button (lucide `Sun`/`Moon`) that just flips the attribute + writes `localStorage`. Mounted in the door (`app/page.tsx`, styled via `.door-toggle`) and in the `HamburgerMenu` "Appearance" section. Never mounted twice at once, so it holds no shared state.
- **Scope (deliberate):** the theme only skins the **HTML chrome that used to be light** — the door and the two overlay modals (`ArtworkInfoModal`, `SubmitArtworkModal`). The **3D scene keeps its curated per-room atmosphere** regardless of theme. The `HamburgerMenu` and the HUD chips/plaques are **not yet theme-aware** (they stay as-is) — themable later if we want a full light mode.
- **Adding a new overlay/panel:** reuse the `--panel-*` / `--field-*` variables instead of hardcoding cream/dark colors, and it will follow the theme for free.

## Local preferences

- **Source of truth:** browser `localStorage`, not cookies, while the app remains static export and the server does not need to read preferences.
- **Visit resume:** `utils/userPreferences.ts` stores `{ roomId, frameIndex, updatedAt }` under `cfs-gallery:visit-position:v1`. This is deliberately a **room + slot position**, not artwork identity: `roomId` survives room reordering, and `frameIndex` matches the current eight-slot room model (including empty submit canvases).
- **Menu comfort:** the draggable hamburger tab Y position is stored under `cfs-gallery:menu-tab-y:v1` and clamped away from viewport edges.
- **Failure mode:** storage access is optional and wrapped in `try/catch`; private mode, disabled storage, or malformed values fall back to Room I / overview.
- **Future preference work:** add small typed helpers to `utils/userPreferences.ts` with versioned keys instead of scattering raw `localStorage` calls across components.

## Conventions

- Docs shared with the Reddit collaborator stay in **English** (`SCOPE.md`, this file). Luis communicates in Spanish.
- Placeholder art lives in `public/art/*.svg`; plaque text is lorem ipsum until real submissions arrive.
- Keep new code in the style of the surrounding files (config-driven rooms, HTML overlay for anything interactive/accessible).
