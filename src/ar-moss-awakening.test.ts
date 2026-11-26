import { expect, it } from 'vitest';
import { mossTurn } from './ar/experimental/mossAwakening';
import { createSculptureTimeline, SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';

it('holds the sculpture for the five-second reveal and reaches V5 angular velocity at six seconds', () => {
  expect(mossTurn(5)).toBe(0);
  expect(mossTurn(5.5)).toBeGreaterThan(0);
  expect((mossTurn(5.0001) - mossTurn(5)) / .0001).toBeCloseTo(0, 7);
  const v5 = createSculptureTimeline();
  v5.update(0, false, true);
  const revolution = SCULPTURE_TIMING.revolutionSeconds;
  expect(mossTurn(6 + revolution) - mossTurn(6)).toBeCloseTo(v5.update(revolution, false, true).turn, 12);
  expect(mossTurn(6) - mossTurn(5.9999)).toBeCloseTo(mossTurn(6.0001) - mossTurn(6), 10);
});
