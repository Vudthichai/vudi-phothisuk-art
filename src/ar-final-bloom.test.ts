import { Group, Points, ShaderMaterial } from 'three';
import { expect, it, vi } from 'vitest';
import { firstBreathPresentation } from './ar/experimental/bloomOpening';
import { createFallingBloomSparks } from './ar/experimental/fallingBloomSparks';
import { createSculptureTimeline } from './ar/experimental/sculptureTimeline';

it('eases the new opacity and retains the approved light and original fade', () => {
  const approved = (elapsed: number) => firstBreathPresentation(elapsed, false);
  const final = (elapsed: number, reduced = false) => firstBreathPresentation(elapsed, reduced, true);

  expect(final(0).fade).toBe(0);
  expect(final(.25).fade).toBeLessThan(approved(.25).fade);
  expect(final(.9).fade).toBeGreaterThan(final(.25).fade);
  expect(final(1.92).fade).toBe(1);
  expect(final(0, true).fade).toBe(1);
  expect(approved(1.92).fade).toBe(.96);
  expect(final(5.1).sweep).toBe(approved(5.1).sweep);
});

it('keeps one bounded gravity-aligned spark batch on the tracked clock and releases it', () => {
  const upright = new Group();
  const batch = createFallingBloomSparks(upright);
  const points = upright.children[0] as Points;
  const material = points.material as ShaderMaterial;
  const clock = createSculptureTimeline();
  const update = (time: number, tracked: boolean) => {
    const frame = clock.update(time, false, tracked);
    if (tracked) batch.update(frame.elapsedSeconds, false);
  };

  expect(points).toBeInstanceOf(Points);
  expect(points.geometry.getAttribute('position').count).toBe(13);
  expect(material.depthWrite).toBe(false);
  update(0, true);
  expect(points.visible).toBe(false);
  update(3, true);
  expect(points.visible).toBe(true);
  update(6, false);
  update(20, true);
  expect(material.uniforms.sparkTime.value).toBe(3);
  update(40, true);
  expect(points.visible).toBe(true);
  batch.update(23, true);
  expect(points.visible).toBe(false);

  const dispose = vi.fn();
  points.geometry.addEventListener('dispose', dispose);
  material.addEventListener('dispose', dispose);
  batch.dispose();
  expect(upright.children).toHaveLength(0);
  expect(dispose).toHaveBeenCalledTimes(2);
});
