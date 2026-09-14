import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applyPlasterShader,
  createPlasterMaterial,
  PLASTER_TUNING,
} from '../../utils/wallPlasterShader';

/** The anchors as they appear in the three version this project pins (0.178). */
function fakeShader() {
  return {
    vertexShader: [
      '#include <common>',
      'void main() {',
      '\t#include <begin_vertex>',
      '}',
    ].join('\n'),
    fragmentShader: [
      '#include <common>',
      'void main() {',
      '\t#include <color_fragment>',
      '\t#include <roughnessmap_fragment>',
      '\t#include <normal_fragment_begin>',
      '\t#include <normal_fragment_maps>',
      '}',
    ].join('\n'),
  };
}

describe('createPlasterMaterial', () => {
  it('builds a matte standard material with the room colour', () => {
    const material = createPlasterMaterial('#1A1637');
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(material.color.getHexString()).toBe('1a1637');
    expect(material.metalness).toBe(0);
    expect(material.roughness).toBe(1);
    expect(typeof material.onBeforeCompile).toBe('function');
  });

  it('answers a stable program cache key so three does not reuse an unpatched program', () => {
    const material = createPlasterMaterial('#ffffff');
    expect(material.customProgramCacheKey?.()).toBe('wall-plaster-v1');
  });
});

describe('applyPlasterShader', () => {
  it('passes the world position to the fragment shader', () => {
    const { vertexShader } = patch();
    expect(vertexShader).toContain('varying vec3 vPlasterPos;');
    expect(vertexShader).toContain('modelMatrix * vec4( transformed, 1.0 )');
    // The world position has to be written after `transformed` exists.
    expect(vertexShader.indexOf('vPlasterPos =')).toBeGreaterThan(
      vertexShader.indexOf('#include <begin_vertex>'),
    );
  });

  it('defines the noise and applies it to the albedo and the roughness', () => {
    const { fragmentShader } = patch();
    expect(fragmentShader).toContain('float plasterNoise( vec3 p )');
    expect(fragmentShader).toContain('diffuseColor.rgb *= 1.0 +');
    expect(fragmentShader).toContain('roughnessFactor *= 1.0 +');
    // Applied after both are defined, and without breaking the includes.
    const apply = fragmentShader.indexOf('diffuseColor.rgb');
    expect(apply).toBeGreaterThan(fragmentShader.indexOf('#include <roughnessmap_fragment>'));
    expect(fragmentShader).toContain('#include <normal_fragment_maps>');
  });

  it('takes its scale and strength from the tuning', () => {
    const { fragmentShader } = patch({
      coarseM: 0.25,
      fineM: 0.1,
      albedo: 0.5,
      roughness: 0.9,
    });
    expect(fragmentShader).toContain('plasterP / 0.25000');
    expect(fragmentShader).toContain('plasterP / 0.10000');
    expect(fragmentShader).toContain('1.0 + 0.50000 * plasterH');
    expect(fragmentShader).toContain('1.0 + 0.90000 * plasterH');
  });

  it('fades each octave out as one pixel grows past it, so the grain cannot shimmer', () => {
    const { fragmentShader } = patch();
    expect(fragmentShader).toContain('smoothstep( 0.03500 * 0.5, 0.03500 * 2.0, plasterPx )');
    expect(fragmentShader).toContain('smoothstep( 0.01200 * 0.5, 0.01200 * 2.0, plasterPx )');
    // Centred on zero: a distant wall must not read darker or shinier.
    expect(fragmentShader).toContain('- 0.5 )');
  });

  it('leaves an unrecognised shader untouched instead of throwing', () => {
    const material = new THREE.MeshStandardMaterial();
    applyPlasterShader(material);
    const shader = { vertexShader: 'void main() {}', fragmentShader: 'void main() {}' };
    expect(() => material.onBeforeCompile(shader as never, null as never)).not.toThrow();
    expect(shader.vertexShader).toBe('void main() {}');
    expect(shader.fragmentShader).toBe('void main() {}');
  });

  it('ships a deliberately small default grain', () => {
    expect(PLASTER_TUNING.coarseM).toBeLessThan(0.1);
    expect(PLASTER_TUNING.fineM).toBeLessThan(PLASTER_TUNING.coarseM);
    expect(PLASTER_TUNING.albedo).toBeLessThanOrEqual(0.15);
    expect(PLASTER_TUNING.roughness).toBeLessThanOrEqual(0.25);
  });
});

function patch(tuning?: Parameters<typeof applyPlasterShader>[1]) {
  const material = applyPlasterShader(new THREE.MeshStandardMaterial(), tuning);
  const shader = fakeShader();
  material.onBeforeCompile(shader as never, null as never);
  return shader;
}
