// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function openPage() {
  return render(<MemoryRouter initialEntries={['/available-art']}><Routes><Route element={<Layout/>}>{['collections','available-art','about','exhibitions','contact'].map(path => <Route key={path} path={path} element={<h1>{path}</h1>}/>)}</Route></Routes></MemoryRouter>);
}
it('navigates to each site section from the shared footer', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const user = userEvent.setup(); openPage();
  const footer = screen.getByRole('contentinfo');
  expect(within(footer).getByText('Vudi Phothisuk Art')).toBeTruthy();
  expect(within(footer).getByText('Make some art today.')).toBeTruthy();
  const nav = within(footer).getByRole('navigation', {name:'Footer navigation'});
  for (const [label,path] of [['Collections','collections'],['Available Art','available-art'],['About','about'],['Exhibitions','exhibitions'],['Contact','contact']]) {
    await user.click(within(nav).getByRole('link', {name:label}));
    expect(screen.getByRole('heading', {level:1}).textContent).toBe(path);
  }
});
it.each([false,true])('returns to the current page header by keyboard and click (reduced motion: %s)', async reduced => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({matches:reduced})));
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const user = userEvent.setup(); openPage();
  const link = screen.getByRole('link', {name:'Back to top'});
  link.focus(); await user.keyboard('{Enter}');
  expect(scroll).toHaveBeenLastCalledWith({top:0,behavior:reduced?'auto':'smooth'});
  expect(document.activeElement?.id).toBe('page-top');
  await user.click(link);
  expect(scroll).toHaveBeenCalledTimes(2);
  expect(document.activeElement?.id).toBe('page-top');
  expect(screen.getByRole('heading', {level:1}).textContent).toBe('available-art');
});
