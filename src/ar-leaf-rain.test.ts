import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial } from 'three';
import { expect, it } from 'vitest';
import { createLeafRain } from './ar/experimental/leafRain';

function leaf() {
  const root = new Group();
  root.add(new Mesh(new BoxGeometry(.5, 1, .08), new MeshStandardMaterial()));
  return root;
}

it('batches independent falling leaves and periodically adds just one golden leaf', () => {
  const field = new Group();
  const green = leaf(), gold = leaf();
  field.add(green, gold);
  const rain = createLeafRain(field, green, gold);
  const [greenInstances, goldInstances] = field.children as InstancedMesh[];
  expect(greenInstances.count).toBe(17);
  expect(goldInstances.count).toBe(1);

  const first = new Matrix4(), next = new Matrix4();
  rain.update(0);
  expect(goldInstances.visible).toBe(false);
  greenInstances.getMatrixAt(6, first);
  rain.update(.15);
  greenInstances.getMatrixAt(6, next);
  expect(next.elements[13]).toBeLessThan(first.elements[13]);
  expect(next.elements[12]).not.toBeCloseTo(first.elements[12], 5);
  expect(field.rotation.y).toBe(0);

  rain.update(3);
  expect(goldInstances.visible).toBe(true);
  rain.update(9);
  expect(goldInstances.visible).toBe(false);
  rain.update(16);
  expect(goldInstances.visible).toBe(true);
  rain.dispose();
});
