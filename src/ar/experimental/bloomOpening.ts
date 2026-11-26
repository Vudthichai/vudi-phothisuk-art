import { Group, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { SCULPTURE_TIMING } from './sculptureTimeline';

export const BLOOM_OPENING_SECONDS = 5.1;
export const BLOOM_HOLD_SECONDS = .5;

export function firstBreathPresentation(elapsed: number, reduced: boolean, refinedEntrance = false) {
  const sweepStart = 4.55;
  const sweepEnd = 5.85;
  const reveal = refinedEntrance
    ? MathUtils.smoothstep(elapsed, .04, 1.92)
    : MathUtils.clamp(elapsed / 2, 0, 1);
  return {
    fade: reduced ? 1 : reveal,
    sweep: reduced || elapsed <= sweepStart || elapsed >= sweepEnd
      ? -1 : (elapsed - sweepStart) / (sweepEnd - sweepStart),
  };
}

const openingVertex = `
uniform float bloomOpening;
varying float vBloomCoverage;

// Center and axis of the blossom on the approved Blooming Desire mesh.
const vec3 bloomCenter = vec3(0., -.10, -.12);
const vec3 bloomAxis = vec3(0., .7986, .6018);

void bloomFrame(vec3 point, out vec3 radialDir, out float radius, out float stem, out float opening) {
  vec3 offset = point - bloomCenter;
  vec3 radial = offset - bloomAxis * dot(offset, bloomAxis);
  radius = length(radial);
  radialDir = radial / max(radius, .00001);
  float angle = atan(radialDir.x + .00001, dot(radialDir, vec3(0., -.6018, .7986)));
  float delay = .18 + .12 * sin(angle * 3. + .7) + .06 * cos(angle * 5. - .2);
  stem = (1. - smoothstep(-.47, -.19, point.y))
    * (1. - smoothstep(.075, .22, length(point.xz - vec2(.05, -.08))));
  float localTime = clamp((bloomOpening - delay) / (1. - delay), 0., 1.);
  opening = localTime * localTime * (3. - 2. * localTime);
}

vec3 bloomFold(vec3 vector, vec3 radialDir, float turn) {
  float radial = dot(vector, radialDir);
  float axial = dot(vector, bloomAxis);
  float c = cos(turn), s = sin(turn);
  return vector + radialDir * ((c - 1.) * radial - s * axial)
                + bloomAxis * (s * radial + (c - 1.) * axial);
}
`;

const openingNormal = `
  #include <beginnormal_vertex>
  vec3 bloomRadialDir = vec3(0.);
  float bloomRadius = 0., bloomStem = 0., bloomLocal = 1., bloomAngle = 0.;
  if (bloomOpening < 1.) {
    bloomFrame(position, bloomRadialDir, bloomRadius, bloomStem, bloomLocal);
    bloomAngle = 1.04 * (1. - bloomLocal)
      * smoothstep(.12, .78, bloomRadius) * (1. - bloomStem);
    objectNormal = bloomFold(objectNormal, bloomRadialDir, bloomAngle);
    #ifdef USE_TANGENT
      objectTangent = bloomFold(objectTangent, bloomRadialDir, bloomAngle);
    #endif
  }
`;

const openingPosition = `
  #include <begin_vertex>
  vBloomCoverage = 1.;
  if (bloomOpening < 1.) {
    // Curl the outer band around the blossom axis. The center and stem keep
    // their authored position, and the fully open mesh is never deformed.
    vec3 hinge = bloomCenter + bloomAxis * dot(position - bloomCenter, bloomAxis);
    transformed = hinge + bloomFold(position - hinge, bloomRadialDir, bloomAngle);
    float reveal = mix(.275, 1.26, bloomLocal);
    float petal = 1. - smoothstep(reveal - .08, reveal + .105, bloomRadius);
    vBloomCoverage = max(petal, bloomStem);
  }
`;

const firstBreathCoverage = `
  if (firstBreathFade < 1.) {
    // The inner lip of the blossom resolves first, followed by its lower
    // surfaces. Keep the same opaque depth pass used by the opening.
    float upper = smoothstep(-.46, .52, firstBreathPosition.y + firstBreathPosition.z * .30);
    float delay = mix(.65, .35, upper);
    coverage *= smoothstep(delay - .34, delay + .34, firstBreathFade);
  }`;

const firstBreathLighting = `
  #include <aomap_fragment>
  if (firstBreathSweep > 0. && firstBreathSweep < 1.) {
    float coordinate = .5 + dot(firstBreathPosition, vec3(.48, .12, .05));
    float front = mix(-.10, 1.10, firstBreathSweep);
    float distanceFromLight = coordinate - front;
    float lightBand = exp2(-53. * distanceFromLight * distanceFromLight);
    float envelope = smoothstep(0., .21, firstBreathSweep) *
      (1. - smoothstep(.71, 1., firstBreathSweep));
    float warmth = lightBand * envelope;
    reflectedLight.directDiffuse *= mix(vec3(1.), vec3(1.072, 1.037, .979), warmth);
    reflectedLight.directSpecular *= mix(vec3(1.), vec3(1.15, 1.095, 1.03), warmth);
  }`;

export function createBloomOpening(sculpture: Group, firstBreath = false, refinedEntrance = false) {
  const progress = { value: 0 };
  const fade = { value: 0 }, sweep = { value: -1 };
  const stamen = new Vector3(0, .43, .05);
  let positioned = false;
  sculpture.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    object.frustumCulled = false;
    if (firstBreath && !positioned) {
      // Measured at the stamen collar in the original compacted GLB. Its
      // normalized sculpture transform includes both the mesh and fit scale.
      object.localToWorld(stamen);
      (sculpture.parent ?? sculpture).worldToLocal(stamen);
      stamen.y += .025;
      positioned = true;
    }
    const material = object.material;
    material.onBeforeCompile = shader => {
      shader.uniforms.bloomOpening = progress;
      const firstBreathPosition = firstBreath ? 'varying vec3 firstBreathPosition;\n' : '';
      shader.vertexShader = firstBreathPosition + openingVertex + shader.vertexShader
        .replace('#include <beginnormal_vertex>', openingNormal)
        .replace('#include <begin_vertex>', openingPosition +
          (firstBreath ? '\nfirstBreathPosition = position;' : ''));
      shader.fragmentShader = 'varying float vBloomCoverage; uniform float bloomOpening;\n' + shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', `
          #include <clipping_planes_fragment>
          if (bloomOpening < 1.) {
            float coverage = vBloomCoverage * smoothstep(0., .065, bloomOpening);
            ${firstBreath ? firstBreathCoverage : ''}
            float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
            if (coverage <= grain) discard;
          }`);
      if (firstBreath) {
        shader.uniforms.firstBreathFade = fade;
        shader.uniforms.firstBreathSweep = sweep;
        shader.fragmentShader = firstBreathPosition + 'uniform float firstBreathFade, firstBreathSweep;\n' +
          shader.fragmentShader.replace('#include <aomap_fragment>', firstBreathLighting);
      }
    };
    material.customProgramCacheKey = () => firstBreath ? 'blooming-desire-first-breath' : 'blooming-desire-opening-v1';
    material.needsUpdate = true;
  });

  return {
    stamen,
    update(elapsed: number, reduced: boolean) {
      progress.value = reduced ? 1 : MathUtils.clamp(elapsed / BLOOM_OPENING_SECONDS, 0, 1);
      if (firstBreath) {
        const phase = firstBreathPresentation(elapsed, reduced, refinedEntrance);
        fade.value = phase.fade;
        sweep.value = phase.sweep;
      }
      const heldUntil = BLOOM_OPENING_SECONDS + BLOOM_HOLD_SECONDS;
      return reduced ? 0 : Math.max(0, elapsed - heldUntil) / SCULPTURE_TIMING.revolutionSeconds * Math.PI * 2;
    },
  };
}
