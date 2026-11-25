import { BufferAttribute, BufferGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Points, ShaderMaterial } from 'three';
import { createAtmosphereMist } from './atmosphereMist';
import { SCULPTURE_TIMING } from './sculptureTimeline';

const sporesStart = 9;
const fullReveal = 12;

export function mossTurn(elapsed: number) {
  const ramp = MathUtils.clamp((elapsed - sporesStart) / (fullReveal - sporesStart), 0, 1);
  const trackedTurnSeconds = 3 * ramp ** 3 * (1 - ramp / 2) + Math.max(0, elapsed - fullReveal);
  return trackedTurnSeconds / SCULPTURE_TIMING.revolutionSeconds * Math.PI * 2;
}

export function createMossAwakening(sculpture: Group, upright: Group) {
  const clock = { value: 0 };
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
      shader.vertexShader = 'varying vec3 awakeningPosition; uniform vec3 awakeningOrigin, awakeningExtent;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          awakeningPosition = (position - awakeningOrigin) / max(awakeningExtent, vec3(0.00001));`);
      shader.fragmentShader = 'varying vec3 awakeningPosition; uniform float awakeningTime;\n' +
        shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          if (awakeningTime < 9.0) {
            vec3 p = awakeningPosition;
            vec3 pigment = diffuseColor.rgb;
            float lightness = dot(pigment, vec3(.2126, .7152, .0722));
            float grain = sin(p.x * 53.0 + p.y * 31.0) * sin(p.z * 49.0 - p.y * 19.0);
            float moss = smoothstep(.001, .028, pigment.g - pigment.r * .93)
              * smoothstep(.004, .035, pigment.g - pigment.b);
            float edge = smoothstep(.075, .18, lightness);
            float cap = smoothstep(.006, .032, pigment.r - pigment.g) * smoothstep(.019, .073, lightness);
            float shelf = (1.0 - moss) * max(edge, cap * smoothstep(.20, .54, p.y));
            float barkTime = .12 + p.y * 1.45 + .32 * p.z + .17 * grain;
            float fanTime = 5.12 + p.y * 1.24 + abs(p.x - .53) * 2.05
                            + p.z * .70 + grain * .20;
            float revealAt = mix(barkTime, fanTime, smoothstep(.28, .52, shelf));
            float appearance = smoothstep(revealAt - .11, revealAt + .20, awakeningTime);
            float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
            if (appearance < .999 && appearance <= dither) discard;
            float liveMoss = smoothstep(1.9 + p.y * 2.5 + grain * .31,
                                       2.5 + p.y * 2.5 + grain * .31, awakeningTime);
            vec3 dormant = pigment * vec3(.68, .30, .24);
            diffuseColor.rgb = mix(pigment, dormant, moss * (1.0 - liveMoss));
          }`);
    };
    material.customProgramCacheKey = () => 'moss-awakening-v1';
    material.needsUpdate = true;
  });

  const mist = createAtmosphereMist();
  mist.root.scale.setScalar(1.28);
  upright.add(mist.root);

  const geometry = new BufferGeometry();
  const seeds = new Float32Array(12 * 3);
  for (let i = 0; i < 12; i++) {
    seeds[i * 3] = ((i * 7) % 13) / 13;
    seeds[i * 3 + 1] = ((i * 11) % 17) / 17;
    seeds[i * 3 + 2] = ((i * 5) % 11) / 11;
  }
  geometry.setAttribute('position', new BufferAttribute(seeds, 3));
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { awakeningTime: clock },
    vertexShader: `
      uniform float awakeningTime;
      varying float intensity;
      void main() {
        float age = max(0.0, awakeningTime - 9.0);
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
  const spores = new Points(geometry, material);
  spores.frustumCulled = false;
  spores.renderOrder = 2;
  upright.add(spores);

  return {
    update(elapsed: number, reduced: boolean) {
      clock.value = reduced ? fullReveal : elapsed;
      const ambient = .48 - .29 * MathUtils.smoothstep(elapsed, 1, 11);
      mist.update(elapsed, reduced, reduced ? .17 : ambient);
      spores.visible = !reduced && elapsed >= sporesStart;
    },
    dispose() {
      mist.dispose();
      mist.root.removeFromParent();
      spores.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
