import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import catalog from '../server/commerce/studio-catalog.json' with { type: 'json' };
import { artworkMasters, artworkReference, maxArtworkBytes, signArtwork } from '../server/commerce/studio-artwork.mjs';
import { createHandler } from '../netlify/functions/studio-print.mjs';

import { createArtworkUploader } from './upload-studio-masters.mjs';

const base = 'https://deploy-preview.example.test';
const endpoint = base + '/api/studio-print/';
const env = {
  CONTEXT: 'deploy-preview', STUDIO_SANDBOX_ENABLED: 'true',
  SQUARE_SANDBOX_TOKEN: 'fixture', SQUARE_SANDBOX_LOCATION: 'location', SQUARE_SANDBOX_MERCHANT: 'merchant',
  SQUARE_WEBHOOK_KEY: 'webhook-fixture', STUDIO_WEBHOOK_URL: endpoint + 'webhook',
  STUDIO_ADMIN_TOKEN: '1'.repeat(64), STUDIO_DATA_KEY: '2'.repeat(64),
  STUDIO_FULFILLMENT_ENABLED: 'true', STUDIO_MAX_FULFILLMENT_CENTS: '3000', STUDIO_ARTWORK_SIGNING_KEY: '3'.repeat(64), PRODIGI_SANDBOX_KEY: 'sandbox_fixture',
  STUDIO_CHECKOUT_ENABLED: 'true', STUDIO_DAILY_FULFILLMENT_CENTS: '20000',
  STUDIO_DESTINATIONS: JSON.stringify({
    'OR-97201': { shippingCents: 799, additionalCents: 100, taxBps: 0, taxShipping: false },
    'PA-15201': { shippingCents: 799, additionalCents: 100, taxBps: 700, taxShipping: true },
  }),
};

function fixture(overrides = {}, deployContext = { deploy: { context: overrides.CONTEXT ?? env.CONTEXT } }) {
  const diagnostics = [];
  const records = new Map();
  const orders = new Map();
  const attempts = new Map();
  const payments = new Map();
  const drafts = new Map();
  const draftCalls = [];
  let submits = 0;
  let failDraft = false;
  let failPatch = false;
  let served = 0;
  const image = new Uint8Array([255, 216, 255, 217]);
  const masters = new Map(Object.values(artworkMasters).map(master => [master.key, {
    metadata: { sha256: master.sha256, bytes: image.length },
  }]));
  const artworkStore = {
    async getMetadata(key) { return masters.get(key) ?? null; },
    async getWithMetadata(key, { type }) {
      assert.equal(type, 'stream');
      served++;
      const entry = masters.get(key);
      return entry && { ...entry, data: new Blob([image]).stream() };
    },
  };
  let submitFailure;
  let submitHold;
  let invalidVariant = false;
  let quoteCurrency = 'USD';
  let quoteFailure = false;
  const store = {
    async getWithMetadata(id) { return structuredClone(records.get(id) ?? null); },
    async setJSON(id, data, { onlyIfNew, onlyIfMatch } = {}) {
      const previous = records.get(id);
      if ((onlyIfNew && previous) || (onlyIfMatch && onlyIfMatch !== previous?.etag)) return { modified: false };
      const etag = randomUUID();
      records.set(id, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
  };
  const fetcher = async (address, init) => {
    const url = new URL(address);
    const body = init.body && JSON.parse(init.body);
    if (url.hostname === 'connect.squareupsandbox.com') {
      assert.equal(init.headers.Authorization, 'Bearer fixture');
      if (url.pathname === '/v2/online-checkout/payment-links') {
        if (attempts.has(body.idempotency_key)) return Response.json(attempts.get(body.idempotency_key));
        assert.equal(body.checkout_options.ask_for_shipping_address, false);
        const id = 'order-' + (orders.size + 1);
        const order = { ...body.order, id };
        const subtotal = Number(order.line_items[0].quantity) * order.line_items[0].base_price_money.amount;
        const shipping = order.service_charges?.[0]?.amount_money.amount ?? 0;
        const tax = Math.round((subtotal + (order.service_charges?.[0]?.taxable ? shipping : 0)) *
          Number(order.taxes?.[0]?.percentage ?? 0) / 100);
        order.total_tax_money = { currency: 'USD', amount: tax };
        order.total_money = { currency: 'USD', amount: subtotal + shipping + tax };
        orders.set(id, order);
        const result = { payment_link: { order_id: id, url: `https://sandbox.square.link/u/${id}` } };
        attempts.set(body.idempotency_key, result);
        return Response.json(result);
      }
      if (url.pathname.startsWith('/v2/orders/')) return Response.json({ order: orders.get(url.pathname.split('/').at(-1)) });
      if (url.pathname.startsWith('/v2/payments/')) return Response.json({ payment: payments.get(url.pathname.split('/').at(-1)) });
    }
    if (url.href === 'https://api.sandbox.prodigi.com/v4.0/quotes') {
      assert.equal(init.headers['X-API-Key'], 'fixture');
      assert.equal(body.destinationCountryCode, 'US');
      assert.equal(body.currencyCode, 'USD');
      assert.equal(body.shippingMethod, 'Standard');
      if (quoteFailure) return new Response(null, { status: 503 });
      const [{ sku, copies, assets }] = body.items;
      assert.deepEqual(assets, [{ printArea: 'default' }]);
      assert(Object.values(catalog.variants).includes(sku));
      const price = sku.endsWith('9X12') ? 450 : 650;
      return Response.json({ outcome: 'Created', quotes: [{
        shipmentMethod: 'Standard',
        costSummary: { items: { amount: (price * copies / 100).toFixed(2), currency: quoteCurrency },
          shipping: { amount: ((799 + (copies - 1) * 100) / 100).toFixed(2), currency: quoteCurrency } },
        items: [{ id: 'qit_fixture', sku, copies }],
        shipments: [{ items: ['qit_fixture'], fulfillmentLocation: { countryCode: 'US' } }],
      }] });
    }
    if (url.hostname === 'api.prodigi.com') {
      assert.equal(init.headers['X-API-Key'], 'sandbox_fixture');
      if (url.pathname.startsWith('/v5/catalogue/variants/')) {
        const sku = url.pathname.split('/').at(-1);
        const [width, height] = sku.endsWith('9X12') ? [9, 12] : [12, 16];
        return Response.json({ data: {
          sku, name: invalidVariant ? 'Wrong paper 200gsm' : 'Lustre Photo Paper, 240gsm',
          dimensions: { width: { in: width }, height: { in: height } },
          shipsTo: ['Worldwide'], printAreas: [{ name: 'default', required: true }],
        } });
      }
      if (url.pathname === '/v5/orders') {
        draftCalls.push(body);
        if (failDraft) return new Response(null, { status: 503 });
        const key = init.headers['Idempotency-Key'];
        assert.equal(key.length, 64);
        if (!drafts.has(key)) drafts.set(key, {
          ...body, items: body.items.map(item => ({ ...item, id: 'item-1' })),
          id: `prodigi-${drafts.size + 1}`, status: 'draft', allowedActions: ['submit'],
          costs: { total: { amount: '12.34', currency: 'USD' } },
          shipments: [],
        });
        return Response.json({ data: drafts.get(key) }, { status: 202 });
      }
      const draft = [...drafts.values()].find(value => value.id === url.pathname.split('/')[3]?.split(':')[0]);
      assert(draft, url.pathname);
      if (init.method === 'PATCH') {
        assert.equal(url.pathname, `/v5/orders/${draft.id}/items/item-1`);
        assert.equal(draft.status, 'draft');
        if (failPatch) throw new Error('request interrupted');
        draft.items[0].assets = body.assets;
        return Response.json({ data: draft.items[0] });
      }
      if (url.pathname.endsWith(':submit')) {
        submits++;
        if (submitHold) await submitHold;
        if (submitFailure === 'transport') throw new Error('request interrupted');
        if (submitFailure) return new Response(null, { status: submitFailure });
        draft.status = 'submitted';
        draft.allowedActions = [];
      }
      return Response.json({ data: draft });
    }
    assert.fail('Unexpected provider address ' + url.origin + url.pathname);
  };
  const handler = createHandler({ env: { ...env, ...overrides }, openStore: () => store, openArtworkStore: () => artworkStore, fetcher, reportConfig: issues => diagnostics.push(...issues) });
  const request = (action, body, headers = {}, origin = base) => handler(new Request(origin + '/api/studio-print/' + action, {
    method: 'POST', body, headers: { 'Content-Type': 'application/json', ...(['checkout', 'quote'].includes(action) && { Origin: base }), ...headers },
  }), deployContext);
  const post = (action, body, headers) => request(action, JSON.stringify(body), headers);
  async function purchase(input, headers) {
    const response = await post('quote', input, headers);
    if (!response.ok) return response;
    const { quoteId } = await response.json();
    return post('checkout', { quoteId, shippingCents: 1, totalCents: 1, quantity: 1000 }, headers);
  }
  function pay(orderId, options = {}) {
    const id = 'payment-' + orderId;
    const money = orders.get(orderId).total_money;
    payments.set(id, { id, order_id: orderId, location_id: 'location', status: 'COMPLETED', amount_money: money, total_money: money, ...options });
    return id;
  }
  const notify = (id, signature, status = 'COMPLETED', createdAt = new Date().toISOString()) => {
    const event = { created_at: createdAt, type: 'payment.updated', merchant_id: 'merchant', data: { object: { payment: { id, status } } } };
    const valid = createHmac('sha256', env.SQUARE_WEBHOOK_KEY).update(env.STUDIO_WEBHOOK_URL).update(JSON.stringify(event)).digest('base64');
    return post('webhook', event, { 'x-square-hmacsha256-signature': signature ?? valid });
  };
  const admin = input => post('admin', input, { Authorization: 'Bearer ' + env.STUDIO_ADMIN_TOKEN });
  return {
    records, orders, drafts, draftCalls, pay, notify, post, purchase, request, admin, submits: () => submits,
    masters, image, served: () => served, download: (url, method = 'GET') => handler(new Request(url, { method }), deployContext),
    status: () => handler(new Request(endpoint + 'status'), deployContext), diagnostics,
    setFailPatch: value => { failPatch = value; },
    setQuoteCurrency: value => { quoteCurrency = value; }, setQuoteFailure: value => { quoteFailure = value; },
    setSubmitFailure: value => { submitFailure = value; }, setSubmitHold: value => { submitHold = value; },
    setFailDraft: value => { failDraft = value; }, setInvalidVariant: value => { invalidVariant = value; },
  };
}

function customer(overrides = {}) {
  return {
    attemptId: randomUUID(), artwork: 'mother-nature', size: '9x12', quantity: 2,
    name: 'Sandbox Buyer', email: 'sandbox-buyer@example.com', line1: '100 Test Street',
    city: 'Pittsburgh', state: 'PA', zip: '15201', country: 'US', ...overrides,
  };
}

test('both sizes and all five artwork mappings use authoritative pricing and original file URLs', async () => {
  const f = fixture();
  for (const artwork of Object.keys(catalog.artworks)) {
    for (const [size, price] of Object.entries(catalog.prices)) {
      const response = await f.purchase(customer({ artwork, size, priceCents: 1 }));
      assert.equal(response.status, 200, await response.clone().text());
      const { orderId } = await response.json();
      const p = f.pay(orderId);
      assert.equal((await f.notify(p)).status, 200);
      const { data } = f.records.get(orderId);
      assert.equal(data.unitCents, price);
      assert.equal(data.shippingCents, 899);
      assert.equal(data.taxCents, Math.round((price * 2 + 899) * 0.07));
      assert.equal(data.state, 'draft');
      assert(!JSON.stringify(data).includes('sandbox-buyer@example.com'));
      assert(!JSON.stringify(data).includes('sig='));
      assert.equal(typeof data.recipientBox, 'string');
      const draft = f.draftCalls.at(-1);
      assert.equal(draft.submit, false);
      assert.equal(draft.recipient.address.countryCode, 'US');
      const [item] = draft.items;
      assert.equal(item.sku, catalog.variants[size]);
      assert.equal(item.quantity, 2);
      assert.equal(item.sizing, 'fitPrintArea');
      const asset = item.assets[0];
      assert.equal(asset.printArea, 'default');
      const artworkURL = new URL(asset.url);
      assert.equal(artworkURL.origin + artworkURL.pathname, artworkReference(base, artwork));
      assert(artworkURL.searchParams.has('sig'));
    }
  }
  assert.equal(f.drafts.size, 10);
  assert.equal(f.submits(), 0);
});

test('invalid U.S. addresses and unconfigured variants fail before Square checkout', async () => {
  const f = fixture();
  for (const input of [
    { country: 'CA' }, { line1: '' }, { email: 'wrong' }, { zip: '123' },
    { zip: '00000' }, { state: 'CA' }, { artwork: 'collectors-edition' }, { quantity: 0 },
  ]) assert.equal((await f.purchase(customer(input))).status, 400);
  f.setInvalidVariant(true);
  assert.equal((await f.purchase(customer())).status, 503);
  assert.equal(f.orders.size, 0);
  assert.equal((await f.purchase(customer(), { Origin: 'https://other.example.test' })).status, 403);
});

test('unsigned events, unsuccessful payments and amount changes cannot create drafts', async () => {
  const f = fixture();
  const { orderId } = await (await f.purchase(customer())).json();
  assert.equal((await f.notify(f.pay(orderId), 'forged')).status, 401);
  assert.deepEqual(await (await f.notify(f.pay(orderId, { status: 'FAILED' }))).json(), { ignored: true });
  assert.deepEqual(await (await f.notify(f.pay(orderId), undefined, 'PENDING')).json(), { ignored: true });
  assert.equal((await f.notify(f.pay(orderId, { amount_money: { amount: 1, currency: 'USD' } }))).status, 502);
  assert.equal(f.drafts.size, 0);
});

test('duplicate webhooks, temporary provider failures, and concurrent admin approvals are safe', async () => {
  const f = fixture();
  const { quoteId } = await (await f.post('quote', customer())).json();
  const checkout = { quoteId };
  const { orderId } = await (await f.post('checkout', checkout)).json();
  assert.equal((await (await f.post('checkout', checkout)).json()).orderId, orderId);
  const paymentId = f.pay(orderId);
  f.setFailDraft(true);
  assert.equal((await f.notify(paymentId)).status, 502);
  f.setFailDraft(false);
  const results = await Promise.all([f.notify(paymentId), f.notify(paymentId), f.admin({ action: 'retry-draft', paymentId })]);
  assert(results.every(response => response.ok));
  assert.equal(f.drafts.size, 1);
  assert.equal(f.submits(), 0);
  assert.equal((await f.post('admin', { action: 'approve', orderId })).status, 401);
  f.pay(orderId, { refunded_money: { amount: 1, currency: 'USD' } });
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 409);
  f.pay(orderId);
  const approvals = await Promise.all([f.admin({ action: 'approve', orderId }), f.admin({ action: 'approve', orderId })]);
  assert.deepEqual(approvals.map(result => result.status).sort(), [200, 409]);
  assert.equal(f.submits(), 1);
  const supplier = [...f.drafts.values()][0];
  supplier.status = 'shipped';
  supplier.shipments = [{ carrier: 'Fixture carrier', trackingNumber: '12345', trackingUrl: 'https://carrier.example.test/12345' }];
  const refreshed = await (await f.admin({ action: 'refresh', orderId })).json();
  assert.equal(refreshed.state, 'shipped');
  assert.equal(refreshed.costs.total.amount, '12.34');
  assert.equal(refreshed.tracking[0].trackingNumber, '12345');
});

test('missing credentials, a live Prodigi key, and production all fail closed', async () => {
  for (const [overrides, status] of [
    [{ SQUARE_SANDBOX_TOKEN: '' }, 503],
    [{ STUDIO_ARTWORK_SIGNING_KEY: '' }, 503],
    [{ PRODIGI_SANDBOX_KEY: 'live_never' }, 503],
    [{ CONTEXT: 'production' }, 404],
    [{ STUDIO_SANDBOX_ENABLED: 'false' }, 404],
  ]) assert.equal((await fixture(overrides).purchase(customer())).status, status);
});

async function draftOrder(f) {
  const response = await f.purchase(customer());
  assert.equal(response.status, 200);
  const { orderId } = await response.json();
  const paymentId = f.pay(orderId);
  assert.equal((await f.notify(paymentId)).status, 200);
  return { orderId, paymentId, supplier: [...f.drafts.values()][0] };
}

test('rejects stale authenticated events, wrong currency, order mutations and unauthorized admin requests', async () => {
  const f = fixture();
  const { orderId } = await (await f.purchase(customer())).json();
  const paymentId = f.pay(orderId);
  const stale = new Date(Date.now() - 73 * 3600000).toISOString();
  assert.deepEqual(await (await f.notify(paymentId, undefined, 'COMPLETED', stale)).json(), { ignored: true });
  f.pay(orderId, { total_money: { amount: f.orders.get(orderId).total_money.amount, currency: 'CAD' } });
  assert.equal((await f.notify(paymentId)).status, 502);
  f.pay(orderId);
  f.orders.get(orderId).line_items[0].name = 'Collector’s Edition';
  assert.equal((await f.notify(paymentId)).status, 502);
  assert.equal(f.drafts.size, 0);
  const authorization = { Authorization: 'Bearer ' + env.STUDIO_ADMIN_TOKEN };
  assert.equal((await f.post('admin', { action: 'pause' }, { ...authorization, Origin: base })).status, 401);
  assert.equal((await f.request('admin', '{"action":"pause"}', authorization, 'https://wrong.example.test')).status, 404);
  assert.equal((await f.request('checkout', ' '.repeat(8200))).status, 413);
  assert.equal((await f.request('webhook', ' '.repeat(65537))).status, 413);
  assert.equal((await f.request('checkout', '{}', { 'Content-Type': 'application/jsonx' })).status, 415);
  assert.equal((await f.request('checkout', 'null')).status, 400);
});

test('quantity, missing or excessive supplier cost, modified draft and emergency pause block fulfillment', async () => {
  const f = fixture({ STUDIO_MAX_QUANTITY: '2', STUDIO_MAX_FULFILLMENT_CENTS: '2000' });
  assert.equal((await f.purchase(customer({ quantity: 3 }))).status, 400);
  const { orderId, supplier } = await draftOrder(f);
  const approve = () => f.admin({ action: 'approve', orderId });
  supplier.costs.total.amount = '20.01';
  assert.equal((await approve()).status, 409);
  delete supplier.costs;
  assert.equal((await approve()).status, 409);
  supplier.costs = { total: { amount: '20.00', currency: 'USD' } };
  supplier.recipient.address.countryCode = 'CA';
  assert.equal((await approve()).status, 409);
  supplier.recipient.address.countryCode = 'US';
  const file = supplier.items[0].assets[0].url;
  supplier.items[0].assets[0].url = 'https://files.example.com/other-print.jpg';
  assert.equal((await approve()).status, 409);
  supplier.items[0].assets[0].url = file;
  const unpaid = await (await f.purchase(customer())).json();
  assert.deepEqual(await (await f.admin({ action: 'pause' })).json(), { paused: true });
  assert.equal((await approve()).status, 503);
  assert.equal((await f.notify(f.pay(unpaid.orderId))).status, 503);
  assert.equal((await f.purchase(customer())).status, 503);
  assert.equal((await f.admin({ action: 'resume' })).status, 409);
  assert.equal(f.submits(), 0);
  assert.equal((await f.admin({ action: 'resume', confirm: 'resume-sandbox-fulfillment' })).status, 200);
  assert.equal((await approve()).status, 200);
});

test('definite rejection permits immediate retry; timeout requires explicit reconciliation', async () => {
  const rejected = fixture();
  const first = await draftOrder(rejected);
  rejected.setSubmitFailure(422);
  assert.equal((await rejected.admin({ action: 'approve', orderId: first.orderId })).status, 502);
  assert.equal(rejected.records.get(first.orderId).data.approval, 'rejected');
  rejected.setSubmitFailure(null);
  assert.equal((await rejected.admin({ action: 'approve', orderId: first.orderId })).status, 200);

  const ambiguous = fixture();
  const { orderId } = await draftOrder(ambiguous);
  ambiguous.setSubmitFailure('transport');
  assert.equal((await ambiguous.admin({ action: 'approve', orderId })).status, 502);
  ambiguous.setSubmitFailure(null);
  ambiguous.records.get(orderId).data.approvalAttemptAt = new Date(Date.now() - 180000).toISOString();
  assert.equal((await ambiguous.admin({ action: 'approve', orderId })).status, 409);
  assert.equal((await ambiguous.admin({ action: 'reset-approval', orderId })).status, 409);
  assert.equal(ambiguous.submits(), 1);
  const reset = await ambiguous.admin({ action: 'reset-approval', orderId, confirm: 'confirmed-no-submission' });
  assert.equal(reset.status, 200);
  assert.equal((await ambiguous.admin({ action: 'approve', orderId })).status, 200);
});

test('status refresh during a provider call preserves the approval write and never resubmits', async () => {
  const f = fixture();
  const { orderId } = await draftOrder(f);
  let release;
  f.setSubmitHold(new Promise(resolve => { release = resolve; }));
  const inFlight = f.admin({ action: 'approve', orderId });
  while (f.submits() === 0) await new Promise(resolve => setImmediate(resolve));
  const refreshed = await (await f.admin({ action: 'refresh', orderId })).json();
  assert.equal(refreshed.approval, 'pending');
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 409);
  release();
  assert.equal((await inFlight).status, 200);
  assert.equal(f.records.get(orderId).data.approval, 'accepted');
  assert.equal(f.submits(), 1);
});

test('private artwork is gated by the allowlist, signature, expiry, origin, and sandbox environment', async () => {
  const f = fixture();
  const config = { artworkKey: Buffer.from(env.STUDIO_ARTWORK_SIGNING_KEY, 'hex') };
  const reference = artworkReference(base, 'mother-nature');
  const signed = signArtwork(config, reference);
  for (const invalid of [
    reference,
    signed.replace('mother-nature', 'tiger-lily'),
    signed.replace(/.$/, tail => tail === 'a' ? 'b' : 'a'),
    signed + '&expires=100',
    signed.replace(base, 'https://other.example.test'),
    signArtwork(config, reference, Date.now() - 49 * 3600000),
  ]) assert.equal((await f.download(invalid)).status, 404);
  assert.equal((await f.download(signed, 'POST')).status, 404);
  assert.equal((await fixture({ CONTEXT: 'production' }).download(signed)).status, 404);
  const head = await f.download(signed, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(f.image.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal(f.served(), 0);
  const response = await f.download(signed);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), f.image);
  assert.equal(f.served(), 1);
});

test('unverified or missing artwork fails before checkout', async () => {
  const f = fixture();
  const key = artworkMasters['mother-nature'].key;
  f.masters.get(key).metadata.bytes = maxArtworkBytes + 1;
  assert.equal((await f.purchase(customer())).status, 503);
  f.masters.delete(key);
  assert.equal((await f.purchase(customer())).status, 503);
  assert.equal(f.orders.size, 0);
  const readiness = await (await f.admin({ action: 'artwork-status' })).json();
  assert.equal(readiness.results.find(result => result.artwork === 'mother-nature').ready, false);
  assert.equal(readiness.results.filter(result => result.ready).length, 4);
  assert.equal((await fixture({ STUDIO_FULFILLMENT_ENABLED: 'false' }).purchase(customer())).status, 503);
});

test('manual approval renews expired artwork links and retries failed renewal without submitting', async () => {
  const f = fixture();
  const { orderId, supplier } = await draftOrder(f);
  const reference = artworkReference(base, 'mother-nature');
  const config = { artworkKey: Buffer.from(env.STUDIO_ARTWORK_SIGNING_KEY, 'hex') };
  const expired = signArtwork(config, reference, Date.now() - 49 * 3600000);
  const asset = supplier.items[0].assets[0];
  asset.url = expired;
  assert.equal((await f.download(expired)).status, 404);
  f.setFailPatch(true);
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 502);
  assert.equal(f.submits(), 0);
  assert.equal(f.records.get(orderId).data.approval, 'rejected');
  f.setFailPatch(false);
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 200);
  assert.equal(f.submits(), 1);
  const renewed = supplier.items[0].assets[0].url;
  assert.notEqual(renewed, expired);
  assert.equal((await f.download(renewed)).status, 200);
});

test('a timeout with a later positive supplier state is reconciled without another submission', async () => {
  const f = fixture();
  const { orderId, supplier } = await draftOrder(f);
  f.setSubmitFailure('transport');
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 502);
  f.records.get(orderId).data.approvalAttemptAt = new Date(Date.now() - 180000).toISOString();
  supplier.status = 'in_production';
  const refreshed = await (await f.admin({ action: 'refresh', orderId })).json();
  assert.equal(refreshed.approval, 'accepted');
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 409);
  assert.equal(f.submits(), 1);
});

test('quote review precedes Square, expires, and fails closed on missing USD or provider errors', async () => {
  const f = fixture();
  const response = await f.post('quote', customer({ artwork: 'ethereal-bloom', size: '12x16' }));
  assert.equal(response.status, 200);
  const offer = await response.json();
  assert.equal(offer.printCents, 19000);
  assert.equal(offer.shippingCents, 899);
  assert.equal(offer.taxCents, 1393);
  assert.equal(offer.totalCents, 21292);
  assert.equal(f.orders.size, 0);
  f.records.get('quote-' + offer.quoteId).data.expires = Date.now() - 1;
  assert.equal((await f.post('checkout', { quoteId: offer.quoteId })).status, 409);
  assert.equal((await f.post('checkout', { quoteId: randomUUID() })).status, 409);
  assert.equal((await f.post('checkout', customer())).status, 400);
  const capped = fixture({ STUDIO_MAX_FULFILLMENT_CENTS: '1700' });
  assert.equal((await capped.post('quote', customer())).status, 503);
  assert.equal(capped.orders.size, 0);
  f.setQuoteCurrency('GBP');
  assert.equal((await f.post('quote', customer())).status, 503);
  f.setQuoteFailure(true);
  assert.equal((await f.post('quote', customer())).status, 502);
  assert.equal(f.orders.size, 0);
});

test('catalogue and order reports distinguish quotes from provider-reported costs and use verified fees', async () => {
  const f = fixture();
  const response = await f.admin({ action: 'catalogue' });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.deepEqual(report.results.map(x => x.sku), Object.values(catalog.variants));
  assert.deepEqual(report.results[0].quote.fulfillmentCountries, ['US']);
  const { orderId, supplier } = await draftOrder(f);
  f.pay(orderId, { processing_fee: [{ amount_money: { amount: 220, currency: 'USD' } }] });
  supplier.costs.shipping = { amount: '7.00', currency: 'USD' };
  const view = await (await f.admin({ action: 'view', orderId })).json();
  assert.equal(view.paymentStatus, 'COMPLETED');
  assert.equal(view.financials.squareFeeCents, 220);
  assert.equal(view.financials.estimatedProductionCents, 900);
  assert.equal(view.financials.supplierReportedShippingCents, 700);
  assert.equal(view.financials.estimatedContributionAfterFeesCents, 8445);
  assert.equal(view.fulfillment.state, 'draft');
  assert(!JSON.stringify(view).includes('sandbox-buyer@example.com'));
});

test('atomic daily spending cap blocks concurrent approvals across different orders', async () => {
  const f = fixture({ STUDIO_MAX_FULFILLMENT_CENTS: '2000', STUDIO_DAILY_FULFILLMENT_CENTS: '2000' });
  const first = await draftOrder(f);
  const second = await draftOrder(f);
  const responses = await Promise.all([first, second].map(({ orderId }) => f.admin({ action: 'approve', orderId })));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(f.submits(), 1);
});

test('checkout-only pause preserves verification and manual fulfillment', async () => {
  const f = fixture();
  const { orderId } = await (await f.purchase(customer())).json();
  assert.equal((await f.admin({ action: 'pause-checkout' })).status, 200);
  assert.equal((await f.post('quote', customer())).status, 503);
  assert.equal((await f.notify(f.pay(orderId))).status, 200);
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 200);
  assert.equal((await f.admin({ action: 'resume-checkout', confirm: 'resume-sandbox-checkout' })).status, 200);
  assert.equal((await f.post('quote', customer())).status, 200);
});


const uploadBytes = Buffer.from('private JPEG fixture');
const uploadMaster = {
  filename: 'test master.jpeg', key: 'test-master.jpeg',
  sha256: createHash('sha256').update(uploadBytes).digest('hex'),
};

function uploadFixture({ head = 404, writeAuthorization = 200, write = 201, read = 200, body = uploadBytes } = {}) {
  const operations = [];
  const localToken = 'local-test-token';
  const signedURL = 'https://storage.example.test/?signature=private-test-signature';
  const metadata = Buffer.from(JSON.stringify({ bytes: uploadBytes.length, sha256: uploadMaster.sha256 })).toString('base64');
  const run = createArtworkUploader({ siteID: randomUUID(), token: localToken, async fetcher(address, options) {
    const isApi = new URL(address).hostname === 'api.netlify.com';
    const method = options.method.toUpperCase();
    const headers = new Headers(options.headers);
    operations.push([isApi, method]);
    if (isApi) {
      assert.equal(headers.get('authorization'), 'Bearer ' + localToken);
      if (method === 'HEAD') return new Response(null, { status: head });
      if (method === 'PUT' && writeAuthorization !== 200) {
        return new Response('sensitive-provider-response ' + signedURL, { status: writeAuthorization });
      }
      return Response.json({ url: signedURL });
    }
    assert.equal(headers.has('authorization'), false);
    if (method === 'PUT') {
      assert.equal(headers.get('if-none-match'), '*');
      assert.deepEqual(Buffer.from(await options.body.arrayBuffer()), uploadBytes);
      return new Response(null, { status: write });
    }
    return new Response(body, { status: read, headers: { 'x-amz-meta-user': 'b64;' + metadata } });
  } });
  return { run: () => run(uploadMaster, uploadBytes), operations };
}

test('uploader reports the failing SDK operation and HTTP status without exposing provider or auth data', async () => {
  const deniedRead = uploadFixture({ head: 401 });
  await assert.rejects(deniedRead.run, /Check existing Blob metadata failed: .*Netlify API, HEAD, HTTP 401/);

  const deniedWrite = uploadFixture({ writeAuthorization: 403 });
  await assert.rejects(deniedWrite.run, error => {
    assert.match(error.message, /Conditional Blob upload failed: .*Netlify API transfer authorization, PUT, HTTP 403/);
    assert.doesNotMatch(error.message, /local-test-token|signature=|sensitive-provider-response|storage\.example/);
    return true;
  });

  const missing = uploadFixture({ read: 404 });
  await assert.rejects(missing.run, /Verify private Blob failed: .*Blob transfer, GET, HTTP 404/);

  const corrupted = uploadFixture({ body: Buffer.alloc(uploadBytes.length) });
  await assert.rejects(corrupted.run, /Verify private Blob bytes failed: .*Blob transfer, GET, HTTP 200/);
});

test('uploader verifies a conditional-write conflict before accepting it and never overwrites a Blob', async () => {
  const raced = uploadFixture({ write: 412 });
  assert.equal(await raced.run(), 'already present after conditional write, HTTP 412');
  assert.deepEqual(raced.operations, [[true, 'HEAD'], [true, 'PUT'], [false, 'PUT'], [true, 'GET'], [false, 'GET']]);

  const existing = uploadFixture({ head: 200 });
  assert.equal(await existing.run(), 'already present');
  assert.deepEqual(existing.operations, [[true, 'HEAD'], [true, 'GET'], [false, 'GET']]);
});


test('hosted status trusts Netlify deploy metadata and rejects production or absent context', async () => {
  const preview = fixture({ CONTEXT: undefined }, { deploy: { context: 'deploy-preview' } });
  assert.deepEqual(await (await preview.status()).json(), { sandbox: true, maxQuantity: 10 });
  for (const [context, reason] of [[{}, 'missing'], [{ deploy: { context: 'production' } }, 'invalid']]) {
    const f = fixture({ CONTEXT: 'deploy-preview' }, context);
    const response = await f.status();
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Studio Print checkout is unavailable.' });
    assert.deepEqual(f.diagnostics, ['context.deploy.context: ' + reason]);
  }
});

test('configuration diagnostics report invalid variable names only to the private logger', async () => {
  const f = fixture({
    SQUARE_SANDBOX_TOKEN: '',
    STUDIO_WEBHOOK_URL: 'sensitive-URL-value',
    PRODIGI_SANDBOX_KEY: 'sensitive-key-value',
    STUDIO_DESTINATIONS: 'sensitive-JSON-value',
    STUDIO_ARTWORK_SIGNING_KEY: env.STUDIO_DATA_KEY,
  });
  const response = await f.status();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Sandbox checkout configuration is incomplete.' });
  assert.deepEqual(f.diagnostics, [
    'STUDIO_WEBHOOK_URL: invalid', 'SQUARE_SANDBOX_TOKEN: missing', 'PRODIGI_SANDBOX_KEY: invalid',
    'STUDIO_DATA_KEY: reuses another security key', 'STUDIO_ARTWORK_SIGNING_KEY: reuses another security key',
    'STUDIO_DESTINATIONS: invalid',
  ]);
  const missing = fixture({ STUDIO_SANDBOX_ENABLED: undefined });
  assert.equal((await missing.status()).status, 404);
  assert.deepEqual(missing.diagnostics, ['STUDIO_SANDBOX_ENABLED: missing']);

  const inactive = fixture({ STUDIO_CHECKOUT_ENABLED: undefined });
  assert.deepEqual(await (await inactive.status()).json(), { sandbox: false, maxQuantity: 10 });
  assert.deepEqual(inactive.diagnostics, ['STUDIO_CHECKOUT_ENABLED: missing']);
});
