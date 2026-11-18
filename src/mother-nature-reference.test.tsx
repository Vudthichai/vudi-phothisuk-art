// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct } from './studio/StudioStore';
import { StudioEditions } from './studio/StudioEditions';
import { studioGallery, studioPrimaryImage } from './studio/gallery';
import { studioEditions } from './studio/editions';
afterEach(cleanup);
it('uses each reviewed exact-room composite across both size choices, without retired generic views',()=>{
 for(const edition of studioEditions){
  const path=`/studio-editions/exact-gallery/${edition.artworkId}-1122.webp`;
  expect(studioPrimaryImage(edition).variants.at(-1)?.src).toBe(path);
  expect(studioGallery(edition,'9x12')[0].image).toEqual(studioGallery(edition,'12x16')[0].image);
  const view=render(<MemoryRouter initialEntries={[`/studio-editions/${edition.artworkId}/`]}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(path);
  fireEvent.click(screen.getByRole('radio',{name:'12 × 16 inches — $95'}));
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(path);
  expect(view.container.querySelector('.studio-gallery-caption')?.textContent).toBe('In a Space');
  expect([...view.container.querySelectorAll('img')].some(i=>i.getAttribute('src')?.includes('/mockups/'))).toBe(false);
  expect(view.container.querySelector('.studio-product-price')?.textContent).toContain('$95Selected size · Coming Soon');
  fireEvent.click(screen.getByRole('button',{name:'Artwork Detail'}));
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toContain(`/studio-editions/${edition.artworkId}-print-`);
  view.unmount();
 }
});
it('uses only reviewed composites for all five cards, without generic-room hover alternates',()=>{
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 const cards=[...container.querySelectorAll('article')];expect(cards).toHaveLength(5);
 cards.forEach((card,index)=>expect(card.querySelector('.studio-edition-image>img')?.getAttribute('src')).toBe(`/studio-editions/exact-gallery/${studioEditions[index].artworkId}-1122.webp`));
 expect(container.querySelector('.studio-card-lifestyle')).toBeNull();
});
