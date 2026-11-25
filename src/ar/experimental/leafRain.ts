import { DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, Object3D, MathUtils } from 'three';

const GREEN_COUNT = 17;
const GOLD_INTERVAL = 13;
const GOLD_FALL = 5.8;

function fraction(seed: number) {
  const value = Math.sin(seed * 127.1 + 39.7) * 43758.5453;
  return value - Math.floor(value);
}

export function createLeafRain(field: Group, green: Group, gold: Group) {
  const pose = new Object3D();
  const matrix = new Matrix4();
  field.updateWorldMatrix(true, true);
  const fieldInverse = field.matrixWorld.clone().invert();

  function batches(source: Group, count: number) {
    const meshes: { mesh: InstancedMesh; rest: Matrix4 }[] = [];
    source.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const mesh = new InstancedMesh(object.geometry, object.material, count);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      field.add(mesh);
      meshes.push({ mesh, rest: new Matrix4().multiplyMatrices(fieldInverse, object.matrixWorld) });
    });
    source.removeFromParent();
    return meshes;
  }

  const greenBatches = batches(green, GREEN_COUNT);
  const goldBatches = batches(gold, 1);
  function place(slot: number, cycle: number, progress: number, phase: number, golden = false) {
    const seed = slot * 103 + cycle * 53;
    const x = (fraction(seed + 1) - .5) * .84;
    const z = (fraction(seed + 2) - .5) * .48;
    const width = .12 + fraction(seed + 3) * .09 + (golden ? .035 : 0);
    const envelope = MathUtils.smoothstep(progress, 0, .08) * (1 - MathUtils.smoothstep(progress, .91, 1));
    pose.position.set(x + .075 * Math.sin(phase * 1.4 + seed), 1.24 - 1.58 * progress, z + .055 * Math.sin(phase * 1.05));
    pose.rotation.set(.46 * Math.sin(phase * 2.5 + seed), seed + phase * (.34 + fraction(seed + 4) * .64), .52 * Math.sin(phase * 1.8 + seed) + progress * 1.7);
    pose.scale.setScalar(width * envelope);
    pose.updateMatrix();
    for (const { mesh, rest } of golden ? goldBatches : greenBatches) {
      mesh.setMatrixAt(golden ? 0 : slot, matrix.multiplyMatrices(pose.matrix, rest));
    }
  }

  return {
    update(seconds: number) {
      for (let slot = 0; slot < GREEN_COUNT; slot++) {
        const duration = 4.3 + fraction(slot + 21) * 3.2;
        const age = seconds + duration * (slot + .5) / GREEN_COUNT;
        const cycle = Math.floor(age / duration);
        const phase = age - cycle * duration;
        place(slot, cycle, phase / duration, phase);
      }
      const goldAge = seconds % GOLD_INTERVAL;
      const goldCycle = Math.floor(seconds / GOLD_INTERVAL);
      const goldVisible = goldAge >= 2 && goldAge < 2 + GOLD_FALL;
      if (goldVisible) place(GREEN_COUNT, goldCycle, (goldAge - 2) / GOLD_FALL, goldAge - 2, true);
      for (const { mesh } of greenBatches) mesh.instanceMatrix.needsUpdate = true;
      for (const { mesh } of goldBatches) {
        mesh.visible = goldVisible;
        mesh.instanceMatrix.needsUpdate = goldVisible;
      }
    },
    dispose() {
      for (const { mesh } of [...greenBatches, ...goldBatches]) mesh.dispose();
    },
  };
}
