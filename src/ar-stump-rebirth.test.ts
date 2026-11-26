import { expect, it } from 'vitest';
import { rebirthTurn } from './ar/experimental/stumpRebirth';
import { createSculptureTimeline, SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';

it('holds the stump during regeneration, then eases into the shared turn', () => {
  expect(rebirthTurn(4.4, false)).toBe(0);
  expect(rebirthTurn(5.2, false)).toBeGreaterThan(0);
  expect((rebirthTurn(4.4001, false) - rebirthTurn(4.4, false)) / .0001).toBeCloseTo(0, 7);

  const fullSpeed = 5.75;
  const revolution = SCULPTURE_TIMING.revolutionSeconds;
  const collection = createSculptureTimeline();
  collection.update(0, false, true);
  expect(rebirthTurn(fullSpeed + revolution, false) - rebirthTurn(fullSpeed, false))
    .toBeCloseTo(collection.update(revolution, false, true).turn, 12);
  expect(rebirthTurn(fullSpeed, false) - rebirthTurn(fullSpeed - .0001, false))
    .toBeCloseTo(rebirthTurn(fullSpeed + .0001, false) - rebirthTurn(fullSpeed, false), 11);
  expect(rebirthTurn(fullSpeed + revolution, true)).toBe(0);
});
