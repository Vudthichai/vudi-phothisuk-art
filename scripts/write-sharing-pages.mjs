import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { render, pages, metadata, incompleteArtwork } from '../.prerender/entry-server.js';

const site = 'https://vudiphothisukart.com';
const template = await readFile('dist/index.html', 'utf8');
if (!template.includes('<div id="root"></div>')) throw new Error('Static generation requires a fresh Vite build. Run npm run build.');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const tag = (attr, key, value) => `<meta ${attr}="${key}" content="${escape(value)}">`;
const json = data => JSON.stringify(data).replaceAll('<', '\\u003c');

async function writePage(path, file) {
  const data = metadata(path);
  const tags = [];
  if (data.indexable) tags.push(`<link rel="canonical" href="${escape(data.url)}">`);
  else tags.push(tag('name', 'robots', 'noindex'));
  if (data.social) {
    await access('dist' + new URL(data.social.image).pathname);
    const og = { type: 'website', site_name: 'Vudi Phothisuk Art', url: data.url, title: data.title, description: data.description,
      image: data.social.image, 'image:type': 'image/jpeg', 'image:width': '1200', 'image:height': '630', 'image:alt': data.social.alt };
    const twitter = { card: 'summary_large_image', title: data.title, description: data.description, image: data.social.image, 'image:alt': data.social.alt };
    for (const [key, value] of Object.entries(og)) tags.push(tag('property', `og:${key}`, value));
    for (const [key, value] of Object.entries(twitter)) tags.push(tag('name', `twitter:${key}`, value));
  }
  if (data.indexable) tags.push(`<script id="page-schema" type="application/ld+json">${json(data.jsonLd)}</script>`);
  const html = template.replace(/<title>.*?<\/title>/s, () => `<title>${escape(data.title)}</title>`)
    .replace(/<meta name="description"[^>]*\/>/, () => tag('name', 'description', data.description))
    .replace('</head>', () => tags.join('\n') + '\n</head>')
    .replace('<div id="root"></div>', () => `<div id="root">${render(path)}</div>`);
  await writeFile(file, html);
}
for (const page of pages) {
  const directory = 'dist' + (page.path === '/' ? '' : page.path.slice(0, -1));
  await mkdir(directory, { recursive: true });
  await writePage(page.path, directory + '/index.html');
}
await writePage('/404/', 'dist/404.html');
const urls = pages.map(page => `<url><loc>${site}${escape(page.path)}</loc>${[...new Map(page.images.map(image => [image.src, image])).values()].map(image => `<image:image><image:loc>${escape(new URL(image.src, site).href)}</image:loc></image:image>`).join('')}</url>`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);
// Search/retrieval and training policies are deliberately separate. robots.txt is not access control.
const exclusions = 'Disallow: /dev/\nDisallow: /forest-preview/collection.json\n';
const search = ['Googlebot', 'Googlebot-Image', 'bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User'];
const training = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'cohere-ai', 'Bytespider', 'Applebot-Extended', 'Amazonbot'];
await writeFile('dist/robots.txt', `# Public search and user-directed retrieval; named training crawlers blocked.\nUser-agent: *\nAllow: /\n${exclusions}\n${search.map(bot => `User-agent: ${bot}`).join('\n')}\nAllow: /\n${exclusions}\n${training.map(bot => `User-agent: ${bot}`).join('\n')}\nDisallow: /\n\nSitemap: ${site}/sitemap.xml\n`);
const redirects = [];
for (const page of pages) {
  if (page.legacy) {
    if (pages.some(p => p.path === page.legacy + '/')) throw new Error(`Legacy collision: ${page.legacy}`);
    redirects.push(`${page.legacy} ${page.path} 301!`, `${page.legacy}/ ${page.path} 301!`);
  }
  // Netlify normalizes trailing slashes before matching redirect rules.
  // Its directory/Pretty URL handling provides slash normalization; explicit
  // /page -> /page/ rules would also match /page/ and create a redirect loop.
}
redirects.push('/* /404.html 404');
await writeFile('dist/_redirects', redirects.join('\n') + '\n');
await writeFile('dist/_headers', '/404.html\n  X-Robots-Tag: noindex\n');
console.log(`Generated ${pages.length} public HTML pages, image sitemap, robots.txt, redirects and 404.html.`);
for (const warning of incompleteArtwork) console.warn(`Catalog review required: ${warning}`);
