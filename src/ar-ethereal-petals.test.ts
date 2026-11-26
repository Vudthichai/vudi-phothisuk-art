import { Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { createEtherealPetals } from './ar/experimental/etherealPetals';

it('keeps a single batch of petals drifting down with front and back depth', () => {
  const upright = new Group();
  const rain = createEtherealPetals(upright);
  const petals = upright.children[0] as InstancedMesh;
  const matrix = new Matrix4();
  const positions = (seconds: number) => {
    rain.update(seconds, false);
    return Array.from({ length: petals.count }, (_, index) => {
      petals.getMatrixAt(index, matrix);
      return new Vector3().setFromMatrixPosition(matrix);
    });
  };
  const first = positions(0);
  const later = positions(.2);
  expect(petals.count).toBe(11);
  expect(petals.geometry.index!.count / 3).toBe(96);
  expect(first.some(position => position.z > 0)).toBe(true);
  expect(first.some(position => position.z < 0)).toBe(true);
  expect(later.every((position, index) => position.y < first[index].y)).toBe(true);
  expect(later.some((position, index) => position.x !== first[index].x)).toBe(true);
  expect(positions(.2)).toEqual(later);
  rain.update(10, true);
  expect(petals.visible).toBe(false);
  rain.dispose();
  rain.dispose();
  expect(upright.children).toHaveLength(0);
});
