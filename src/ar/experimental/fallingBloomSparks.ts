import { BufferGeometry, Float32BufferAttribute, Group, Points, ShaderMaterial } from 'three';

const sparkCount = 12;
const fallStart = 1.5;

/** A single batch of falling sparks and one occasional brighter glint. */
export function createFallingBloomSparks(upright: Group) {
  const geometry = new BufferGeometry();
  const seeds: number[] = [];
  for (let index = 0; index < sparkCount; index++) {
    seeds.push(((index * 7 + 2) % 13) / 13, ((index * 5 + 3) % 17) / 17, (index + .5) / sparkCount);
  }
  seeds.push(.3, .47, 1);
  geometry.setAttribute('position', new Float32BufferAttribute(seeds, 3));
  const time = { value: 0 };
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { sparkTime: time },
    vertexShader: `
      uniform float sparkTime;
      varying float opacity, bright, gold;
      void main() {
        float elapsed = sparkTime - ${fallStart.toFixed(1)};
        bright = step(.999, position.z);
        float duration = mix(4.1 + position.y * 2.7, 2.4, bright);
        float interval = mix(duration, 12.8, bright);
        float phase = mix(elapsed + position.z * interval, sparkTime - 4.6, bright);
        float age = mod(max(0., phase), interval) / duration;
        float stepAge = clamp(age, 0., 1.);
        float cycle = floor(max(0., phase) / interval);
        float angle = position.x * 6.2831853 + cycle * 2.3999632;
        float radius = .24 + .39 * position.y;
        vec2 side = vec2(cos(angle), sin(angle)) * radius * vec2(1., .69);
        side.x += .05 * sin(2.5 * stepAge + angle) * stepAge;
        float height = 1.10 + .15 * position.x - stepAge * (.81 + .24 * position.y);
        vec4 view = modelViewMatrix * vec4(side.x, height, side.y, 1.);
        gl_Position = projectionMatrix * view;
        float scale = projectionMatrix[1][1] * length(modelViewMatrix[1].xyz) / max(.001, -view.z);
        float glint = bright * (1. - smoothstep(.035, .19, abs(age - .48)));
        float size = mix(5.6 + 3.25 * position.y, 10.3, bright) * (1. + .16 * glint);
        gl_PointSize = clamp(size * scale, 1.65, 4.8 + 1.65 * bright);
        float fade = smoothstep(.0, .21, age) * (1. - smoothstep(.70, 1., age));
        float twinkle = .92 + .08 * sin(phase * 2.9 + angle);
        float opening = smoothstep(0., 1.45, elapsed) * step(0., phase);
        opacity = fade * opening * twinkle * (mix(.55 + .18 * position.x, .66, bright) + .26 * glint);
        gold = position.y;
      }`,
    fragmentShader: `
      varying float opacity, bright, gold;
      void main() {
        vec2 delta = (gl_PointCoord - .5) * 2.;
        float radius = length(delta * vec2(1.24, 1.));
        float halo = 1. - smoothstep(.18, 1., radius);
        float core = 1. - smoothstep(.0, .52, radius);
        vec3 rim = mix(vec3(.93, .60, .24), vec3(.97, .74, .40), gold);
        vec3 center = mix(vec3(.99, .83, .53), vec3(1., .93, .70), bright);
        gl_FragColor = vec4(mix(rim, center, core), opacity * halo * (.63 + .37 * core));
      }`,
  });
  const sparks = new Points(geometry, material);
  sparks.name = 'Blooming Desire falling golden sparks';
  sparks.visible = false;
  sparks.frustumCulled = false;
  sparks.renderOrder = 2;
  upright.add(sparks);
  return {
    update(elapsed: number, reduced: boolean) {
      time.value = elapsed;
      sparks.visible = !reduced && elapsed > fallStart;
    },
    dispose() {
      sparks.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
