import {
  Box3, BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, InstancedMesh,
  Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3,
} from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';

// Projected from the blossom centers in the original painting: upper right,
// upper left, middle, lower left and lower right. Depth makes the five forms independent.
const placements = [
  { position: [.32, 1.11, -.045], rotation: [-.39, .09, -.23], size: [.304, .299, .322], rate: .65, phase: .23 },
  { position: [-.163, .94, .13], rotation: [-.18, -.49, .19], size: [.298, .313, .286], rate: .82, phase: 1.74 },
  { position: [-.035, .67, -.11], rotation: [-.33, .22, -.10], size: [.293, .278, .315], rate: .61, phase: 3.16 },
  { position: [-.475, .408, .05], rotation: [-.43, -.25, .25], size: [.284, .299, .304], rate: .92, phase: 4.48 },
  { position: [.079, .152, .15], rotation: [-.14, .37, -.19], size: [.312, .291, .301], rate: .73, phase: 5.21 },
] as const;

function flowerHead(geometry: BufferGeometry) {
  const index = geometry.getIndex();
  const positions = geometry.getAttribute('position');
  if (!index || !positions || geometry.groups.length > 0) return geometry;

  const points = new Float32Array(positions.count * 3);
  const stem = new Uint8Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z;
    // Measured on the ivory GLB. Low ivory petals sit outside this narrow
    // stalk region, so a horizontal cut across the entire flower would damage them.
    stem[i] = y < -.198 && x > -.24 && x < .08 && z > -.43 && z < -.135 ? 1 : 0;
  }
  const cropped = new Uint32Array(index.count);
  let length = 0;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    if (stem[a] || stem[b] || stem[c]) continue;
    cropped[length++] = a;
    cropped[length++] = b;
    cropped[length++] = c;
  }
  if (!length) return geometry;
  const trimmed = cropped.subarray(0, length);
  const [detail] = MeshoptSimplifier.supported && length > 60_000
    ? MeshoptSimplifier.simplify(trimmed, points, 3, 60_000, .004, ['LockBorder'])
    : [trimmed];

  // Compact the simplified geometry so both the stem and its unused attribute
  // data are gone. The original UVs, normals and material still describe each petal.
  const remap = new Int32Array(positions.count).fill(-1);
  const vertices: number[] = [];
  const triangles = Uint32Array.from(detail, vertex => {
    if (remap[vertex] === -1) {
      remap[vertex] = vertices.length;
      vertices.push(vertex);
    }
    return remap[vertex];
  });
  const head = new BufferGeometry();
  for (const [key, attribute] of Object.entries(geometry.attributes)) {
    const values = new Float32Array(vertices.length * attribute.itemSize);
    vertices.forEach((vertex, i) => {
      for (let component = 0; component < attribute.itemSize; component++) {
        values[i * attribute.itemSize + component] = attribute.getComponent(vertex, component);
      }
    });
    head.setAttribute(key, new BufferAttribute(values, attribute.itemSize));
  }
  head.setIndex(new BufferAttribute(vertices.length < 65_536 ? Uint16Array.from(triangles) : triangles, 1));
  return head;
}

function varyFlowerRims(material: MeshStandardMaterial) {
  const compile = material.onBeforeCompile.bind(material);
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        // The asset is welded. Bend only the outer petal margins while
        // keeping the calyx, stamens and their original texture map intact.
        vec2 wing = position.xz;
        float rim = smoothstep(.36, .82, length(wing)) * smoothstep(-.37, -.07, position.y);
        float angle = atan(wing.y, wing.x + .00001);
        float form = float(gl_InstanceID) * 1.43 + .35;
        transformed.y += .048 * rim * sin(4. * angle + form);
        transformed.xz += .042 * rim * wing * sin(3. * angle - form);
      #endif`);
  };
  material.customProgramCacheKey = () => `${key}|ethereal-head-rim`;
  material.needsUpdate = true;
}

/** Five independent heads from one already-loaded ivory model. */
export async function createEtherealCanopy(turn: Group, source: Group, signal: AbortSignal) {
  await MeshoptSimplifier.ready;
  signal.throwIfAborted();
  source.updateWorldMatrix(true, true);
  const sourceFrame = source.matrixWorld.clone().invert();
  const sourceScale = source.scale.x;
  const pose = new Object3D();
  const matrix = new Matrix4();
  const bounds = new Box3();
  const centers = placements.map(({ position }) => new Vector3().fromArray(position));
  const flowers = new Group();
  flowers.name = 'Independent ivory flower heads';
  const meshes: { batch: InstancedMesh; rest: Matrix4 }[] = [];
  source.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const detail = flowerHead(object.geometry);
    detail.computeBoundingBox();
    const rest = new Matrix4().multiplyMatrices(sourceFrame, object.matrixWorld);
    bounds.union(detail.boundingBox!.clone().applyMatrix4(rest));
    const batch = new InstancedMesh(detail, object.material, placements.length);
    batch.name = 'Five ivory flowers';
    batch.instanceMatrix.setUsage(DynamicDrawUsage);
    batch.frustumCulled = false;
    meshes.push({ batch, rest });
    flowers.add(batch);
    if (detail !== object.geometry) object.geometry.dispose();
  });
  const center = bounds.getCenter(new Vector3());
  for (const { rest } of meshes) {
    const offset = new Vector3().setFromMatrixPosition(rest).sub(center);
    rest.setPosition(offset);
  }

  function update(seconds: number, reduced: boolean) {
    placements.forEach(({ position, rotation, size, rate, phase }, i) => {
      const phaseTime = seconds * rate + phase;
      const sway = reduced ? 0 : Math.sin(phaseTime);
      const hover = reduced ? 0 : Math.sin(phaseTime * .79 + phase);
      const depth = reduced ? 0 : Math.sin(phaseTime * .51 - phase);
      const [x, y, z] = position;
      centers[i].set(x + .020 * sway, y + .024 * hover, z + .031 * depth);
      pose.position.copy(centers[i]);
      pose.rotation.set(rotation[0] + .078 * hover, rotation[1] + .125 * depth, rotation[2] + .076 * sway);
      pose.scale.fromArray(size).multiplyScalar(sourceScale);
      pose.updateMatrix();
      for (const { batch, rest } of meshes) batch.setMatrixAt(i, matrix.multiplyMatrices(pose.matrix, rest));
    });
    for (const { batch } of meshes) batch.instanceMatrix.needsUpdate = true;
  }

  source.removeFromParent();
  turn.add(flowers);
  update(0, true);
  return {
    centers,
    update,
    varyShapedRims() {
      for (const { batch } of meshes) {
        if (batch.material instanceof MeshStandardMaterial) varyFlowerRims(batch.material);
      }
    },
    dispose() {
      for (const { batch } of meshes) batch.dispose();
    },
  };
}
