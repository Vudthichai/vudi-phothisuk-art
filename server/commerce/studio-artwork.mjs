import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import sources from '../../docs/studio-print-photographs.json' with { type: 'json' };

export const artworkStoreName = 'studio-print-masters-sandbox';
export const maxArtworkBytes = 15_000_000;
const artworkPath = '/api/studio-print/artwork/';
const lifetimeSeconds = 48 * 3600;
const leaseMs = lifetimeSeconds * 1000;
const maxGrantMs = 30 * 24 * 3600000;
const minFetchMs = 24 * 3600000;

function grantKey(url) {
  return 'artwork-grant-' + createHash('sha256').update(url.searchParams.get('grant')).digest('hex');
}

export function draftArtworkURL(config, reference, orderId) {
  const url = new URL(reference);
  const token = createHmac('sha256', config.artworkKey)
    .update(JSON.stringify(['studio-draft-artwork-v1', reference, orderId, 'default']))
    .digest('hex');
  url.searchParams.set('grant', token);
  return url.href;
}

const strongJSON = { type: 'json', consistency: 'strong' };

export async function createArtworkGrant(store, value, now = Date.now()) {
  const url = new URL(value);
  const saved = await store.setJSON(grantKey(url), {
    path: url.pathname, validUntil: now + leaseMs, deadline: now + maxGrantMs,
  }, { onlyIfNew: true });
  if (saved.modified) return true;
  const entry = await store.getWithMetadata(grantKey(url), strongJSON);
  return validGrant(entry, url, now) && entry.data.validUntil > now;
}

function legacyExpiry(config, url, now) {
  const expiry = url.searchParams.get('expires');
  const supplied = url.searchParams.get('sig');
  if (url.searchParams.size !== 2 || !/^\d{10}$/.test(expiry ?? '') ||
      !/^[a-f\d]{64}$/.test(supplied ?? '') ||
      Number(expiry) > Math.floor(now / 1000) + lifetimeSeconds ||
      !timingSafeEqual(signature(config, url, expiry), Buffer.from(supplied, 'hex'))) return 0;
  return Number(expiry) * 1000;
}

function validGrant(entry, url, now) {
  const grant = entry?.data;
  return grant?.path === url.pathname && !grant.revoked &&
    Number.isSafeInteger(grant.validUntil) && Number.isSafeInteger(grant.deadline) &&
    grant.validUntil <= grant.deadline && grant.deadline <= now + maxGrantMs;
}

function legacyGrantKey(url) {
  return 'artwork-legacy-grant-' + createHash('sha256').update(url.href).digest('hex');
}

// Extend private access server-side without changing the URL on the supplier draft.
export async function prepareArtworkAccess(config, store, value, stableURL, recoverLegacy = false, now = Date.now()) {
  const url = new URL(value);
  if (!stableURL) {
    const expiry = legacyExpiry(config, url, now);
    if (expiry >= now + minFetchMs) return expiry;
    const deadline = expiry - leaseMs + maxGrantMs;
    if (!recoverLegacy || !expiry || deadline < now + minFetchMs) return null;
    const key = legacyGrantKey(url);
    await store.setJSON(key, { path: url.pathname, validUntil: Math.min(deadline, now + leaseMs), deadline },
      { onlyIfNew: true });
    return extendGrant(store, key, url, now);
  }
  if (value !== stableURL) return null;
  return extendGrant(store, grantKey(url), url, now);
}

async function extendGrant(store, key, url, now) {
  const entry = await store.getWithMetadata(key, strongJSON);
  if (!validGrant(entry, url, now) || entry.data.deadline < now + minFetchMs) return null;
  const validUntil = Math.min(entry.data.deadline, now + leaseMs);
  if (entry.data.validUntil >= validUntil) return entry.data.validUntil;
  if (!entry.etag) return null;
  const result = await store.setJSON(key, { ...entry.data, validUntil }, { onlyIfMatch: entry.etag });
  return result.modified ? validUntil : null;
}

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
    .update(`studio-print-launch-artwork-v1\n${url.origin}${url.pathname}\n${expiry}`)
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

// Check that production Functions can stream the private object, not just list it.
export async function artworkReadable(store, artwork) {
  const master = artworkMasters[artwork];
  const entry = await store.getWithMetadata(master.key, { type: 'stream', consistency: 'strong' });
  if (!artworkMetadata(entry, master) || !entry?.data) {
    await entry?.data?.cancel();
    return false;
  }
  const reader = entry.data.getReader();
  try {
    const prefix = [];
    while (prefix.length < 3) {
      const { value, done } = await reader.read();
      if (done) break;
      prefix.push(...value.subarray(0, 3 - prefix.length));
    }
    return prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255;
  } finally {
    await reader.cancel();
  }
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

export async function downloadArtwork(request, config, store, grants, now = Date.now()) {
  const url = new URL(request.url);
  const key = url.pathname.startsWith(artworkPath) ? url.pathname.slice(artworkPath.length) : '';
  const master = byKey.get(key);
  const headers = artworkHeaders();
  const unavailable = () => new Response(null, { status: 404, headers });
  if (!master || url.origin !== config.origin || !['GET', 'HEAD'].includes(request.method)) return unavailable();
  if (url.searchParams.has('grant')) {
    if (url.searchParams.size !== 1 || !/^[a-f\d]{64}$/.test(url.searchParams.get('grant'))) return unavailable();
    const entry = await grants.getWithMetadata(grantKey(url), strongJSON);
    if (!validGrant(entry, url, now) || entry.data.validUntil <= now) return unavailable();
  } else {
    const expiry = legacyExpiry(config, url, now);
    if (!expiry) return unavailable();
    if (expiry <= now) {
      if (config.mode !== 'live-test') return unavailable();
      const entry = await grants.getWithMetadata(legacyGrantKey(url), strongJSON);
      if (!validGrant(entry, url, now) || entry.data.validUntil <= now) return unavailable();
    }
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
