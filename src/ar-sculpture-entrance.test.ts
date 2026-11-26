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
