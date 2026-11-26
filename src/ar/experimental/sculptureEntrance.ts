import { BufferAttribute, BufferGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Sprite, Points, ShaderMaterial, Vector3 } from 'three';
import type { Entrance } from '../config';
import { createAtmosphereMist } from './atmosphereMist';
import { SCULPTURE_TIMING } from './sculptureTimeline';

export function entranceTiming(entrance: Entrance, pieceCount: number, elapsed: number, reduced: boolean) {
  const end = entrance.phases?.reduce((latest, phase) => Math.max(latest, phase.start + phase.duration), 0)
    ?? (entrance.duration + (pieceCount - 1) * entrance.stagger);
  return {
    progress(index: number) {
      const phase = entrance.phases?.[index];
      const start = phase?.start ?? index * entrance.stagger;
      return reduced ? 1 : MathUtils.clamp((elapsed - start) / (phase?.duration ?? entrance.duration), 0, 1);
    },
    turn: reduced ? 0 : Math.max(0, elapsed - end) / SCULPTURE_TIMING.revolutionSeconds * Math.PI * 2,
  };
}

export function createSculptureEntrance(settings: Entrance, sculpture: Group, upright: Group) {
  const radialCenter = new Vector3().fromArray(settings.radialCenter ?? [.5, .5, .5]);
  const assigned = new Set<MeshStandardMaterial>();
  const progress = sculpture.children.map((piece, index) => {
    const phaseDirection = settings.phases?.[index]?.direction;
    const direction = new Vector3().fromArray(phaseDirection ?? settings.direction);
    direction.divideScalar(Math.abs(direction.x) + Math.abs(direction.y) + Math.abs(direction.z));
    const time = { value: 0 };
    piece.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      const material = assigned.has(object.material) ? object.material.clone() : object.material;
      object.material = material;
      assigned.add(material);
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox!;
      const origin = bounds.min;
      const extent = bounds.max.clone().sub(origin);
      material.onBeforeCompile = shader => {
        shader.uniforms.entranceProgress = time;
        shader.uniforms.entranceOrigin = { value: origin };
        shader.uniforms.entranceExtent = { value: extent };
        shader.uniforms.entranceDirection = { value: direction };
        shader.uniforms.entranceSoftness = { value: settings.softness };
        shader.uniforms.entranceCenter = { value: radialCenter };
        shader.uniforms.entranceRadial = { value: settings.radialCenter && !phaseDirection ? 1 : 0 };
        shader.uniforms.entranceGold = { value: settings.gold ? 1 : 0 };
        shader.vertexShader = 'varying vec3 entrancePosition; uniform vec3 entranceOrigin, entranceExtent;\n' +
          shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            entrancePosition = (position - entranceOrigin) / max(entranceExtent, vec3(.00001));`);
        shader.fragmentShader = `varying vec3 entrancePosition;
          uniform vec3 entranceDirection, entranceCenter;
          uniform float entranceProgress, entranceSoftness, entranceGold, entranceRadial;\n` +
          shader.fragmentShader.replace('#include <opaque_fragment>', `
            if (entranceProgress < 1.0) {
              float fleck = fract(sin(dot(floor(entrancePosition * 88.0), vec3(41.7, 73.1, 17.3))) * 43758.5453);
              float line = dot(entrancePosition - .5, entranceDirection) + .5;
              float radius = min(1.0, length((entrancePosition - entranceCenter) * vec3(1.45, 1.0, 1.45)));
              float axis = mix(line, radius, entranceRadial) + (fleck - .5) * .14;
              float front = mix(-.10 - entranceSoftness, 1.10 + entranceSoftness, entranceProgress);
              float coverage = 1.0 - smoothstep(front - entranceSoftness, front + entranceSoftness, axis);
              float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
              if (coverage <= grain) discard;
              float distanceToFront = (axis - front + .09) * 15.0;
              float glint = exp(-distanceToFront * distanceToFront) * coverage;
              outgoingLight += entranceGold * glint * vec3(.24, .15, .047);
            }
            #include <opaque_fragment>`);
      };
      material.customProgramCacheKey = () => 'botanical-entrance-v1';
      material.needsUpdate = true;
    });
    return time;
  });

  const mist = settings.atmosphere > 0 ? createAtmosphereMist() : undefined;
  if (mist) {
    for (const wisp of mist.root.children.slice(2)) wisp.visible = false;
    if (settings.atmosphereColor !== undefined) {
      for (const wisp of mist.root.children) {
        if (wisp instanceof Sprite) wisp.material.color.setHex(settings.atmosphereColor);
      }
    }
    upright.add(mist.root);
  }

  const fragments = settings.gold ? createGoldFragments(upright, settings.goldOrigin) : undefined;
  const firstPhase = settings.phases?.[0];
  return {
    update(elapsed: number, reduced: boolean) {
      const timing = entranceTiming(settings, progress.length, elapsed, reduced);
      progress.forEach((uniform, index) => { uniform.value = timing.progress(index); });
      if (mist) {
        const intensity = settings.atmosphere * (1 - timing.progress(progress.length - 1));
        mist.update(elapsed, reduced, intensity);
        mist.root.visible = intensity > 0;
      }
      fragments?.update(firstPhase && !reduced
        ? MathUtils.clamp(elapsed / (firstPhase.start + firstPhase.duration), 0, 1)
        : timing.progress(0));
      return timing.turn;
    },
    dispose() {
      mist?.dispose();
      mist?.root.removeFromParent();
      fragments?.dispose();
    },
  };
}

function createGoldFragments(root: Group, origin?: number[]) {
  const geometry = new BufferGeometry();
  const seeds = new Float32Array(36 * 3);
  for (let i = 0; i < 36; i++) {
    seeds[i * 3] = ((i * 11) % 37) / 37;
    seeds[i * 3 + 1] = ((i * 17) % 41) / 41;
    seeds[i * 3 + 2] = ((i * 23) % 43) / 43;
  }
  geometry.setAttribute('position', new BufferAttribute(seeds, 3));
  const progress = { value: 0 };
  const material = new ShaderMaterial({
    uniforms: { progress, origin: { value: new Vector3().fromArray(origin ?? [0, .40, 0]) },
      convergence: { value: origin ? .88 : .58 } }, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float progress, convergence;
      uniform vec3 origin;
      varying float alpha;
      void main() {
        float slide = smoothstep(0.0, 1.0, progress);
        float angle = 6.2831853 * position.x - slide * 1.65;
        float radius = (.34 + position.z * .29) * (1.0 - convergence * slide);
        float height = (position.y - .5) * (.99 - (.55 + (convergence - .58)) * slide);
        vec3 p = origin + vec3(cos(angle) * radius, height, sin(angle) * radius);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 1.3 + position.z * 3.0;
        alpha = smoothstep(0.0, convergence > .6 ? .105 : .18,progress) * (1.0-smoothstep(.50,1.0,progress)) * (.25 + position.z * .60);
      }`,
    fragmentShader: `
      varying float alpha;
      void main() {
        vec2 p = abs(gl_PointCoord - .5);
        gl_FragColor = vec4(.98,.75,.36,alpha * (1.0-smoothstep(.22,.50,p.x+p.y)));
      }`,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  root.add(points);
  return {
    update(value: number) {
      progress.value = value;
      points.visible = value > 0 && value < 1;
    },
    dispose() {
      points.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
