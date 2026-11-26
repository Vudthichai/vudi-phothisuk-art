import { Group, InstancedMesh, Matrix4, Sprite, Vector3 } from 'three';
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

it('varies the optional petal paths without adding draws or changing the reduced-motion haze', () => {
  const approved = new Group();
  const optional = new Group();
  const original = createEtherealPetals(approved);
  const refined = createEtherealPetals(optional, true);
  const [basePetals, haze] = approved.children;
  const [refinedPetals, refinedHaze] = optional.children;
  const batch = refinedPetals as InstancedMesh;
  expect(batch.count).toBe((basePetals as InstancedMesh).count);
  expect(refinedHaze.children.filter(wisp => wisp.visible)).toHaveLength(2);

  const matrix = new Matrix4();
  const positions = () => Array.from({ length: batch.count }, (_, index) => {
    batch.getMatrixAt(index, matrix);
    return new Vector3().setFromMatrixPosition(matrix);
  });
  const start = positions();
  refined.update(.2, false);
  const next = positions();
  expect(next.every((position, index) => position.y < start[index].y)).toBe(true);
  expect(next.some(position => position.z > 0)).toBe(true);
  expect(next.some(position => position.z < 0)).toBe(true);
  original.update(3.1, false);
  refined.update(3.1, false);
  expect(batch.instanceMatrix.array).not.toEqual((basePetals as InstancedMesh).instanceMatrix.array);
  refined.update(.2, false);
  expect(positions()).toEqual(next);

  original.update(6.2, true);
  refined.update(9.4, true);
  expect(batch.visible).toBe(false);
  expect(refinedHaze.children.map(wisp => (wisp as Sprite).material.opacity))
    .toEqual(haze.children.map(wisp => (wisp as Sprite).material.opacity));
  refined.dispose();
  original.dispose();
});
