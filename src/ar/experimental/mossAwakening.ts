import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, MathUtils, Mesh, MeshStandardMaterial, Points, ShaderMaterial } from 'three';
import { createAtmosphereMist } from './atmosphereMist';
import { SCULPTURE_TIMING } from './sculptureTimeline';

const sporesStart = 5;
const fullReveal = 6;
const turnRampSeconds = fullReveal - sporesStart;

export function mossTurn(elapsed: number) {
  const ramp = MathUtils.clamp((elapsed - sporesStart) / turnRampSeconds, 0, 1);
  const trackedTurnSeconds = turnRampSeconds * ramp ** 3 * (1 - ramp / 2) + Math.max(0, elapsed - fullReveal);
  return trackedTurnSeconds / SCULPTURE_TIMING.revolutionSeconds * Math.PI * 2;
}

// Fan edges sampled from the approved, levelled sculpture in target-width units.
const shelfOrigins = [
  [-.30, .389, .36], [-.18, .501, .22], [.07, .548, .17],
  [.36, .445, .08], [.26, .401, -.26], [.38, .379, .23],
];

// Measured just below the baked cap surfaces, with local outward directions.
const capUndersides = [
  [-.30, .342, .36, -.66, .75], [-.18, .453, .22, -.85, .53],
  [.07, .503, .17, .08, 1.0], [.39, .409, .05, .98, -.20],
  [.24, .370, -.28, .38, -.92], [.395, .345, .241, .90, .44],
  [-.38, .263, -.25, -.89, -.45], [.02, .237, .53, .11, .99],
];
const steadySporeCount = 48;
const burstSporeCount = 12;

const fanGrowth = `
  vec3 shelfExpansion(vec3 p, vec3 fan, vec3 root, float stagger) {
    vec3 local = (p - fan) * vec3(1., 1.75, 1.);
    float edge = 1. - smoothstep(.065, .16, length(local));
    float opened = .78 * smoothstep(2.15 + stagger, 5.3 + stagger, awakeningTime)
      + .22 * smoothstep(4.4 + stagger, 36. + stagger * 6., awakeningTime);
    return (root - p) * vec3(.18, .065, .18) * edge * (1. - opened);
  }
`;

const fanExpansion = `
  if (awakeningMotion > .5 && awakeningTime < 40.2) {
    // Measured caps and attachment points in the 1.2-wide sculpture's coordinate system.
    vec3 dimensions = vec3(.99565, .55977, 1.2);
    vec3 p = (awakeningPosition - vec3(.5, 0., .5)) * dimensions;
    vec3 movement = shelfExpansion(p, vec3(-.24, .44, .28), vec3(-.11, .39, .18), .26)
      + shelfExpansion(p, vec3(.09, .48, .145), vec3(.015, .43, .04), .0)
      + shelfExpansion(p, vec3(.25, .43, -.19), vec3(.13, .38, -.07), .64)
      + shelfExpansion(p, vec3(.37, .40, .17), vec3(.28, .36, .12), .43);
    transformed += movement * awakeningExtent / dimensions;
  }
`;

const dewReflection = `#include <normal_fragment_maps>
  if (awakeningTime > 5.05) {
    vec3 p = awakeningPosition;
    vec3 pigment = diffuseColor.rgb;
    float moss = smoothstep(.003, .028, pigment.g - pigment.r * .93)
      * smoothstep(.005, .036, pigment.g - pigment.b);
    float fan = smoothstep(.12, .28, dot(pigment, vec3(.2126, .7152, .0722)))
      * smoothstep(.39, .63, p.y);
    float droplets = smoothstep(.74, .98, sin(p.x * 85. + p.z * 57.)
      * sin(p.y * 94. - p.x * 43.) * cos(p.z * 91. + p.y * 43.));
    float beam = sin(7.5 * p.x + 4. * p.z - awakeningTime * .72);
    float edge = pow(max(0., dot(normal, normalize(vec3(.31, .49, .81)))), 3.);
    float reflection = max(moss * .92, fan * .57) * droplets * edge
      * smoothstep(.38, .93, beam) * smoothstep(5.05, 6.4, awakeningTime);
    roughnessFactor = mix(roughnessFactor, min(roughnessFactor, .24), reflection * .62);
  }`;

function createSporeGeometry(count = 12) {
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = ((i * 7) % 13) / 13;
    seeds[i * 3 + 1] = ((i * 11) % 17) / 17;
    seeds[i * 3 + 2] = ((i * 5) % 11) / 11;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(seeds, 3));
  return { geometry, seeds };
}

function createShelfSpores(authoredYaw: number) {
  const { geometry, seeds } = createSporeGeometry();
  const count = seeds.length / 3;
  const origins = new Float32Array(count * 3);
  const ages = new Float32Array(count);
  const birthPositions = new BufferAttribute(origins, 3).setUsage(DynamicDrawUsage);
  const progress = new BufferAttribute(ages, 1).setUsage(DynamicDrawUsage);
  geometry.setAttribute('birthPosition', birthPositions);
  geometry.setAttribute('sporeProgress', progress);
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 birthPosition;
      attribute float sporeProgress;
      varying float intensity;
      varying float warmth;
      void main() {
        float t = clamp(sporeProgress, 0., 1.);
        float phase = position.x * 6.2831853;
        float drift = sin(phase + t * 3.5) - sin(phase);
        float curl = cos(phase + t * 3.1) - cos(phase);
        vec3 p = birthPosition + vec3(drift * (.038 + .034 * position.y),
          t * (.24 + .35 * position.z), curl * (.024 + .036 * position.z));
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * view;
        float targetUnits = length(modelViewMatrix[1].xyz);
        gl_PointSize = clamp((4.0 + 4.5 * position.y) * targetUnits / max(.001, -view.z), 1.5, 5.0);
        intensity = smoothstep(.025, .20, t) * (1. - smoothstep(.59, 1., t))
          * (.20 + .26 * position.y);
        warmth = position.z;
      }`,
    fragmentShader: `
      varying float intensity;
      varying float warmth;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.;
        vec3 color = mix(vec3(.83, .88, .72), vec3(.96, .84, .65), warmth * .68);
        gl_FragColor = vec4(color, intensity * (1. - smoothstep(.05, 1., radius)));
      }`,
  });
  const points = new Points(geometry, material);
  return {
    points,
    update(elapsed: number, reduced: boolean) {
      points.visible = !reduced && elapsed > sporesStart;
      if (!points.visible) return;
      for (let i = 0; i < count; i++) {
        const seed = seeds[i * 3];
        const life = 3.5 + 1.85 * seeds[i * 3 + 2];
        const period = life + .9 + seeds[i * 3 + 1];
        const start = sporesStart + i * .25 + seed * .42;
        const birth = start + Math.floor(Math.max(0, elapsed - start) / period) * period;
        const age = (elapsed - birth) / life;
        ages[i] = MathUtils.clamp(age, 0, 1);
        const [x, y, z] = shelfOrigins[i % shelfOrigins.length];
        // Follow the shelf at release, then rise on the independent gravity axis.
        const yaw = authoredYaw + mossTurn(birth);
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const offset = (seed - .5) * .019;
        origins[i * 3] = (x + offset) * cos + z * sin;
        origins[i * 3 + 1] = y;
        origins[i * 3 + 2] = z * cos - (x + offset) * sin;
      }
      birthPositions.needsUpdate = true;
      progress.needsUpdate = true;
    },
  };
}

function createReleaseSpores(authoredYaw: number) {
  const count = steadySporeCount + burstSporeCount;
  const { geometry, seeds } = createSporeGeometry(count);
  const origins = new Float32Array(count * 3);
  const directions = new Float32Array(count * 2);
  const ages = new Float32Array(count);
  const birthPositions = new BufferAttribute(origins, 3).setUsage(DynamicDrawUsage);
  const birthDirections = new BufferAttribute(directions, 2).setUsage(DynamicDrawUsage);
  const progress = new BufferAttribute(ages, 1).setUsage(DynamicDrawUsage);
  geometry.setAttribute('birthPosition', birthPositions);
  geometry.setAttribute('birthDirection', birthDirections);
  geometry.setAttribute('sporeProgress', progress);
  const emissions = Array.from({ length: count }, (_, index) => {
    const seed = seeds[index * 3];
    const isBurst = index >= steadySporeCount;
    const beat = index - steadySporeCount;
    const period = isBurst ? 22.4 : 5.55;
    const delay = isBurst ? (beat < 6 ? 7.7 : 18.4) + (beat % 6) * .15 : index * period / steadySporeCount;
    const offset = (seed - .5) * .025;
    const [x, y, z, outwardX, outwardZ] = capUndersides[index % capUndersides.length];
    return {
      x: x - outwardZ * offset, y, z: z + outwardX * offset,
      outwardX, outwardZ, period, start: sporesStart + delay + seed * .12,
      life: (isBurst ? 2.65 : 3.35) + 1.65 * seeds[index * 3 + 2],
      lastRelease: -1,
    };
  });
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 birthPosition;
      attribute vec2 birthDirection;
      attribute float sporeProgress;
      varying float intensity;
      varying float warmth;
      void main() {
        float t = clamp(sporeProgress, 0., 1.);
        float phase = position.x * 6.2831853;
        vec2 across = vec2(-birthDirection.y, birthDirection.x);
        float release = smoothstep(0., .31, t);
        float coast = release * (.098 + .083 * position.y) + t * (.084 + .089 * position.z);
        float side = (sin(phase + t * (4.5 + 2.7 * position.y)) - sin(phase)) * (.027 + .036 * position.z);
        vec2 drift = birthDirection * coast + across * side;
        float drop = sin(min(t / .23, 1.) * 3.141593) * (.014 + .022 * position.y);
        float rise = smoothstep(.14, .91, t) * (.24 + .40 * position.z) + .073 * t;
        vec3 p = birthPosition + vec3(drift.x, rise - drop, drift.y);
        vec4 view = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * view;
        float units = length(modelViewMatrix[1].xyz) * projectionMatrix[1][1];
        gl_PointSize = clamp((4.0 + 5.9 * position.y) * units / max(.001, -view.z), 2.1, 6.0);
        intensity = smoothstep(.018, .17, t) * (1. - smoothstep(.61, .99, t))
          * (.38 + .34 * position.y);
        warmth = position.z;
      }`,
    fragmentShader: `
      varying float intensity;
      varying float warmth;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.;
        float core = 1. - smoothstep(.22, .72, radius);
        float edge = 1. - smoothstep(.53, 1., radius);
        // A soft umber edge gives the warm core contrast against pale backgrounds.
        vec3 light = mix(vec3(1., .96, .83), vec3(1., .76, .43), warmth * .87);
        vec3 color = mix(vec3(.19, .125, .065), light, smoothstep(.18, .72, core));
        gl_FragColor = vec4(color, intensity * (.66 * edge + .34 * core));
      }`,
  });
  const points = new Points(geometry, material);
  return {
    points,
    update(elapsed: number, reduced: boolean) {
      points.visible = !reduced && elapsed > sporesStart;
      if (!points.visible) return;
      let changedBirths = false;
      emissions.forEach((emission, index) => {
        const { start, period, life } = emission;
        const release = Math.floor(Math.max(0, elapsed - start) / period);
        const birth = start + release * period;
        ages[index] = MathUtils.clamp((elapsed - birth) / life, 0, 1);
        if (release === emission.lastRelease) return;
        emission.lastRelease = release;
        changedBirths = true;
        // Emission follows the rotating cap; detached spores drift in gravity space.
        const yaw = authoredYaw + mossTurn(birth);
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const { x, y, z, outwardX, outwardZ } = emission;
        birthPositions.setXYZ(index, x * cos + z * sin, y, z * cos - x * sin);
        birthDirections.setXY(index, outwardX * cos + outwardZ * sin, outwardZ * cos - outwardX * sin);
      });
      if (changedBirths) {
        birthPositions.needsUpdate = true;
        birthDirections.needsUpdate = true;
      }
      progress.needsUpdate = true;
    },
  };
}

export function createMossAwakening(sculpture: Group, upright: Group, forestFinish = false, finalForest = false) {
  const clock = { value: 0 };
  const motion = { value: 1 };
  sculpture.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox!;
    const origin = bounds.min.clone();
    const extent = bounds.max.clone().sub(origin);
    const material = object.material;
    material.onBeforeCompile = shader => {
      shader.uniforms.awakeningTime = clock;
      shader.uniforms.awakeningOrigin = { value: origin };
      shader.uniforms.awakeningExtent = { value: extent };
      if (finalForest) shader.uniforms.awakeningMotion = motion;
      shader.vertexShader = 'varying vec3 awakeningPosition; uniform vec3 awakeningOrigin, awakeningExtent;\n' +
        (finalForest ? 'uniform float awakeningTime, awakeningMotion;\n' + fanGrowth : '') +
        shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          awakeningPosition = (position - awakeningOrigin) / max(awakeningExtent, vec3(0.00001));
          ${finalForest ? fanExpansion : ''}`);
      shader.fragmentShader = 'varying vec3 awakeningPosition; uniform float awakeningTime;\n' +
        shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          if (awakeningTime < ${sporesStart.toFixed(1)}) {
            vec3 p = awakeningPosition;
            vec3 pigment = diffuseColor.rgb;
            float lightness = dot(pigment, vec3(.2126, .7152, .0722));
            float grain = sin(p.x * 53.0 + p.y * 31.0) * sin(p.z * 49.0 - p.y * 19.0);
            float moss = smoothstep(.001, .028, pigment.g - pigment.r * .93)
              * smoothstep(.004, .035, pigment.g - pigment.b);
            float edge = smoothstep(.075, .18, lightness);
            float cap = smoothstep(.006, .032, pigment.r - pigment.g) * smoothstep(.019, .073, lightness);
            float shelf = (1.0 - moss) * max(edge, cap * smoothstep(.20, .54, p.y));
            float barkTime = .17 + p.y * .83 + .14 * p.z + .08 * grain;
            float fanTime = 2.05 + p.y * .62 + abs(p.x - .53) * 1.72
                            + p.z * .48 + grain * .15;
            float shelfMask = smoothstep(.28, .52, shelf);
            float revealAt = mix(barkTime, fanTime, shelfMask);
            float softness = mix(.19, .76, shelfMask);
            float fadeEnd = min(revealAt + softness, ${sporesStart.toFixed(1)});
            float appearance = smoothstep(revealAt - softness, fadeEnd, awakeningTime)
                               * smoothstep(0.0, .27, awakeningTime);
            float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
            if (appearance <= dither) discard;
            float mossTime = .95 + p.y * 1.44 + grain * .15;
            float liveMoss = smoothstep(mossTime, mossTime + .43, awakeningTime);
            vec3 dormant = pigment * vec3(.68, .30, .24);
            diffuseColor.rgb = mix(pigment, dormant, moss * (1.0 - liveMoss));
          }`);
    };
    if (forestFinish) {
      const compile = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        compile(shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', dewReflection);
      };
    }
    material.customProgramCacheKey = () => finalForest ? 'moss-awakening-growth' : forestFinish ? 'moss-awakening-dew' : 'moss-awakening-v2';
    material.needsUpdate = true;
  });

  const mist = createAtmosphereMist();
  mist.root.scale.setScalar(1.2);
  // Keep the three low wisps and one mid-layer close to the bark.
  for (const wisp of mist.root.children.slice(4)) wisp.visible = false;
  upright.add(mist.root);

  const authoredYaw = sculpture.children[0]?.rotation.y ?? 0;
  const spores = finalForest ? createReleaseSpores(authoredYaw)
    : forestFinish ? createShelfSpores(authoredYaw) : createBarkSpores(clock);
  const points = spores.points;
  points.frustumCulled = false;
  points.renderOrder = 2;
  upright.add(points);
  return {
    update(elapsed: number, reduced: boolean) {
      clock.value = reduced ? (forestFinish ? sporesStart : fullReveal) : elapsed;
      motion.value = reduced ? 0 : 1;
      const ambient = .48 - .29 * MathUtils.smoothstep(elapsed, 1, fullReveal);
      const breathing = forestFinish ? .025 * Math.sin(elapsed * .61) : 0;
      mist.update(elapsed, reduced, reduced ? .17 : ambient + breathing);
      spores.update(elapsed, reduced);
    },
    dispose() {
      mist.dispose();
      mist.root.removeFromParent();
      points.removeFromParent();
      points.geometry.dispose();
      points.material.dispose();
    },
  };
}

function createBarkSpores(clock: { value: number }) {
  const { geometry } = createSporeGeometry();
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { awakeningTime: clock },
    vertexShader: `
      uniform float awakeningTime;
      varying float intensity;
      void main() {
        float age = max(0.0, awakeningTime - ${sporesStart.toFixed(1)});
        float life = 4.0 + position.x * 3.0;
        float delay = position.y * 4.5;
        float progress = fract(max(0.0, age - delay) / life);
        vec3 p = vec3((position.x - .5) * .96 + .09 * sin(progress * 5.0 + position.z * 9.0),
                      .18 + progress * .83, (position.z - .5) * .72);
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp((1.5 + position.z * 3.0) / max(.6, -view.z), 1.0, 4.0);
        intensity = step(delay, age) * smoothstep(0.0, .22, progress) *
                    (1.0 - smoothstep(.58, 1.0, progress)) * (.25 + .28 * position.z);
      }`,
    fragmentShader: `
      varying float intensity;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.0;
        gl_FragColor = vec4(.86, .87, .70, intensity * (1.0 - smoothstep(.05, 1.0, radius)));
      }`,
  });
  const points = new Points(geometry, material);
  return {
    points,
    update(elapsed: number, reduced: boolean) {
      points.visible = !reduced && elapsed >= sporesStart;
    },
  };
}
