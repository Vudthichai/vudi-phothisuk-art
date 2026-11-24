import { createHmac, timingSafeEqual } from 'node:crypto';
import sources from '../../docs/studio-print-photographs.json' with { type: 'json' };

export const artworkStoreName = 'studio-print-masters-sandbox';
export const maxArtworkBytes = 15_000_000;
const artworkPath = '/api/studio-print/artwork/';
const lifetimeSeconds = 48 * 3600;

export const artworkMasters = Object.freeze(Object.fromEntries(sources.map(source => {
  const key = `${source.artworkId}-${source.sourceSha256}.jpg`;
  return [source.artworkId, Object.freeze({
    key, sha256: source.sourceSha256, filename: source.sourceFilename,
  })];
})));
const byKey = new Map(Object.values(artworkMasters).map(master => [master.key, master]));

export function artworkReference(origin, artwork) {
  return origin + artworkPath + artworkMasters[artwork].key;
}

function signature(config, url, expiry) {
  return createHmac('sha256', config.artworkKey)
    .update(`studio-print-sandbox-artwork-v1\n${url.origin}${url.pathname}\n${expiry}`)
    .digest();
}

export function signArtwork(config, reference, now = Date.now()) {
  const url = new URL(reference);
  const expiry = String(Math.floor(now / 1000) + lifetimeSeconds);
  url.searchParams.set('expires', expiry);
  url.searchParams.set('sig', signature(config, url, expiry).toString('hex'));
  return url.href;
}

export function artworkMetadata(entry, master) {
  const metadata = entry?.metadata;
  return metadata?.sha256 === master.sha256 && Number.isSafeInteger(metadata.bytes) &&
    metadata.bytes > 0 && metadata.bytes <= maxArtworkBytes ? metadata : null;
}

export async function artworkReady(store, artwork) {
  const master = artworkMasters[artwork];
  const entry = await store.getMetadata(master.key, { consistency: 'strong' });
  return Boolean(artworkMetadata(entry, master));
}

function artworkHeaders() {
  return {
    'Cache-Control': 'private, no-store',
    'Netlify-CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
  };
}

export async function downloadArtwork(request, config, store, now = Date.now()) {
  const url = new URL(request.url);
  const key = url.pathname.startsWith(artworkPath) ? url.pathname.slice(artworkPath.length) : '';
  const master = byKey.get(key);
  const expiry = url.searchParams.get('expires');
  const supplied = url.searchParams.get('sig');
  const headers = artworkHeaders();
  if (!master || url.origin !== config.origin || !['GET', 'HEAD'].includes(request.method) ||
      url.searchParams.size !== 2 || !/^\d{10}$/.test(expiry ?? '') || !/^[a-f\d]{64}$/.test(supplied ?? '') ||
      Number(expiry) <= Math.floor(now / 1000) || Number(expiry) > Math.floor(now / 1000) + lifetimeSeconds ||
      !timingSafeEqual(signature(config, url, expiry), Buffer.from(supplied, 'hex'))) {
    return new Response(null, { status: 404, headers });
  }

  const head = request.method === 'HEAD';
  const entry = head
    ? await store.getMetadata(key, { consistency: 'strong' })
    : await store.getWithMetadata(key, { type: 'stream', consistency: 'strong' });
  const metadata = artworkMetadata(entry, master);
  if (!metadata || (!head && !entry?.data)) {
    await entry?.data?.cancel();
    return new Response(null, { status: 404, headers });
  }
  return new Response(head ? null : entry.data, {
    headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Length': String(metadata.bytes) },
  });
}
