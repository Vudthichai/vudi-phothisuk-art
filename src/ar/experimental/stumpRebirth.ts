import {
  BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial,
  Points, ShaderMaterial,
} from 'three';
import { SCULPTURE_TIMING } from './sculptureTimeline';

const fullGrowth = 5.2;
const restingUntil = 4.4;
const easeIntoTurn = 1.35;

export function rebirthTurn(elapsed: number, reduced: boolean) {
  if (reduced) return 0;
  const moving = Math.max(0, elapsed - restingUntil);
  const ramp = Math.min(1, moving / easeIntoTurn);
  const turnSeconds = easeIntoTurn * ramp ** 3 * (1 - ramp / 2) + Math.max(0, moving - easeIntoTurn);
  return turnSeconds * Math.PI * 2 / SCULPTURE_TIMING.revolutionSeconds;
}

const growthFragment = `
  // The baked sapling shares its texture and mesh with the stump. Its
  // footprint starts in the cut heartwood; the tall jagged bark sits behind it.
  vec3 p = rebirthPosition;
  vec2 fromStem = p.xz - vec2(.014, .085);
  float radius = length(fromStem);
  float heartwood = smoothstep(-.129, -.087, p.z + p.x * .42);
  float sapling = smoothstep(.608, .647, p.y) * heartwood * (1. - smoothstep(.205, .24, radius));
  if (rebirthTime < ${fullGrowth.toFixed(1)}) {
    float noise = sin(p.x * 37.0 + p.y * 75.0) * cos(p.z * 62.0 - p.y * 29.0);
    float woodTime = .25 + p.y * .56 + noise * .07;
    float wood = smoothstep(max(0., woodTime - .28), woodTime + .53, rebirthTime);
    // Height advances the shoot, then radial distance reveals each tier from
    // the stalk toward its leaf tips. A little variation staggers the sides.
    float level = clamp((p.y - .61) / .292, 0., 1.);
    float leaf = smoothstep(.018, .123, radius);
    float tier = 1.26 + level * 2.92 + leaf * (.48 + .26 * level)
      + leaf * smoothstep(-.07, .115, fromStem.x) * .22 + noise * .09;
    float growing = smoothstep(tier - .27, min(tier + .45, ${fullGrowth.toFixed(1)}), rebirthTime);
    float presence = wood * mix(1., growing, sapling);
    float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
    if (presence <= grain) discard;
  }
  #include <aomap_fragment>
  // Warm the existing reflected studio light locally, with a soft moving
  // edge as the shoot rises. The bark's darks and the baked color map remain.
  float sun = smoothstep(1.55, 4.80, rebirthTime);
  float lightHeight = mix(.67, .88, sun) + .037 * sin(rebirthTime * .53);
  float lightDistance = p.y - lightHeight;
  float beam = (.21 * exp2(-58. * lightDistance * lightDistance) + .055) * sapling * sun;
  reflectedLight.directDiffuse *= mix(vec3(1.), vec3(1.92, 1.50, .94), beam);
  reflectedLight.directSpecular *= mix(vec3(1.), vec3(2.05, 1.62, 1.22), beam);
`;

function createRebirthAir(upright: Group, time: { value: number }) {
  const positions: number[] = [];
  for (let index = 0; index < 8; index++) {
    positions.push(((index * 7 + 1) % 11) / 11, ((index * 5 + 2) % 13) / 13, (index + .5) / 8);
  }
  positions.push(.01, 0, 1, .65, 1, 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { rebirthTime: time },
    vertexShader: `
      uniform float rebirthTime;
      varying float opacity, wisp, phase;
      void main() {
        wisp = step(.999, position.z);
        phase = position.x * 6.2831853;
        vec3 drift;
        float size;
        if (wisp > .5) {
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
      void main() {
        vec2 uv = (gl_PointCoord - vec2(.5)) * 2.;
        vec2 fog = vec2(uv.x, (uv.y + .10 * sin(uv.x * 4.2 + phase)) * 4.2);
        float mist = pow(1. - smoothstep(0., 1., length(fog)), 1.65);
        float mote = 1. - smoothstep(.04, 1., length(uv));
        vec3 tint = mix(vec3(.96, .92, .73), vec3(.83, .88, .77), wisp);
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

/** Reveal the real foliage in the approved baked GLB without adding or deforming meshes. */
export function createStumpRebirth(sculpture: Group, upright: Group) {
  const time = { value: 0 };
  sculpture.updateWorldMatrix(true, true);
  const toSculpture = sculpture.matrixWorld.clone().invert();
  sculpture.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    const meshToSculpture = new Matrix4().multiplyMatrices(toSculpture, object.matrixWorld);
    const material = object.material;
    material.onBeforeCompile = shader => {
      shader.uniforms.rebirthTime = time;
      shader.uniforms.rebirthMeshToSculpture = { value: meshToSculpture };
      shader.vertexShader = 'uniform mat4 rebirthMeshToSculpture; varying vec3 rebirthPosition;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          rebirthPosition = (rebirthMeshToSculpture * vec4(position, 1.)).xyz;`);
      shader.fragmentShader = 'uniform float rebirthTime; varying vec3 rebirthPosition;\n' +
        shader.fragmentShader.replace('#include <aomap_fragment>', growthFragment);
    };
    material.customProgramCacheKey = () => 'forest-forgotten-rebirth';
    material.needsUpdate = true;
  });
  const air = createRebirthAir(upright, time);

  return {
    update(elapsed: number, reduced: boolean) {
      time.value = reduced ? fullGrowth : elapsed;
      air.update(elapsed, reduced);
      return rebirthTurn(elapsed, reduced);
    },
    dispose: air.dispose,
  };
}
