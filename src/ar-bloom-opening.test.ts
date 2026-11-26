import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { BLOOM_HOLD_SECONDS, BLOOM_OPENING_SECONDS, createBloomOpening } from './ar/experimental/bloomOpening';
import { SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';

describe('Blooming Desire opening', () => {
  it('holds the open flower in place before turning at the shared rate', () => {
    const bloom = createBloomOpening(new Group());
    const holdEnds = BLOOM_OPENING_SECONDS + BLOOM_HOLD_SECONDS;
    expect(bloom.update(0, false)).toBe(0);
    expect(bloom.update(BLOOM_OPENING_SECONDS, false)).toBe(0);
    expect(bloom.update(holdEnds, false)).toBe(0);
    expect(bloom.update(holdEnds + SCULPTURE_TIMING.revolutionSeconds / 2, false)).toBeCloseTo(Math.PI);
    expect(bloom.update(holdEnds + SCULPTURE_TIMING.revolutionSeconds, false)).toBeCloseTo(2 * Math.PI);
    expect(bloom.update(holdEnds + 2, true)).toBe(0);
  });
});
