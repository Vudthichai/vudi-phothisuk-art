// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ArtworkPage, CollectionPage, Home } from './pages/Pages';
import { Gallery } from './components/Gallery';
afterEach(cleanup);
describe('portfolio foundation', () => {
  it('renders a directly opened collection and updates metadata', async () => {
    document.head.innerHTML = '<meta name="description" content="">';
    render(<MemoryRouter initialEntries={['/collections/forest-and-flowers']}><Routes><Route path="collections/:slug" element={<CollectionPage/>}/></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Forest & Flowers');
    expect(screen.getByText(/No artwork is shown/)).toBeTruthy();
    await waitFor(() => expect(document.title).toBe('Forest & Flowers | Vudi Phothisuk Art'));
  });
  it('handles an unknown collection without inventing content', () => {
    render(<MemoryRouter initialEntries={['/collections/unknown']}><Routes><Route path="collections/:slug" element={<CollectionPage/>}/></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found.');
  });
  it('exposes accessible mobile navigation and a working featured link', async () => {
    window.scrollTo = () => {};
    const user = userEvent.setup();
    render(<MemoryRouter><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="collections/:slug" element={<CollectionPage/>}/></Route></Routes></MemoryRouter>);
    const menu = screen.getByRole('button', { name: /Menu/ });
    await user.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    await user.click(screen.getByRole('link', { name: /Explore Forest/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Forest & Flowers');
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement?.id).toBe('main');
  });
  it('preserves supplied artwork text and reserves image space', () => {
    render(<Gallery artworks={[{ id: 'fixture', title: 'Test fixture only', image: { src: '/fixture.webp', alt: 'Test image', width: 800, height: 1000 } }]}/>);
    const image = screen.getByRole('img');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('width')).toBe('800');
    expect(screen.getByText('Test fixture only')).toBeTruthy();
  });
});

describe('The Oceans portfolio', () => {
  function openOceans(path = '/collections/oceans') {
    return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="collections/:slug" element={<CollectionPage/>}/><Route path="collections/:slug/:artworkSlug" element={<ArtworkPage/>}/></Routes></MemoryRouter>);
  }
  it('opens a painting from the gallery and shows its approved narrative', async () => {
    const user = userEvent.setup();
    openOceans();
    expect(screen.getAllByRole('img')).toHaveLength(11);
    await user.click(screen.getByRole('link', { name: 'View Manta' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Manta');
    expect(screen.getByText(/A spotted ray glides/)).toBeTruthy();
    expect(screen.getByText('Sold')).toBeTruthy();
    expect(screen.queryByText('Inquire about this artwork →')).toBeNull();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Details' })).toBeNull();
  });
  it('loads a direct artwork URL and distinguishes illustrative room views', () => {
    openOceans('/collections/oceans/golden-sand-beach');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Golden Sand Beach');
    expect(screen.getByText(/Room study · illustrative scale/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'In a room' })).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Inquire about/ }).getAttribute('href')).toContain('Golden%20Sand%20Beach');
    expect(screen.queryByText('Available')).toBeNull();
    expect(screen.getAllByRole('img')[0].getAttribute('fetchpriority')).toBe('high');
  });
  it('does not confuse an artwork with the identically named collection', () => {
    openOceans('/collections/oceans/the-oceans');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The Oceans');
    expect(screen.getByText(/A wide shoreline unfolds/)).toBeTruthy();
  });
  it('keeps previous and next navigation in exhibition order and marks Dark Scales sold', async () => {
    const user = userEvent.setup();
    openOceans('/collections/oceans/dark-scales');
    expect(screen.getByText('Sold')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Inquire about/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Previous painting: Manta/ }).getAttribute('href')).toBe('/collections/oceans/manta');
    await user.click(screen.getByRole('link', { name: /Next painting.*Mermaid Tail/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mermaid Tail');
  });
  it('has no previous link on the first painting and no next link on the last', () => {
    const first = openOceans('/collections/oceans/the-oceans');
    expect(screen.queryByRole('link', { name: /Previous painting/ })).toBeNull();
    first.unmount();
    openOceans('/collections/oceans/arctic-ocean');
    expect(screen.queryByRole('link', { name: /Next painting/ })).toBeNull();
  });
  it('uses the selected Beach Day photo in both its hero and room study without repainting it', () => {
    const { container } = openOceans('/collections/oceans/beach-day');
    const hero = container.querySelector('.artwork-primary')!;
    const staged = container.querySelector('.beach-room-art')!;
    expect(hero.getAttribute('src')).toContain('beach-day-artist-selection');
    expect(staged.getAttribute('src')).toBe(hero.getAttribute('src'));
    expect(screen.queryByRole('region', { name: 'Details' })).toBeNull();
    expect(screen.getByText('Room study · illustrative scale')).toBeTruthy();
  });
  it('shows not-found for a painting outside its collection', () => {
    openOceans('/collections/regal-collection/manta');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found.');
  });
  it('presents the artist-selected Mermaid Tail photograph without weak supplementary shots', () => {
    openOceans('/collections/oceans/mermaid-tail');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img').getAttribute('src')).toContain('artist-selection');
    expect(screen.queryByRole('region', { name: 'Details' })).toBeNull();
  });
});
