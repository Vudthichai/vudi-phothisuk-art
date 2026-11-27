import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { createEtherealCanopy } from './ar/experimental/etherealCanopy';

it('isolates the heads, preserves low petals and floats five small flowers from one loaded source', async () => {
  const turn = new Group();
  const source = new Group();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -.08, -.9, -.25, -.08, -.1, -.25, .024, -.1, -.24,
    -.2, .49, -.1, -.5, -.46, 0, .35, .37, .52,
  ], 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  const material = new MeshStandardMaterial();
  source.add(new Mesh(geometry, material));
  source.scale.setScalar(1.02);
  turn.add(source);
  const canopy = await createEtherealCanopy(turn, source, new AbortController().signal);

  expect(source.parent).toBeNull();
  const flowers = turn.getObjectByName('Five ivory flowers') as InstancedMesh;
  expect(flowers.count).toBe(5);
  expect(flowers.geometry.index?.count).toBe(3);
  expect(flowers.geometry.boundingBox?.min.y).toBeCloseTo(-.46);
  expect(geometry.index?.count).toBe(6);
  expect(flowers.material).toBe(material);
  const transform = new Matrix4();
  const centers = new Set<string>();
  for (let i = 0; i < flowers.count; i++) {
    flowers.getMatrixAt(i, transform);
    expect(new Vector3().setFromMatrixScale(transform).x).toBeLessThan(.34);
    centers.add(new Vector3().setFromMatrixPosition(transform).toArray().join(','));
  }
  expect(centers.size).toBe(5);
  expect(turn.children).toHaveLength(1);
  expect(canopy.centers[0].x).toBeGreaterThan(canopy.centers[1].x);
  expect(canopy.centers[3].x).toBeLessThan(canopy.centers[4].x);
  const still = canopy.centers.map(center => center.clone());
  canopy.update(3, false);
  const drift = canopy.centers.map((center, index) => center.clone().sub(still[index]));
  expect(drift.some(offset => offset.length() > .009)).toBe(true);
  expect(new Set(drift.map(offset => offset.toArray().join(','))).size).toBe(5);
  expect(turn.rotation.y).toBe(0);
  canopy.update(15, true);
  expect(canopy.centers).toEqual(still);

  const released = vi.fn();
  flowers.addEventListener('dispose', released);
  canopy.dispose();
  expect(released).toHaveBeenCalledOnce();
});

it('leaves the original graph intact when loading is canceled', async () => {
  const turn = new Group();
  const source = new Group();
  turn.add(source);
  await expect(createEtherealCanopy(turn, source, AbortSignal.abort())).rejects.toThrow();
  expect(turn.children).toEqual([source]);
});
