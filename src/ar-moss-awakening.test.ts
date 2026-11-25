import { expect, it } from 'vitest';
import { mossTurn } from './ar/experimental/mossAwakening';
import { createSculptureTimeline, SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';

it('holds the sculpture during the reveal and eases into the V5 angular velocity', () => {
  expect(mossTurn(9)).toBe(0);
  expect(mossTurn(10)).toBeGreaterThan(0);
  expect((mossTurn(9.0001) - mossTurn(9)) / .0001).toBeCloseTo(0, 7);
  const v5 = createSculptureTimeline();
  v5.update(0, false, true);
  const revolution = SCULPTURE_TIMING.revolutionSeconds;
  expect(mossTurn(12 + revolution) - mossTurn(12)).toBeCloseTo(v5.update(revolution, false, true).turn, 12);
  expect(mossTurn(12) - mossTurn(11.9999)).toBeCloseTo(mossTurn(12.0001) - mossTurn(12), 10);
});
