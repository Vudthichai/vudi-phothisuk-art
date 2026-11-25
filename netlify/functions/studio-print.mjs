import { createHash } from 'node:crypto';
import policy from '../../server/commerce/studio-policy.json' with { type: 'json' };
import { getStore } from '@netlify/blobs';
import { equal, studioConfig, StudioConfigError, StudioError } from '../../server/commerce/studio-config.mjs';
import { artworkStoreName, downloadArtwork } from '../../server/commerce/studio-artwork.mjs';
import { providers, studioPreflight, studioService } from '../../server/commerce/studio-api.mjs';

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

function authorizedAdmin(request, token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token) &&
    !request.headers.has('origin') && equal(`Bearer ${token}`, request.headers.get('authorization') ?? '');
}

export function createHandler({ env = process.env, launchPolicy = policy, openStore = config => getStore('studio-orders-v1-' + createHash('sha256').update(JSON.stringify([config.merchantId, config.locationId, config.mode])).digest('hex').slice(0, 24)), openArtworkStore = () => getStore(artworkStoreName), fetcher = fetch, reportProvider, reportConfig = issues => console.warn('[studio-print configuration]', issues.join('; ')) } = {}) {
  return async (request, context) => {
    const url = new URL(request.url);
    const action = url.pathname.split('/').at(-1);
    const statusCheck = request.method === 'GET' && url.pathname === '/api/studio-print/status';
    let preflightCheck = false;
    let approvalRequest = false;
    try {
      const off = env.STUDIO_MODE === undefined || env.STUDIO_MODE === 'off';
      if (statusCheck && off) return reply({ mode: 'off', checkout: false });
      if (off && request.method === 'POST' && url.pathname === '/api/studio-print/admin' &&
          context?.deploy?.context === 'deploy-preview' && url.origin === launchPolicy.origins['live-test']) {
        if (!authorizedAdmin(request, env.STUDIO_ADMIN_TOKEN)) return reply({ error: 'Unauthorized.' }, 401);
        if (json(await readBody(request, 8192)).action !== 'preflight') {
          return reply({ error: 'Studio Print checkout is unavailable.' }, 404);
        }
        preflightCheck = true;
        const config = studioConfig(env, context.deploy.context, launchPolicy, { preflight: true });
        return reply(await studioPreflight(config, providers(config, fetcher, reportProvider), openArtworkStore()));
      }
      const config = studioConfig(env, context?.deploy?.context, launchPolicy);
      if (url.origin !== config.origin) {
        if (statusCheck) reportConfig(['studio-policy.json: checkout origin differs from request']);
        return reply({ error: 'Not found.' }, 404);
      }
      const artworkStore = openArtworkStore();
      if (url.pathname.startsWith('/api/studio-print/artwork/')) {
        return await downloadArtwork(request, config, artworkStore, openStore(config));
      }
      if (action === 'status' && request.method === 'GET') {
        const service = studioService(config, openStore(config), providers(config, fetcher, reportProvider), artworkStore);
        return reply({ mode: config.mode, checkout: await service.enabled(), maxQuantity: config.maxQuantity });
      }
      if (request.method !== 'POST' || !['review', 'checkout', 'webhook', 'admin'].includes(action)) {
        return reply({ error: 'Not found.' }, 404);
      }
      if (action === 'admin' && !authorizedAdmin(request, config.adminToken)) {
        return reply({ error: 'Unauthorized.' }, 401);
      }
      if ((action === 'checkout' || action === 'review') && request.headers.get('origin') !== url.origin) {
        return reply({ error: 'Open checkout from the Studio Print page.' }, 403);
      }
      const service = studioService(config, openStore(config), providers(config, fetcher, reportProvider), artworkStore);
      const raw = await readBody(request, action === 'webhook' ? 65536 : 8192);
      if (action === 'webhook') return reply(await service.webhook(raw, request.headers.get('x-square-hmacsha256-signature')));
      const input = json(raw);
      approvalRequest = action === 'admin' && input?.action === 'approve';
      return reply(await service[action](input));
    } catch (error) {
      if ((statusCheck || preflightCheck) && error instanceof StudioConfigError) reportConfig(error.issues);
      if (error instanceof StudioError) {
        const code = error.code ?? (approvalRequest ? 'APPROVAL_UNAVAILABLE' : undefined);
        const stage = error.stage ?? (approvalRequest ? 'order-lookup' : undefined);
        if (approvalRequest) console.warn('[studio-print approval]', stage, code);
        return reply({ error: error.message, code, stage }, error.status);
      }
      // The providers adapter only reports HTTP status and safe request IDs.
      // Avoid logging raw exceptions, authenticated URLs, or webhook bodies.
      const safeError = /^(?:Square|Prodigi) (?:transport failure|API returned HTTP \d{3}(?: \(request [\w-]+\))?)$/.test(error?.message)
        ? error.message : 'Order data, response, or storage verification failed';
      console.error('[studio-print]', ['review', 'checkout', 'webhook', 'admin'].includes(action) ? action : 'request', safeError);
      return reply(approvalRequest
        ? { error: 'Approval could not be verified. Reconcile before another attempt.',
          code: 'APPROVAL_RECONCILIATION', stage: 'unknown' }
        : { error: 'The Studio Print order could not be processed. Please retry or check the function logs.' }, 502);
    }
  };
}
export default createHandler();

export const config = {
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ['ip', 'domain'] },
  path: ['/api/studio-print/status', '/api/studio-print/review', '/api/studio-print/checkout', '/api/studio-print/webhook', '/api/studio-print/admin', '/api/studio-print/artwork/:file'],
};
