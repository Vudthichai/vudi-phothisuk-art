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
  expect(screen.getByRole('heading', { level: 1, name: 'Forest & Flowers' })).toBeDefined();
  expect(screen.getAllByRole('article')).toHaveLength(10);
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
 expect(collection.artworks.slice(1).map(art => art.images.filter(image => image.role === 'detail').length)).toEqual([3, 7, 2, 4, 5, 4, 8, 5, 3]);
 expect(collection.artworks.filter(a=>a.availability==='not-for-sale').map(a=>a.title)).toEqual(['Tiger Lily','75 Leaves']);
 expect(collection.artworks.filter(a=>a.availability==='provisional')).toHaveLength(8);
 expect(collection.artworks.find(a=>a.slug==='dragon-lily')?.dimensions).toBeNull();
});
