import {
  BufferGeometry, Float32BufferAttribute, Group, MathUtils, Mesh, MeshStandardMaterial,
  Points, ShaderMaterial, Vector3,
} from 'three';
import type { Entrance, LilyCinematics } from '../config';
import { SCULPTURE_TIMING } from './sculptureTimeline';
import { createLilyBeam, lilyBeamLighting } from './lilyBeam';

const presets = {
  'sunlit-flame': { sweepStart: 1.05, sweepEnd: 4.15, petalBase: .47, tint: [.27, .15, .045], shimmer: 0 },
  'blushing-ember': { sweepStart: .72, sweepEnd: 3.90, petalBase: .41, tint: [.21, .105, .175], shimmer: .45 },
  'the-dance': { sweepStart: .65, sweepEnd: 2.78, petalBase: .45, tint: [.15, .115, .077], shimmer: .18 },
} as const;

export function lilyCinematicTurn(elapsed: number, revealEnd: number, reduced: boolean) {
  if (reduced) return 0;
  const rampSeconds = .85;
  const afterReveal = Math.max(0, elapsed - revealEnd);
  const ramp = Math.min(1, afterReveal / rampSeconds);
  const rotating = rampSeconds * ramp ** 3 * (1 - ramp / 2) + Math.max(0, afterReveal - rampSeconds);
  return rotating * Math.PI * 2 / SCULPTURE_TIMING.revolutionSeconds;
}

function addLilyLight(piece: Group, sweep: { value: number }, preset: typeof presets[LilyCinematics], beam?: ReturnType<typeof createLilyBeam>) {
  piece.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox!;
    const material = object.material;
    const existingCompile = material.onBeforeCompile.bind(material);
    const existingKey = material.customProgramCacheKey();
    const beamFrame = beam?.trackMesh(object);
    material.onBeforeCompile = (shader, renderer) => {
      existingCompile(shader, renderer);
      shader.uniforms.lilySweep = sweep;
      shader.uniforms.lilyBounds = { value: bounds.min };
      shader.uniforms.lilySize = { value: bounds.getSize(new Vector3()) };
      shader.uniforms.lilyPetalBase = { value: preset.petalBase };
      shader.uniforms.lilyTint = { value: new Vector3(...preset.tint) };
      shader.uniforms.lilyShimmer = { value: preset.shimmer };
      shader.vertexShader = 'varying vec3 lilySurface; uniform vec3 lilyBounds, lilySize;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          lilySurface = (position - lilyBounds) / max(lilySize, vec3(.00001));`);
      shader.fragmentShader = `varying vec3 lilySurface;
        uniform vec3 lilyTint;
        uniform float lilySweep, lilyPetalBase, lilyShimmer;\n` +
        shader.fragmentShader.replace('#include <aomap_fragment>', `
          #include <aomap_fragment>
          if (lilySweep > 0. && lilySweep < 1.) {
            float petal = smoothstep(lilyPetalBase, lilyPetalBase + .13, lilySurface.y);
            float axis = dot(lilySurface, vec3(.75, .18, .07));
            float head = mix(.02, 1.08, lilySweep);
            float bandDistance = axis - head;
            float band = exp2(-31. * bandDistance * bandDistance);
            float envelope = smoothstep(0., .2, lilySweep) * (1. - smoothstep(.71, 1., lilySweep));
            float light = band * envelope * petal;
            float grazing = 1. - abs(dot(normal, normalize(vViewPosition)));
            reflectedLight.directDiffuse *= 1. + light * lilyTint;
            reflectedLight.directSpecular *= 1. + light * (lilyTint * 1.28 + lilyShimmer * grazing);
          }
          ${beam ? lilyBeamLighting : ''}`);
      if (beam && beamFrame) {
        Object.assign(shader.uniforms, beam.uniforms, { lilyBeamMeshToUpright: beamFrame });
        shader.vertexShader = 'varying vec3 lilyBeamSurface; uniform mat4 lilyBeamMeshToUpright;\n' +
          shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            lilyBeamSurface = (lilyBeamMeshToUpright * vec4(position, 1.)).xyz;`);
        shader.fragmentShader = 'varying vec3 lilyBeamSurface; uniform vec3 lilyBeamSource, lilyBeamTip, lilyBeamTint; uniform float lilyBeamAmount;\n' +
          shader.fragmentShader;
      }
    };
    material.customProgramCacheKey = () => `${existingKey}|lily-petal-light${beam ? '|directional-shaft' : ''}`;
    material.needsUpdate = true;
  });
}

function lilyThroat(turn: Group, piece: Group, blush: boolean) {
  // Measured in the existing Tiger and Dragon placements, after their fixed tilt.
  const throat = blush ? new Vector3(0, .54, -.16) : new Vector3(.008, .515, -.29);
  return piece.worldToLocal(turn.localToWorld(throat));
}

/** Motes stay gravity-aligned while their emission point follows the actual throat. */
function createLilyAir(upright: Group, piece: Group, throat: Vector3, blush: boolean) {
  const vertices: number[] = [];
  for (let i = 0; i < 7; i++) {
    vertices.push(((i * 7 + 2) % 13) / 13, ((i * 5 + 3) % 11) / 11, (i + .5) / 7);
  }
  if (blush) vertices.push(0, 0, 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const clock = { value: 0 };
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { lilyTime: clock, lilyBlush: { value: blush ? 1 : 0 } },
    vertexShader: `
      uniform float lilyTime, lilyBlush;
      varying float opacity, mist, blush;
      void main() {
        blush = lilyBlush;
        mist = step(.999, position.z);
        vec3 offset;
        float units = projectionMatrix[1][1] * length(modelViewMatrix[1].xyz);
        float size;
        if (mist > .5) {
          offset = vec3(-.033 + .075 * sin(lilyTime * .49), -.028 + lilyTime * .027, .028);
          opacity = .17 * smoothstep(.10, .58, lilyTime) * (1. - smoothstep(1.1, 2.75, lilyTime));
          size = 130.;
        } else {
          float delay = (blush > .5 ? 1.30 : 1.55) + position.z * 1.38;
          float flight = (lilyTime - delay) / (1.72 + position.y * 1.49);
          float heading = position.x * 6.2831853;
          if (lilyTime >= 8.5) {
            float idle = lilyTime - 8.5;
            flight = mod(idle, 6.4) / 2.55 + step(.15, position.z);
            heading += floor(idle / 6.4) * 1.59;
          }
          float stepAge = clamp(flight, 0., 1.);
          vec2 drift = vec2(cos(heading), sin(heading)) * (.024 + (.105 + position.y * .15) * stepAge);
          drift.x += .027 * sin(heading + stepAge * 6.1) * stepAge;
          offset = vec3(drift.x, .02 + (.23 + position.z * .10) * stepAge, drift.y + .05);
          opacity = (.38 + .20 * position.y) * smoothstep(.04, .24, flight) * (1. - smoothstep(.57, 1., flight));
          size = 4.4 + 2.4 * position.y;
        }
        vec4 view = modelViewMatrix * vec4(offset, 1.);
        gl_Position = projectionMatrix * view;
        float pixels = size * units / max(.001, -view.z);
        gl_PointSize = mist > .5 ? clamp(pixels, 22., 104.) : clamp(pixels, 1.05, 3.25);
      }`,
    fragmentShader: `
      varying float opacity, mist, blush;
      void main() {
        vec2 point = (gl_PointCoord - .5) * 2.;
        float mote = 1. - smoothstep(.07, 1., length(point));
        point.y = point.y * 2.35 + .1 * sin(point.x * 5.);
        float veil = pow(1. - smoothstep(0., 1., length(point)), 1.5);
        vec3 tint = mix(vec3(.99, .84, .59), vec3(.99, .76, .83), blush);
        gl_FragColor = vec4(tint, opacity * mix(mote, veil, mist));
      }`,
  });
  const points = new Points(geometry, material);
  points.name = blush ? 'Dragon Lily blush haze and motes' : 'Tiger Lily throat pollen';
  points.frustumCulled = false;
  points.renderOrder = 2;
  points.visible = false;
  upright.add(points);
  const position = new Vector3();
  return {
    update(elapsed: number, reduced: boolean) {
      clock.value = elapsed;
      const entrance = elapsed > (blush ? .1 : 1.55) && elapsed < 5.85;
      const idle = elapsed >= 8.5 && (elapsed - 8.5) % 6.4 < 2.55;
      points.visible = !reduced && (entrance || idle);
      if (points.visible) {
        piece.localToWorld(position.copy(throat));
        points.position.copy(upright.worldToLocal(position));
      }
    },
    dispose() {
      points.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createLilyCinematics(variant: LilyCinematics, turn: Group, upright: Group, entrance?: Entrance, finalLilyLight = false) {
  const preset = presets[variant];
  const pieces = turn.children as Group[];
  const blush = variant === 'blushing-ember';
  const throat = variant !== 'the-dance' && pieces[0] ? lilyThroat(turn, pieces[0], blush) : undefined;
  const beam = finalLilyLight && throat ? createLilyBeam(upright, pieces[0], throat, blush) : undefined;
  const revealEnd = entrance?.phases?.reduce((end, phase) => Math.max(end, phase.start + phase.duration), 0)
    ?? (entrance ? entrance.duration + (pieces.length - 1) * entrance.stagger : 0);
  const blooms = pieces.map((piece, index) => {
    const sweep = { value: -1 };
    addLilyLight(piece, sweep, preset, beam);
    return {
      piece, sweep, x: piece.rotation.x, z: piece.rotation.z,
      start: entrance?.phases?.[index]?.start ?? index * (entrance?.stagger ?? 0),
    };
  });
  const air = throat ? createLilyAir(upright, pieces[0], throat, blush) : undefined;
  return {
    turnAt(elapsed: number, reduced: boolean) {
      return lilyCinematicTurn(elapsed, revealEnd, reduced);
    },
    update(elapsed: number, reduced: boolean) {
      blooms.forEach(({ piece, sweep, start, x, z }, index) => {
        const age = elapsed - start;
        sweep.value = reduced ? -1 : MathUtils.clamp((age - preset.sweepStart) / (preset.sweepEnd - preset.sweepStart), 0, 1);
        // Tiger Lily's original sway still owns its own pivot. Dragon and the
        // bouquet breathe through tiny rigid movements from their original feet.
        if (variant === 'sunlit-flame') return;
        const motion = reduced ? 0 : MathUtils.smoothstep(age, .36, 1.55);
        const strength = variant === 'the-dance' ? .0115 : .019;
        const rate = .55 + .093 * index;
        piece.rotation.x = x + motion * strength * Math.sin(age * rate + index * 1.67);
        piece.rotation.z = z + motion * strength * .65 * Math.sin(age * (rate + .14) + index * 1.03);
      });
      air?.update(elapsed, reduced);
      beam?.update(elapsed, reduced);
    },
    dispose() {
      air?.dispose();
      beam?.dispose();
    },
  };
}
