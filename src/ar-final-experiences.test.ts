// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { arById, certificateARPreviews } from './ar/config';
import { creativePreviewFor } from './ar/creativePreviews';
import { artworkHubEntries, finalExperience } from './ar/finalExperiences';

it('renders one launch per artwork and preserves all edition targets', async () => {
  document.body.innerHTML = '<ol id="certificates"></ol>';
  await import('./ar/certificateHub');
  const cards = [...document.querySelectorAll<HTMLLIElement>('#certificates > li')];
  expect(cards).toHaveLength(10);
  expect(new Set(cards.map(card => card.querySelector('h2')?.textContent)).size).toBe(10);

  const targetIds: string[] = [];
  for (const card of cards) {
    const links = card.querySelectorAll<HTMLAnchorElement>('a');
    expect(links).toHaveLength(1);
    const link = links[0];
    const select = card.querySelector('select');
    const readRoute = () => {
      const url = new URL(link.href);
      expect(url.pathname).toBe('/ar-camera.html');
      expect(url.searchParams.get('variant')).toBe('final');
      return url.searchParams.get('experience');
    };
    if (!select) {
      targetIds.push(readRoute()!);
      continue;
    }
    expect(select.options[0].textContent).toBe('Original');
    for (const option of select.options) {
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      expect(readRoute()).toBe(option.value);
      targetIds.push(option.value);
    }
  }

  expect(targetIds.sort()).toEqual(certificateARPreviews.map(experience => experience.id).sort());
});

it('uses one latest composition per artwork while keeping original recognition targets', () => {
  for (const artwork of artworkHubEntries()) {
    const final = artwork.certificates.map(finalExperience);
    expect(final.map(experience => experience.targetFile))
      .toEqual(artwork.certificates.map(experience => experience.targetFile));
    const { composition, modelAsset, rainforestV5 } = final[0];
    expect(Boolean(composition || modelAsset || rainforestV5)).toBe(true);
    for (const entry of final) expect(entry.composition).toEqual(composition);
  }

  const original = (id: string) => arById(id + '-original', true)!;
  const mother = original('mother-nature');
  expect(finalExperience(mother)).toBe(mother);
  const wild = original('wild-tiger-lilies');
  expect(finalExperience(wild).composition).toEqual(creativePreviewFor(wild)?.composition?.(wild));
  const gilded = original('gilded-bloom');
  expect(finalExperience(gilded).composition?.creativeFinish).toBe('gilded');
  expect(finalExperience(gilded).composition?.pieces).toBe(gilded.previewV3Composition?.pieces);
  const bloom = original('blooming-desire');
  expect(finalExperience(bloom).composition).toMatchObject({ firstBreath: true, finalBloom: true });
  expect(bloom.previewFirstBreathComposition?.finalBloom).toBeUndefined();
  const stump = original('a-forest-forgotten');
  expect(finalExperience(stump).composition).toMatchObject({ stumpRebirth: true, finalForest: 'rebirth' });
  expect(creativePreviewFor(stump)?.composition?.(stump)?.finalForest).toBeUndefined();
});
