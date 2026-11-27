import {
  BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group,
  InstancedMesh, MathUtils, MeshBasicMaterial, Object3D, Sprite, Vector3,
} from 'three';
import { createAtmosphereMist } from './atmosphereMist';

const PETAL_COUNT = 11;
const PETAL_COLORS = [0xffe1e7, 0xefafbf, 0xf7c9d5];

function createPetalGeometry(leaf = false) {
  const across = 6;
  const length = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const center = new Color(leaf ? 0xb7c29a : 0xfff7f7);
  const edge = new Color(leaf ? 0x677654 : 0xf7c7d4);
  const tint = new Color();

  for (let row = 0; row <= length; row++) {
    const t = row / length;
    const halfWidth = leaf ? .004 + .235 * Math.sin(Math.PI * t) ** .84
      : .014 + .34 * Math.sin(Math.PI * t) ** .58 * (.52 + .68 * t);
    for (let col = 0; col <= across; col++) {
      const u = col / across * 2 - 1;
      positions.push(
        u * halfWidth + .035 * Math.sin(t * Math.PI),
        t - .5 - .08 * Math.abs(u) ** 2 * t,
        .22 * t ** 3 + .16 * u ** 2 * Math.sin(Math.PI * t),
      );
      tint.copy(center).lerp(edge, .25 + .45 * Math.abs(u) + .13 * t);
      colors.push(tint.r, tint.g, tint.b);
      if (row < length && col < across) {
        const corner = row * (across + 1) + col;
        const below = corner + across + 1;
        indices.push(corner, corner + 1, below, corner + 1, below + 1, below);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

function petalVariation(slot: number, offset: number) {
  const value = Math.sin(slot * 73.83 + offset * 42.37) * 5197.23;
  return value - Math.floor(value);
}

function mountBatch(upright: Group, count: number, name: string, singlePass: boolean, leaf = false) {
  const geometry = createPetalGeometry(leaf);
  const material = new MeshBasicMaterial({
    side: DoubleSide, vertexColors: true, transparent: true, opacity: .77, depthWrite: false, forceSinglePass: singlePass,
  });
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  upright.add(mesh);
  return mesh;
}

function disposeBatch(batch: InstancedMesh<BufferGeometry, MeshBasicMaterial>) {
  batch.removeFromParent();
  batch.dispose();
  batch.geometry.dispose();
  batch.material.dispose();
}

function createClusterRain(centers: readonly Vector3[]) {
  return centers.flatMap((center, index) => [0, 1, 2].map(slot => {
    const seed = index * 3 + slot;
    const leaf = slot === 2;
    const duration = (leaf ? 3.65 : 4.25) + petalVariation(seed, 1) * 2.6;
    return {
      center, leaf, instance: leaf ? index : index * 2 + slot, duration,
      size: (leaf ? .049 : .034) + petalVariation(seed, 2) * .030,
      start: duration * (.12 + .78 * petalVariation(seed, 3)),
      side: slot === 0 || (leaf && index % 2 === 0) ? -1 : 1,
      depth: (petalVariation(seed, 4) - .5) * .23,
      phase: petalVariation(seed, 5) * 2 * Math.PI,
      fall: .33 + .18 * petalVariation(seed, 6),
      flutter: (leaf ? 1.56 : .96) + petalVariation(seed, 7) * .89,
    };
  }));
}

/** Mount to the gravity-aligned root. The tracked clock owns pauses and resumes. */
export function createEtherealPetals(upright: Group, serene = false, centers?: readonly Vector3[]) {
  const petals = mountBatch(upright, centers ? centers.length * 2 : PETAL_COUNT, 'Drifting blush petals', !!centers);
  const leaves = centers && mountBatch(upright, centers.length, 'Falling sage leaves', true, true);
  const rain = centers && createClusterRain(centers);

  const lanes = Array.from({ length: PETAL_COUNT }, (_, slot) => ({
    seconds: (serene ? 9.3 : 8.4) + petalVariation(slot, 1) * (serene ? 5.4 : 3.7),
    size: .065 + petalVariation(slot, 2) * .045,
    x: (petalVariation(slot, 3) - .5) * 1.17,
    z: (slot % 2 ? .22 : -.25) + (petalVariation(slot, 4) - .5) * (serene ? .53 : .39),
    phase: petalVariation(slot, 5) * Math.PI * 2,
    driftRate: serene ? .57 + .30 * petalVariation(slot, 6) : .87,
    flutterRate: serene ? .93 + .75 * petalVariation(slot, 7) : 2.12,
    arrival: serene ? .13 + .53 * petalVariation(slot, 8) : .16,
  }));
  const palette = centers ? [0xffe2d8, 0xf7c9d5, 0xffe4b4] : PETAL_COLORS;
  for (let slot = 0; slot < petals.count; slot++) {
    petals.setColorAt(slot, new Color(palette[slot % palette.length]));
  }

  const mist = createAtmosphereMist();
  mist.root.name = 'Ethereal ivory haze';
  mist.root.position.y = .15;
  mist.root.scale.set(1.25, 1.1, .67);
  mist.root.children.forEach((child, index) => {
    const wisp = child as Sprite;
    wisp.visible = index === 1 || index === 2;
    wisp.material.color.setHex(index === 1 ? 0xfff3e9 : 0xf1e9e9);
  });
  upright.add(mist.root);

  const pose = new Object3D();
  let disposed = false;
  function update(elapsed: number, reduced: boolean) {
    if (disposed) return;
    petals.visible = !reduced;
    if (leaves) leaves.visible = !reduced;
    if (!reduced && rain && leaves) {
      const arrival = MathUtils.smoothstep(elapsed, .24, 1.8);
      for (const lane of rain) {
        const time = elapsed + lane.start;
        const progress = (time % lane.duration) / lane.duration;
        const flutter = lane.phase + time * lane.flutter;
        const drift = lane.phase + time * .68;
        const fade = MathUtils.smoothstep(progress, 0, .11) * (1 - MathUtils.smoothstep(progress, .78, 1));
        pose.position.set(
          lane.center.x + lane.side * (.11 + .065 * progress) + .044 * Math.sin(drift),
          lane.center.y + .157 - lane.fall * (progress + .018 * Math.sin(progress * Math.PI * 2)),
          lane.center.z + lane.depth + .056 * Math.sin(drift * 1.37),
        );
        pose.rotation.set(.82 * Math.sin(flutter), drift * .74 + .60 * Math.cos(flutter), lane.phase + .76 * Math.sin(drift * 1.27));
        pose.scale.setScalar(lane.size * fade * arrival);
        pose.updateMatrix();
        (lane.leaf ? leaves : petals).setMatrixAt(lane.instance, pose.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
    } else if (!reduced) {
      const arrivalScale = serene ? 1 : MathUtils.smoothstep(elapsed, .16, 1.3);
      lanes.forEach(({ seconds, size, x, z, phase, driftRate, flutterRate, arrival }, slot) => {
        const time = elapsed + seconds * (slot + .46) / PETAL_COUNT;
        const progress = (time % seconds) / seconds;
        const drift = phase + time * driftRate;
        const flutter = phase + time * flutterRate;
        const envelope = MathUtils.smoothstep(progress, 0, .07) *
          (1 - MathUtils.smoothstep(progress, .9, 1));
        const appear = serene ? MathUtils.smoothstep(elapsed, arrival, arrival + 1.43) : arrivalScale;
        const descent = serene ? progress + .018 * Math.sin(progress * Math.PI * 2) : progress;
        pose.position.set(
          x + .14 * Math.sin(drift) + .032 * Math.sin(flutter),
          1.27 - 1.48 * descent,
          z + (serene ? .12 : .075) * Math.sin(drift * 1.19),
        );
        pose.rotation.set(
          .64 * Math.sin(flutter) + (serene ? .12 * Math.sin(drift) : 0),
          drift * (serene ? .57 : .8) + .52 * Math.cos(flutter),
          .67 * Math.sin(drift * 1.5) + .23 * Math.sin(flutter * .63),
        );
        pose.scale.setScalar(size * envelope * appear);
        pose.updateMatrix();
        petals.setMatrixAt(slot, pose.matrix);
      });
      petals.instanceMatrix.needsUpdate = true;
    }
    const veil = serene ? .17 + .075 * (1 - MathUtils.smoothstep(elapsed, 1.3, 4.2)) : .19;
    const haze = reduced ? .19 : veil * MathUtils.smoothstep(elapsed, 0, serene ? 1.8 : 1.55);
    mist.update(elapsed, reduced, haze);
  }

  update(0, false);
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeBatch(petals);
      if (leaves) disposeBatch(leaves);
      mist.root.removeFromParent();
      mist.dispose();
    },
  };
}
