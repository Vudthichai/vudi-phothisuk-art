import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute,
  Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, TubeGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';

const placements = [
  { position: [-.265, .37, .025], rotation: [-.24, -.28, .17], scale: .45 },
  { position: [.23, .40, -.14], rotation: [-.33, .26, -.14], scale: .42 },
  { position: [-.32, .085, .15], rotation: [-.13, -.41, -.14], scale: .43 },
  { position: [.295, .095, .18], rotation: [-.25, .17, .16], scale: .45 },
  { position: [.012, .61, -.038], rotation: [-.22, .10, -.08], scale: .43 },
] as const;

function bloomDetail(geometry: BufferGeometry) {
  const index = geometry.getIndex();
  const positions = geometry.getAttribute('position');
  if (!MeshoptSimplifier.supported || !index || index.count <= 66_000 ||
      geometry.groups.length > 0 || !positions) return geometry;
  const points = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    points[i * 3] = positions.getX(i);
    points[i * 3 + 1] = positions.getY(i);
    points[i * 3 + 2] = positions.getZ(i);
  }
  const indices = index.array instanceof Uint32Array ? index.array : Uint32Array.from(index.array);
  // The five blooms are small on screen. Reuse the original vertices, normal map
  // and UVs, while limiting deviation to 0.35% of the original bounding extent.
  const [detail] = MeshoptSimplifier.simplify(indices, points, 3, 66_000, .0035);
  const lod = new BufferGeometry();
  for (const [key, attribute] of Object.entries(geometry.attributes)) lod.setAttribute(key, attribute);
  lod.setIndex(new BufferAttribute(detail, 1));
  return lod;
}

function sprigLeaf(base: Vector3, reach: Vector3, width: number, roll: number) {
  const columns = 6, rows = 12;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const side = new Vector3().crossVectors(new Vector3(.05, .27, 1), reach).normalize();
  const up = new Vector3().crossVectors(reach, side).normalize();
  const shade = new Color(0x536f5e), light = new Color(0xa0ae8c);
  const sample = new Vector3();
  const color = new Color();
  for (let row = 0; row <= rows; row++) {
    const u = (row + .02) / (rows + .04);
    const shape = Math.sin(u * Math.PI) ** .77;
    for (let column = 0; column <= columns; column++) {
      const v = column / columns * 2 - 1;
      const ridge = .021 * (1 - Math.abs(v)) ** 2;
      const fold = .007 * Math.sin((u - .21 * Math.abs(v)) * 42) * Math.abs(v);
      sample.copy(base).addScaledVector(reach, u)
        .addScaledVector(side, width * v * shape)
        .addScaledVector(up, shape * (ridge + fold + roll * v * u));
      positions.push(sample.x, sample.y, sample.z);
      color.copy(shade).lerp(light, .20 + .44 * (1 - Math.abs(v)) ** 2 + .12 * Math.sin(u * 33 - Math.abs(v) * 4));
      colors.push(color.r, color.g, color.b);
      if (row < rows && column < columns) {
        const index = row * (columns + 1) + column;
        const next = index + columns + 1;
        indices.push(index, next, index + 1, index + 1, next, next + 1);
      }
    }
  }
  const blade = new BufferGeometry();
  blade.setAttribute('position', new Float32BufferAttribute(positions, 3));
  blade.setAttribute('color', new Float32BufferAttribute(colors, 3));
  blade.setIndex(indices);
  blade.computeVertexNormals();
  return blade;
}

function buildFoliage() {
  const base = new Vector3(.01, -.027, .055);
  const stemColor = new Color(0x536d56);
  const leaves = [
    [.75, -.24, .13, .075, .053, -.11], [.76, .25, .13, .065, .059, .09],
    [.52, -.19, .08, .035, .049, .11], [.50, .20, .12, .07, .042, -.07],
    [.78, -.19, .09, -.035, .054, -.10],
  ] as const;
  const pieces: BufferGeometry[] = [];
  placements.forEach(({ position }, i) => {
    const end = new Vector3(...position).add(new Vector3(0, .047, 0));
    const middle = base.clone().lerp(end, .62);
    middle.x += i % 2 ? .039 : -.031;
    middle.y -= .034;
    const stem = new CatmullRomCurve3([base, middle, end]);
    const tube = new TubeGeometry(stem, 12, .007 - .0004 * i, 5, false);
    tube.deleteAttribute('uv');
    const colors = new Float32Array(tube.getAttribute('position').count * 3);
    for (let k = 0; k < colors.length; k += 3) stemColor.toArray(colors, k);
    tube.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const [alongStem, x, y, z, width, roll] = leaves[i];
    pieces.push(tube, sprigLeaf(stem.getPointAt(alongStem), new Vector3(x, y, z), width, roll));
  });
  const geometry = mergeGeometries(pieces)!;
  for (const piece of pieces) piece.dispose();
  const foliage = new Mesh(geometry, new MeshStandardMaterial({
    vertexColors: true, side: DoubleSide, roughness: .82, metalness: 0,
  }));
  foliage.name = 'Ethereal canopy leaves and stems';
  return foliage;
}

/** Build all five blooms from a single normalized, already-loaded ivory GLB. */
export async function createEtherealCanopy(turn: Group, source: Group, signal: AbortSignal) {
  await MeshoptSimplifier.ready;
  signal.throwIfAborted();
  source.updateWorldMatrix(true, true);
  const sourceFrame = source.matrixWorld.clone().invert();
  const pose = new Object3D();
  const matrix = new Matrix4();
  const flowers = new Group();
  flowers.name = 'Ivory flower canopy';
  source.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const detail = bloomDetail(object.geometry);
    const batch = new InstancedMesh(detail, object.material, placements.length);
    batch.name = 'Five ivory flowers';
    batch.frustumCulled = false;
    const rest = new Matrix4().multiplyMatrices(sourceFrame, object.matrixWorld);
    placements.forEach(({ position, rotation, scale }, i) => {
      pose.position.fromArray(position);
      pose.rotation.set(rotation[0], rotation[1], rotation[2]);
      pose.scale.setScalar(source.scale.x * scale);
      pose.updateMatrix();
      batch.setMatrixAt(i, matrix.multiplyMatrices(pose.matrix, rest));
    });
    flowers.add(batch);
    if (detail !== object.geometry) object.geometry.dispose();
  });
  source.removeFromParent();
  turn.add(flowers, buildFoliage());
  return () => {
    for (const batch of flowers.children as InstancedMesh[]) batch.dispose();
  };
}
