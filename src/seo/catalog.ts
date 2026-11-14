import { collections, informationPages } from '../data';
import { forestCollection } from '../forest/collection';
import { primaryForestImage } from '../forest/types';
import previews from '../../scripts/sharing-previews.json';

export const site = 'https://vudiphothisukart.com';
export const canonicalPath = (path: string) => path === '/' ? '/' : path.replace(/\/+$/, '') + '/';
export const absolute = (path: string) => new URL(path, site).href;
const artist = { '@type': 'Person', '@id': `${site}/#artist`, name: 'Vudi Phothisuk', url: `${site}/about/`, homeLocation: { '@type': 'Place', name: 'Pittsburgh, Pennsylvania' } };
const artistRef = { '@id': artist['@id'] };
type Node = Record<string, unknown>;
export type SeoPage = {
  path: string; title: string; description: string; images: { src: string; alt: string }[];
  graph: Node[]; legacy?: string;
};
const title = (name: string) => `${name} | Vudi Phothisuk Art`;
const page = (path: string, name: string, description: string, extra: Partial<SeoPage> = {}): SeoPage => ({ path: canonicalPath(path), title: title(name), description, images: [], graph: [], ...extra });
export const pages: SeoPage[] = [
  page('/', 'Home', 'Make some art today. Explore dimensional mixed-media paintings and the stories behind the work of Vudi Phothisuk.'),
  page('/collections', 'Collections', 'Explore the collections of Vudi Phothisuk Art.'),
  page('/available-art', informationPages['available-art'].title, informationPages['available-art'].description),
  page('/about', 'About the Artist', 'Meet Vudi Phothisuk and discover the sculptural texture, layered color, and deliberate form behind his paintings.'),
  page('/contact', 'Commissions & Contact', 'Contact Vudi Phothisuk about an original painting, a commission, or the story behind the work.'),
  page('/exhibitions', 'Forest & Flowers — Exhibitions', informationPages.exhibitions.description, { graph: [{
    '@type': 'ExhibitionEvent', '@id': `${site}/exhibitions/#event`, name: 'Forest & Flowers',
    url: `${site}/exhibitions/`, description: informationPages.exhibitions.description,
    startDate: '2026-12-05T16:00:00-05:00', endDate: '2026-12-05T19:00:00-05:00',
    location: { '@type': 'Place', name: 'Field Day', address: { '@type': 'PostalAddress', streetAddress: '3706 Butler Street', addressLocality: 'Pittsburgh', addressRegion: 'PA', postalCode: '15201', addressCountry: 'US' } },
    about: artistRef,
  }] }),
];
export const incompleteArtwork: string[] = [];
for (const collection of collections) {
  const base = `/collections/${collection.slug}`;
  const forest = collection.slug === 'forest-and-flowers';
  const works = forest ? forestCollection.artworks.map(art => {
    const image = primaryForestImage(art);
    return { slug: art.slug, title: art.title, description: art.description, dimensions: art.dimensions, medium: art.medium,
      image: { src: image.variants[image.variants.length - 1].src, alt: image.alt }, sourceUrl: undefined,
      provisional: art.copyStatus === 'provisional', availabilityUnconfirmed: art.availability === 'provisional' };
  }) : collection.artworks.map(art => ({ ...art, provisional: false, availabilityUnconfirmed: false }));
  const items: Node[] = [];
  for (const art of works) {
    const path = canonicalPath(`${base}/${art.slug}`);
    const url = absolute(path);
    if (!art.dimensions || !art.medium || art.provisional || art.availabilityUnconfirmed) {
      incompleteArtwork.push(`${art.title}: ${[!art.dimensions && 'dimensions missing', !art.medium && 'medium missing', art.provisional && 'copy provisional', art.availabilityUnconfirmed && 'availability unconfirmed'].filter(Boolean).join(', ')}`);
    }
    const artwork: Node = { '@type': 'VisualArtwork', '@id': url + '#artwork', name: art.title, url, creator: artistRef,
      image: absolute(art.image.src), ...(art.description?.length && !art.provisional ? { description: art.description.join('\n\n') } : {}),
      ...(art.medium ? { artMedium: art.medium } : {}), ...(art.dimensions ? { size: art.dimensions } : {}) };
    items.push({ '@type': 'ListItem', position: items.length + 1, item: { '@id': artwork['@id'], '@type': 'VisualArtwork', name: art.title, url, image: artwork.image } });
    pages.push(page(path, `${art.title} | ${collection.name}`, art.description?.[0] ?? art.title, {
      images: [art.image], graph: [artwork], legacy: art.sourceUrl ? new URL(art.sourceUrl).pathname : undefined,
    }));
  }
  pages.push(page(base, collection.name, collection.summary, { images: works.map(art => art.image), graph: [{
    '@type': 'CollectionPage', '@id': absolute(canonicalPath(base)) + '#webpage', url: absolute(canonicalPath(base)), name: collection.name,
    mainEntity: { '@type': 'ItemList', itemListElement: items },
  }] }));
}
const collectionPages = pages.filter(p => /^\/collections\/[^/]+\/$/.test(p.path));
pages.find(p => p.path === '/collections/')!.graph.push({ '@type': 'CollectionPage', '@id': `${site}/collections/#webpage`, url: `${site}/collections/`, name: 'Collections', mainEntity: { '@type': 'ItemList', itemListElement: collectionPages.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title.split(' | ')[0], url: absolute(p.path) })) } });
export const findPage = (path: string) => pages.find(p => p.path === canonicalPath(path));
export function metadata(path: string) {
  const found = findPage(path);
  const current = found ?? page(path, 'Page not found', 'This page could not be found in the Vudi Phothisuk Art portfolio.');
  const key = current.path === '/' ? '/' : current.path.slice(0, -1);
  const preview = (previews as Record<string, { image: string; alt: string }>)[key];
  // Sharing images remain curated; narrative and factual metadata come from the catalog.
  const social = preview ? { image: absolute('/sharing/' + preview.image), alt: preview.alt } : undefined;
  const crumbs: Node[] = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }];
  if (current.path !== '/') {
    const parts = current.path.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const p = findPage('/' + parts.slice(0, i + 1).join('/'));
      if (p) crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: p.title.split(' | ')[0], item: absolute(p.path) });
    }
  }
  const url = absolute(current.path);
  const graph = found ? [artist, ...current.graph,
    ...(!current.graph.some(n => n['@type'] === 'CollectionPage') ? [{ '@type': current.path === '/about/' ? 'AboutPage' : current.path === '/contact/' ? 'ContactPage' : 'WebPage', '@id': url + '#webpage', url, name: current.title, description: current.description,
      ...(current.graph.find(n => n['@type'] === 'VisualArtwork' || n['@type'] === 'ExhibitionEvent') ? { mainEntity: { '@id': current.graph[0]['@id'] } } : { about: artistRef }) }] : []),
    ...(current.path !== '/' ? [{ '@type': 'BreadcrumbList', '@id': url + '#breadcrumbs', itemListElement: crumbs }] : [])] : [];
  return { ...current, url, social, indexable: Boolean(found), jsonLd: { '@context': 'https://schema.org', '@graph': graph } };
}
