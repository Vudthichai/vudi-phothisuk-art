import { DirectionalLight, HemisphereLight, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { applyStudioLighting } from './ar/studioLighting';

describe('botanical AR studio lighting', () => {
  it.each(['mother-nature', '75-leaves', 'gilded-bloom'])('preserves the approved light rig for %s', artwork => {
    const scene = new Scene();
    applyStudioLighting(scene, artwork);
    const [ambient, key] = scene.children as [HemisphereLight, DirectionalLight];
    expect(scene.children).toHaveLength(2);
    expect(ambient.color.getHex()).toBe(0xf4f8f4);
    expect(ambient.groundColor.getHex()).toBe(0x26352c);
    expect(ambient.intensity).toBe(2);
    expect(key.color.getHex()).toBe(0xfff5e4);
    expect(key.intensity).toBe(3);
    expect(key.position.toArray()).toEqual([-1, 2, 3]);
    expect(scene.environmentIntensity).toBe(1);
  });

  it('keeps independent profiles and adds no shadow draws', () => {
    const gilded = new Scene();
    const ivory = new Scene();
    applyStudioLighting(gilded, 'gilded-bloom', true, 'v2');
    applyStudioLighting(ivory, 'ethereal-bloom');
    expect(gilded.environmentIntensity).toBeGreaterThan(ivory.environmentIntensity);
    expect(gilded.children.map(light => light.name)).toEqual(['Studio hemisphere', 'Studio key', 'Studio fill', 'Studio rim']);
    expect(gilded.children.every(light => !light.castShadow)).toBe(true);
    expect(ivory.children.every(light => !light.castShadow)).toBe(true);
  });

  it('keeps fallback lighting on the generic renderer', () => {
    const scene = new Scene();
    applyStudioLighting(scene, 'tiger-lily', false);
    expect(scene.children).toHaveLength(2);
    expect((scene.children[0] as HemisphereLight).color.getHex()).toBe(0xfff8e8);
    expect(scene.environmentIntensity).toBe(1);
  });
});
