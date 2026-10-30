// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtworkPage, CollectionPage } from './pages/Pages';
import { findCollection } from './data';
afterEach(cleanup);
it('presents all five Regal works with working collection-scoped links', () => {
  render(<MemoryRouter initialEntries={['/collections/regal-collection']}><Routes><Route path="/collections/:slug" element={<CollectionPage/>}/></Routes></MemoryRouter>);
  expect(screen.getByRole('heading', {level:1}).textContent).toBe('The RegalCollection.');
  for (const art of findCollection('regal-collection')!.artworks) expect(screen.getByRole('link',{name:`View ${art.title}`}).getAttribute('href')).toBe(`/collections/regal-collection/${art.slug}`);
  expect(screen.getAllByText('Sold')).toHaveLength(2);
  expect(screen.queryByRole('navigation',{name:'Paintings in the Regal Collection'})).toBeNull();
});
it('opens every Regal detail with an authentic close-up and correct neighboring works', () => {
  const arts=findCollection('regal-collection')!.artworks;
  for (const [i,art] of arts.entries()) {
    const view=render(<MemoryRouter initialEntries={[`/collections/regal-collection/${art.slug}`]}><Routes><Route path="/collections/:slug/:artworkSlug" element={<ArtworkPage/>}/></Routes></MemoryRouter>);
    expect(screen.getByRole('heading',{level:1}).textContent).toBe(art.title);
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByRole('region',{name:`${art.title} texture detail`})).toBeTruthy();
    if(i>0)expect(screen.getByRole('link',{name:`Previous painting: ${arts[i-1].title}`})).toBeTruthy();
    if(i<arts.length-1)expect(screen.getByRole('link',{name:`Next painting: ${arts[i+1].title}`})).toBeTruthy();
    expect(view.container.querySelector('.curated-room-scene')).toBeTruthy();
    expect(view.container.querySelector('.curated-room-art')?.getAttribute('src')).toBe(art.image.src);
    view.unmount();
  }
});
