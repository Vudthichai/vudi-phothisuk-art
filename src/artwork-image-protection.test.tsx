// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForestPhotograph } from './forest/ForestPhotograph';
import { StudioEditions } from './studio/StudioEditions';
import { studioArtwork, studioEditions } from './studio/editions';
import { studioPrimaryImage } from './studio/gallery';
import { primaryForestImage } from './forest/types';
afterEach(cleanup);
const image = primaryForestImage(studioArtwork(studioEditions[0]));
it('deters image saving and dragging while leaving page context menus and scrolling alone', () => {
  render(<div><p>Gallery text</p><ForestPhotograph image={image}/></div>);
  const photograph = screen.getByRole('img');
  expect(photograph.getAttribute('draggable')).toBe('false');
  expect(fireEvent.contextMenu(photograph)).toBe(false);
  expect(fireEvent.dragStart(photograph)).toBe(false);
  expect(fireEvent.contextMenu(screen.getByText('Gallery text'))).toBe(true);
  expect(fireEvent.wheel(photograph, {ctrlKey:true,deltaY:10})).toBe(true);
  expect(fireEvent.touchStart(photograph)).toBe(true);
  expect(fireEvent.keyDown(photograph,{key:'Escape'})).toBe(true);
  expect(photograph.getAttribute('alt')).toBe(image.alt);
  expect(photograph.getAttribute('width')).toBe(String(image.variants.at(-1)!.width));
  expect(photograph.getAttribute('srcset')).toBe(image.variants.map(v=>`${v.src} ${v.width}w`).join(', '));
});
it('preserves linked artwork context menus, navigation and accessible names', () => {
  render(<MemoryRouter><StudioEditions/></MemoryRouter>);
  for(const photograph of screen.getAllByRole('img')) {
    expect(fireEvent.contextMenu(photograph)).toBe(true);
    expect(fireEvent.dragStart(photograph)).toBe(false);
    const link = photograph.closest('a')!;
    expect(link.getAttribute('href')).toMatch(/^\/studio-editions\/[^/]+\/$/);
    expect(link.getAttribute('aria-label')).toMatch(/^View Studio Edition information/);
    expect(fireEvent.pointerDown(photograph,{pointerType:'touch'})).toBe(true);
  }
});
it('keeps Studio card sources web-resolution, including on Retina displays', () => {
  for (const edition of studioEditions) {
    const photo = studioPrimaryImage(edition);
    for (const variant of photo.variants) {
      expect(Math.max(variant.width,variant.height)).toBeLessThanOrEqual(2000);
      expect(variant.src).toMatch(/\.webp$/);
    }
    expect(Math.max(...photo.variants.flatMap(v=>[v.width,v.height]))).toBeGreaterThanOrEqual(1600);
  }
});
