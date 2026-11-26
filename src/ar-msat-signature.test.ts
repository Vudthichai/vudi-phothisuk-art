import { expect, it } from 'vitest';
import { msatPresentation } from './ar/experimental/msatSignature';
import { msatExperience, msatTagline } from './ar/msatConfig';
import { certificateARPreviews } from './ar/config';

it('keeps the magnet and authentic phrase separate from the 15 certificate targets', () => {
  expect(msatTagline).toBe('Make some art today.');
  expect(certificateARPreviews).toHaveLength(15);
  expect(certificateARPreviews.some(entry => entry.targetFile === msatExperience.targetFile)).toBe(false);
  expect(msatExperience.certificatePaths).toEqual([]);
});

it('raises the tagline in a single gentle fade and holds it without turning the monogram', () => {
  expect(msatPresentation(2, false)).toMatchObject({ opacity: 0, explore: false });
  expect(msatPresentation(2.75, false)).toMatchObject({ opacity: .5, explore: false });
  expect(msatPresentation(3.5, false)).toMatchObject({ opacity: 1, explore: true, taglineY: -.16 });
  const later = msatPresentation(40, false);
  expect(later.opacity).toBe(1);
  expect(Math.abs(later.yaw)).toBeLessThanOrEqual(.065);
  expect(msatPresentation(0, true)).toMatchObject({ opacity: 1, explore: true, yaw: 0, float: 0 });
});
