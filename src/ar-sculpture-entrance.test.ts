import { expect, it } from 'vitest';
import { entranceTiming } from './ar/experimental/sculptureEntrance';
import { createSculptureTimeline, SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';

const settings = { duration: 2, stagger: .5, softness: .2, atmosphere: .1, direction: [0, 1, 0] };

it('staggers pieces, keeps its place through tracking loss and turns at the V5 rate once assembled', () => {
  const clock = createSculptureTimeline();
  const tick = (time: number, tracked = true, reduced = false) =>
    entranceTiming(settings, 4, clock.update(time, reduced, tracked).elapsedSeconds, reduced);
  tick(0);
  const reveal = tick(1);
  expect([0, 1, 2, 3].map(reveal.progress)).toEqual([.5, .25, 0, 0]);
  tick(2, false);
  expect(tick(6).progress(1)).toBe(.25);
  expect(tick(8.5).turn).toBe(0);
  const complete = tick(8.5 + SCULPTURE_TIMING.revolutionSeconds);
  expect(complete.progress(3)).toBe(1);
  expect(complete.turn).toBe(2 * Math.PI);
  const still = tick(21, true, true);
  expect(still.progress(3)).toBe(1);
  expect(still.turn).toBe(0);
});

it('supports a fragment lead-in and separate flower, stem, and leaf phases', () => {
  const phased = { ...settings, phases: [
    { start: .35, duration: 2.15 },
    { start: 1.75, duration: 1.38 },
    { start: 2.45, duration: 1.15 },
    { start: 2.67, duration: 1.08 },
  ] };
  const leadIn = entranceTiming(phased, 4, .3, false);
  expect([0, 1, 2, 3].map(leadIn.progress)).toEqual([0, 0, 0, 0]);
  const flower = entranceTiming(phased, 4, 1.2, false);
  expect(flower.progress(0)).toBeGreaterThan(0);
  expect([1, 2, 3].map(flower.progress)).toEqual([0, 0, 0]);
  const firstLeaf = entranceTiming(phased, 4, 2.6, false);
  expect(firstLeaf.progress(0)).toBe(1);
  expect(firstLeaf.progress(1)).toBeGreaterThan(firstLeaf.progress(2));
  expect(firstLeaf.progress(3)).toBe(0);
  const complete = entranceTiming(phased, 4, 3.75, false);
  expect([0, 1, 2, 3].map(complete.progress)).toEqual([1, 1, 1, 1]);
  expect(complete.turn).toBe(0);
  expect(entranceTiming(phased, 4, 3.75 + SCULPTURE_TIMING.revolutionSeconds, false).turn).toBeCloseTo(2 * Math.PI);
  const still = entranceTiming(phased, 4, 0, true);
  expect([0, 1, 2, 3].map(still.progress)).toEqual([1, 1, 1, 1]);
  expect(still.turn).toBe(0);
});
