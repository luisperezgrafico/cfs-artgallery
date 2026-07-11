# ME/CFS Community Art Gallery — Project Scope

*Working draft — July 2026. Co-created by Luis + [Reddit collaborator]. This document is the
source of truth for what we're building and, just as importantly, what we're deliberately not building.*

---

*Revision log:*
- *July 2026 — Phase 0 prototype completed and deployed to Vercel.*
- *July 2026 — Architecture updated: Lobby + 3 fixed themed rooms, blank-canvas submission
  system, Vercel Blob storage, curator approval queue.*

---

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
   rooms cost curation effort, not engineering effort.
4. **Sustainable pace for us too.** Both maintainers have ME/CFS. Small milestones, no deadlines,
   heavy use of AI assistance for implementation. The architecture must survive weeks of nobody
   touching it.

## The experience

### Entry
- A minimal "door" page: name, one sentence, one button/gesture to enter. No corporate landing.
- Serves as the shareable cover (Reddit, link previews) and as the ritual moment of *entering*.

### Gallery structure: Lobby + 3 themed rooms

```
[ Door ] → [ Lobby ] → Room A
                     → Room B
                     → Room C
```

**Lobby (reception):** The first space after the door. Museum-like interior: reception desk feel,
warm light, a few featured or recent works on display. Three visible passages/arches lead to the
themed rooms. The lobby is also the hub for the map overlay.

**Three themed rooms (fixed for now):** Each room has its own palette, atmosphere, and a mix
of filled artwork panels and blank canvases. Rooms are permanent for this version — new rooms
are a future development milestone, not something that grows automatically.

### Navigation: guided tour on rails
- The visitor **never controls the camera**. Two levels of navigation:
  - **← / →** within a room: moves artwork to artwork (including blank canvases).
    Passing the last slot in a room returns to the lobby.
  - **Room select:** from the lobby, or via the map overlay, jump to any room directly.
- The "walk" between viewpoints is an automatic camera glide with easing.
  With `prefers-reduced-motion` (or a manual toggle), glides become crossfades.
- **Plaque:** each filled artwork shows title, artist, medium, and the artist's own words —
  on request, like stepping closer to read the label.
- **Blank canvas plaque:** shows a brief invitation and an "Submit your work" button that
  opens the upload modal (see Submission system below).

### Themed rooms as a template system
- Each room = one config file: theme, palette, fog/light settings, ambient decoration kit
  selection, and the list of frame slots (filled or blank) with wall positions.
- Ambient decoration kit (reusable, shader/instance-based, cheap): swaying low-poly vegetation,
  water as animated shaders, fog, floating particles, sky/light gradients.
- Dreamlike stylization is the aesthetic *and* the performance strategy: no photorealism, no
  dynamic shadows, no 4K textures.
- Decoration is restrained: the art is the protagonist; atmosphere supports it.
- **Museum interior aesthetic:** actual walls, floor, ceiling (not a floating void), benches,
  warm gallery lighting, recognisable museum-room proportions. This grounds the dreamlike
  elements and makes the space feel curated and dignified.

### Prototype filling strategy
For testing both flows, rooms are seeded at approximately **50% filled / 50% blank**:
- Filled slots: placeholder SVG artwork (as in Phase 0) with realistic plaque data.
- Blank slots: visible empty frames with the submission invitation.

### Comfort controls (persistent, one tap)
- Motion: glide ↔ crossfade
- Ambient animation: on/off (freezes room, drops GPU to zero while still)
- Sound: off by default; optional ambient audio, never autoplay

## Submission system

Artists submit directly from inside the gallery — approaching a blank canvas triggers the flow.

### Upload flow (artist side)
1. Artist approaches a blank canvas → plaque shows: *"This space is waiting for you."*
2. Button: **"Submit your work"** → opens an upload modal (HTML overlay, not 3D).
3. Modal collects: image file, title, medium, short statement (optional), name/handle,
   consent checkbox (display permission + "all rights reserved by artist").
4. Image uploaded to **Vercel Blob** (free tier: 500 MB storage / 1 GB transfer per month —
   sufficient for hundreds of optimised artwork images).
5. Submission metadata written to a simple JSON queue file (no database: just a Vercel KV
   entry or a serverless function appending to a flat file).
6. Artist sees: *"Thank you — your work is in review. We'll add it to the gallery soon."*
7. The blank canvas remains blank until a curator approves. The specific slot is not reserved —
   approval assigns the work to the next available blank in any room.

### Approval flow (curator side)
- A password-protected route (`/admin`) — basic HTTP auth, no full auth system needed.
- Lists pending submissions: thumbnail preview, title, artist, statement, consent confirmation.
- Two actions: **Approve** (assigns to a blank slot → image moves to permanent Blob path,
  room JSON updated, redeploy triggered) or **Reject** (sends a gentle notification, file
  deleted from Blob).
- Curators: Luis + collaborator. No public moderation, no community voting.

### Storage notes
- Vercel Blob free tier covers the MVP comfortably. If the gallery grows significantly,
  the upgrade to Pro ($20/month) is the only cost change — no architecture change.
- Approved images are stored in Blob and referenced in room JSON. They survive deploys.
- Pending/rejected images are cleaned up after the curator decision.

## Accessibility requirements (non-negotiable)

- All navigation UI is **HTML on top of the canvas**, never inside the 3D scene. Screen readers
  traverse the gallery as a list: "Room A, slot 3 of 8: *Title*, by *Artist*" + alt text +
  plaque content. Full keyboard navigation.
- The upload modal is a standard accessible HTML form — fully keyboard navigable, labelled inputs.
- `prefers-reduced-motion` respected for every animation, including camera glides.
- No autoplay of sound or video. No flashing content. Calm typography, generous spacing.
- Works on a mid-range phone over a weak connection (see performance budget).
- A plain **list view** of the gallery exists as a first-class fallback — also the SEO/share
  surface and the guarantee that no one is locked out.

## Performance budget

Informed by measuring a Unity-based platform gallery (Metasteps): 66 MB transferred / 122 MB
in RAM. Our budget:

- Initial load (door + lobby): **≤ 5 MB**
- Each additional room: **≤ 2 MB**, lazy-loaded on approach
- GPU renders **only during transitions/ambient animation** (demand-based frameloop);
  a still visitor costs zero battery
- Target: smooth on a 4-year-old mid-range Android

## Architecture

- **Stack:** Next.js (App Router, not static export — required for server actions/API routes
  needed by the submission system) + React Three Fiber + drei, hosted on **Vercel**.
- **Vercel Blob:** image storage for artwork uploads (free tier sufficient for MVP).
- **Vercel KV (or simple API route + JSON):** lightweight queue for pending submissions.
  No traditional database.
- **No visitor accounts.** The only "auth" in the system is the curator `/admin` route
  (HTTP basic auth via middleware — one env var with a hashed password).
- **Content structure:**
  - `content/rooms/<slug>.json` — room config (theme, ambient, frame slots with filled/blank state)
  - `content/artworks/<slug>.json` — approved artwork metadata (image URL in Blob, plaque data)
  - Pending submissions live in KV/queue only until approved or rejected.

## Out of scope (deliberately)

- Visitor accounts / login of any kind
- Comments, likes, social features
- Free-roam 3D navigation or photorealistic rendering
- Artists managing their own profile or editing submissions after approval
- Multiple curator roles or permissions
- Databases (Postgres, MongoDB, etc.)
- Real-time collaboration or live updates

## Phases

### Phase 0 — Prototype ✓ DONE
One circular room, low-poly, mist atmosphere, 4 placeholder artworks, prev/next rail navigation,
plaque, reduced-motion fallback, comfort controls. Deployed to Vercel.

### Phase 1 — Interior & structure
- Redesign room aesthetic: actual walls, floor, ceiling, benches, gallery lighting
- Implement Lobby + 3 themed rooms with the template system
- 50% filled / 50% blank frame slots (placeholder content)
- Map overlay, room-to-room navigation, lobby as hub
- Validate the full navigation flow on mobile

### Phase 2 — Submission system
- Upload modal triggered from blank canvases
- Vercel Blob image storage + upload API route
- Pending queue (Vercel KV)
- `/admin` curator approval panel with approve/reject
- Image optimisation on upload (resize, convert to WebP)
- Artist consent + attribution baked into the flow

### Phase 3 — MVP launch
- Real artworks from the community (call for submissions on r/cfs)
- List-view fallback, accessibility audit
- Optional ambient audio (off by default)
- Launch post

### Later (only if it still sparks joy)
- Artist statement pages, audio-described tours, seasonal special rooms
- Archive of "full" rooms as exhibitions close to new submissions

## Open questions

- Name + domain
- Themes for the 3 rooms (first ideas: nature/earth, night/rest, abstract/inner world?)
- Whether the collaborator wants to co-curate, co-build, or both
- Notification to artist on approval — email (needs a transactional email service) or
  just a message they can check via a submission token link?
