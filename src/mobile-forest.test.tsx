// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MotherNature } from './components/MotherNature';
import { RegalPreview } from './components/RegalPreview';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mobile(reduced = false) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({matches: query.includes('max-width') || reduced,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
}
it.each(['/', '/collections/forest-and-flowers', '/collections/oceans', '/about'])('restricts menu decoration to botanical pages and makes a closed mobile menu inert: %s', async path => {
  mobile(); const user = userEvent.setup();
  const { container } = render(<MemoryRouter initialEntries={[path]}><Layout/></MemoryRouter>);
  const menu = screen.getByRole('button', {name:/Menu/});
  expect(container.querySelector('.nav-panel')?.hasAttribute('inert')).toBe(true);
  expect(screen.queryByRole('navigation', {name:'Main navigation'})).toBeNull();
  menu.focus(); await user.keyboard('{Enter}');
  expect(menu.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('.nav-panel')?.hasAttribute('inert')).toBe(false);
  expect(Boolean(container.querySelector('.forest-drift'))).toBe(path==='/' || path==='/collections/forest-and-flowers');
  await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button', {name:'Collections'}));
  await user.keyboard('{Enter}');
  await user.keyboard('{Escape}');
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(menu);
  expect(container.querySelector('.forest-drift')).toBeNull();
});
it('dismisses mobile navigation and focuses the destination when a link is chosen', async () => {
  mobile(); const user = userEvent.setup();
  const { container } = render(<MemoryRouter><Routes><Route element={<Layout/>}><Route index element={<h1>Home</h1>}/><Route path="about" element={<h1>About</h1>}/></Route></Routes></MemoryRouter>);
  await user.click(screen.getByRole('button', {name:/Menu/}));
  await user.click(within(screen.getByRole('navigation', {name:'Main navigation'})).getByRole('link', {name:'About'}));
  expect(screen.getByRole('heading', {level:1}).textContent).toBe('About');
  expect(container.querySelector('.nav-panel')?.hasAttribute('inert')).toBe(true);
  expect(document.activeElement?.id).toBe('main');
});
it('keeps the detail visible while the full photograph loads and supports reversing the reveal immediately', async () => {
  const user = userEvent.setup(); const { container } = render(<MotherNature/>);
  expect(screen.getByText('Mother Nature — Detail')).toBeTruthy();
  await user.click(screen.getByRole('button', {name:'View full painting'}));
  expect(container.querySelector('.mother-nature-view')?.getAttribute('aria-busy')).toBe('true');
  expect(screen.getByAltText(/Detail of Mother Nature/)).toBeTruthy();
  await user.click(screen.getByRole('button', {name:'Return to detail'}));
  fireEvent.load(container.querySelector('.mother-nature-full')!);
  expect(screen.queryByAltText(/Mother Nature, complete painting/)).toBeNull();
  await user.click(screen.getByRole('button', {name:'View full painting'}));
  expect(screen.getByAltText(/Mother Nature, complete painting/)).toBeTruthy();
  expect(container.querySelector('.mother-nature-view')?.classList.contains('is-whole')).toBe(true);
  await user.click(screen.getByRole('button', {name:'Return to detail'}));
  expect(screen.getByText('Mother Nature — Detail')).toBeTruthy();
  expect(container.querySelector('.mother-nature-view')?.classList.contains('is-whole')).toBe(false);
});
it.each([false,true])('keeps all three Regal links and supports keyboard scrolling with reduced motion=%s', async reduced => {
  mobile(reduced); const user = userEvent.setup();
  render(<MemoryRouter><RegalPreview/></MemoryRouter>);
  const gallery=screen.getByRole('region', {name:'Regal paintings'});
  Object.defineProperty(gallery, 'clientWidth', {value:300});
  const scroll=vi.fn(); gallery.scrollBy=scroll;
  expect(within(gallery).getAllByRole('link').map(a=>a.getAttribute('href'))).toEqual(['/collections/regal-collection/navy','/collections/regal-collection/carnations','/collections/regal-collection/sahara']);
  gallery.focus(); await user.keyboard('{ArrowRight}');
  expect(scroll).toHaveBeenLastCalledWith({left:258,behavior:reduced?'auto':'smooth'});
  await user.keyboard('{ArrowLeft}');
  expect(scroll).toHaveBeenLastCalledWith({left:-258,behavior:reduced?'auto':'smooth'});
  within(gallery).getByRole('link', {name:/ Navy$/}).focus(); await user.keyboard('{ArrowRight}');
  expect(scroll).toHaveBeenCalledTimes(2);
});

it('dismisses on outside pointer interaction without cancelling the painting reveal', async () => {
  mobile(); const user = userEvent.setup();
  const { container } = render(<MemoryRouter><Routes><Route element={<Layout/>}><Route index element={<MotherNature/>}/></Route></Routes></MemoryRouter>);
  fireEvent.load(container.querySelector('.mother-nature-full')!);
  const menu = screen.getByRole('button', {name:/Menu/});
  await user.click(menu);
  const painting = screen.getByRole('button', {name:'View Mother Nature, complete painting'});
  const pointer = new MouseEvent('pointerdown', {bubbles:true,cancelable:true});
  fireEvent(painting, pointer);
  expect(pointer.defaultPrevented).toBe(false);
  await user.click(painting);
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByAltText(/Mother Nature, complete painting/)).toBeTruthy();
  expect(painting.getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('.nav-panel')?.hasAttribute('inert')).toBe(true);
});
it('dismisses on outside keyboard activation, noninteractive taps, and a second Menu press', async () => {
  mobile(); const user = userEvent.setup();
  render(<MemoryRouter><Routes><Route element={<Layout/>}><Route index element={<><MotherNature/><p>Outside the menu</p></>}/></Route></Routes></MemoryRouter>);
  const menu = screen.getByRole('button', {name:/Menu/});
  await user.click(menu);
  const view = screen.getByRole('button', {name:'View full painting'});
  view.focus(); await user.keyboard('{Enter}');
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(view.getAttribute('aria-pressed')).toBe('true');
  await user.click(menu); await user.click(screen.getByText('Outside the menu'));
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  await user.click(menu); expect(menu.getAttribute('aria-expanded')).toBe('true');
  await user.click(menu); expect(menu.getAttribute('aria-expanded')).toBe('false');
});
it('dismisses when the current navigation destination is selected', async () => {
  mobile(); const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/about']}><Routes><Route element={<Layout/>}><Route path="about" element={<h1>About</h1>}/></Route></Routes></MemoryRouter>);
  const menu = screen.getByRole('button', {name:/Menu/}); await user.click(menu);
  await user.click(within(screen.getByRole('navigation', {name:'Main navigation'})).getByRole('link', {name:'About'}));
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement?.id).toBe('main');
});
it('uses exactly three leaf and two petal cutouts with empty alt text in a hidden decorative layer', () => {
  mobile(); const { container }=render(<MotherNature/>);
  fireEvent.load(container.querySelector('.mother-nature-full')!);
  fireEvent.click(screen.getByRole('button', {name:'View full painting'}));
  const layer=container.querySelector('.forest-drift')!;
  expect(layer.getAttribute('aria-hidden')).toBe('true');
  expect(layer.querySelectorAll('.forest-leaf')).toHaveLength(3);
  expect(layer.querySelectorAll('.forest-petal')).toHaveLength(2);
  for(const image of layer.querySelectorAll('img')){expect(image.getAttribute('alt')).toBe('');expect(image.getAttribute('src')).toMatch(/^\/botanical\/.+\.webp$/);expect(image.getAttribute('draggable')).toBe('false');}
});
