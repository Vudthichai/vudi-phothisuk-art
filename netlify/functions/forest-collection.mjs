import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac, createHash, timingSafeEqual, createDecipheriv, randomBytes } from 'node:crypto';
const cookieName = '__Host-vudi-forest';
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' };
function json(body, status = 200, extra = {}) { return Response.json(body, { status, headers: { ...headers, ...extra } }); }
function signature(value, key) { return createHmac('sha256', key).update('forest-session-v1:' + value).digest('base64url'); }
function equal(a, b) { return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()); }
function decrypt(bytes, key) {
  if (bytes.subarray(0,4).toString() !== 'VFF1') throw new Error('Invalid encrypted package');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(4,16));
  decipher.setAuthTag(bytes.subarray(16,32));
  return Buffer.concat([decipher.update(bytes.subarray(32)), decipher.final()]);
}
function validSession(request, key) {
  const cookie = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!cookie || cookie.length > 1024) return false;
  const [payload, mac, extra] = cookie.split('.');
  if (!payload || !mac || extra || !equal(signature(payload, key), mac)) return false;
  try { const session = JSON.parse(Buffer.from(payload, 'base64url').toString()); return Number.isFinite(session.exp) && session.exp > Date.now() && session.exp <= Date.now() + 8 * 60 * 60 * 1000; } catch { return false; }
}
function cookie(value, clear = false) { return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict${clear ? '; Max-Age=0' : ''}`; }
/** No dependency, no plaintext protected content in the public bundle or repository. */
export function createHandler({ contentRoot = resolve('netlify/private/forest'), environment = process.env } = {}) {
const root = contentRoot;
return async function handler(request) {
  const password = environment.FOREST_COLLECTION_PASSWORD;
  const key = Buffer.from(environment.FOREST_COLLECTION_CONTENT_KEY ?? '', 'base64');
  if (!password || key.length !== 32) return json({ error: 'Private preview is awaiting secure server configuration.' }, 503);
  const sessionKey = createHmac('sha256', key).update('session-key-v1:' + password).digest();
  const url = new URL(request.url);
  if (!['GET','POST','DELETE'].includes(request.method)) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, DELETE' });
  if (request.method !== 'GET' && (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site')) return json({ error: 'Request not allowed' }, 403);
  if (request.method === 'DELETE') return json({ locked: true }, 200, { 'Set-Cookie': cookie('', true) });
  let sessionCookie;
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid request' }, 400);
    const body = await request.text();
    if (body.length > 1024) return json({ error: 'Invalid request' }, 400);
    let attempt; try { attempt = JSON.parse(body).password; } catch { return json({ error: 'Invalid request' }, 400); }
    if (typeof attempt !== 'string' || !equal(attempt, password)) return json({ error: 'That password was not recognized. Please try again.' }, 401);
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
    sessionCookie = cookie(payload + '.' + signature(payload, sessionKey));
  } else if (!validSession(request, sessionKey)) return json({ error: 'Enter password to view the collection.' }, 401);
  try {
    const collection = JSON.parse(decrypt(await readFile(resolve(root, 'collection.enc')), key).toString());
    if (url.searchParams.has('image')) {
      const image = collection.artworks.flatMap(a => a.images.flatMap(i => i.variants)).find(v => v.key === url.searchParams.get('image'));
      if (!image || !/^[a-f0-9]{32}\.enc$/.test(image.file)) return json({ error: 'Image not found' }, 404);
      const bytes = decrypt(await readFile(resolve(root, 'assets', image.file)), key);
      return new Response(bytes, { headers: { ...headers, 'Content-Type': 'image/webp' } });
    }
    // Filesystem identifiers never leave the server. Images use the same auth gate.
    const safe = { ...collection, artworks: collection.artworks.map(a => ({ ...a, images: a.images.map(i => ({ ...i, variants: i.variants.map(({ file, ...v }) => v) })) })) };
    return json(safe, 200, sessionCookie ? { 'Set-Cookie': sessionCookie } : {});
  } catch { return json({ error: 'Private preview content is unavailable. Please contact the artist.' }, 503); }
};
}
export default createHandler();
