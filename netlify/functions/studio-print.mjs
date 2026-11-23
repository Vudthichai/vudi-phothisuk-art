import { getStore } from '@netlify/blobs';
import { equal, studioConfig, StudioError } from '../../server/commerce/studio-config.mjs';
import { providers, studioService } from '../../server/commerce/studio-api.mjs';

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function json(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new StudioError(415, 'Expected a JSON request.');
  }
  try {
    const text = await request.text();
    if (text.length > 8192) throw new Error();
    const input = JSON.parse(text);
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
      if (action === 'status' && request.method === 'GET') return reply({ sandbox: true });
      if (request.method !== 'POST' || !['checkout', 'webhook', 'admin'].includes(action)) {
        return reply({ error: 'Not found.' }, 404);
      }
      if (action === 'admin' && !equal(`Bearer ${config.adminToken}`, request.headers.get('authorization') ?? '')) {
        return reply({ error: 'Unauthorized.' }, 401);
      }
      if (action === 'checkout' && request.headers.get('origin') !== url.origin) {
        return reply({ error: 'Open checkout from the Studio Print page.' }, 403);
      }
      const service = studioService(config, openStore(config), providers(config, fetcher));
      if (action === 'webhook') return reply(await service.webhook(request));
      return reply(await service[action](await json(request)));
    } catch (error) {
      if (error instanceof StudioError) return reply({ error: error.message }, error.status);
      // The providers adapter only reports HTTP status and safe request IDs.
      // Avoid logging raw exceptions, authenticated URLs, or webhook bodies.
      const safeError = /^(?:Square|Prodigi) (?:transport failure|API returned HTTP \d{3}(?: \(request [\w-]+\))?)$/.test(error.message)
        ? error.message : 'Order data, response, or storage verification failed';
      console.error('[studio-print sandbox]', ['checkout', 'webhook', 'admin'].includes(action) ? action : 'request', safeError);
      return reply({ error: 'The sandbox order could not be processed. Please retry or check the function logs.' }, 502);
    }
  };
}
export default createHandler();

export const config = {
  path: ['/api/studio-print/status', '/api/studio-print/checkout', '/api/studio-print/webhook', '/api/studio-print/admin'],
};
