// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OceanCollection } from './components/OceanCollection';
import { findCollection } from './data';

const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
let reduced = false;
let changePreference: (() => void) | undefined;
beforeEach(() => {
  reduced = false;
  changePreference = undefined;
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: reduced,
    addEventListener: (_: string, listener: () => void) => { changePreference = listener; },
    removeEventListener: vi.fn(),
  })));
  Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll); else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView'); });
function openCollection() {
  return render(<MemoryRouter><OceanCollection collection={findCollection('oceans')!}/></MemoryRouter>);
}
describe('cinematic Oceans entrance', () => {
  it('provides portrait sources and a high-priority poster without duplicating artwork', () => {
    const { container } = openCollection();
    const source = container.querySelector('picture source')!;
    expect(source.getAttribute('media')).toBe('(max-width: 700px)');
    expect(source.getAttribute('srcset')).toContain('portrait-480.webp');
    const poster = container.querySelector('picture img')!;
    expect(poster.getAttribute('fetchpriority')).toBe('high');
    expect(poster.getAttribute('loading')).toBe('eager');
    expect(container.querySelectorAll('.artwork-card')).toHaveLength(11);
    expect(container.querySelector('video')).toBeNull();
  });
  it('features the wide painting first without repeating it in the remaining gallery', () => {
    const { container } = openCollection();
    expect(container.querySelector('.ocean-exhibit h3')?.textContent).toBe('The Oceans');
    expect(container.querySelectorAll('.ocean-exhibit')).toHaveLength(3);
    expect(container.querySelectorAll('.ocean-remaining .artwork-card')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /motion/i })).toBeNull();
    expect(container.querySelector('.ocean-shore')).toBeNull();
  });
  it('uses a still entrance for reduced motion and responds to preference changes', () => {
    reduced = true;
    const { container } = openCollection();
    expect(container.querySelector('.ocean-experience')?.getAttribute('data-motion')).toBe('off');
    reduced = false;
    act(() => changePreference?.());
    expect(container.querySelector('.ocean-experience')?.getAttribute('data-motion')).toBe('on');
  });
  it('respects data saving instead of enabling animation', () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const { container } = openCollection();
    expect(container.querySelector('.ocean-experience')?.getAttribute('data-motion')).toBe('off');
    expect(container.querySelector('[data-reveal="waiting"]')).toBeNull();
  });
  it('takes visitors straight to the gallery and moves keyboard focus', async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const user = userEvent.setup();
    const { container } = openCollection();
    const explore = screen.getByRole('link', { name: /Explore the collection/ });
    expect(explore.getAttribute('href')).toBe('#oceans-gallery');
    await user.click(explore);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(document.activeElement).toBe(container.querySelector('#oceans-gallery'));
  });
});
