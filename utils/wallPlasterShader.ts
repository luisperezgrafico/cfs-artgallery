import * as THREE from 'three';

/**
 * Procedural wall plaster, evaluated in the shader instead of sampled from a
 * texture. Two reasons, both from looking at the result:
 *
 *   - **No repeat.** A texture on a wall is a tile, and however fine the noise
 *     in it, the eye finds the tile. A value noise evaluated on world position
 *     is a function of where the wall is, so there is nothing to repeat.
 *   - **No memory, no download.** Nothing to generate, upload or mip.
 *
 * What it does to a wall is deliberately small: it nudges the albedo and the
 * roughness by a few percent on a fine grain, which is what stops a flat plane
 * from reading as plastic. It does **not** touch the normal: relief through
 * screen-space derivatives costs three noise evaluations per fragment instead of
 * one, and at this subtlety the tone and sheen variation is what reads anyway.
 *
 * `vPlasterPos` is the world position, so the grain is continuous across the
 * walls of a room and is the same physical size on every wall.
 *
 * Cost: ~16 hash evaluations per wall fragment, no textures, no uniforms.
 *
 * Tuning lives in `PLASTER_TUNING` (all in metres and fractions, not pixels):
 * raise `albedo`/`roughness` for more presence, `coarseM`/`fineM` for a coarser
 * or finer grain. Widen with care — this was dialled back twice for being too
 * strong, and `docs/` has no picture of the taste, the values here are it.
 */

export interface PlasterTuning {
  /** Metres across one blob of the coarse octave. */
  coarseM: number;
  /** Metres across one blob of the fine octave. */
  fineM: number;
  /** Peak albedo swing, as a fraction (0.06 = ±3%). */
  albedo: number;
  /** Peak roughness swing, as a fraction (0.12 = ±6%). */
  roughness: number;
}

export const PLASTER_TUNING: PlasterTuning = {
  coarseM: 0.035,
  fineM: 0.012,
  albedo: 0.06,
  roughness: 0.12,
};

const VERTEX_DECLARATION = 'varying vec3 vPlasterPos;';
const VERTEX_POSITION_WRITE =
  '\tvPlasterPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;';

/**
 * Hash without `sin()`, after Dave Hoskins: stable on mobile GPUs, where a
 * `fract(sin(dot(...)))` hash loses precision as the coordinates grow.
 */
const FRAGMENT_FUNCTIONS = /* glsl */ `
varying vec3 vPlasterPos;

float plasterHash( vec3 p ) {
	p = fract( p * 0.1031 );
	p += dot( p, p.zyx + 31.32 );
	return fract( ( p.x + p.y ) * p.z );
}

float plasterNoise( vec3 p ) {
	vec3 i = floor( p );
	vec3 f = fract( p );
	f = f * f * ( 3.0 - 2.0 * f );
	float n000 = plasterHash( i + vec3( 0.0, 0.0, 0.0 ) );
	float n100 = plasterHash( i + vec3( 1.0, 0.0, 0.0 ) );
	float n010 = plasterHash( i + vec3( 0.0, 1.0, 0.0 ) );
	float n110 = plasterHash( i + vec3( 1.0, 1.0, 0.0 ) );
	float n001 = plasterHash( i + vec3( 0.0, 0.0, 1.0 ) );
	float n101 = plasterHash( i + vec3( 1.0, 0.0, 1.0 ) );
	float n011 = plasterHash( i + vec3( 0.0, 1.0, 1.0 ) );
	float n111 = plasterHash( i + vec3( 1.0, 1.0, 1.0 ) );
	float nx00 = mix( n000, n100, f.x );
	float nx10 = mix( n010, n110, f.x );
	float nx01 = mix( n001, n101, f.x );
	float nx11 = mix( n011, n111, f.x );
	return mix( mix( nx00, nx10, f.y ), mix( nx01, nx11, f.y ), f.z );
}
`;

/**
 * The grain itself, applied where `diffuseColor`, `roughnessFactor` and
 * `normal` are all already defined but nothing has read them yet.
 *
 * Each octave fades out once one screen pixel covers more than about half of it:
 * an unfiltered noise this fine shimmers as the camera moves, and the fade is
 * the cheapest honest fix (the texture version got this for free from
 * mip-mapping). The result stays centred on zero, so a wall seen from far away
 * is neither darker nor shinier than the same wall seen close up — it is just
 * smooth.
 */
function grainBlock(tuning: PlasterTuning): string {
  const coarse = tuning.coarseM.toFixed(5);
  const fine = tuning.fineM.toFixed(5);
  const albedo = tuning.albedo.toFixed(5);
  const roughness = tuning.roughness.toFixed(5);
  return /* glsl */ `
	{
		vec3 plasterP = vPlasterPos;
		vec3 plasterDx = dFdx( plasterP );
		vec3 plasterDy = dFdy( plasterP );
		float plasterPx = max( length( plasterDx ), length( plasterDy ) );
		float plasterH =
			0.65 * ( plasterNoise( plasterP / ${coarse} ) - 0.5 ) * ( 1.0 - smoothstep( ${coarse} * 0.5, ${coarse} * 2.0, plasterPx ) )
			+ 0.35 * ( plasterNoise( plasterP / ${fine} ) - 0.5 ) * ( 1.0 - smoothstep( ${fine} * 0.5, ${fine} * 2.0, plasterPx ) );
		diffuseColor.rgb *= 1.0 + ${albedo} * plasterH;
		roughnessFactor *= 1.0 + ${roughness} * plasterH;
	}
`;
}

const VERTEX_COMMON_ANCHOR = '#include <common>';
const VERTEX_POSITION_ANCHOR = '#include <begin_vertex>';
const FRAGMENT_COMMON_ANCHOR = '#include <common>';
const FRAGMENT_APPLY_ANCHOR = '#include <normal_fragment_maps>';

/**
 * Patches a standard material in place. Exported for tests; `createPlasterMaterial`
 * is what callers should use.
 *
 * Missing anchor: the material is left patched only as far as the anchors found,
 * and never throws — a shader that fails to compile takes the whole room down,
 * while a wall without grain is merely a wall. The anchors are asserted in the
 * unit tests against the three version the project pins.
 */
export function applyPlasterShader(
  material: THREE.MeshStandardMaterial,
  tuning: PlasterTuning = PLASTER_TUNING,
): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    if (shader.vertexShader.includes(VERTEX_COMMON_ANCHOR)) {
      shader.vertexShader = shader.vertexShader.replace(
        VERTEX_COMMON_ANCHOR,
        `${VERTEX_COMMON_ANCHOR}\n${VERTEX_DECLARATION}`,
      );
    }
    if (shader.vertexShader.includes(VERTEX_POSITION_ANCHOR)) {
      shader.vertexShader = shader.vertexShader.replace(
        VERTEX_POSITION_ANCHOR,
        `${VERTEX_POSITION_ANCHOR}\n${VERTEX_POSITION_WRITE}`,
      );
    }
    if (shader.fragmentShader.includes(FRAGMENT_COMMON_ANCHOR)) {
      shader.fragmentShader = shader.fragmentShader.replace(
        FRAGMENT_COMMON_ANCHOR,
        `${FRAGMENT_COMMON_ANCHOR}\n${FRAGMENT_FUNCTIONS}`,
      );
    }
    if (shader.fragmentShader.includes(FRAGMENT_APPLY_ANCHOR)) {
      shader.fragmentShader = shader.fragmentShader.replace(
        FRAGMENT_APPLY_ANCHOR,
        `${FRAGMENT_APPLY_ANCHOR}${grainBlock(tuning)}`,
      );
    }
  };

  // Without this, three can hand this material a program compiled for another
  // material with the same parameters but no onBeforeCompile patch.
  material.customProgramCacheKey = () => 'wall-plaster-v1';

  return material;
}

/**
 * The wall material: a matte standard material with the plaster grain patched
 * in. One instance is safe to share across every wall of a room (and cheaper
 * than one per wall, since they all compile to the same program).
 */
export function createPlasterMaterial(
  color: THREE.ColorRepresentation,
  tuning: PlasterTuning = PLASTER_TUNING,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 1,
  });
  return applyPlasterShader(material, tuning);
}
