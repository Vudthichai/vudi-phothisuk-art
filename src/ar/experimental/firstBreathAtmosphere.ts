import { BufferGeometry, Float32BufferAttribute, Group, Points, ShaderMaterial, Vector3 } from 'three';

const pulseEnd = 5.1;
const idleStart = 8.4;
const idleInterval = 16.5;
const idleLife = 3.8;

/** Mount on the gravity-aligned root so the motes rise independently of blossom rotation. */
export function createFirstBreathAtmosphere(upright: Group, origin: Vector3, releaseSeconds: number) {
  const geometry = new BufferGeometry();
  const seeds: number[] = [];
  for (let index = 0; index < 10; index++) {
    seeds.push(((index * 7 + 3) % 13) / 13, ((index * 11 + 2) % 17) / 17, (index + .5) / 10);
  }
  seeds.push(0, 0, 1);
  geometry.setAttribute('position', new Float32BufferAttribute(seeds, 3));

  const age = { value: 0 };
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { breathAge: age, releaseOffset: { value: releaseSeconds } },
    vertexShader: `
      uniform float breathAge;
      uniform float releaseOffset;
      varying float opacity;
      varying float warmth;
      varying float ivory;
      void main() {
        float targetUnits = length(modelViewMatrix[1].xyz);
        ivory = step(.999, position.z);
        if (ivory > .5) {
          float openingAge = breathAge + releaseOffset;
          vec3 drift = vec3(.022 * sin(openingAge * 1.2), openingAge * .028, .035);
          vec4 view = modelViewMatrix * vec4(drift, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp(53.0 * targetUnits / max(.001, -view.z), 10.0, 42.0);
          opacity = .14 * smoothstep(.10, .66, openingAge) * (1.0 - smoothstep(.96, 2.0, openingAge));
          warmth = 0.0;
          return;
        }
        float delay = .22 + position.z * .94;
        float life = 2.2 + position.y * 1.6;
        float flight = (breathAge - delay) / life;
        float activeMote = step(0.0, flight) * (1.0 - step(1.0, flight));
        float strength = .56 + position.y * .21;
        float heading = position.x * 6.2831853;
        if (breathAge >= ${idleStart.toFixed(1)}) {
          float idle = breathAge - ${idleStart.toFixed(1)};
          flight = mod(idle, ${idleInterval.toFixed(1)}) / ${idleLife.toFixed(1)};
          activeMote = (1.0 - step(.10, position.z)) * (1.0 - step(1.0, flight));
          strength = .46;
          heading += floor(idle / ${idleInterval.toFixed(1)}) * 1.49;
        }
        float progress = clamp(flight, 0.0, 1.0);
        vec2 headingVector = vec2(cos(heading), sin(heading));
        vec2 drift = headingVector * (.018 + progress * (.10 + position.y * .17));
        drift.x += .027 * sin(progress * 5.8 + position.y * 3.0) * progress;
        vec3 offset = vec3(drift.x, .024 + progress * (.24 + position.x * .23), drift.y);
        vec4 view = modelViewMatrix * vec4(offset, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = activeMote * clamp((6.0 + position.y * 2.4) * targetUnits / max(.001, -view.z), 1.1, 3.8);
        opacity = activeMote * strength * smoothstep(.02, .20, flight) * (1.0 - smoothstep(.54, 1.0, flight));
        warmth = position.y;
      }`,
    fragmentShader: `
      varying float opacity;
      varying float warmth;
      varying float ivory;
      void main() {
        float radius = length(gl_PointCoord - vec2(.5)) * 2.0;
        float edge = 1.0 - smoothstep(.12, 1.0, radius);
        vec3 tint = mix(vec3(.99, .96, .88), vec3(.98, .86, .68), warmth * .54 + radius * .23);
        float halo = 1.0 - smoothstep(0.0, 1.0, radius);
        gl_FragColor = vec4(mix(tint, vec3(.99, .97, .92), ivory), opacity * mix(edge, halo * halo, ivory));
      }`,
  });

  const motes = new Points(geometry, material);
  motes.name = 'First Breath pollen';
  motes.position.copy(origin);
  motes.frustumCulled = false;
  motes.visible = false;
  motes.renderOrder = 2;
  upright.add(motes);

  return {
    update(elapsed: number, reduced: boolean) {
      const sinceRelease = elapsed - releaseSeconds;
      const pulse = sinceRelease >= .22 && sinceRelease < pulseEnd;
      const idle = sinceRelease >= idleStart && (sinceRelease - idleStart) % idleInterval < idleLife;
      age.value = sinceRelease;
      const veil = elapsed >= .1 && elapsed < 2;
      motes.visible = !reduced && (veil || pulse || idle);
    },
    dispose() {
      motes.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
