import {
  BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial,
  Points, ShaderMaterial,
} from 'three';
import { SCULPTURE_TIMING } from './sculptureTimeline';

const fullGrowth = 5.2;
const extendedGrowth = 7.3;
const restingUntil = 4.4;
const easeIntoTurn = 1.35;

export function rebirthTurn(elapsed: number, reduced: boolean) {
  if (reduced) return 0;
  const moving = Math.max(0, elapsed - restingUntil);
  const ramp = Math.min(1, moving / easeIntoTurn);
  const turnSeconds = easeIntoTurn * ramp ** 3 * (1 - ramp / 2) + Math.max(0, moving - easeIntoTurn);
  return turnSeconds * Math.PI * 2 / SCULPTURE_TIMING.revolutionSeconds;
}

function growthFragment(finalForest: boolean) {
  const duration = finalForest ? extendedGrowth : fullGrowth;
  return `
  // The baked sapling shares its texture and mesh with the stump. Its
  // footprint starts in the cut heartwood; the tall jagged bark sits behind it.
  vec3 p = rebirthPosition;
  vec2 fromStem = p.xz - vec2(.014, .085);
  float radius = length(fromStem);
  float heartwood = smoothstep(-.129, -.087, p.z + p.x * .42);
  float sapling = smoothstep(.608, .647, p.y) * heartwood * (1. - smoothstep(.205, .24, radius));
  if (rebirthTime < ${duration.toFixed(1)}) {
    float noise = sin(p.x * 37.0 + p.y * 75.0) * cos(p.z * 62.0 - p.y * 29.0);
    float woodTime = .25 + p.y * .56 + noise * .07;
    float wood = smoothstep(max(0., woodTime - .28), woodTime + .53, rebirthTime);
    // Height advances the shoot, then radial distance reveals each tier from
    // the stalk toward its leaf tips. A little variation staggers the sides.
    float level = clamp((p.y - .61) / .292, 0., 1.);
    float leaf = smoothstep(.018, .123, radius);
    float tier = 1.26 + level * ${finalForest ? '4.55' : '2.92'} + leaf * (.48 + .26 * level)
      + leaf * smoothstep(-.07, .115, fromStem.x) * .22 + noise * .09;
    float growing = smoothstep(tier - .27, min(tier + .45, ${duration.toFixed(1)}), rebirthTime);
    float presence = wood * mix(1., growing, sapling);
    float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
    if (presence <= grain) discard;
  }
  #include <aomap_fragment>
  // Warm the existing reflected studio light locally, with a soft moving
  // edge as the shoot rises. The bark's darks and the baked color map remain.
  float sun = smoothstep(1.55, ${finalForest ? '6.80' : '4.80'}, rebirthTime);
  float lightHeight = mix(.67, .88, sun) + .037 * sin(rebirthTime * .53);
  float lightDistance = p.y - lightHeight;
  float beam = (.21 * exp2(-58. * lightDistance * lightDistance) + .055) * sapling * sun;
  reflectedLight.directDiffuse *= mix(vec3(1.), vec3(1.92, 1.50, .94), beam);
  reflectedLight.directSpecular *= mix(vec3(1.), vec3(2.05, 1.62, 1.22), beam);
`;
}

const extendSapling = `
  // The original stem stays rooted at the stump's cut surface. Restrict
  // the upward extension to the measured plant above the highest bark.
  vec2 fromStem = rebirthPosition.xz - vec2(.014, .085);
  float shoot = smoothstep(.646, .711, rebirthPosition.y)
    * smoothstep(-.129, -.087, rebirthPosition.z + rebirthPosition.x * .42)
    * (1. - smoothstep(.205, .24, length(fromStem)));
  float risen = smoothstep(1.35, ${extendedGrowth.toFixed(1)}, rebirthTime);
  float elongation = (rebirthPosition.y - .646) * mix(-.39, .24, risen);
  vec2 opening = fromStem * ((risen - 1.) * .16);
  vec3 advancement = vec3(opening.x, elongation, opening.y) * shoot;
  transformed += (rebirthSculptureToMesh * vec4(advancement, 0.)).xyz;
`;

const goldenFlight = `
  if (goldSpark > .5) {
    float seed = position.z - 1.1;
    float age = rebirthTime - (1.75 + seed * 4.6);
    float lifetime = 3.3 + position.x * 1.85;
    float flight = mod(max(0., age), 6.6 + position.y * 2.4) / lifetime;
    float t = clamp(flight, 0., 1.);
    vec2 lane = vec2(cos(phase), sin(phase)) * (.13 + position.y * .31 + t * .09);
    lane.x += .055 * sin(t * 5.4 + phase) * t;
    lane.y += .04 * sin(t * 4.9 - phase) * t;
    drift = vec3(lane.x, .025 + .11 * position.y + (.30 + .24 * position.x) * t, lane.y);
    size = 5.4 + position.y * 4.5;
    float shimmer = .70 + .30 * pow(.5 + .5 * sin(age * (2.5 + 1.9 * position.x) + phase), 3.);
    opacity = step(0., age) * smoothstep(.02, .22, flight)
      * (1. - smoothstep(.59, 1., flight)) * shimmer * (.34 + .18 * position.y);
  } else
`;

function createRebirthAir(upright: Group, time: { value: number }, finalForest: boolean) {
  const positions: number[] = [];
  for (let index = 0; index < 8; index++) {
    positions.push(((index * 7 + 1) % 11) / 11, ((index * 5 + 2) % 13) / 13, (index + .5) / 8);
  }
  positions.push(.01, 0, 1, .65, 1, 1);
  if (finalForest) {
    for (let index = 0; index < 6; index++) {
      positions.push(((index * 8 + 2) % 11) / 11, ((index * 9 + 3) % 13) / 13, 1.1 + (index + .5) / 6);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { rebirthTime: time },
    vertexShader: `
      uniform float rebirthTime;
      varying float opacity, wisp, phase;
      ${finalForest ? 'varying float goldSpark;' : ''}
      void main() {
        wisp = step(.999, position.z);
        ${finalForest ? 'goldSpark = step(1.01, position.z); wisp *= 1. - goldSpark;' : ''}
        phase = position.x * 6.2831853;
        vec3 drift;
        float size;
        ${finalForest ? goldenFlight : ''}if (wisp > .5) {
          drift = vec3((position.x - .39) * .63 + .061 * sin(rebirthTime * .39 + phase),
            .016 + position.y * .062 + .021 * sin(rebirthTime * .61 + phase),
            .127 + position.y * .08);
          size = 178. + position.y * 35.;
          opacity = (.09 + .12 * (1. - smoothstep(1.3, 5.6, rebirthTime)))
            * smoothstep(.13, 1.5, rebirthTime);
        } else {
          float delay = .72 + position.z * 3.7;
          float cycle = 6.0 + position.y * 4.2;
          float age = rebirthTime - delay;
          float flight = mod(max(0., age), cycle) / (2.9 + position.x * 1.9);
          float progress = clamp(flight, 0., 1.);
          vec2 heading = vec2(cos(phase), sin(phase));
          vec2 side = heading * (.084 + position.y * .09 + progress * .16);
          side.x += .047 * sin(progress * 4.9 + phase) * progress;
          drift = vec3(side.x, .035 + (.22 + position.y * .23) * progress, side.y);
          size = 5.0 + position.y * 4.2;
          opacity = step(0., age) * smoothstep(.02, .24, flight)
            * (1. - smoothstep(.60, 1., flight)) * (.30 + .18 * position.y);
        }
        vec4 view = modelViewMatrix * vec4(drift, 1.);
        float units = length(modelViewMatrix[1].xyz) * projectionMatrix[1][1];
        gl_Position = projectionMatrix * view;
        float pixels = size * units / max(.001, -view.z);
        gl_PointSize = wisp > .5 ? clamp(pixels, 18., 137.) : clamp(pixels, 1.1, 3.9);
      }`,
    fragmentShader: `
      varying float opacity, wisp, phase;
      ${finalForest ? 'varying float goldSpark;' : ''}
      void main() {
        vec2 uv = (gl_PointCoord - vec2(.5)) * 2.;
        vec2 fog = vec2(uv.x, (uv.y + .10 * sin(uv.x * 4.2 + phase)) * 4.2);
        float mist = pow(1. - smoothstep(0., 1., length(fog)), 1.65);
        float mote = 1. - smoothstep(.04, 1., length(uv));
        vec3 tint = mix(vec3(.96, .92, .73), vec3(.83, .88, .77), wisp);
        ${finalForest ? 'tint = mix(tint, vec3(1., .75, .37), goldSpark);' : ''}
        gl_FragColor = vec4(tint, opacity * mix(mote, mist, wisp));
      }`,
  });
  const air = new Points(geometry, material);
  air.name = 'Rebirth understory mist and motes';
  air.position.set(.014, .54, .085);
  air.frustumCulled = false;
  air.visible = false;
  air.renderOrder = 2;
  upright.add(air);

  return {
    update(elapsed: number, reduced: boolean) {
      air.visible = !reduced && elapsed > .13;
    },
    dispose() {
      air.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Reveal and optionally extend the foliage baked into the approved stump GLB. */
export function createStumpRebirth(sculpture: Group, upright: Group, finalForest = false) {
  const time = { value: 0 };
  sculpture.updateWorldMatrix(true, true);
  const toSculpture = sculpture.matrixWorld.clone().invert();
  sculpture.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    const meshToSculpture = new Matrix4().multiplyMatrices(toSculpture, object.matrixWorld);
    const sculptToMesh = finalForest ? meshToSculpture.clone().invert() : undefined;
    const material = object.material;
    material.onBeforeCompile = shader => {
      shader.uniforms.rebirthTime = time;
      shader.uniforms.rebirthMeshToSculpture = { value: meshToSculpture };
      if (sculptToMesh) shader.uniforms.rebirthSculptureToMesh = { value: sculptToMesh };
      shader.vertexShader = 'uniform mat4 rebirthMeshToSculpture; varying vec3 rebirthPosition;\n' +
        (finalForest ? 'uniform mat4 rebirthSculptureToMesh; uniform float rebirthTime;\n' : '') +
        shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          rebirthPosition = (rebirthMeshToSculpture * vec4(position, 1.)).xyz;
          ${finalForest ? extendSapling : ''}`);
      shader.fragmentShader = 'uniform float rebirthTime; varying vec3 rebirthPosition;\n' +
        shader.fragmentShader.replace('#include <aomap_fragment>', growthFragment(finalForest));
    };
    material.customProgramCacheKey = () => finalForest ? 'forest-forgotten-regeneration' : 'forest-forgotten-rebirth';
    material.needsUpdate = true;
  });
  const air = createRebirthAir(upright, time, finalForest);

  return {
    update(elapsed: number, reduced: boolean) {
      time.value = reduced ? (finalForest ? extendedGrowth : fullGrowth) : elapsed;
      air.update(elapsed, reduced);
      return rebirthTurn(elapsed, reduced);
    },
    dispose: air.dispose,
  };
}
