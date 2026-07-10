# ME/CFS Community Art Gallery — Project Scope

*Working draft — July 2026. Co-created by Luis + [Reddit collaborator]. This document is the
source of truth for what we're building and, just as importantly, what we're deliberately not building.*

## Vision

> "A sort of online art gallery for works made by the M.E. community. Not just a series of
> webpages but a clickable interactive exhibition experience — something to make them feel
> like they're there. Nothing too crazy, but thoughtful enough for those who are too sick to
> visit galleries to still be able to appreciate the effort and want to explore the art."

A dreamlike virtual gallery where the ME/CFS community exhibits its art. Visitors *attend* an
exhibition — they don't scroll a grid. Artists get the dignity of being *exhibited*, not uploaded.

## Guiding principles

1. **Energy-first design.** Our core visitor may be in bed, on an old phone, with brain fog,
   during PEM. Every design decision is tested against: *could someone enjoy this on a bad day?*
   Accessibility is not a feature — it is the value proposition.
2. **Immersion without the cost of a museum visit.** In a physical gallery, walking and
   wayfinding are the *price*, not the experience. We keep the sense of place (space, light,
   scale, atmosphere) and remove the simulation of effort (free-roam, camera control, getting lost).
3. **A system, not a set of handmade rooms.** Rooms are data + a shared template, so new
   exhibitions cost curation effort, not engineering effort.
4. **Sustainable pace for us too.** Both maintainers have ME/CFS. Small milestones, no deadlines,
   heavy use of AI assistance for implementation. The architecture must survive weeks of nobody
   touching it.

## The experience

### Entry
- A minimal "door" page: name, one sentence, one button/gesture to enter. No corporate landing.
- Serves as the shareable cover (Reddit, link previews) and as the ritual moment of *entering*.

### Inside: guided tour on rails
- The gallery is real-time 3D (stylized low-poly, dreamlike atmosphere), but the visitor
  **never controls the camera**. Navigation is a single mental model:
  - **← previous / next →** — always in the same place. Moves artwork to artwork; passing the
    last artwork of a room glides you into the next room. One interaction for the whole visit.
  - **Map** (optional overlay) — a stylized floor plan listing rooms and artworks for those with
    energy to jump around. Agency as an option, never a requirement.
- The "walk" between viewpoints is automatic: a short camera glide with easing.
  With `prefers-reduced-motion` (or a manual toggle), glides become crossfades.
- **Plaque**: each artwork viewpoint offers title, artist, medium, and optionally the story
  behind the piece — shown on request, like stepping closer to read the label.

### Rooms as a themed template system
- Each room = one config file: theme, palette, fog/light settings, a small set of ambient
  decorations picked from a shared kit, and the list of artworks with wall positions.
- Ambient kit (reusable, shader/instance-based, cheap): swaying low-poly vegetation,
  water (falls/pools) as animated shaders, fog, floating particles, sky gradients.
- Dreamlike stylization is the aesthetic *and* the performance strategy: no photorealism,
  no dynamic shadows, no 4K PBR textures. A room floating in mist says "made for us"
  better than a generic white-cube replica.
- Decoration is restrained: the art is the protagonist; atmosphere supports it.

### Comfort controls (persistent, one tap)
- Motion: glide ↔ crossfade
- Ambient animation: on/off (water, plants, particles freeze)
- Sound: off by default; optional ambient audio, never autoplay
- Brightness: default is low-glare; palette avoids harsh whites

## Accessibility requirements (non-negotiable)

- All navigation UI is **HTML on top of the canvas**, never inside the 3D scene. Screen readers
  traverse the exhibition as a list: "Nature room, artwork 3 of 8: *Title*, by *Artist*" + alt
  text + plaque content. Full keyboard navigation.
- `prefers-reduced-motion` respected for every animation, including camera glides.
- No autoplay of sound or video. No flashing content. Calm typography, generous spacing.
- Works on a mid-range phone over a weak connection (see performance budget).
- A plain "list view" of the exhibition (artworks + plaques as simple pages) exists as a
  first-class fallback — also our SEO/share surface and the guarantee that no one is locked out.

## Performance budget

Informed by measuring a Unity-based platform gallery (Metasteps): 66 MB transferred / 122 MB
in RAM — unusable on the devices our audience has. Our budget:

- Initial load (door + first room): **≤ 5 MB**
- Each additional room: **≤ 2 MB**, lazy-loaded on approach
- GPU renders **only during transitions/ambient animation** (demand-based frameloop);
  a still visitor costs zero battery
- Target: smooth on a 4-year-old mid-range Android

## Architecture

- **Stack:** Next.js (static export) + React Three Fiber (three.js) + drei, hosted on **Vercel**.
  Chosen for: declarative 3D that fits the template+data room system, mature ecosystem,
  and maximal AI-assistance friendliness.
- **No database, no backend, no auth.** Content lives in the repo:
  - `content/exhibitions/<slug>/room-<n>.json` — room config (theme, ambient, artwork layout)
  - `content/artworks/<slug>.md` — plaque data + image reference
  - Images optimized at build time (responsive sizes, modern formats)
- **Publishing** = add files, commit, deploy. Curation is the workflow, git is the CMS.
- **Artist submissions:** external form (Tally or similar) → we curate → we add to the repo.
  No user uploads, no accounts, no live moderation. Ever (see out of scope).

## Out of scope (deliberately)

- Visitor accounts / login of any kind
- Comments, likes, social features
- Free-roam 3D navigation or photorealistic rendering
- Direct artist uploads or self-service publishing
- Databases, CMS platforms, server-side code
- Anything requiring real-time moderation

## Phases

### Phase 0 — Prototype (validate the feeling)
One room, low-poly, one ambient theme, 3–5 placeholder artworks, prev/next rail navigation,
plaque, reduced-motion fallback. Goal: put it on phones, feel it on a low-energy day, show the
subreddit friend. **Kill or commit based on this.**

### Phase 1 — MVP (first real exhibition)
- The door page
- 2–3 themed rooms from the template system, 8–15 curated artworks
  (possibly a call for art in the subreddit)
- Comfort controls, list-view fallback, map overlay
- Launch post in the community

### Phase 2 — v1
- Submission form + curation workflow documented
- Second exhibition; archive of past exhibitions
- Optional ambient audio

### Later (only if it still sparks joy)
- Artist pages, audio-described tours, seasonal/one-off special rooms

## Open questions

- Name + domain
- Theme of the first exhibition (and whether to open a call for art on r/cfs)
- Credit/licensing model for artists (plaque always credits; ask artists for display permission
  in the submission form; default "all rights reserved by artist")
- Whether the collaborator wants to co-curate, co-build, or both
