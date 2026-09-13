# Floor stone — what each room's floor is cut from

Reference for `utils/floorDesign.ts` and `utils/floorPattern.ts`. Two registries,
and the split matters:

| File | Answers |
|---|---|
| `utils/floorDesign.ts` | **How the light behaves**: `mirror`, `mixStrength`, `roughness`, `mixBlur`, `metalness`, a hue nudge. |
| `utils/floorPattern.ts` | **Which stone** the floor is cut from: the pattern laid on it, and the studies that were tried. |

## Why a colour map cannot do this

Room floors are almost black (`#050505`–`#0a0806`), so a `map` has nothing to
colour. drei's `MeshReflectorMaterial` shader ends with

```
diffuseColor.rgb = diffuseColor.rgb * ((1 - mirror) + reflection * mixStrength)
```

— the albedo **multiplies the reflection**. So the pattern is still a lever, but
as a *multiplier on the reflection*, not as paint. Two techniques use it:

- `albedo-map` (Room I): a mask generated in code, RGB = the multiplier, pushed
  by `1 / mean(field)` so the floor's average brightness does not move. Cost:
  one 256² texture, generated once, disposed on unmount.
- `overlay-mesh` (Rooms II–IV): a photograph of stone laid as a thin veil over
  the reflector. This is the one that works where the reflection is a sharp
  mirror — dimming a mirror reads as stripes over the room, not as stone.

Rooms II–IV keep **jointless** photographs on purpose: no grout, no squares, no
drawn figure. A study that reads as *pattern* — stripes, banding, a printed
figure — is rejected however good its luma numbers look. Same rule as
`docs/credits.md` and `utils/floorDesign.ts`: material, not decoration. All CC0
from [ambientCG](https://ambientcg.com), see `docs/credits.md` for licences.

## What each room lays

| Room | Stone | Dose | Floor band (measured) | Wall band |
|---|---|---|---|---|
| I — Ocre Profond | generated veining, waxed sienna | gain 1.1 | 30.4 | 79.7 |
| II — Ardoise | `marble023_512.jpg`, blue-black marble | 18% | 52.0 | 87.6 |
| III — Vert Forêt | `concrete030_512.jpg`, tinted green | 22% | 46.9 | 98.3 |
| IV — Indigo | `terrazzo005_512.jpg`, poured aggregate | 24% | 51.4 | 91.0 |

The bands come from the capture harness (`scripts/visual-smoke.cjs` style runs,
floor = the 0.55–0.80 band of the frame, wall = 0.30–0.42). Use them as the
before/after reference when touching a floor: the room's own stone should leave
the wall band alone.

Shipped assets: ~245 KB for the three photographs (Room I carries none).

## Studies

`?floor=<key>` previews a study, and only in the room it was cut for — a key
from another room resolves to that room's own floor instead, so nothing can be
laid by accident. Only two kinds of study are kept in the registry: one that
proves a *technique* cannot work, and one stone a room could still choose. The
dose scans and rejected rounds are deleted; the numbers that decided each room
live in the comment above that room.
