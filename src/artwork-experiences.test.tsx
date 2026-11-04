// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ArtworkExperience } from './dev/experiences/ArtworkExperience';
import { artworkExperiences } from './dev/experiences/configurations';
import { playableSteps } from './dev/experiences/model';
let reduced: boolean;
let listeners: Set<() => void>;
beforeEach(() => {
  vi.useFakeTimers(); reduced = false; listeners = new Set();
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, listener: () => void) => listeners.add(listener), removeEventListener: (_: string, listener: () => void) => listeners.delete(listener) }));
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => ({ cancel: vi.fn(), finished: new Promise<void>(() => {}) })) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function tick(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
it('registers all five distinct directions, one real photograph, and restrained leaf inventory', () => {
  expect(artworkExperiences.map(e => e.title)).toEqual(['Mother Nature','Ethereal Bloom','Moss & Mushrooms','Wild Tiger Lilies','75 Leaves']);
  expect(new Set(artworkExperiences.map(e => e.artworkId)).size).toBe(5);
  expect(artworkExperiences.filter(e => e.photograph.status === 'available')).toHaveLength(1);
  const tribute = artworkExperiences[4].steps[0];
  expect(tribute.family).toBe('fall');
  if (tribute.family === 'fall') {
    expect(tribute.particles).toHaveLength(3);
    expect(tribute.particles.filter(p => p.assetId === 'leaf-gold')).toHaveLength(1);
  }
});
it('never enables rejected flower/mushroom assets, even with experimental opt-in', () => {
  expect(playableSteps(artworkExperiences[1], true)).toHaveLength(0);
  expect(playableSteps(artworkExperiences[2], false)).toHaveLength(0);
  expect(playableSteps(artworkExperiences[2], true).map(step => step.family)).toEqual(['bark']);
  const invalid = { ...artworkExperiences[1], steps: artworkExperiences[1].steps.map(step => ({ ...step, readiness: 'approved' as const })) };
  expect(playableSteps(invalid, true)).toHaveLength(0);
});
it('starts/replays approved botanical steps and skips immediately to unobstructed artwork', async () => {
  const { container } = render(<ArtworkExperience experience={artworkExperiences[0]}/>);
  expect(container.querySelector('[data-step]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Start experience' }));
  await tick(200);
  expect(container.querySelector('[data-step="awakening-drift"]')).not.toBeNull();
  expect(container.querySelector('[data-step="awakening-foliage"]')).toBeNull();
  await tick(1500);
  expect(container.querySelector('.experience-detail.is-revealed')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Skip animation/ }));
  expect(container.querySelector('[data-step]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Replay experience' }));
  await tick(200);
  expect(container.querySelector('[data-step="awakening-drift"]')).not.toBeNull();
  await tick(4200);
  expect(container.querySelector('[data-step]')).toBeNull();
  expect(screen.getByRole('status').textContent).toBe('Complete');
});
it('displays a blocked preview and missing-photo label without a fake bloom', () => {
  const { container } = render(<ArtworkExperience experience={artworkExperiences[1]}/>);
  expect(screen.getByRole('button', { name: 'Start experience' }).hasAttribute('disabled')).toBe(true);
  expect(container.textContent).toContain('photograph missing');
  expect(container.textContent).toContain('asset-blocked');
  expect(container.querySelector('.flower-bloom')).toBeNull();
});
it('requires deliberate opt-in for the bark test and never mounts rejected mushroom playback', async () => {
  const { container } = render(<ArtworkExperience experience={artworkExperiences[2]}/>);
  fireEvent.click(screen.getByLabelText('Include experimental effects (private only)'));
  fireEvent.click(screen.getByRole('button', { name: 'Start experience' }));
  await tick(20);
  expect(container.querySelector('.forest-bark')).not.toBeNull();
  expect(container.querySelector('.mushroom-storyboard')).toBeNull();
  expect(container.querySelector('.flower-bloom')).toBeNull();
});
it('supports both local and live system reduced motion and cancels pending steps', async () => {
  const { container } = render(<ArtworkExperience experience={artworkExperiences[0]}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start experience' }));
  await tick(200);
  act(() => { reduced = true; listeners.forEach(listener => listener()); });
  expect(container.querySelector('[data-step]')).toBeNull();
  await tick(5000);
  expect(container.querySelector('[data-step]')).toBeNull();
  act(() => { reduced = false; listeners.forEach(listener => listener()); });
  fireEvent.click(screen.getByLabelText('Preview reduced motion'));
  fireEvent.click(screen.getByRole('button', { name: 'Replay experience' }));
  await tick(1000);
  expect(container.querySelector('[data-step]')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Reduced motion');
});
it('cancels timers on unmount and on document inactivity', async () => {
  const { container, unmount } = render(<ArtworkExperience experience={artworkExperiences[0]}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start experience' }));
  await tick(200);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  expect(container.querySelector('[data-step]')).toBeNull();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  unmount(); expect(listeners.size).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});
it('contains scene decode failures without blocking the existing artwork image', async () => {
  vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValue(new Error('missing asset'));
  const { container } = render(<ArtworkExperience experience={artworkExperiences[0]}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start experience' })); await tick();
  expect(screen.getByRole('status').textContent).toContain('failed to load');
  expect(container.querySelector('.experience-artwork')?.getAttribute('src')).toBe(artworkExperiences[0].photograph.src);
  expect(container.querySelector('[data-step]')).toBeNull();
});
it('also supports artwork with no assigned animation', () => {
  render(<ArtworkExperience experience={{ ...artworkExperiences[0], steps: [] }}/>);
  expect(screen.getByRole('status').textContent).toContain('no animation assigned');
  expect(screen.getByRole('button', { name: 'Start experience' }).hasAttribute('disabled')).toBe(true);
});
