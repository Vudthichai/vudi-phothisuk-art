// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct } from './studio/StudioStore';
import { StudioEditions } from './studio/StudioEditions';
import { studioGallery, studioPrimaryImage } from './studio/gallery';
import { studioEditions } from './studio/editions';
afterEach(cleanup);
const path='/studio-editions/approved/mother-nature-gallery-still-life-1122.webp';
it('uses the same exact approved photograph across size choices without generic Mother Nature mockups',()=>{
 const edition=studioEditions[0];
 expect(studioPrimaryImage(edition).variants.at(-1)?.src).toBe(path);
 expect(studioGallery(edition,'9x12')[0].image).toEqual(studioGallery(edition,'12x16')[0].image);
 const {container}=render(<MemoryRouter initialEntries={['/studio-editions/mother-nature/']}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
 expect(container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(path);
 fireEvent.click(screen.getByRole('radio',{name:'12 × 16 inches'}));
 expect(container.querySelector('.studio-product-image img')?.getAttribute('src')).toBe(path);
 expect(container.querySelector('.studio-gallery-caption')?.textContent).toBe('Gallery photograph');
 expect([...container.querySelectorAll('img')].some(i=>i.getAttribute('src')?.includes('/mockups/mother-nature-'))).toBe(false);
 expect(screen.getByText(/Starting at \$40/)).toBeTruthy();
});
it('uses the approved photo for the Mother Nature card and disables its old generic hover view',()=>{
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 const card=container.querySelector('article')!;
 expect(card.querySelector('.studio-edition-image>img')?.getAttribute('src')).toBe(path);
 expect(card.querySelector('.studio-card-lifestyle')).toBeNull();
 expect(container.querySelectorAll('.has-lifestyle')).toHaveLength(4);
});
