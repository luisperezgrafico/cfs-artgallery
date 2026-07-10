# ME/CFS Community Gallery

A calm, dreamlike virtual exhibition of art made by the ME/CFS community.
See [SCOPE.md](./SCOPE.md) for the full vision, principles, and phase plan.

**Status: Phase 0 prototype** — one mist room, 4 placeholder artworks, rail-based
camera navigation. The goal of this phase is to feel whether the experience works
on a low-energy day before committing to the MVP.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm run build` produces a fully static site in `out/` (deployable to Vercel or any static host).

## How it's put together

- **Next.js (static export) + React Three Fiber** — no backend, no database.
- `content/room.json` — the room is data: theme colors + artwork list. New rooms = new config.
- `lib/gallery.ts` — layout math: artworks on an arc, one camera viewpoint per artwork.
- `components/Gallery.tsx` — state: current viewpoint, comfort settings, reduced-motion fade.
- `components/Scene.tsx` — the 3D room: fog, floating panels, ambient particles/crystals.
- `components/CameraRig.tsx` — camera on rails; glides between viewpoints, never free-roams.
- `components/Overlay.tsx` — all UI is HTML over the canvas: accessible buttons, plaque,
  screen-reader announcements.

Comfort rules baked in: `prefers-reduced-motion` switches glides to crossfades,
"Ambience off" freezes the room and drops GPU use to zero while still, sound does not exist yet
(and will never autoplay).
