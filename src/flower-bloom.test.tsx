// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor, act } from '@testing-library/react';
import { FlowerBloom } from './components/FlowerBloom';
import type { FlowerSequence } from './botanical/bloom';
const asset: FlowerSequence = { id: 'test-only', species: 'Test fixture', width: 300, height: 400, duration: 4, status: 'approved', frames: ['bud.webp', 'mid.webp', 'open.webp'], poster: 'poster.webp' };
let reduced = false;
let updatePreference: () => void;
let nextFrame: FrameRequestCallback;
beforeEach(() => {
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, listener: () => void) => { updatePreference = listener; }, removeEventListener: vi.fn() }));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('blocks unapproved imagery and reserves the stage without an image', () => {
  const { container } = render(<FlowerBloom asset={{ ...asset, status: 'needs-assets', frames: [], reason: 'Missing continuity' }} />);
  expect(container.querySelector('[data-status="needs-assets"]')).not.toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect((container.firstChild as HTMLElement).style.aspectRatio).toBe('300 / 400');
});
it('plays registered frames once, settles and replays on request', async () => {
  const { container, rerender } = render(<FlowerBloom asset={asset} replayKey={1} gentleMotion />);
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
  act(() => nextFrame(100));
  act(() => nextFrame(2200));
  expect(container.querySelector('img')?.getAttribute('src')).toBe('mid.webp');
  act(() => nextFrame(4200));
  expect(container.querySelector('[data-status="settled"]')).not.toBeNull();
  expect(container.querySelector('img')?.getAttribute('src')).toBe('open.webp');
  rerender(<FlowerBloom asset={asset} replayKey={2} />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('bud.webp');
});
it('responds to reduced motion with a static poster and cancels playback', async () => {
  const { container } = render(<FlowerBloom asset={asset} trigger="mount" gentleMotion />);
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
  act(() => { reduced = true; updatePreference(); });
  expect(container.querySelector('[data-status="reduced-motion"]')).not.toBeNull();
  expect(container.querySelector('img')?.getAttribute('src')).toBe('poster.webp');
  expect(container.querySelector('.flower-bloom__settled')).toBeNull();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
it('keeps manual mode idle and handles decode errors without broken images', async () => {
  vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValue(new Error('missing frame'));
  const { container } = render(<FlowerBloom asset={asset} />);
  await waitFor(() => expect(container.querySelector('[data-status="error"]')).not.toBeNull());
  expect(container.querySelector('img')).toBeNull();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});
it('starts visibility-triggered playback once in view', async () => {
  let observeCallback: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observeCallback = callback; }
    observe() {} disconnect = disconnect;
  });
  render(<FlowerBloom asset={asset} trigger="visible" />);
  await waitFor(() => expect(HTMLImageElement.prototype.decode).toHaveBeenCalled());
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  act(() => observeCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalled());
  expect(disconnect).toHaveBeenCalled();
});
