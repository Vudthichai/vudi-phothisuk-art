// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CollectionPage, Home } from './pages/Pages';
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
