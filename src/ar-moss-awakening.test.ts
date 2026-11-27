import { expect, it } from 'vitest';
import { Group, Points } from 'three';
import { createMossAwakening, mossTurn } from './ar/experimental/mossAwakening';
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

it('releases one gravity-aligned shelf-spore batch only in the optional preview', () => {
  const upright = new Group();
  const turn = new Group();
  const placement = new Group();
  placement.rotation.y = -1.1;
  turn.add(placement);
  upright.add(turn);
  const preview = createMossAwakening(turn, upright, true);
  const spores = upright.children.find(child => child instanceof Points)!;
  const birth = spores.geometry.getAttribute('birthPosition');
  const age = spores.geometry.getAttribute('sporeProgress');
  expect(birth.count).toBe(12);
  preview.update(4.9, false);
  expect(spores.visible).toBe(false);
  preview.update(5.9, false);
  expect(spores.visible).toBe(true);
  expect(birth.getY(0)).toBeCloseTo(.389);
  expect(age.getX(0)).toBeGreaterThan(0);
  expect(age.getX(11)).toBe(0);
  const release = birth.getX(0);
  preview.update(6.5, false);
  expect(birth.getX(0)).toBe(release);
  preview.update(6.5, true);
  expect(spores.visible).toBe(false);
  preview.dispose();
  expect(upright.children).toEqual([turn]);

  const approved = createMossAwakening(turn, upright);
  const approvedSpores = upright.children.find(child => child instanceof Points)!;
  expect(approvedSpores.geometry.getAttribute('birthPosition')).toBeUndefined();
  approved.dispose();
});

it('keeps the release-candidate undershelf spores continuous with intermittent bursts in one batch', () => {
  const upright = new Group();
  const turn = new Group();
  upright.add(turn);
  const release = createMossAwakening(turn, upright, true, true);
  const batches = upright.children.filter(child => child instanceof Points);
  expect(batches).toHaveLength(1);
  const [spores] = batches;
  const ages = spores.geometry.getAttribute('sporeProgress');
  const origins = spores.geometry.getAttribute('birthPosition');
  expect(origins.count).toBe(60);
  release.update(4.99, false);
  expect(spores.visible).toBe(false);
  release.update(11, false);
  expect(spores.visible).toBe(true);
  expect(new Set(Array.from({ length: 48 }, (_, index) => origins.getY(index))).size).toBe(8);
  expect(origins.getY(0)).toBeCloseTo(.342);
  expect(origins.getY(1)).toBeCloseTo(.453);

  const inFlight = (from: number, to: number) => {
    let count = 0;
    for (let index = from; index < to; index++) {
      const progress = ages.getX(index);
      if (progress > .08 && progress < .92) count++;
    }
    return count;
  };
  expect(inFlight(48, 60)).toBe(0);
  release.update(14.1, false);
  expect(inFlight(48, 60)).toBe(6);
  release.update(17, false);
  expect(inFlight(48, 60)).toBe(0);
  const density = [];
  for (let time = 18; time < 68; time += .13) {
    release.update(time, false);
    density.push(inFlight(0, 48));
  }
  expect(Math.min(...density)).toBeGreaterThanOrEqual(27);
  expect(Math.max(...density)).toBeLessThanOrEqual(32);
  release.update(68, true);
  expect(spores.visible).toBe(false);
  release.dispose();
  expect(upright.children).toEqual([turn]);
});
