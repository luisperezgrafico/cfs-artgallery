# AGENTS.md — ME/CFS Community Gallery

Orientation for agents/contributors working in this repo — *how the code is actually built today*.
Treat it as a map, not a rulebook: anything here can change, and it goes stale, so trust the code when they disagree.

- **What's decided and what's next:** `docs/feedback-triage.md` — every collaborator suggestion, its decision and its build state. That's the live roadmap.
- **`SCOPE.md` is gone** (deprecated and deleted). The principles it held are summarised below; the phase plan moved into the triage doc.

> **Note:** the old Phase 0 code (the earlier non-working museum, plus a `_deprecated/` folder and a `content/*.json` data model) has been removed — the live app is entirely under `app/`, `components/`, `config/`, `contexts/`, `lib/`, `types/`, `utils/`.

## What this is

A calm, dreamlike **virtual 3D art gallery** for the ME/CFS community. Visitors *attend* an exhibition on rails — they never control the camera. The core visitor may be in bed, on an old phone, with brain fog: **accessibility and low energy cost are the value proposition, not features.** Both maintainers have ME/CFS — small milestones, no deadlines, heavy AI assistance.

## Stack

- **Next.js 15** (App Router), deployed on Vercel. Server-rendered, **not** a static export any more — API routes and the `/admin` panel need a server. `next.config.mjs` only sets `images.unoptimized`.
- **React Three Fiber v9 + drei v10 + three 0.178** for the 3D scene.
- **Tailwind CSS v4** for the HTML overlay UI.
- `react-swipeable` (touch nav), `maath` (easing/math), `lucide-react` (icons).
- `@vercel/blob` (storage) and `resend` (email) on the server side.
- **Vitest** for unit tests, **Playwright** for e2e.

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build

npm test          # Vitest — storage + admin state logic
npm run test:e2e  # Playwright — the admin moderation flow, in a real browser
npm run test:all  # both
```

Tests never touch real storage: they run the app with `GALLERY_STORAGE=memory` (see below).
`npm run test:e2e` starts its own dev server on port 3100; `npm run test:e2e:ui` opens the Playwright inspector.

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
- **Contexts:** `AnimationContext` (loading→title→scene transitions, scene opacity/blur), `TourContext` (current frame index, prev/next), `RoomContext` (active room), `ZoomContext` (artwork zoom state), `ShelfContext` (device-local favourites).
- **Live artworks come from the server.** `config/*.ts` supplies the rooms, themes and placeholder art; `Gallery.tsx` fetches `/api/artworks` on mount and merges approved submissions over it. `ImageMetadata` carries `id` (stable, copied from the submission at approval — the basis for favourites), `medium`, `shortDescription`, `longDescription`.

## Backend

No database. Everything persists as JSON and images in **Vercel Blob**.

- **`lib/blobStore.ts` is the only thing that talks to Blob.** It exposes `readJson` / `writeJson` / `putFile` behind a `BlobStore` interface with two backends: the real one, and an in-memory one selected by `GALLERY_STORAGE=memory` (what the tests run against). Two quirks documented in the file: the public URL is derived from the store id embedded in `BLOB_READ_WRITE_TOKEN`, and reads carry a cache-busting timestamp because the Blob CDN serves stale content after a write.
- **`lib/storage.ts` is the domain layer** — submissions, per-room artworks, settings. Use these helpers rather than writing to Blob directly. Two things to know before changing them:
  - Every mutation is a read-modify-write of a whole JSON file, so writes are **serialized per path** (`withLock`). Without it, a submission arriving mid-approval is lost.
  - Moderation goes through **`claimSubmission`**, which moves a submission out of `pending` only if it is still pending and returns it exactly once. That's what keeps approve idempotent under double clicks and retries; `releaseSubmission` undoes a claim whose follow-up work failed.
  - Artworks are removed **by identity** (`utils/artworkKey.ts`: `id`, falling back to `url`), never by array index.
  - Blob is **eventually consistent**: for ~10-15s after a write a read can still return the old version. Three things deal with it — `blobStore` prefers a value it just wrote itself, the admin reducer never lets a read undo a mutation, and `getPublishingSubmissions` reports approvals that are committed but not yet readable so the panel can show them as *publishing* instead of losing them. Assume a read may be stale; never treat one as authoritative over a local mutation.
  - Approval carries the artist's **slot** (`ImageMetadata.slot`) — the empty canvas they submitted through — so the piece hangs where they put it. `layoutRoom()` in `Gallery.tsx` places pinned slots first, then fills the rest in order; a taken slot falls back to the next free wall.
- **`lib/email.ts`** — Resend. Approval/rejection templates are editable in `/admin` (`{{artist}}`, `{{title}}`, `{{gallery_url}}`). Sending is deliberately **outside the transaction**: an email failure is logged and reported, but never turns a committed moderation into an error.
- **`lib/audioNarration.ts`** — optional generated audio descriptions. Approval tries to turn the artwork title/artist/short+long descriptions into speech, stores the audio in Blob, and adds `audioUrl` to the approved artwork. This is deliberately best-effort: a TTS failure is logged but never blocks approval. The dev-only admin tab stores/selects the audio provider (`local`, `openai`, `elevenlabs`, or `disabled`) in settings; local/OpenAI use an OpenAI-compatible `/audio/speech` shape, ElevenLabs uses `POST /v1/text-to-speech/:voice_id`. Env vars still work as fallback: `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMAT`, `TTS_TIMEOUT_MS`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`, `ELEVENLABS_OUTPUT_FORMAT`.
- **Auth:** `middleware.ts` puts Basic Auth on `/admin/*` and `/api/admin/*` (`ADMIN_USER`, `DEV_USER`, `ADMIN_PASSWORD`). `DEV_USER` defaults to `dev` and uses the same password, but unlocks the Developer tab and developer-only admin endpoints. Env vars live in `.env.local`, plus `BLOB_READ_WRITE_TOKEN`.

### API routes

| Route | Auth | What it does |
|---|:--:|---|
| `POST /api/submit` | — | Uploads the image, saves a pending submission, notifies moderators |
| `GET /api/artworks` | — | Approved artworks per room, for the gallery |
| `GET /api/admin/submissions` | ✔️ | The pending queue |
| `POST /api/admin/submissions/[id]/approve` | ✔️ | Claims, hangs the artwork, emails the artist. Returns `{ ok, artwork, roomId }` |
| `POST /api/admin/submissions/[id]/reject` | ✔️ | Claims and emails the artist |
| `GET /api/admin/artworks` · `DELETE /api/admin/artworks/[roomId]` | ✔️ | Returns `{ artworks, publishing }`; delete takes `{ id }` |
| `GET \| PUT /api/admin/settings`, `POST .../test-email` | ✔️ | Resend key, moderators, templates |
| `POST /api/testing/reset`, `GET /api/testing/blob/*` | — | **Test fixtures. 404 unless `GALLERY_STORAGE=memory`** |

### The admin panel

`app/admin/` — the shell owns all server state; the tabs are pure views.

- **`adminState.ts`** — a pure reducer holding submissions *and* artworks together. Two rules it exists to enforce, both from real bugs: state lives above the tabs so switching tabs never remounts or refetches, and **a load never undoes a mutation** (it remembers what was approved, rejected and deleted, and reconciles stale reads against that).
- **`useAdminData.ts`** — the reducer plus the fetch calls; mounted once in `AdminDashboard`.
- **`AdminDashboard.tsx`** — presentation only. `data-testid` attributes here are load-bearing for the e2e suite.

## Tests

- **`tests/unit/`** (Vitest, `npm test`) — `lib/storage.ts` against the memory backend (idempotency, write serialization, delete-by-id) and the admin reducer (optimistic updates, rollback, stale-read guards).
- **`tests/e2e/`** (Playwright, `npm run test:e2e`) — drives the real admin panel: a card appears, moves to Approved when approved, doesn't come back on tab switch / refresh / reload, and the right artwork is deleted. Failure paths are covered by intercepting the API. Some tests log `[timing]` lines and assert a budget, so a regression that reintroduces a full reload shows up as a slowdown.
- **Seeding:** `tests/e2e/fixtures.ts` → `seed(request, {...})` wipes and populates the in-memory store via `/api/testing/reset`.
- Adding an admin feature? Add the reducer case in `tests/unit/adminState.test.ts` and the user-visible outcome in the e2e spec.

## Principles worth keeping

These have held up so far; they came from `SCOPE.md` and from what the community asked for. They're the default, not a law.

1. **On rails.** The visitor never controls the camera. ← / → move artwork-to-artwork; room select jumps rooms.
2. **All navigation UI is HTML over the canvas, never inside the 3D scene** — screen readers must traverse the gallery as a list. Keyboard-navigable.
3. **Respect `prefers-reduced-motion`** for every animation (glides become crossfades).
4. **Energy/performance is the value prop, not an afterthought.** Low-poly, no photorealism, no 4K textures; keep GPU cost near zero while the visitor is still. Load budget: door+lobby ≤ 5 MB, each room ≤ 2 MB. Target: a 4-year-old mid-range Android.
5. **No autoplay** of sound/video. No flashing content. Calm typography, generous spacing.
6. A plain **list view** fallback is a first-class requirement — **still the biggest gap** (not built).

## Pending / known state

- **The accessible list view is not built** — see principle 6. Biggest open item.
- Submissions, moderation and email are **built and working** (see *Backend* below).
- **No linter configured**; `npx tsc --noEmit` plus the test suites are the checks.
- **Floor reflection flicker** (`MeshReflectorMaterial` on the floor) is a known issue — parked, not being worked on right now.
- Rooms II–IV have no artworks yet; filled with submit canvases.

## Theming (dark / light)

- **Source of truth:** the `data-theme` attribute on `<html>` (`"dark"` | `"light"`), **default dark**, persisted in `localStorage` under the key `theme`. An inline script in `app/layout.tsx` applies it before first paint (no flash); `<html>` is rendered with `data-theme="dark"` + `suppressHydrationWarning`.
- **Tokens live in `app/globals.css`:** dark values are the defaults in `:root`; light values override under `:root[data-theme='light']`. Three groups — `--door-*` (landing), `--panel-*` (overlay modals: surface/border/shadow/title/subtitle/text/separator/button), `--field-*` (form inputs inside modals). There's also a global `::placeholder` rule using `--field-hint`.
- **Toggle:** `components/ui/ThemeToggle.tsx` — an icon button (lucide `Sun`/`Moon`) that just flips the attribute + writes `localStorage`. Mounted in the door (`app/page.tsx`, styled via `.door-toggle`) and in the `HamburgerMenu` "Appearance" section. Never mounted twice at once, so it holds no shared state.
- **Scope (deliberate):** the theme only skins the **HTML chrome that used to be light** — the door and the two overlay modals (`ArtworkInfoModal`, `SubmitArtworkModal`). The **3D scene keeps its curated per-room atmosphere** regardless of theme. The `HamburgerMenu` and the HUD chips/plaques are **not yet theme-aware** (they stay as-is) — themable later if we want a full light mode.
- **Adding a new overlay/panel:** reuse the `--panel-*` / `--field-*` variables instead of hardcoding cream/dark colors, and it will follow the theme for free.

## Local preferences

- **Source of truth:** browser `localStorage`, not cookies. Preferences are per-device and the server has no reason to read them; there are no accounts.
- **Visit resume:** `utils/userPreferences.ts` stores `{ roomId, frameIndex, updatedAt }` under `cfs-gallery:visit-position:v1`. This is deliberately a **room + slot position**, not artwork identity: `roomId` survives room reordering, and `frameIndex` matches the current eight-slot room model (including empty submit canvases).
- **Tour slots:** arrow navigation skips empty submit canvases in either direction. Moving next from the last real artwork deliberately ends at the bench/rest view, where the visitor can choose the next room or leave; do not disable that final Next action just because later slots are empty.
- **Menu comfort:** the draggable hamburger tab Y position is stored under `cfs-gallery:menu-tab-y:v1` and clamped away from viewport edges.
- **My shelf:** device-local favourites under `cfs-gallery:shelf:v1`, via `ShelfContext` + `readShelf`/`writeShelf`.
- **Failure mode:** storage access is optional and wrapped in `try/catch`; private mode, disabled storage, or malformed values fall back to Room I / overview.
- **Future preference work:** add small typed helpers to `utils/userPreferences.ts` with versioned keys instead of scattering raw `localStorage` calls across components.

## Conventions

- Docs shared with the Reddit collaborator stay in **English** (this file, `docs/feedback-triage.md`). Luis communicates in Spanish.
- Placeholder art lives in `public/art/*.svg`; plaque text is lorem ipsum until real submissions arrive.
- Keep new code in the style of the surrounding files (config-driven rooms, HTML overlay for anything interactive/accessible).
