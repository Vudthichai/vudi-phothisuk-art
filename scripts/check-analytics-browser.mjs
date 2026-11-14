// Intercept every request: production-origin simulation never contacts Google or the live site.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const production = process.argv.includes('--production');
const directory = resolve('dist');
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
let tagRequests = 0;
const errors = [];
const mockTag = `window.__gaCommands = (window.dataLayer || []).map(v => Array.from(v));
const push = window.dataLayer.push.bind(window.dataLayer);
window.dataLayer.push = function(...items) { window.__gaCommands.push(...items.map(v => Array.from(v))); return push(...items); };`;
async function context(saved = false, signal = false) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(({ saved, signal }) => {
    try { if (saved) localStorage.setItem('vpa.analytics-consent.v1', JSON.stringify({ choice: 'granted', time: Date.now() })); } catch { /* initial about:blank has no storage */ }
    if (signal) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
  }, { saved, signal });
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com') {
      assert.equal(url.pathname, '/gtag/js'); assert.equal(url.searchParams.get('id'), 'G-0S3J4CK8RP');
      tagRequests++; return route.fulfill({ contentType: 'application/javascript', body: mockTag });
    }
    assert(!/google-analytics|doubleclick/.test(url.hostname), 'Unexpected real analytics transport');
    assert(['vudiphothisukart.com', 'localhost', 'deploy-preview-60--vpa.netlify.app'].includes(url.hostname), `Unexpected external request: ${url.origin}`);
    let path = resolve(directory, '.' + decodeURIComponent(url.pathname));
    assert(path === directory || path.startsWith(directory + sep));
    try {
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'application/javascript' : path.endsWith('.css') ? 'text/css' : undefined;
      return route.fulfill({ path, ...(type ? { contentType: type } : {}) });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return ctx;
}
const ctx = await context(!production); const page = await ctx.newPage();
await page.goto('https://vudiphothisukart.com/collections/oceans/mermaid-tail/?email=private@example.com#secret', { waitUntil: 'networkidle' });
assert.equal(tagRequests, 0);
if (production) {
  if (process.env.ANALYTICS_SCREENSHOT) await page.screenshot({ path: process.env.ANALYTICS_SCREENSHOT });
  await page.getByRole('button', { name: 'Accept analytics' }).click();
  await page.waitForFunction(() => window.__gaCommands?.some(c => c[0] === 'event'));
  const commands = () => page.evaluate(() => window.__gaCommands);
  const count = async name => (await commands()).filter(c => c[0] === 'event' && c[1] === name).length;
  assert.equal(tagRequests, 1); assert.equal(await count('page_view'), 1); assert.equal(await count('artwork_view'), 1);
  assert(!JSON.stringify(await commands()).match(/private@example|secret|\?email/));
  await page.evaluate(() => window.addEventListener('click', e => { if (e.target.closest?.('a[href^="mailto:"]')) e.preventDefault(); }));
  await page.getByRole('link', { name: /Inquire about this artwork/ }).click();
  assert.equal(await count('artwork_inquiry_click'), 1); assert.equal(await count('purchase'), 0); assert.equal(await count('generate_lead'), 0);
  await page.getByRole('link', { name: /The Oceans/, exact: false }).filter({ hasText: '←' }).click();
  await page.waitForURL(url => url.pathname.replace(/\/$/, '') === '/collections/oceans');
  await page.waitForFunction(() => window.__gaCommands.filter(c => c[0] === 'event' && c[1] === 'collection_view').length === 1);
  assert.equal(await count('page_view'), 2);
  await page.goBack(); await page.waitForFunction(() => window.__gaCommands.filter(c => c[0] === 'event' && c[1] === 'page_view').length === 3);
  assert.equal(tagRequests, 1);
  await page.evaluate(() => { document.cookie = '_ga=simulated; Path=/; Secure'; document.cookie = '_ga_0S3J4CK8RP=simulated; Path=/; Secure'; });
  await page.getByRole('button', { name: 'Analytics preferences' }).click();
  await page.getByRole('button', { name: 'Decline analytics' }).click();
  assert.equal(await page.evaluate(() => window['ga-disable-G-0S3J4CK8RP']), true);
  assert(!await page.evaluate(() => document.cookie.includes('_ga')));
  const before = await count('page_view');
  await page.getByRole('link', { name: /The Oceans/, exact: false }).filter({ hasText: '←' }).click();
  assert.equal(await count('page_view'), before);
  await page.reload({ waitUntil: 'networkidle' }); assert.equal(tagRequests, 1);
  console.log('Production simulation: consent, exactly-once initial/SPA/back views, safe payloads, inquiry intent, cookie withdrawal and saved decline passed.');
} else {
  assert.equal(await page.getByRole('button', { name: 'Accept analytics' }).count(), 0);
  assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
  console.log('Nonproduction build stays off even when served at the production origin.');
}
await ctx.close();
for (const origin of ['http://localhost', 'https://deploy-preview-60--vpa.netlify.app']) {
  const off = await context(true); const p = await off.newPage(); const before = tagRequests;
  await p.goto(origin + '/', { waitUntil: 'networkidle' });
  assert.equal(tagRequests, before); assert.equal(await p.evaluate(() => typeof window.gtag), 'undefined'); await off.close();
}
const gpc = await context(true, true); const gpcPage = await gpc.newPage(); const before = tagRequests;
await gpcPage.goto('https://vudiphothisukart.com/', { waitUntil: 'networkidle' });
assert.equal(tagRequests, before); assert.equal(await gpcPage.evaluate(() => typeof window.gtag), 'undefined'); await gpc.close();
assert.deepEqual(errors, []); await browser.close();
console.log('Localhost, preview host, saved consent and GPC exclusions passed; all requests intercepted, no live GA hits.');
