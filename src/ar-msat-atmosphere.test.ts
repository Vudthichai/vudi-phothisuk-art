import { Color, Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { createMsatAtmosphere } from './ar/experimental/msatAtmosphere';

it('frames the monogram and tagline with two small falling batches and an occasional gold leaf', () => {
  const upright = new Group();
  const atmosphere = createMsatAtmosphere(upright);
  const batches = upright.children as InstancedMesh[];
  const matrix = new Matrix4();
  const centersAt = (seconds: number) => {
    atmosphere.update(seconds, false);
    return batches.flatMap(mesh => Array.from({ length: mesh.count }, (_, slot) => {
      mesh.getMatrixAt(slot, matrix);
      return new Vector3().setFromMatrixPosition(matrix);
    }));
  };

  const initial = centersAt(1.1);
  const after = centersAt(1.2);
  expect(batches.map(mesh => mesh.count)).toEqual([10, 5]);
  const protectedBand = initial.filter(center => center.y >= -.38 && center.y <= 1.08);
  expect(protectedBand.every(center => Math.abs(center.x) >= .47)).toBe(true);
  expect(initial.some(center => Math.abs(center.x) < .47)).toBe(true);
  expect(after.filter((center, index) => center.y < initial[index].y).length).toBeGreaterThan(12);
  expect(initial.some(center => center.z < 0)).toBe(true);
  expect(initial.some(center => center.z > 0)).toBe(true);

  const lastLeafColor = new Color();
  atmosphere.update(0, false);
  batches[1].getColorAt(4, lastLeafColor);
  expect(lastLeafColor.getHex()).toBe(0x476c48);
  atmosphere.update(6, false);
  batches[1].getColorAt(4, lastLeafColor);
  expect(lastLeafColor.getHex()).toBe(0xc19b55);
  atmosphere.update(6, true);
  expect(batches.every(mesh => !mesh.visible)).toBe(true);

  atmosphere.dispose();
  atmosphere.dispose();
  expect(upright.children).toHaveLength(0);
});
