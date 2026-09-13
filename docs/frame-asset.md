# Imported ornate frame asset

`public/models/frames/fancy-picture-frame-01.glb` is a compact, frame-only
derivative of [Poly Haven's fancy_picture_frame_01](https://polyhaven.com/a/fancy_picture_frame_01).
Poly Haven distributes it under [CC0](https://polyhaven.com/license). The
source download and page metadata used for this import were supplied locally in
`/tmp/cfs-frame-research` on 2026-09-07.

## Reproduce

No asset-pipeline dependency is needed. The packer does **not** download its inputs.
If the temporary research folder no longer exists, download these original files
into a directory of your choice (keeping the listed names):

- `original.gltf`: [original 1K glTF](https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf).
- `fancy_picture_frame_01.bin`: [geometry buffer](https://dl.polyhaven.org/file/ph-assets/Models/gltf/8k/fancy_picture_frame_01/fancy_picture_frame_01.bin) (the shared buffer is under `8k`; this is **not** an 8K texture download).
- Under `textures/`: [normal](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/fancy_picture_frame_01/fancy_picture_frame_01_nor_gl_1k.jpg), [diffuse](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/fancy_picture_frame_01/fancy_picture_frame_01_diff_1k.jpg), [roughness](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/fancy_picture_frame_01/fancy_picture_frame_01_rough_1k.jpg). Keep each original filename.

```sh
python3 scripts/prepare-ornate-frame.py --source /path/to/source -o public/models/frames/fancy-picture-frame-01.glb
```

Source creators: Rico Cilliers (modeling) and Rob Tuytel (scan/painting), per the
Poly Haven asset page. The packer is specific to this source revision; validate
its output with the actual-GLB unit tests after changing any inputs.

The script retains only the source frame mesh (629 vertices, 936 triangles) and
its normal, base-color and roughness 1K JPEGs. It excludes the separate canvas
mesh (2 triangles) and all three canvas textures. Current output is 513,988
bytes, below the 600 KB target.

## Geometry mapping

The source mesh's inner opening was measured from its innermost rail vertices,
not from the backing canvas: x = +/-0.22181040 and y = +/-0.16248018. Its
native aperture is therefore 0.44362080 x 0.32496036 units. The backing canvas
extends behind that opening and is intentionally absent from the output.

`adaptImportedFrameGeometry()` clones the cached GLTF geometry for each artwork
size. It applies a piecewise x/y map: the middle region grows to the requested
aperture and the four outside regions map to a 0.10-unit rail on each side.
This preserves the corner/profile region much better than scaling the whole
mesh. It remaps source depth to -0.045 through 0.13; callers place art at
z=0.051, leaving it visible through the centered XY aperture.

The original UV layout necessarily stretches ornament detail along unusually
long rails; the geometry profile and corners are retained, but this low-poly
source has no separately tiled long-rail UV islands. Materials/textures stay in
the `useGLTF` cache; only cloned geometry is disposed by the component.
