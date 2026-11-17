// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct, StudioListing } from './studio/StudioStore';
import { studioEditions, studioSizes } from './studio/editions';
import { metadata } from './seo/catalog';
import { AvailableArt } from './pages/AvailableArt';
afterEach(cleanup);
it('serves all five distinct product pages with intended sizes and no checkout or final size prices', () => {
  for (const edition of studioEditions) {
    const view=render(<MemoryRouter initialEntries={[`/studio-editions/${edition.artworkId}/`]}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
    expect(screen.getByText(/Starting at \$40/)).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(studioSizes.every(s=>s.priceCents===null)).toBe(true);
    const larger=screen.getByRole('radio',{name:'12 × 16 inches'});
    fireEvent.click(larger);expect((larger as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('12 × 16 inches. Size-specific pricing to be confirmed.')).toBeTruthy();
    expect(screen.getByRole('link',{name:'View the original artwork'}).getAttribute('href')).toBe(`/collections/forest-and-flowers/${edition.artworkId}/`);
    expect(document.querySelector('input[type="email"],input[name="card"],a[href*="checkout"]')).toBeNull();
    expect(screen.queryByRole('button',{name:/buy|cart|checkout/i})).toBeNull();
    const meta=metadata(`/studio-editions/${edition.artworkId}/`);
    expect(meta.indexable).toBe(true);expect(meta.graph[0]['@type']).toBe('Product');expect(meta.graph[0]).not.toHaveProperty('offers');expect(meta.social).toBeTruthy();
    view.unmount();
  }
});
it('links listing cards to standalone products and rejects unknown products',()=>{
 const view=render(<MemoryRouter><StudioListing/></MemoryRouter>);
 expect(screen.getAllByRole('article')).toHaveLength(5);
 screen.getAllByRole('article').forEach(card=>expect(card.querySelector('a')?.getAttribute('href')).toMatch(/^\/studio-editions\/[^/]+\/$/));view.unmount();
 render(<MemoryRouter initialEntries={['/studio-editions/missing/']}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Page not found.'})).toBeTruthy();
});
it('places inquiry-only Forest originals and Studio Editions before earlier collections without changing inventory',()=>{
 const {container}=render(<MemoryRouter><AvailableArt/></MemoryRouter>);
 const groups=[...container.querySelector('.available-art')!.children].filter(n=>n.tagName==='SECTION');
 expect(groups.map(n=>n.querySelector('h2')?.textContent)).toEqual(['Forest & Flowers — Original Artworks','Forest & Flowers — Studio Editions','The Oceans Collection','The Regal Collection']);
 expect(container.querySelectorAll('.available-painting')).toHaveLength(6);
 expect(container.querySelectorAll('.available-forest-painting')).toHaveLength(8);
 expect(container.querySelector('.available-forest-originals')?.textContent).toContain('availability by inquiry');
});
