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

it('layers the Moss and Gilded refinements onto their existing presentations', () => {
  const moss = arById('moss-and-mushrooms-original', true)!;
  expect(creativePreviewFor(moss)?.composition?.(moss))
    .toEqual({ ...moss.composition, creativeFinish: 'moss' });
  const gilded = arById('gilded-bloom-original', true)!;
  expect(creativePreviewFor(gilded)?.composition?.(gilded))
    .toEqual({ ...gilded.previewV3Composition, creativeFinish: 'gilded' });
});

it('retains the original lilies, placements and stagger on the optional lily studies', () => {
  const tiger = arById('tiger-lily-original', true)!;
  expect(tiger.modelAsset).toBe('/ar/models/tiger-lily-orange.glb');
  expect(creativePreviewFor(tiger)?.lilyCinematics).toBe('sunlit-flame');
  for (const [id, variant] of [
    ['dragon-lily-original', 'blushing-ember'],
    ['wild-tiger-lilies-original', 'the-dance'],
  ]) {
    const entry = arById(id, true)!;
    const preview = creativePreviewFor(entry)?.composition?.(entry);
    expect(preview?.lilyCinematics).toBe(variant);
    expect(preview?.pieces).toBe(entry.composition?.pieces);
    expect(preview?.entrance).toEqual(variant === 'blushing-ember'
      ? { ...entry.composition?.entrance, atmosphere: 0 }
      : entry.composition?.entrance);
  }
});
