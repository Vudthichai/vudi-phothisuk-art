// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { collections, findCollection } from './data';
import { InformationPage, ArtworkPage } from './pages/Pages';
import { Layout } from './components/Layout';
afterEach(cleanup);
const expected = ['The Oceans', 'Mermaid Tail', 'Beach Day', 'Arctic Waves', 'Water’s Edge', 'Arctic Ocean', 'Sahara'];
it('lists exactly the seven confirmed available paintings with dimensions, detail paths and inquiry subjects', () => {
  render(<MemoryRouter><InformationPage page="available-art"/></MemoryRouter>);
  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(7);
  expect(cards.map(card => within(card).getByRole('heading').textContent).sort()).toEqual([...expected].sort());
  for (const collection of collections) for (const artwork of collection.artworks) {
    if (artwork.availability !== 'available') {
      expect(screen.queryByRole('link', {name: `View ${artwork.title}`})).toBeNull();
      continue;
    }
    expect(screen.getByRole('link', {name: `View ${artwork.title}`}).getAttribute('href')).toBe(`/collections/${collection.slug}/${artwork.slug}`);
    const card = screen.getByRole('heading', {name: artwork.title}).closest('article')!;
    expect(within(card).getByText(artwork.dimensions!)).toBeTruthy();
    expect(within(card).getByText(collection.name, {selector: '.eyebrow'})).toBeTruthy();
    expect(within(card).getByRole('link', {name: `Inquire about ${artwork.title}`}).getAttribute('href')).toBe(`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent(`Artwork inquiry: ${artwork.title}`)}`);
  }
  expect(document.body.textContent).not.toMatch(/\$|USD|Sold/);
});
it('uses live availability data and preserves newly sold artwork detail pages without inquiry actions', () => {
  const sahara = findCollection('regal-collection')!.artworks.find(a => a.slug === 'sahara')!;
  const previous = sahara.availability;
  try {
    sahara.availability = 'sold';
    const view = render(<MemoryRouter><InformationPage page="available-art"/></MemoryRouter>);
    expect(screen.queryByRole('link', {name: 'View Sahara'})).toBeNull();
    view.unmount();
  } finally { sahara.availability = previous; }
  for (const [collection, slug] of [['oceans', 'golden-sand-beach'], ['regal-collection', 'verdant'], ['regal-collection', 'ciaran'], ['regal-collection', 'navy']]) {
    expect(findCollection(collection)!.artworks.find(a => a.slug === slug)!.availability).toBe('sold');
    const view = render(<MemoryRouter initialEntries={[`/collections/${collection}/${slug}`]}><Routes><Route path="/collections/:slug/:artworkSlug" element={<ArtworkPage/>}/></Routes></MemoryRouter>);
    expect(screen.getByText('Sold')).toBeTruthy();
    expect(screen.queryByRole('link', {name: /Inquire about/})).toBeNull();
    expect(screen.getByRole('heading', {level: 1})).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\$|USD/);
    view.unmount();
  }
});
it('opens Collections by keyboard, marks the selected collection and restores focus on Escape', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/collections/oceans']}><Layout/></MemoryRouter>);
  const trigger = screen.getByRole('button', {name:'Collections'});
  trigger.focus(); await user.keyboard('{Enter}');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  const oceans = screen.getByRole('link', {name:'The Oceans'});
  expect(oceans.getAttribute('aria-current')).toBe('page');
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('link', {name:/Forest & Flowers/}));
  await user.keyboard('{Escape}');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
});

it('places the five Oceans portraits before the horizontal feature and Sahara in the Regal section', () => {
  const { container } = render(<MemoryRouter><InformationPage page="available-art"/></MemoryRouter>);
  const sections = container.querySelectorAll('.available-collection');
  expect(sections).toHaveLength(2);
  expect([...sections[0].querySelectorAll('h3')].map(h => h.textContent)).toEqual(['Mermaid Tail', 'Beach Day', 'Arctic Waves', 'Water’s Edge', 'Arctic Ocean', 'The Oceans']);
  expect(sections[0].querySelector('.available-grid .available-featured')).toBeNull();
  expect(sections[0].querySelector('.available-featured h3')?.textContent).toBe('The Oceans');
  expect([...sections[1].querySelectorAll('h3')].map(h => h.textContent)).toEqual(['Sahara']);
  expect(findCollection('regal-collection')!.artworks.filter(a => a.availability === 'available').map(a => a.title)).toEqual(['Sahara']);
});
