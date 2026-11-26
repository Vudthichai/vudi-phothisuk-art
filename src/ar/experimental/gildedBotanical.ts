import {
  Box3, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute,
  Group, MathUtils, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const up = new Vector3(0, 1, 0);
const forward = new Vector3(0, 0, 1);

function blossomJoint(blossom: Group) {
  blossom.updateWorldMatrix(true, true);
  const frame = blossom.parent?.matrixWorld ?? new Matrix4();
  const intoFrame = frame.clone().invert();
  const bounds = new Box3();
  blossom.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.geometry.computeBoundingBox();
    const inFrame = new Matrix4().multiplyMatrices(intoFrame, object.matrixWorld);
    bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(inFrame));
  });
  const center = bounds.getCenter(new Vector3());
  const underside = new Vector3(center.x, bounds.min.y, center.z);
  // A ray along the botanical axis finds the real underside, between the
  // petals' outer edges. Bury the narrow stem tip slightly inside the surface.
  const axis = up.clone().transformDirection(frame);
  const ray = new Raycaster(new Vector3(), axis);
  let joint: Vector3 | undefined;
  // Offset two probes slightly so a central ray on a triangle seam cannot
  // skip the underside and attach through the opposite side of the blossom.
  for (const [x, z] of [[0, 0], [.0011, .0017], [-.0017, .0011]]) {
    ray.ray.origin.copy(underside).add(new Vector3(x, -.07, z)).applyMatrix4(frame);
    const hit = ray.intersectObject(blossom, true)[0];
    const point = hit?.point.clone().applyMatrix4(intoFrame);
    if (point && (!joint || point.y < joint.y - .00001)) joint = point;
  }
  return (joint ?? underside).addScaledVector(up, .018);
}

function tube(curve: CatmullRomCurve3, sections: number, sides: number, radius: (u: number) => number, color: Color) {
  const position: number[] = [], colors: number[] = [], index: number[] = [];
  const frames = curve.computeFrenetFrames(sections, false);
  for (let i = 0; i <= sections; i++) {
    const u = i / sections;
    const center = curve.getPointAt(u);
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const point = center.clone()
        .addScaledVector(frames.normals[i], Math.cos(angle) * radius(u))
        .addScaledVector(frames.binormals[i], Math.sin(angle) * radius(u));
      position.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
      if (i < sections && j < sides) {
        const a = i * (sides + 1) + j;
        const b = a + sides + 1;
        index.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  return shadedGeometry(position, colors, index);
}

function shadedGeometry(position: number[], colors: number[], index: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function leaf(start: Vector3, reach: Vector3, halfWidth: number, twist: number) {
  const along = reach.clone().normalize();
  const across = new Vector3().crossVectors(forward, along).normalize();
  const surfaceNormal = new Vector3().crossVectors(along, across).normalize();
  const pale = new Color(0xe6ae50), dark = new Color(0xa26827);
  const color = new Color();

  function surface(u: number, v: number, rise = 0) {
    const shape = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .83) * (1.11 - .24 * u);
    const veins = .009 * Math.cos((u - .14 * Math.abs(v)) * 28 * Math.PI) * Math.abs(v);
    const edge = .025 * Math.sin(15 * u + v) * Math.abs(v) ** 2;
    const ridge = .052 * (1 - Math.abs(v)) ** 2;
    return start.clone().addScaledVector(reach, u)
      .addScaledVector(across, halfWidth * v * shape * (1 + .06 * Math.sin(u * 31)))
      .addScaledVector(surfaceNormal, shape * (ridge + veins + edge + twist * v * (u + .15)) + rise);
  }

  const position: number[] = [], colors: number[] = [], index: number[] = [];
  const rows = 32, columns = 10;
  for (let i = 0; i <= rows; i++) {
    const u = MathUtils.lerp(.002, .998, i / rows);
    for (let j = 0; j <= columns; j++) {
      const v = j / columns * 2 - 1;
      const point = surface(u, v);
      position.push(point.x, point.y, point.z);
      // Keep the center vein and softly alternating folds readable at phone size.
      const grain = .28 + .44 * (1 - Math.abs(v)) + .13 * Math.sin(u * 36 - Math.abs(v) * 3);
      color.copy(dark).lerp(pale, grain);
      colors.push(color.r, color.g, color.b);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j;
        const b = a + columns + 1;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const geometry = shadedGeometry(position, colors, index);
  const ribs: BufferGeometry[] = [geometry];
  const midrib = new CatmullRomCurve3([0, .22, .45, .7, .94].map(u => surface(u, 0, .001)));
  ribs.push(tube(midrib, 16, 5, u => .004 * (1 - .85 * u), pale));
  for (const side of [-1, 1]) {
    for (const base of [.2, .36, .51, .66]) {
      const curve = new CatmullRomCurve3([
        surface(base, 0, .002), surface(base + .075, side * .46, .0015), surface(base + .155, side * .84, .0008),
      ]);
      ribs.push(tube(curve, 6, 4, u => .0019 * (1 - .82 * u), pale));
    }
  }
  const blade = mergeGeometries(ribs)!;
  for (const rib of ribs) rib.dispose();
  return blade;
}

/** One connected stem and two staggered gold leaves for the V2 blossom. */
export function createGildedBotanical(blossom: Group) {
  const joint = blossomJoint(blossom);
  const { x, y, z } = joint;
  const curve = new CatmullRomCurve3([
    new Vector3(x - .074, 0, z + .043),
    new Vector3(x + .058, .24 * y, z + .018),
    new Vector3(x - .048, .63 * y, z - .033),
    new Vector3(x + .022, .87 * y, z - .025),
    joint,
  ]);
  const gold = new MeshStandardMaterial({
    vertexColors: true, metalness: .91, roughness: .31, side: DoubleSide,
  });
  const support = new Group();
  support.name = 'Gilded Bloom stem and foliage';
  const stem = new Mesh(tube(curve, 24, 9, u => .016 - .006 * u, new Color(0xc28b39)), gold);
  stem.name = 'Curved gold stem';
  const left = new Mesh(leaf(curve.getPointAt(.33), new Vector3(-.245, .13, .062), .065, -.049), gold);
  left.name = 'Lower gold leaf';
  const right = new Mesh(leaf(curve.getPointAt(.59), new Vector3(.232, .142, -.056), .06, .06), gold);
  right.name = 'Upper gold leaf';
  support.add(stem, left, right);
  return support;
}
