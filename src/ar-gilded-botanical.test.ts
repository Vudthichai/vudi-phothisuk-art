import { Box3, BoxGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { createGildedBotanical } from './ar/experimental/gildedBotanical';

it('attaches the tapered stem to the blossom underside and places one leaf on each side', () => {
  const turn = new Group();
  turn.rotation.x = Math.PI / 3;
  const blossom = new Group();
  blossom.position.y = .52;
  blossom.add(new Mesh(new BoxGeometry(.4, .4, .4), new MeshStandardMaterial({ side: DoubleSide })));
  turn.add(blossom);

  const support = createGildedBotanical(blossom);
  const [stem, lower, upper] = support.children as Mesh[];
  expect(support.children).toHaveLength(3);
  const position = stem.geometry.getAttribute('position');
  const tip = new Vector3();
  const ring = position.count - 10;
  for (let i = ring; i < ring + 9; i++) tip.add(new Vector3().fromBufferAttribute(position, i));
  tip.divideScalar(9);
  expect(tip.y).toBeCloseTo(.338);
  expect(tip.x).toBeCloseTo(0);
  expect(tip.z).toBeCloseTo(0);

  const lowerBounds = new Box3().setFromObject(lower);
  const upperBounds = new Box3().setFromObject(upper);
  expect(lowerBounds.min.x).toBeLessThan(-.16);
  expect(upperBounds.max.x).toBeGreaterThan(.16);
  expect(upperBounds.max.y).toBeGreaterThan(lowerBounds.max.y);
  expect(lower.geometry.index!.count / 3).toBeLessThan(1400);
  expect(upper.geometry.index!.count / 3).toBeLessThan(1400);
  for (const mesh of [stem, lower, upper]) mesh.geometry.dispose();
  (stem.material as MeshStandardMaterial).dispose();
});
