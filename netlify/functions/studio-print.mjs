import { getStore } from '@netlify/blobs';
import { equal, studioConfig, StudioError } from '../../server/commerce/studio-config.mjs';
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

export function createHandler({ env = process.env, openStore = config => getStore(`studio-print-sandbox-${config.merchantId.toLowerCase()}-${config.locationId.toLowerCase()}`), fetcher = fetch } = {}) {
  return async request => {
    const url = new URL(request.url);
    const action = url.pathname.split('/').at(-1);
    try {
      const config = studioConfig(env);
      if (url.origin !== config.origin) return reply({ error: 'Not found.' }, 404);
      if (action === 'status' && request.method === 'GET') {
        const service = studioService(config, openStore(config), providers(config, fetcher));
        return reply({ sandbox: await service.enabled(), maxQuantity: config.maxQuantity });
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
      const service = studioService(config, openStore(config), providers(config, fetcher));
      const raw = await readBody(request, action === 'webhook' ? 65536 : 8192);
      if (action === 'webhook') return reply(await service.webhook(raw, request.headers.get('x-square-hmacsha256-signature')));
      return reply(await service[action](json(raw)));
    } catch (error) {
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
  path: ['/api/studio-print/status', '/api/studio-print/quote', '/api/studio-print/checkout', '/api/studio-print/webhook', '/api/studio-print/admin'],
};
