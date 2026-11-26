import { expect, it } from 'vitest';
import { msatPresentation } from './ar/experimental/msatSignature';
import { msatCaptionLines, msatTypewriter } from './ar/experimental/msatOverlay';
import { createSculptureTimeline } from './ar/experimental/sculptureTimeline';
import { msatExperience, msatTagline } from './ar/msatConfig';
import { certificateARPreviews } from './ar/config';

it('keeps the magnet and authentic phrase separate from the 15 certificate targets', () => {
  expect(msatTagline).toBe('Make some art today.');
  expect(certificateARPreviews).toHaveLength(15);
  expect(certificateARPreviews.some(entry => entry.targetFile === msatExperience.targetFile)).toBe(false);
  expect(msatExperience.certificatePaths).toEqual([]);
});

it('keeps the approved single line and only wraps narrow screens in the optional preview', () => {
  expect(msatCaptionLines(320, false)).toEqual([msatTagline]);
  expect(msatCaptionLines(430, true)).toEqual(['Make some art', 'today.']);
  expect(msatCaptionLines(431, true)).toEqual([msatTagline]);
  expect(msatCaptionLines(320, true).join(' ')).toBe(msatTagline);
});

it('types whole glyphs through the final period and removes the caret after one reveal', () => {
  const at = (time: number, reduced = false) => msatTypewriter(time, 2.25, 1.5, reduced);
  expect(at(2.2)).toEqual({ count: 0, shown: false, complete: false, cursor: false });
  expect(at(2.25)).toMatchObject({ count: 0, shown: true, cursor: true });
  expect(at(3).count).toBe(10);
  expect(msatTagline.slice(0, at(3.74).count)).toBe('Make some art today');
  expect(msatTagline.slice(0, at(3.75).count)).toBe(msatTagline);
  expect(at(40)).toEqual(at(3.75));
  expect(at(0, true)).toEqual(at(3.75));
});

it('resumes at the same glyph after a tracking pause and keeps the emblem facing forward', () => {
  const clock = createSculptureTimeline();
  const at = (wallTime: number, tracked: boolean) =>
    msatTypewriter(clock.update(wallTime, false, tracked).elapsedSeconds, 2.25, 1.5, false);
  at(10, true);
  const partial = at(13, true);
  expect(partial.count).toBe(10);
  at(14, false);
  expect(at(21, true)).toEqual(partial);
  expect(at(22, true).complete).toBe(true);
  expect(Math.abs(msatPresentation(40, false).yaw)).toBeLessThanOrEqual(.065);
  expect(msatPresentation(40, true)).toEqual({ yaw: 0, float: 0 });
});
