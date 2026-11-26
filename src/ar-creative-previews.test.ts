import { expect, it } from 'vitest';
import { arById, certificateARPreviews } from './ar/config';
import { creativePreviewFor } from './ar/creativePreviews';

it('offers the Ancient Tree refinement on both editions without changing the approved V5 entry', () => {
  for (const id of ['mother-nature-original', 'mother-nature-collectors-edition']) {
    const entry = arById(id, true);
    expect(entry?.rainforestV5).toBe(true);
    expect(creativePreviewFor(entry)).toMatchObject({ variant: 'ancient-tree' });
  }
});

it('derives Rebirth from the approved stump placement on both certificate editions', () => {
  for (const id of ['a-forest-forgotten-original', 'a-forest-forgotten-collectors-edition']) {
    const entry = arById(id, true)!;
    const composition = creativePreviewFor(entry)?.composition?.(entry);
    expect(composition?.stumpRebirth).toBe(true);
    expect(composition?.pieces).toBe(entry.composition?.pieces);
    expect(composition?.pieces[0].asset).toBe('/ar/models/rainforest-stump.glb');
    expect(entry.composition?.stumpRebirth).toBeUndefined();
  }
  expect(certificateARPreviews).toHaveLength(15);
  expect(creativePreviewFor(arById('blooming-desire-original', true))).toBeUndefined();
});
