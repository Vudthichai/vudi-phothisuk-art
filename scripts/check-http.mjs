// Run after build against local Netlify Dev or a separately approved hosted preview.
// This script makes GET requests only; it never deploys or submits URLs for indexing.
import assert from 'node:assert/strict';
import { pages } from '../.prerender/entry-server.js';
const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/check-http.mjs http://localhost:8888');
const get = path => fetch(new URL(path, base), { redirect: 'manual' });
for (const page of pages) {
  const response = await get(page.path);
  assert.equal(response.status, 200, page.path);
  const html = await response.text();
  assert(html.includes(`rel="canonical" href="https://vudiphothisukart.com${page.path}"`), page.path);
  // Local Netlify Dev may serve slashless directory requests directly; both
  // forms must converge on the same canonical without a redirect cycle.
  if (page.path !== '/') {
    const slashless = await fetch(new URL(page.path.slice(0, -1), base));
    assert.equal(slashless.status, 200, page.path);
    assert((await slashless.text()).includes(`rel="canonical" href="https://vudiphothisukart.com${page.path}"`));
  }
  if (page.legacy) for (const alias of [page.legacy, page.legacy + '/']) {
    const legacy = await get(alias);
    assert.equal(legacy.status, 301, alias);
    assert.equal(new URL(legacy.headers.get('location'), base).pathname, page.path, alias);
    assert.equal((await fetch(new URL(alias, base))).status, 200, alias);
  }
}
for (const path of ['/unknown-seo-check', '/unknown-seo-check/deep/path', '/missing-seo-image.webp']) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  const html = await response.text();
  assert(html.includes('content="noindex"'));
  assert(!html.includes('rel="canonical"'));
}
for (const [path, type] of [['/sitemap.xml', 'xml'], ['/robots.txt', 'text/plain']]) {
  const response = await get(path);
  assert.equal(response.status, 200);
  assert(response.headers.get('content-type').includes(type));
}
console.log(`HTTP checks passed: ${pages.length} public routes, slash variants, 32 legacy aliases, 3 unknown URLs, sitemap and robots.`);
