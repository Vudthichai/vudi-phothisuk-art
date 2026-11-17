// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForestCollection } from './forest/ForestCollection';
import collection from '../public/forest-preview/collection.json';

const base = '/collections/forest-and-flowers';
function page(path = base) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path={base} element={<ForestCollection/>}/>
    <Route path={`${base}/:artworkSlug`} element={<ForestCollection/>}/>
  </Routes></MemoryRouter>);
}

afterEach(cleanup);

it('shows all ten public artwork links without a preview entrance', () => {
  page();
  expect(screen.getByRole('heading', { level: 1, name: 'Forest & Flowers.' })).toBeDefined();
  expect(document.querySelectorAll('.forest-exhibit')).toHaveLength(10);
  expect(screen.queryByLabelText('Password')).toBeNull();
  expect(document.querySelector('meta[name="robots"]')).toBeNull();
});

it('opens an artwork directly without a stored session', () => {
  sessionStorage.clear();
  page(`${base}/dragon-lily`);
  expect(screen.getByRole('heading', { level: 1, name: 'Dragon Lily' })).toBeDefined();
  expect(screen.getByRole('link', { name: 'Inquire About This Artwork' }).getAttribute('href')).toContain('Dragon%20Lily');
  expect(screen.getByText(/Provisional description/)).toBeDefined();
});

it('offers a return link when the artwork slug is unknown', () => {
  page(`${base}/unknown`);
  expect(screen.getByRole('heading', { name: 'Painting not found' })).toBeDefined();
  expect(screen.getByRole('link', { name: 'View the collection' }).getAttribute('href')).toBe(base);
});

it('preserves ten originals, two not-for-sale exceptions and the approved photography selection',()=>{
 expect(collection.artworks).toHaveLength(10);
 const temporary = collection.artworks.flatMap(art => art.images.filter(image => 'temporary' in image && image.temporary));
 expect(temporary).toHaveLength(0);
 expect(collection.artworks.slice(1).map(art => art.images.filter(image => image.role === 'detail').length)).toEqual([2, 2, 2, 2, 2, 2, 3, 2, 2]);
 expect(collection.artworks.filter(a=>a.availability==='not-for-sale').map(a=>a.title)).toEqual(['Tiger Lily','75 Leaves']);
 expect(collection.artworks.filter(a=>a.availability==='provisional')).toHaveLength(8);
 expect(collection.artworks.find(a=>a.slug==='dragon-lily')?.dimensions).toBeNull();
});

it('shows the eight approved original prices and keeps personal works not for sale', () => {
  const approved = { 'Mother Nature': 5000, 'Dragon Lily': 1200, 'Ethereal Bloom': 7000,
    'Moss & Mushrooms': 6000, 'Blooming Desire': 3000, 'Wild Tiger Lilies': 4000,
    'A Forest Forgotten': 4500, 'Gilded Bloom': 2500 };
  page();
  expect(document.querySelectorAll('.forest-original-price')).toHaveLength(8);
  for (const [title, price] of Object.entries(approved)) {
    const art = collection.artworks.find(a => a.title === title)!;
    expect('priceUsd' in art && art.priceUsd).toBe(price);
    const card = screen.getByRole('heading', { name: title, level: 2 }).closest('article')!;
    expect(card.querySelector('.forest-original-price')?.textContent).toBe('$' + price.toLocaleString('en-US'));
    cleanup();
    page(`${base}/${art.slug}`);
    expect(document.querySelector('.forest-original-price')?.textContent).toBe('$' + price.toLocaleString('en-US'));
    cleanup();
    page();
  }
  for (const title of ['Tiger Lily', '75 Leaves']) {
    const card = screen.getByRole('heading', { name: title, level: 2 }).closest('article')!;
    expect(card.querySelector('.forest-original-price')).toBeNull();
    expect(card.textContent).toContain('Not for Sale');
  }
});
