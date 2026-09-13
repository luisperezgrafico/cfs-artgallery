# The room environment map

The gallery's ambient/reflected light comes from an HDRI **served from this repo**
(`public/hdri/`), never from a third-party CDN at runtime.

## Why

`<Environment preset="city" />` (drei) does not ship its map: at runtime it fetches
`https://raw.githack.com/pmndrs/drei-assets/456060a2.../hdri/potsdamer_platz_1k.hdr`.
The map loads *inside the same Suspense boundary* as the scene, so when that CDN does
not answer, the gallery never leaves "Loading" — the 3D scene is fully held back by a
third-party host nobody chose. For a community that opens the gallery on a slow
connection, that is the whole visit.

`components/MuseumStage.tsx` therefore points `<Environment files=...>` at a local file.

## What is served

    public/hdri/potsdamer_platz_512.hdr     387 KiB (396,446 bytes)
    sha256 ac3474af3886dfcd6a5959d869266c168258b0dd30e1d5dfd231f0c5698fa2fd

It is the **same image** the `city` preset uses, downsampled by 2 in each axis:

- Upstream: `pmndrs/drei-assets`, commit `456060a26bbeb8fdf79326f224b6d99b8bcce736`,
  file `hdri/potsdamer_platz_1k.hdr`, 1,540,678 bytes, 1024×512,
  sha256 `7afe4c2f9700ee78c7477c53fa355463d7dda1fdede401432d6b5f9ff0a95696`
  (that is the exact file drei's `city` preset loads).
- Original author/licence: **"Potsdamer Platz" by Greg Zaal, polyhaven.com — CC0**
  (public domain, redistribution allowed; https://polyhaven.com/license).
  drei-assets' own README states its HDRIs come from HDRI Haven (now Poly Haven).
- Downsampling: plain 2×2 box average **in linear radiance** (the file is Radiance
  RGBE, decode → average → re-encode; no gamma or 8-bit step, no colour grading).
  The env map is PMREM-filtered by the renderer, whose sharpest level is a 256² cube
  face — a 512×256 equirect already covers that face 1:1, so nothing the GPU samples
  is lost. Measured against the 1024×512 original, the largest per-pixel difference
  anywhere in any of the four rooms is 3/255.

Regenerating the asset (no dependency added; the source is CC0):

```bash
curl -L -o /tmp/potsdamer_platz_1k.hdr \
  https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/potsdamer_platz_1k.hdr
sha256sum /tmp/potsdamer_platz_1k.hdr   # must be 7afe4c2f…a95696
# then: decode RGBE -> average each 2x2 block in linear space -> re-encode RGBE/RLE
```

## Known remaining external fetch (not this map)

`Floor.tsx` and `CameraManager.tsx` call drei's `useDetectGPU()`, which downloads a
GPU benchmark table from `https://unpkg.com/detect-gpu@5.0.70/dist/benchmarks/…`
at runtime. It is *not* fatal: when the fetch fails, detect-gpu falls back to tier 1
and the page still renders — but the fallback tier makes `Floor` pick its `low`
material variant, so the floor's finish offline still depends on a third-party fetch.
Changing that means touching `Floor.tsx` (the GPU tier also drives the reflection
resolution), which is out of scope here; it is recorded so it is not forgotten.
