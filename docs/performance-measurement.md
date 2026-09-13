# Measuring the scene's performance

Two traps worth knowing before tuning anything, both measured on this project.

## Frame time inside a headless capture is not the app's frame time

In a headless capture the gallery sits at **~50 ms/frame (about 20 fps)** while a
plain 1280×960 WebGL canvas in the same browser does **60 fps**. That ceiling
does not move when:

- the floor reflection resolution goes 1024 px → 256 px (two local production
  builds, identical frame times),
- the floor pattern layer is removed, or
- dev is compared with production (both ~20.9 fps).

A DevTools trace over six seconds of the tour puts the scene's own
animation-frame JavaScript at **~3.4 ms/frame**; the largest entries are
GPU-command plumbing plus **one synchronous pixel readback per frame**
(`GLES2::ReadPixels` with a matching `WaitForCmd`) — characteristic of the
headless compositor, not of the scene.

**So: judge by a real browser window, on a production build, with the camera
moving** — DevTools → Rendering → Frame Rendering Stats, or the Performance
panel. Tuning against the capture harness will chase an artefact of the harness.

## The real cost lever on the target device is the GPU tier

`useDetectGPU` (drei) picks the floor's reflection resolution: the low tier uses
512 px per room (`utils/floorDesign.ts`), raised from 124 px because 124 px made
the reflection crawl during camera moves. If a change has to pay for itself on a
4-year-old mid-range Android, that reflection pass is where the pixels are — not
in the floor's pattern texture, which is a single 512² JPEG (or a 256²
generated mask in Room I).

## If you trace it yourself

Chrome DevTools Protocol `Tracing.start` wants its categories as a
**comma-separated string**; passing an array returns `Invalid parameters` and the
trace never starts. The harness used for the numbers above (frame-time sampling,
a plain-canvas control, and the trace aggregator) is kept outside the repository,
on the maintainer's machine.
