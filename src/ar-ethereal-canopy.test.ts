import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { createEtherealCanopy } from './ar/experimental/etherealCanopy';

it('builds five small ivory flowers and one connected foliage mesh from one loaded source', async () => {
  const turn = new Group();
  const source = new Group();
  const geometry = new BoxGeometry(.7, 1, .75);
  const material = new MeshStandardMaterial();
  source.add(new Mesh(geometry, material));
  source.scale.setScalar(1.02);
  turn.add(source);
  const dispose = await createEtherealCanopy(turn, source, new AbortController().signal);

  expect(source.parent).toBeNull();
  const flowers = turn.getObjectByName('Five ivory flowers') as InstancedMesh;
  expect(flowers.count).toBe(5);
  expect(flowers.geometry).toBe(geometry);
  expect(flowers.material).toBe(material);
  const transform = new Matrix4();
  const centers = new Set<string>();
  for (let i = 0; i < flowers.count; i++) {
    flowers.getMatrixAt(i, transform);
    expect(new Vector3().setFromMatrixScale(transform).x).toBeLessThan(.47);
    centers.add(new Vector3().setFromMatrixPosition(transform).toArray().join(','));
  }
  expect(centers.size).toBe(5);
  const foliage = turn.getObjectByName('Ethereal canopy leaves and stems') as Mesh;
  expect(foliage.geometry.index!.count / 3).toBeLessThan(1500);

  const released = vi.fn();
  flowers.addEventListener('dispose', released);
  dispose();
  expect(released).toHaveBeenCalledOnce();
});

it('leaves the original graph intact when loading is canceled', async () => {
  const turn = new Group();
  const source = new Group();
  turn.add(source);
  await expect(createEtherealCanopy(turn, source, AbortSignal.abort())).rejects.toThrow();
  expect(turn.children).toEqual([source]);
});
