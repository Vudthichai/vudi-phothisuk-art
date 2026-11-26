import { Group, Points, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { arById, FIRST_BREATH_LABEL, FIRST_BREATH_VARIANT } from './ar/config';
import { firstBreathPresentation } from './ar/experimental/bloomOpening';
import { createFirstBreathAtmosphere } from './ar/experimental/firstBreathAtmosphere';
import { createSculptureTimeline } from './ar/experimental/sculptureTimeline';

describe('Blooming Desire First Breath', () => {
  it('keeps its own preview variant on the existing Blooming Desire model and image target', () => {
    const experience = arById('blooming-desire-original', true);
    expect(FIRST_BREATH_VARIANT).toBe('first-breath');
    expect(FIRST_BREATH_LABEL).toBe('Blooming Desire — First Breath');
    expect(experience?.targetFile).toBe('/ar/targets/blooming-desire-original.mind');
    expect(experience?.modelAsset).toBe('/ar/models/blooming-desire.glb');
    expect(experience?.previewComposition).toMatchObject({ bloomOpening: true });
    expect(experience?.previewComposition?.firstBreath).toBeUndefined();
    const preview = experience?.previewFirstBreathComposition;
    expect(preview).toEqual({ ...experience?.previewComposition, firstBreath: true });
    expect(preview?.pieces).toBe(experience?.previewComposition?.pieces);
  });

  it('fades in through the tracking clock and resumes without replaying its entrance', () => {
    const clock = createSculptureTimeline();
    const update = (time: number, tracked: boolean) => {
      const { elapsedSeconds } = clock.update(time, false, tracked);
      return firstBreathPresentation(elapsedSeconds, false);
    };
    expect(update(10, true).fade).toBe(0);
    const midReveal = update(11, true);
    expect(midReveal.fade).toBeGreaterThan(0);
    expect(midReveal.fade).toBeLessThan(1);
    expect(update(12, false)).toEqual(midReveal);
    expect(update(17, false)).toEqual(midReveal);
    expect(update(18, true)).toEqual(midReveal);
    expect(update(19, true).fade).toBe(1);
  });

  it('limits the light sweep to the opening climax and skips it with reduced motion', () => {
    expect(firstBreathPresentation(2, false).sweep).toBe(-1);
    const climax = firstBreathPresentation(5.1, false);
    expect(climax.sweep).toBeGreaterThan(0);
    expect(climax.sweep).toBeLessThan(1);
    expect(firstBreathPresentation(6, false).sweep).toBe(-1);
    expect(firstBreathPresentation(0, true)).toMatchObject({ fade: 1, sweep: -1 });
  });

  it('batches the veil and pollen and releases their graphics resources', () => {
    const root = new Group();
    const center = new Vector3(0, .43, .05);
    const atmosphere = createFirstBreathAtmosphere(root, center, 4.4);
    expect(root.children).toHaveLength(1);
    const motes = root.children[0];
    if (!(motes instanceof Points)) throw new Error('Expected a single point batch');
    expect(motes.position.toArray()).toEqual(center.toArray());
    expect(motes.geometry.getAttribute('position').count).toBe(11);

    for (const [time, visible] of [[0, false], [.8, true], [3, false], [5.5, true], [12, false], [14.1, true]] as const) {
      atmosphere.update(time, false);
      expect(motes.visible).toBe(visible);
    }
    atmosphere.update(5.5, true);
    expect(motes.visible).toBe(false);

    const disposed = vi.fn();
    motes.geometry.addEventListener('dispose', disposed);
    if (Array.isArray(motes.material)) throw new Error('Expected a single point material');
    motes.material.addEventListener('dispose', disposed);
    atmosphere.dispose();
    expect(root.children).toHaveLength(0);
    expect(disposed).toHaveBeenCalledTimes(2);
  });
});
