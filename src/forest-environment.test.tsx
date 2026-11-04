// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { BarkReveal, ForestFoliage, VineGrowth } from './components/ForestEnvironment';
import { MushroomGrowth } from './components/MushroomGrowth';
import type { BarkAsset, FoliagePiece, GrowthSequence, VineAsset } from './botanical/forest';
const vine: VineAsset = { id: 'test-vine', image: '/vine.webp', width: 400, height: 400, path: 'M 5 95 C 60 80 10 20 90 5', revealWidth: 20 };
const pieces: readonly FoliagePiece[] = [0,1,2].map(i => ({ id: `leaf-${i}`, image: `/leaf-${i}.webp`, width: 100, height: 200, x: i * 20, y: i * 10, size: 15 }));
const bark: BarkAsset = { id: 'test-bark', image: '/bark.webp', ridgeMasks: ['/dark.png','/mid.png','/light.png'] };
let reduced: boolean;
let preferenceListeners: Set<() => void>;
let finishes: (() => void)[];
let cancel: ReturnType<typeof vi.fn>;
beforeEach(() => {
  reduced = false; finishes = []; preferenceListeners = new Set(); cancel = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, listener: () => void) => preferenceListeners.add(listener), removeEventListener: (_: string, listener: () => void) => preferenceListeners.delete(listener) }));
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => ({ cancel, finished: new Promise<void>(resolve => finishes.push(resolve)) })) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('reuses the gated Phase 2 player for mushroom growth without scaling a mature image', () => {
  const asset: GrowthSequence = { id: 'mushroom', species: 'test', width: 300, height: 300, duration: 6, status: 'needs-assets', frames: [], reason: 'continuity' };
  const { container } = render(<MushroomGrowth asset={asset} replayKey={1} />);
  expect(container.querySelector('[data-status="needs-assets"]')).not.toBeNull();
  expect(container.querySelector('img')).toBeNull();
});
it('starts only on request, preserves configurable path and uses unique masks for multiple vines', async () => {
  const { container, rerender } = render(<><VineGrowth asset={vine}/><VineGrowth asset={vine}/></>);
  await waitFor(() => expect(container.querySelectorAll('[data-status="idle"]')).toHaveLength(2));
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(new Set([...container.querySelectorAll('mask')].map(mask => mask.id)).size).toBe(2);
  expect(container.querySelector('path')?.getAttribute('d')).toBe(vine.path);
  rerender(<VineGrowth asset={vine} replayKey={1} duration={7} />);
  await waitFor(() => expect(Element.prototype.animate).toHaveBeenCalled());
  const [frames, options] = vi.mocked(Element.prototype.animate).mock.calls[0];
  expect(frames).toEqual(expect.arrayContaining([{ strokeDashoffset: '100' }, { strokeDashoffset: '0' }]));
  expect(options).toMatchObject({ duration: 7000, fill: 'both' });
});
it('gives foliage independent restrained envelopes, finite duration and replay cleanup', async () => {
  const cue = vi.fn();
  const { container, rerender, unmount } = render(<ForestFoliage pieces={pieces} replayKey={1} duration={5} intensity={.6} onCue={cue}/>);
  await waitFor(() => expect(container.querySelector('[data-status="playing"]')).not.toBeNull());
  const calls = vi.mocked(Element.prototype.animate).mock.calls;
  expect(calls).toHaveLength(3);
  expect(calls[0][0]).not.toEqual(calls[1][0]);
  expect(calls[0][1]).not.toEqual(calls[1][1]);
  expect(calls[0][1]).not.toHaveProperty('iterations');
  await act(async () => { finishes.forEach(finish => finish()); });
  expect(container.querySelector('[data-status="settled"]')).not.toBeNull();
  expect(cue.mock.calls.map(call => call[0])).toEqual(['start','complete']);
  rerender(<ForestFoliage pieces={pieces} replayKey={2} duration={5} intensity={.6} onCue={cue}/>);
  expect(cancel).toHaveBeenCalledTimes(3);
  expect(Element.prototype.animate).toHaveBeenCalledTimes(6);
  unmount(); expect(cancel).toHaveBeenCalledTimes(6);
});
it('clears bark in independently delayed ridge bands without transforming the artwork', async () => {
  const { container } = render(<BarkReveal asset={bark} artwork={{ src: "/original.webp", width: 900, height: 1351 }} replayKey={1} duration={4}/>);
  await waitFor(() => expect(Element.prototype.animate).toHaveBeenCalledTimes(3));
  expect(container.querySelector('.forest-artwork')?.getAttribute('src')).toBe('/original.webp');
  expect(container.querySelector('.forest-artwork')?.getAttribute('style')).toBeNull();
  const options = vi.mocked(Element.prototype.animate).mock.calls.map(call => call[1]);
  expect(options).toEqual([
    expect.objectContaining({ duration: 2400, delay: 0 }),
    expect.objectContaining({ duration: 2400, delay: 800 }),
    expect.objectContaining({ duration: 2400, delay: 1600 }),
  ]);
});
it('responds to reduced motion mid-play, cancels all motion and removes listeners on unmount', async () => {
  const { container, unmount } = render(<ForestFoliage pieces={pieces} trigger="mount"/>);
  await waitFor(() => expect(Element.prototype.animate).toHaveBeenCalledTimes(3));
  act(() => { reduced = true; preferenceListeners.forEach(listener => listener()); });
  expect(container.querySelector('[data-status="reduced-motion"]')).not.toBeNull();
  expect(cancel).toHaveBeenCalledTimes(3);
  unmount(); expect(preferenceListeners.size).toBe(0);
});
it('does not animate under an initial reduced-motion preference', async () => {
  reduced = true;
  const { container } = render(<BarkReveal asset={bark} artwork={{ src: "/original.webp", width: 900, height: 1351 }} trigger="mount"/>);
  await waitFor(() => expect(container.querySelector('[data-status="reduced-motion"]')).not.toBeNull());
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});
it('waits for visibility and plays only after the observer fires', async () => {
  let observeCallback: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observeCallback = callback; }
    observe() {} disconnect = disconnect;
  });
  render(<VineGrowth asset={vine} trigger="visible"/>);
  await waitFor(() => expect(HTMLImageElement.prototype.decode).toHaveBeenCalled());
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  act(() => observeCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  await waitFor(() => expect(Element.prototype.animate).toHaveBeenCalledTimes(1));
  expect(disconnect).toHaveBeenCalled();
});
it('holds decode failures and does not fire cues or play broken assets', async () => {
  vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValue(new Error('missing cutout'));
  const cue = vi.fn();
  const { container } = render(<VineGrowth asset={vine} trigger="mount" onCue={cue}/>);
  await waitFor(() => expect(container.querySelector('[data-status="error"]')).not.toBeNull());
  expect(Element.prototype.animate).not.toHaveBeenCalled(); expect(cue).not.toHaveBeenCalled();
});
