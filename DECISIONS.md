# Pending Decisions

Things to revisit once the gallery is more defined. Keep this file updated.

---

## UI — Controls info button (`Controls.tsx`)

**Status**: hidden (component returns `null`)
**Content moved to**: `HamburgerMenu` drawer (Controls section at the bottom)

**Decision needed**: Keep it in the drawer permanently, restore the floating button, or drop the component entirely?

---

## UI — "Artwork Info" button (`ArtworkInfoModal.tsx`)

**Status**: button removed; modal still opens via tap on the zoomed artwork (3D `CustomEvent`)

**Decision needed**: Is tap-to-open discoverable enough for users? Options:
- Add a subtle hint label the first time ("Tap the artwork to learn more") — fade out after a few seconds
- Add a small label below the frame in 3D space (less intrusive than the old floating button)
- Re-add the button but in the HamburgerMenu or as part of the TourControls pill
- Leave as-is and rely on onboarding copy

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
