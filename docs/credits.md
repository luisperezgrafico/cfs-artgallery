# Credits

## Ambient music

- The default is **“Calm Loop”** by **wipics**, a 314 KB CC0/public-domain
  ambient loop: <https://opengameart.org/content/calm-loop>.
- A replacement can be uploaded in Admin → Settings → Ambient music.

## Floor stones

Rooms II–IV lay a photograph of stone over the floor. Every file is **CC0** from
[ambientCG](https://ambientcg.com), downscaled to 512² and re-encoded, so the
shipped set costs ~180 KB:

- `marble023_512.jpg` — [Marble 023](https://ambientcg.com/view?id=Marble023), Room II.
- `concrete030_512.jpg` — [Concrete 030](https://ambientcg.com/view?id=Concrete030), Room III.
- `concrete036_512.jpg` — [Concrete 036](https://ambientcg.com/view?id=Concrete036), Room IV.

`public/floor-pattern/` also holds three textures used only by the prototypes
reachable through `?floor=<key>` (Marble 012, Marble 016, Terrazzo 005) — same
licence, safe to delete with the prototypes they belong to. Room I's stone is
generated in code, so it carries no asset: see `utils/floorPattern.ts`.
