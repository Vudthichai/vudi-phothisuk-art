import { mkdir, readFile, writeFile, access } from 'node:fs/promises';

const site = 'https://vudiphothisukart.com';
const routes = JSON.parse(await readFile('scripts/sharing-previews.json', 'utf8'));
const template = await readFile('dist/index.html', 'utf8');

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function meta(attribute, key, value) {
  return `<meta ${attribute}="${key}" content="${escapeHtml(value)}">`;
}

for (const [route, preview] of Object.entries(routes)) {
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(route) ||
      !/^[a-z0-9-]+\.jpg$/.test(preview.image)) {
    throw new Error(`Invalid sharing route or image for ${route}`);
  }
  const url = new URL(route, site).href;
  const imagePath = '/sharing/' + preview.image;
  const image = new URL(imagePath, site).href;
  await access('dist' + imagePath);

  const openGraph = {
    'og:type': 'website',
    'og:site_name': 'Vudi Phothisuk Art',
    'og:url': url,
    'og:title': preview.title,
    'og:description': preview.description,
    'og:image': image,
    'og:image:type': 'image/jpeg',
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': preview.alt,
  };
  const twitter = {
    'twitter:card': 'summary_large_image',
    'twitter:title': preview.title,
    'twitter:description': preview.description,
    'twitter:image': image,
    'twitter:image:alt': preview.alt,
  };
  const tags = [
    `<link rel="canonical" href="${url}">`,
    ...Object.entries(openGraph).map(([key, value]) => meta('property', key, value)),
    ...Object.entries(twitter).map(([key, value]) => meta('name', key, value)),
  ];
  const html = template.replace('</head>', () => '  ' + tags.join('\n  ') + '\n</head>');
  const directory = route === '/' ? 'dist' : 'dist' + route;
  await mkdir(directory, { recursive: true });
  await writeFile(directory + '/index.html', html);
}
console.log(`Wrote sharing metadata for ${Object.keys(routes).length} routes.`);
