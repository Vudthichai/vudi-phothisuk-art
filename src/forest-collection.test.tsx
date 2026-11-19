import { AvailableArt } from './pages/AvailableArt';
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
  expect(screen.getByText('18 × 24 in.')).toBeDefined();
  expect(screen.getAllByText('Medium to be confirmed').length).toBeGreaterThan(0);
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
 expect(collection.artworks.find(a=>a.slug==='dragon-lily')).toMatchObject({
  dimensions: '18 × 24 in.', medium: null, copyStatus: 'provisional',
  availability: 'provisional', availabilityNote: 'Availability to be confirmed',
 });
});

it('shows the eight approved original prices and keeps personal works not for sale', () => {
  const approved = { 'Mother Nature': 6000, 'Dragon Lily': 3000, 'Ethereal Bloom': 7000,
    'Moss & Mushrooms': 5000, 'Blooming Desire': 4000, 'Wild Tiger Lilies': 4500,
    'A Forest Forgotten': 5000, 'Gilded Bloom': 3000 };
  expect(Object.values(approved).reduce((sum, price) => sum + price, 0)).toBe(37500);
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

it('uses the same original prices on Available Art without changing Studio prices', () => {
 const {container}=render(<MemoryRouter><AvailableArt/></MemoryRouter>);
 const cards=[...container.querySelectorAll('.available-forest-painting')];
 expect(cards).toHaveLength(8);
 expect(cards.map(card=>card.querySelector('h3')?.textContent)).toEqual(['Mother Nature','A Forest Forgotten','Wild Tiger Lilies','Ethereal Bloom','Gilded Bloom','Moss & Mushrooms','Blooming Desire','Dragon Lily']);
 for (const art of collection.artworks.filter(a=>a.availability!=='not-for-sale')) {
  const card=cards.find(c=>c.querySelector('h3')?.textContent===art.title)!;
  expect(card.querySelector('.forest-original-price')?.textContent).toBe('$'+art.priceUsd!.toLocaleString('en-US'));
  if (art.dimensions) expect(card.querySelector('.forest-original-price')?.previousElementSibling?.textContent).toBe(art.dimensions);
 }
 expect([...container.querySelectorAll('.studio-edition-card .studio-price')].map(p=>p.textContent)).toEqual(Array(5).fill('Starting at $45'));
});
