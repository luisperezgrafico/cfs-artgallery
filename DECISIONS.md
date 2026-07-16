# Pending Decisions

Things to revisit once the gallery is more defined. Keep this file updated.

---

## UI — Controls info button (`Controls.tsx`)

**Status**: hidden (component returns `null`)
**Content moved to**: `HamburgerMenu` drawer (Controls section at the bottom)

**Decision needed**: Keep it in the drawer permanently, restore the floating button, or drop the component entirely?

---

## UX — Artwork interaction model (settled direction, pending implementation)

Agreed interaction flow:
- **Tap artwork (while zoomed)** → lightbox image viewer with pinch-to-zoom / pan
- **Tap plaque (below frame in 3D)** → description modal (`ArtworkInfoModal`)
- **Swipe down** → exit zoom (gesture not yet implemented; currently X button only)

**Plaque implementation plan** (`Frame.tsx`):
- Add a `<Html>` drei element below each frame with title / artist / year
- Include a subtle `···` or `+` indicator to suggest more content
- On click/tap: dispatch `open-artwork-info` CustomEvent (same as current tap-on-frame)
- Remove the current `open-artwork-info` dispatch from frame tap (repurpose for lightbox)

**Lightbox implementation plan** (`ArtworkLightbox.tsx`, new):
- Opens when user taps the zoomed artwork (receives the image URL)
- Full-screen overlay, dark background
- Pinch-to-zoom + pan via `touch-action: none` and pointer events
- Double-tap to reset zoom
- Library option: `react-medium-image-zoom` (simple) or custom (more control)
- Documented in HamburgerMenu controls section ✓

---

## Rooms — Navigation structure

**Status**: HamburgerMenu has 4 placeholder rooms (only Room 1 active)

**Decision needed**: Before building the other rooms, settle the design of Room 1 fully (lighting, bench placement, frame layout, info UX). Then replicate the pattern.

Room ideas noted so far:
- Room 1 — Quiet Landscapes (current)
- Room 2 — Portraits & Faces
- Room 3 — Abstract & Texture
- Room 4 — Night & Rest

---

## HamburgerMenu — Additional content ideas

Things that could go in the side drawer eventually:
- "About this gallery" — short paragraph about the ME/CFS Community Gallery project
- "Submit your work" — link or info for artists who want to contribute
- Accessibility / comfort settings (reduce motion, increase contrast)
- Language toggle if the gallery goes multilingual
- Social / contact links
