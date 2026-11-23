// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct } from './studio/StudioStore';
import { StudioEditions } from './studio/StudioEditions';
import { studioGallery, studioPrimaryImage } from './studio/gallery';
import { studioEditions } from './studio/editions';
afterEach(cleanup);
it('synchronizes both size selectors and each product room image while retaining authentic detail and selection',()=>{
 for(const edition of studioEditions){
  const path=`/studio-editions/exact-gallery/${edition.artworkId}-1122.webp`;
  expect(studioPrimaryImage(edition).variants.at(-1)?.src).toBe(path);
  expect(studioGallery(edition,'9x12')[0].image).not.toEqual(studioGallery(edition,'12x16')[0].image);
  const view=render(<MemoryRouter initialEntries={[`/studio-editions/${edition.artworkId}/`]}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
  const gallery=within(view.container.querySelector<HTMLFieldSetElement>('.studio-size-options-gallery')!);
  const details=within(view.container.querySelector<HTMLFieldSetElement>('.studio-size-options-details')!);
  const smallPath=`/studio-editions/size-gallery/${edition.artworkId}-9x12-1122.webp`;
  const assertSelection=(sizeId: string)=>{
   for(const selector of [gallery,details]){
    for(const radio of selector.getAllByRole('radio')){
     expect((radio as HTMLInputElement).checked).toBe((radio as HTMLInputElement).value===sizeId);
    }
   }
  };
  assertSelection('9x12');
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(smallPath);
  expect(view.container.querySelector('.studio-gallery-views button img')?.getAttribute('src')).toBe(smallPath);
  fireEvent.click(gallery.getByRole('radio',{name:'12 × 16 inches — $95'}));
  assertSelection('12x16');
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(path);
  expect(view.container.querySelector('.studio-gallery-views button img')?.getAttribute('src')).toBe(path);
  expect(studioGallery(edition,'12x16')[0].image).toBe(studioPrimaryImage(edition));
  expect(view.container.querySelector('.studio-gallery-caption')?.textContent).toBe('In a Space · 12 × 16 inches');
  expect([...view.container.querySelectorAll('img')].some(i=>i.getAttribute('src')?.includes('/mockups/'))).toBe(false);
  expect(view.container.querySelector('.studio-product-price')?.textContent).toContain('$95Selected size · Coming Soon');
  fireEvent.click(screen.getByRole('button',{name:'Artwork Detail'}));
  const detailPath=view.container.querySelector('.studio-product-image img')?.getAttribute('src');
  expect(detailPath).toContain(`/studio-editions/${edition.artworkId}-print-`);
  assertSelection('12x16');
  fireEvent.click(details.getByRole('radio',{name:'9 × 12 inches — $45'}));
  assertSelection('9x12');
  expect(view.container.querySelector('.studio-gallery-caption')?.textContent).toBe('Artwork Detail');
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(detailPath);
  expect(view.container.querySelector('.studio-gallery-views button img')?.getAttribute('src')).toBe(smallPath);
  expect(view.container.querySelector('.studio-product-price strong')?.textContent).toBe('$45');
  fireEvent.click(gallery.getByRole('radio',{name:'12 × 16 inches — $95'}));
  assertSelection('12x16');
  expect(view.container.querySelector('.studio-gallery-caption')?.textContent).toBe('Artwork Detail');
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(detailPath);
  expect(view.container.querySelector('.studio-gallery-views button img')?.getAttribute('src')).toBe(path);
  fireEvent.click(screen.getByRole('button',{name:'In a Space'}));
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(path);
  expect(view.container.querySelector('.studio-gallery-caption')?.textContent).toBe('In a Space · 12 × 16 inches');
  expect(view.container.querySelector('.studio-product-price strong')?.textContent).toBe('$95');
  assertSelection('12x16');
  fireEvent.click(details.getByRole('radio',{name:'9 × 12 inches — $45'}));
  assertSelection('9x12');
  expect(view.container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(smallPath);
  expect(view.container.querySelector('.studio-gallery-views button img')?.getAttribute('src')).toBe(smallPath);
  expect(view.container.querySelector('.studio-gallery-caption')?.textContent).toBe('In a Space · 9 × 12 inches');
  expect(view.container.querySelector('.studio-product-price strong')?.textContent).toBe('$45');
  view.unmount();
 }
});
it('uses only reviewed composites for all five cards, without generic-room hover alternates',()=>{
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 const cards=[...container.querySelectorAll('article')];expect(cards).toHaveLength(5);
 cards.forEach((card,index)=>expect(card.querySelector('.studio-edition-image>img')?.getAttribute('src')).toBe(`/studio-editions/exact-gallery/${studioEditions[index].artworkId}-1122.webp`));
 expect(container.querySelector('.studio-card-lifestyle')).toBeNull();
});
