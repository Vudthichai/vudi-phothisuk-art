import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, ShaderLib, Vector3 } from 'three';
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

it('keeps the original rain counts and golden cadence while refining motion and reflections', () => {
  const approved = new Group();
  const optional = new Group();
  const original = createLeafRain(approved, leaf(), leaf());
  const refined = createLeafRain(optional, leaf(), leaf(), true);
  const [baseGreen, baseGold] = approved.children as InstancedMesh[];
  const [refinedGreen, refinedGold] = optional.children as InstancedMesh[];
  const material = refinedGold.material as MeshStandardMaterial;
  const shader = { ...ShaderLib.standard, uniforms: {} } as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader, null!);
  const reflection = shader.uniforms.goldLeafReflection;

  expect(refinedGreen.count).toBe(baseGreen.count);
  expect(refinedGold.count).toBe(baseGold.count);
  expect((baseGold.material as MeshStandardMaterial).customProgramCacheKey()).not.toBe(material.customProgramCacheKey());
  for (const seconds of [0, 1.9, 2, 4.6, 7.79, 7.8, 9, 15, 17.6, 20.8]) {
    original.update(seconds);
    refined.update(seconds);
    expect(refinedGold.visible).toBe(baseGold.visible);
    expect(reflection.value).toBeCloseTo(seconds === 4.6 || seconds === 17.6 ? 1 : 0, 5);
  }

  original.update(1.1);
  refined.update(1.1);
  const first = new Matrix4(), next = new Matrix4();
  refinedGreen.getMatrixAt(6, first);
  refined.update(1.25);
  refinedGreen.getMatrixAt(6, next);
  expect(next.elements[13]).toBeLessThan(first.elements[13]);
  refined.update(1.1);
  expect(refinedGreen.instanceMatrix.array).not.toEqual(baseGreen.instanceMatrix.array);
  // The factory passes a zero clock for reduced motion.
  refined.update(0);
  original.update(0);
  expect(refinedGreen.instanceMatrix.array).toEqual(baseGreen.instanceMatrix.array);
  expect(reflection.value).toBe(0);
  refined.dispose();
  original.dispose();
});

it('concentrates one warm beam near the original gold path without changing either leaf batch', () => {
  const approved = new Group(), final = new Group();
  const original = createLeafRain(approved, leaf(), leaf(), true);
  const illuminated = createLeafRain(final, leaf(), leaf(), true, true);
  const [green, gold] = final.children as InstancedMesh[];
  const beam = final.getObjectByName('Warm beam following the golden leaf')!;
  const matrix = new Matrix4();
  const offsets = [];
  for (const time of [4, 5]) {
    original.update(time);
    illuminated.update(time);
    expect(beam.visible).toBe(true);
    expect(green.instanceMatrix.array).toEqual((approved.children[0] as InstancedMesh).instanceMatrix.array);
    expect(gold.instanceMatrix.array).toEqual((approved.children[1] as InstancedMesh).instanceMatrix.array);
    gold.getMatrixAt(0, matrix);
    offsets.push(beam.position.clone().sub(new Vector3().setFromMatrixPosition(matrix)));
  }
  expect(offsets[0].distanceTo(offsets[1])).toBeLessThan(.0001);
  expect(offsets[0].y).toBeGreaterThan(.1);
  for (const time of [0, 2, 7.5, 9]) {
    illuminated.update(time);
    expect(beam.visible).toBe(false);
  }
  illuminated.dispose();
  original.dispose();
  expect(beam.parent).toBeNull();
});
