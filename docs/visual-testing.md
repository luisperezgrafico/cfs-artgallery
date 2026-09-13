# Visual smoke captures

`scripts/visual-smoke.cjs` grabs **verified screenshots of the real gallery** when touching the 3D
scene or the overlay UI. Not the e2e suite (`npm run test:e2e` covers admin moderation), not a
framework: two captures, one JSON report each.

```bash
npm run dev                       # gallery on http://localhost:3002
node scripts/visual-smoke.cjs --view entrance
node scripts/visual-smoke.cjs --view artwork --room room-1 --frame 0
node scripts/visual-smoke.cjs --help
```
Needs the repo's installed Playwright and a Chrome/Chromium it can launch (system Google Chrome
first, Playwright's Chromium as fallback; the chosen one is recorded). Fresh isolated context, no
cookies or profile, viewport **1280 × 960**, browser always closed in `finally`.

## Views

| Mode | What it does | What the screenshot shows |
|---|---|---|
| `--view entrance` (default) | Opens `/`, waits for hydration, clicks the real accessible button **"Enter the gallery"** | The entrance/**overview** with **"Start the Tour" still present** |
| `--view artwork --room <id> --frame <n>` | Opens `/?room=<id>&frame=<n>` | That **one frame/artwork**, with the tour controls |

**The difference is deliberate.** Entrance mode never touches "Start the Tour" — it captures what a
visitor sees before starting. Artwork mode uses the `?room=&frame=` entry point, which `app/page.tsx`
+ `TourContext` treat as "open at this frame", so **the app itself starts the tour there**
(`isTourStarted = true`, counter `1 / 8`). That is real app state, not something the script forces.
For the last actual artwork the forward control is `Finish tour at the rest view` instead of
`Next artwork`; both are accepted. Nothing else is clicked, injected or dismissed: no CSS injection,
no overlay dismissal, no faked UI.

## How readiness is decided

`http 200` / `networkidle` / "a canvas exists" are **not** readiness. Every sample requires **all**:

- **No blockers** — the `LoadingScreen` (`fixed … bg-black z-50`, "Loading N%") and the `TitleOverlay`
  (`z-40 pointer-events-none`) are gone.
- **Real UI anchors** — `Open menu` visible, plus the mode's controls: `Start the Tour`, or
  `Exit tour` + `Previous artwork` + forward control + the `N / 8` counter matching `--frame`.
- **Scene settled** — every ancestor of the `<canvas>` has computed `opacity ≥ 0.99` and no
  `blur(>0.1px)`. `MuseumStage` drives those from `AnimationContext` (`sceneBlur` starts at 8 and the
  title fade sets it to 0). A non-zero blur means the stage was not settled *at capture time* — read
  the report for which condition was unmet rather than assuming one cause.
- **Mode state** — entrance: tour not running; artwork: tour running at the requested frame.

Three **consecutive identical** samples (~300 ms apart) are required inside one bounded wait
(`--timeout`, default 75 s). Every wait — navigation, hydration, click, probe, screenshot — is
clamped to what is left of that budget, so nothing hides extra minutes.

**Hydration:** the door is server-rendered, so `Enter the gallery` is visible *before* React hydrates
and a click then is silently dropped. The wait for React's props on `.door-enter` is only a fast-path
hint — **a React internal that may change**; clicks are retried at most 5 times and the **real
confirmation is that the door disappeared**.

## Evidence and exit codes

Each run gets a **fresh** directory (a `mkdtempSync` subdirectory of `--out-dir`, default the OS temp
dir), so `result.json` and the PNG are never reused: `shot-<view>-<run-id>.png` + `result.json`.
That JSON holds status, view/room/frame, URL, viewport, `renderer` + `rendererSource` (read from the
canvas's existing WebGL2 context), browser channel and args, readiness conditions, post-capture
verification, per-sample stage `opacity`/`filter`, `pageErrors`, `consoleErrors`, `consoleWarnings`,
`failedRequests`, `httpErrors`, `navigationNote` and absolute `files` paths.

- exit 0 — captured **and re-verified after the shot**: readiness still true, a WebGL renderer present
  and not context-lost, no uncaught page error. Console errors and the usual WebGL driver
  **warnings are recorded but never fail a run**.
- exit 2 — invalid arguments (bad `--view`/`--room`/`--frame`/`--timeout`/URL, unknown flag;
  `--frame` must be decimal digits only). Nothing is launched; rooms and the slot ceiling come from
  `config/roomsConfig.ts` and `config/roomConfig.ts` (`ROOM_CAPACITY`).
- exit 3 — readiness timeout: diagnostic screenshot + JSON with the unmet conditions, last samples,
  visible controls, errors and failed requests. Reported as TIMEOUT, no guessed cause.
- exit 4 — runtime failure: server unreachable (cheap preflight, no browser), browser not launchable,
  or **post-capture verification failed** (readiness lost, no renderer, context lost, uncaught page
  error). PNG + JSON are still written. Reports go to stdout/stderr and files only — nothing is sent
  anywhere; hand the absolute paths to whoever should deliver them.
