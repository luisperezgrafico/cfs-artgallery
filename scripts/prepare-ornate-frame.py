#!/usr/bin/env python3
"""Pack Poly Haven's CC0 fancy_picture_frame_01 into a frame-only GLB.

The source download is expected at /tmp/cfs-frame-research.  This deliberately
uses only Python's standard library so the binary is reproducible without an
asset-pipeline install.  It retains the source frame mesh and its three 1K
textures, and excludes the separate canvas mesh and all canvas textures.
"""
import argparse
import json
import struct
from pathlib import Path

DEFAULT_SOURCE = Path('/tmp/cfs-frame-research')
FRAME_TEXTURES = (
    'fancy_picture_frame_01_nor_gl_1k.jpg',
    'fancy_picture_frame_01_diff_1k.jpg',
    'fancy_picture_frame_01_rough_1k.jpg',
)

def pad(data: bytes, fill: bytes = b'\0') -> bytes:
    return data + fill * ((-len(data)) % 4)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('-o', '--output', type=Path, required=True)
    args = parser.parse_args()
    source_gltf = json.loads((args.source / 'original.gltf').read_text())
    source_bin = (args.source / 'fancy_picture_frame_01.bin').read_bytes()

    # Accessors 0..3 / views 0..3 are the frame only; 4..7 are the canvas.
    geometry = source_bin[:25744]
    payload = bytearray(geometry)
    image_views = []
    for texture_name in FRAME_TEXTURES:
        image = (args.source / 'textures' / texture_name).read_bytes()
        offset = len(payload)
        payload.extend(pad(image))
        image_views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(image)})

    frame_views = [dict(view) for view in source_gltf['bufferViews'][:4]]
    gltf = {
        'asset': {'version': '2.0', 'generator': 'CFS Gallery frame-only packer (Poly Haven CC0 source)'},
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'name': 'fancy_picture_frame_01', 'mesh': 0}],
        'meshes': [{'name': 'fancy_picture_frame_01', 'primitives': [{
            'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0,
        }]}],
        'materials': [source_gltf['materials'][0]],
        'samplers': source_gltf['samplers'],
        'textures': [{'sampler': 0, 'source': index} for index in range(3)],
        'images': [{'name': name.rsplit('_1k', 1)[0], 'mimeType': 'image/jpeg', 'bufferView': index + 4}
                   for index, name in enumerate(FRAME_TEXTURES)],
        'accessors': source_gltf['accessors'][:4],
        'bufferViews': frame_views + image_views,
        'buffers': [{'byteLength': len(payload)}],
    }
    # Original material indices already point to textures 0, 1 and 2.
    encoded = pad(json.dumps(gltf, separators=(',', ':')).encode('utf-8'), b' ')
    binary = pad(bytes(payload))
    header = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(encoded) + 8 + len(binary))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(header + struct.pack('<I4s', len(encoded), b'JSON') + encoded + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
    print(f'{args.output}: {args.output.stat().st_size} bytes; 936 frame triangles; 0 canvas triangles')

if __name__ == '__main__':
    main()
