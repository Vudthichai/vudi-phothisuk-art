import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { pages, metadata, incompleteArtwork } from '../.prerender/entry-server.js';
const site = 'https://vudiphothisukart.com';
const dom = html => new JSDOM(html).window.document;
const documentFor = async page => dom(await readFile(`dist${page.path === '/' ? '' : page.path.slice(0, -1)}/index.html`, 'utf8'));

test('every catalog route ships meaningful HTML, unique standard metadata, social tags and valid linked schema', async () => {
  assert.equal(pages.length, 35);
  const titles = new Set();
  const descriptions = new Set();
  for (const page of pages) {
    const doc = await documentFor(page);
    const meta = metadata(page.path);
    assert.equal(doc.title, page.title);
    assert(!titles.has(doc.title), `duplicate title: ${doc.title}`); titles.add(doc.title);
    assert.equal(doc.querySelector('meta[name="description"]').content, page.description);
    assert(!descriptions.has(page.description), `duplicate description: ${page.path}`); descriptions.add(page.description);
    assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(doc.querySelector('link[rel="canonical"]').href, site + page.path);
    assert.equal(doc.querySelector('meta[property="og:url"]').content, site + page.path);
    assert.equal(doc.querySelector('meta[property="og:image"]').content, meta.social.image);
    assert.equal(doc.querySelector('meta[name="twitter:card"]').content, 'summary_large_image');
    assert(doc.querySelector('#root main h1'), `missing heading: ${page.path}`);
    assert(doc.querySelector('#root main').textContent.length > 80, `empty page: ${page.path}`);
    const graph = JSON.parse(doc.querySelector('#page-schema').textContent)['@graph'];
    assert(graph.some(node => node['@type'] === 'Person'));
    const artwork = graph.find(node => node['@type'] === 'VisualArtwork');
    if (artwork) {
      assert(doc.querySelector('main').textContent.includes(artwork.name));
      assert(doc.querySelectorAll('main img[alt]').length > 0);
      assert.equal(artwork.creator['@id'], `${site}/#artist`);
      assert(!('offers' in artwork));
    }
    for (const image of doc.querySelectorAll('img[src]')) if (image.getAttribute('src').startsWith('/')) await access('dist' + image.getAttribute('src'));
    await access('dist' + new URL(meta.social.image).pathname);
  }
});

test('XML sitemap covers exactly the canonical routes and public artwork images', async () => {
  const xml = await readFile('dist/sitemap.xml', 'utf8');
  const doc = new JSDOM(xml, { contentType: 'application/xml' }).window.document;
  assert.equal(doc.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
  assert.deepEqual([...doc.querySelectorAll('url > loc')].map(n => n.textContent).sort(), pages.map(p => site + p.path).sort());
  for (const page of pages.filter(p => p.images.length)) {
    const url = [...doc.querySelectorAll('url')].find(n => n.firstElementChild.textContent === site + page.path);
    assert.equal(url.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1', 'image').length, new Set(page.images.map(i => i.src)).size);
  }
  assert(!xml.includes('404.html'));
});

test('crawler policy distinguishes search from training without blocking live artwork images', async () => {
  const robots = await readFile('dist/robots.txt', 'utf8');
  const groups = robots.split(/\n\s*\n/);
  for (const bot of ['OAI-SearchBot', 'Googlebot', 'bingbot', 'PerplexityBot', 'Claude-SearchBot']) assert(groups.find(g => g.includes(`User-agent: ${bot}\n`)).includes('Allow: /'));
  for (const bot of ['GPTBot', 'Google-Extended', 'ClaudeBot']) assert(groups.find(g => g.includes(`User-agent: ${bot}\n`)).match(/^Disallow: \/$/m));
  assert(robots.includes(`Sitemap: ${site}/sitemap.xml`));
  assert(!/^Disallow: \/forest-preview\/\s*$/m.test(robots));
});

test('legacy redirects use recorded source URLs and unknown routes have a noindex 404 document', async () => {
  const redirects = await readFile('dist/_redirects', 'utf8');
  for (const page of pages.filter(p => p.legacy)) assert(redirects.includes(`${page.legacy} ${page.path} 301!`));
  assert(redirects.endsWith('/* /404.html 404\n'));
  assert(!redirects.includes('/index.html 200'));
  const doc = dom(await readFile('dist/404.html', 'utf8'));
  assert.equal(doc.querySelector('meta[name="robots"]').content, 'noindex');
  assert.equal(doc.querySelector('link[rel="canonical"]'), null);
  assert(doc.querySelector('h1').textContent.includes('Page not found'));
});

test('exhibition dates/venue are accurate and incomplete catalog fields are omitted, not invented', () => {
  const event = metadata('/exhibitions/').graph.find(n => n['@type'] === 'ExhibitionEvent');
  assert.equal(event.startDate, '2026-12-05T16:00:00-05:00');
  assert.equal(event.endDate, '2026-12-05T19:00:00-05:00');
  assert.equal(event.location.address.streetAddress, '3706 Butler Street');
  const dragon = metadata('/collections/forest-and-flowers/dragon-lily/').graph[0];
  assert(!('artMedium' in dragon)); assert(!('size' in dragon)); assert(!('description' in dragon));
  assert(incompleteArtwork.some(w => w.includes('Dragon Lily')));
});
