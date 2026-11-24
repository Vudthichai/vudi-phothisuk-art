import { getStore } from '@netlify/blobs';
import { equal, studioConfig, StudioConfigError, StudioError } from '../../server/commerce/studio-config.mjs';
import { artworkStoreName, downloadArtwork } from '../../server/commerce/studio-artwork.mjs';
import { providers, studioService } from '../../server/commerce/studio-api.mjs';

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function readBody(request, limit) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new StudioError(415, 'Expected a JSON request.');
  }
  if (Number(request.headers.get('content-length')) > limit) throw new StudioError(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new StudioError(400, 'Invalid request.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      void reader.cancel().catch(() => {});
      throw new StudioError(413, 'Request too large.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, length);
}

function json(raw) {
  try {
    const input = JSON.parse(raw);
    if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error();
    return input;
  } catch {
    throw new StudioError(400, 'Invalid request.');
  }
}

export function createHandler({ env = process.env, openStore = config => getStore(`studio-print-sandbox-${config.merchantId.toLowerCase()}-${config.locationId.toLowerCase()}`), openArtworkStore = () => getStore(artworkStoreName), fetcher = fetch, reportConfig = issues => console.warn('[studio-print configuration]', issues.join('; ')) } = {}) {
  return async (request, context) => {
    const url = new URL(request.url);
    const action = url.pathname.split('/').at(-1);
    const statusCheck = request.method === 'GET' && url.pathname === '/api/studio-print/status';
    try {
      const config = studioConfig(env, context?.deploy?.context);
      if (url.origin !== config.origin) {
        if (statusCheck) reportConfig(['STUDIO_WEBHOOK_URL: origin differs from request']);
        return reply({ error: 'Not found.' }, 404);
      }
      const artworkStore = openArtworkStore();
      if (url.pathname.startsWith('/api/studio-print/artwork/')) {
        return await downloadArtwork(request, config, artworkStore);
      }
      if (action === 'status' && request.method === 'GET') {
        const service = studioService(config, openStore(config), providers(config, fetcher), artworkStore);
        const sandbox = await service.enabled();
        if (!sandbox) {
          const inactive = ['STUDIO_CHECKOUT_ENABLED', 'STUDIO_FULFILLMENT_ENABLED']
            .filter(name => env[name] !== 'true')
            .map(name => `${name}: ${env[name] ? 'not enabled' : 'missing'}`);
          reportConfig(inactive.length ? inactive : ['Sandbox checkout or fulfillment is paused in Netlify Blobs']);
        }
        return reply({ sandbox, maxQuantity: config.maxQuantity });
      }
      if (request.method !== 'POST' || !['quote', 'checkout', 'webhook', 'admin'].includes(action)) {
        return reply({ error: 'Not found.' }, 404);
      }
      if (action === 'admin' && request.headers.has('origin')) return reply({ error: 'Unauthorized.' }, 401);
      if (action === 'admin' && !equal(`Bearer ${config.adminToken}`, request.headers.get('authorization') ?? '')) {
        return reply({ error: 'Unauthorized.' }, 401);
      }
      if ((action === 'checkout' || action === 'quote') && request.headers.get('origin') !== url.origin) {
        return reply({ error: 'Open checkout from the Studio Print page.' }, 403);
      }
      const service = studioService(config, openStore(config), providers(config, fetcher), artworkStore);
      const raw = await readBody(request, action === 'webhook' ? 65536 : 8192);
      if (action === 'webhook') return reply(await service.webhook(raw, request.headers.get('x-square-hmacsha256-signature')));
      return reply(await service[action](json(raw)));
    } catch (error) {
      if (statusCheck && error instanceof StudioConfigError) reportConfig(error.issues);
      if (error instanceof StudioError) return reply({ error: error.message }, error.status);
      // The providers adapter only reports HTTP status and safe request IDs.
      // Avoid logging raw exceptions, authenticated URLs, or webhook bodies.
      const safeError = /^(?:Square|Prodigi) (?:transport failure|API returned HTTP \d{3}(?: \(request [\w-]+\))?)$/.test(error?.message)
        ? error.message : 'Order data, response, or storage verification failed';
      console.error('[studio-print sandbox]', ['quote', 'checkout', 'webhook', 'admin'].includes(action) ? action : 'request', safeError);
      return reply({ error: 'The sandbox order could not be processed. Please retry or check the function logs.' }, 502);
    }
  };
}
export default createHandler();

export const config = {
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ['ip', 'domain'] },
  path: ['/api/studio-print/status', '/api/studio-print/quote', '/api/studio-print/checkout', '/api/studio-print/webhook', '/api/studio-print/admin', '/api/studio-print/artwork/:file'],
};
