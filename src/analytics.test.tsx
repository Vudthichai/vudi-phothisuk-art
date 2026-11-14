// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Link } from 'react-router-dom';
const policy = vi.hoisted(() => ({ eligible: true, signal: false }));
vi.mock('./analytics/config', async importOriginal => ({
  ...await importOriginal<typeof import('./analytics/config')>(),
  productionEligible: () => policy.eligible, privacySignal: () => policy.signal,
}));
async function setup(path = '/collections/oceans/mermaid-tail/') {
  const { Analytics } = await import('./analytics/Analytics');
  return render(<StrictMode><MemoryRouter initialEntries={[path]}><Analytics/>
    <Link to="/collections/oceans/">Collection</Link><Link to="/collections/oceans/mermaid-tail/">Artwork</Link>
    <Link to="/exhibitions/">Exhibition</Link><Link to="/exhibitions/?email=private@example.com#secret">Query only</Link>
    <a href="mailto:test@example.com?body=private" data-analytics-artwork="/collections/oceans/mermaid-tail">Inquire</a>
  </MemoryRouter></StrictMode>);
}
const commands = () => (window.dataLayer ?? []).map(args => Array.from(args));
const events = (name: string) => commands().filter(args => args[0] === 'event' && args[1] === name);
beforeEach(() => {
  vi.resetModules(); policy.eligible = true; policy.signal = false;
  localStorage.clear(); document.head.innerHTML = ''; window.dataLayer = undefined; window.gtag = undefined;
  window.addEventListener('click', preventNavigation);
});
const preventNavigation = (event: Event) => event.preventDefault();
afterEach(() => { cleanup(); window.removeEventListener('click', preventNavigation); vi.restoreAllMocks(); });

it('makes no Google requests/commands until acceptance; StrictMode emits one initial view', async () => {
  await setup('/collections/oceans/mermaid-tail/?email=private@example.com#secret');
  expect(document.getElementById('vpa-google-tag')).toBeNull(); expect(window.dataLayer).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
  await waitFor(() => expect(events('page_view')).toHaveLength(1));
  expect(events('artwork_view')).toHaveLength(1);
  expect(document.querySelectorAll('#vpa-google-tag')).toHaveLength(1);
  const config = commands().find(args => args[0] === 'config')!;
  expect(config[1]).toBe('G-0S3J4CK8RP'); expect(config[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  expect(JSON.stringify(commands())).not.toMatch(/private|secret|\?email/);
});
it('tracks one view per real route transition, including returns, while ignoring query/hash changes', async () => {
  await setup(); fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
  fireEvent.click(screen.getByText('Collection')); fireEvent.click(screen.getByText('Artwork'));
  fireEvent.click(screen.getByText('Exhibition')); fireEvent.click(screen.getByText('Query only'));
  expect(events('page_view')).toHaveLength(4); expect(events('collection_view')).toHaveLength(1);
  expect(events('artwork_view')).toHaveLength(2); expect(events('exhibition_interest')).toHaveLength(1);
  expect(JSON.stringify(commands())).not.toMatch(/private|secret/);
});
it('inquiry clicks contain catalog IDs only and are never leads or sales; withdrawal stops tracking', async () => {
  await setup(); fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
  fireEvent.load(document.getElementById('vpa-google-tag')!);
  const link = screen.getByText('Inquire');
  // Do not follow a mailto in the test; the document listener observes the click.
  fireEvent.click(link);
  expect(events('artwork_inquiry_click')).toHaveLength(1);
  expect(JSON.stringify(events('artwork_inquiry_click'))).not.toMatch(/mailto|test@example|body|private/);
  expect(events('purchase')).toHaveLength(0); expect(events('generate_lead')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Analytics preferences' }));
  fireEvent.click(screen.getByRole('button', { name: 'Decline analytics' }));
  const count = events('page_view').length; fireEvent.click(screen.getByText('Collection')); fireEvent.click(link);
  expect(events('page_view')).toHaveLength(count); expect(events('artwork_inquiry_click')).toHaveLength(1);
  expect(window['ga-disable-G-0S3J4CK8RP']).toBe(true);
});
it('never loads tracking on local/preview builds even with saved consent', async () => {
  policy.eligible = false;
  localStorage.setItem('vpa.analytics-consent.v1', JSON.stringify({ choice: 'granted', time: Date.now() }));
  await setup(); expect(screen.queryByText('Accept analytics')).toBeNull(); expect(window.dataLayer).toBeUndefined();
  expect(document.getElementById('vpa-google-tag')).toBeNull();
});
it('respects browser privacy signals and does not expose an accept action', async () => {
  policy.signal = true; await setup();
  expect(screen.queryByText('Accept analytics')).toBeNull(); expect(window.dataLayer).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Analytics preferences' }));
  expect(screen.getByText(/privacy signal is respected/)).toBeTruthy();
});
it('ignores unknown paths and expired consent', async () => {
  localStorage.setItem('vpa.analytics-consent.v1', JSON.stringify({ choice: 'granted', time: 1 }));
  await setup('/private@example.com'); fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
  expect(events('page_view')).toHaveLength(0); expect(document.getElementById('vpa-google-tag')).toBeNull();
  expect(window.dataLayer).toBeUndefined();
});

it('restores accepted consent once and handles unavailable storage without blocking the site', async () => {
  localStorage.setItem('vpa.analytics-consent.v1', JSON.stringify({ choice: 'granted', time: Date.now() }));
  await setup();
  await waitFor(() => expect(events('page_view')).toHaveLength(1));
  expect(screen.queryByText('Accept analytics')).toBeNull();
});
it('keeps a session choice when consent storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
  await setup();
  expect(document.getElementById('vpa-google-tag')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
  await waitFor(() => expect(events('page_view')).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: 'Analytics preferences' }));
  fireEvent.click(screen.getByRole('button', { name: 'Decline analytics' }));
  expect(window['ga-disable-G-0S3J4CK8RP']).toBe(true);
});
