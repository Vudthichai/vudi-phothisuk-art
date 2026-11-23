import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import catalog from '../src/studio/print-catalog.json' with { type: 'json' };
import { createHandler } from '../netlify/functions/studio-print.mjs';

const base = 'https://deploy-preview.example.test';
const endpoint = base + '/api/studio-print/';
const env = {
  CONTEXT: 'deploy-preview', STUDIO_SANDBOX_ENABLED: 'true',
  SQUARE_SANDBOX_TOKEN: 'fixture', SQUARE_SANDBOX_LOCATION: 'location', SQUARE_SANDBOX_MERCHANT: 'merchant',
  SQUARE_WEBHOOK_KEY: 'webhook-fixture', STUDIO_WEBHOOK_URL: endpoint + 'webhook',
  STUDIO_ADMIN_TOKEN: '1'.repeat(64), STUDIO_DATA_KEY: '2'.repeat(64),
  STUDIO_FULFILLMENT_ENABLED: 'true', STUDIO_MAX_FULFILLMENT_CENTS: '2000', STUDIO_PRINT_HOST: 'files.example.com', PRODIGI_SANDBOX_KEY: 'sandbox_fixture',
  STUDIO_VARIANTS: JSON.stringify({ '9x12': 'fixture-small', '12x16': 'fixture-large' }),
  STUDIO_PRINT_FILES: JSON.stringify(Object.fromEntries(Object.keys(catalog.artworks).map(id => [
    id, Object.fromEntries(Object.keys(catalog.prices).map(size => [size, `https://files.example.com/${id}-${size}.jpg?fixture=download`])),
  ]))),
  STUDIO_DESTINATIONS: JSON.stringify({
    'OR-97201': { shippingCents: 799, additionalCents: 100, taxBps: 0, taxShipping: false },
    'PA-15201': { shippingCents: 799, additionalCents: 100, taxBps: 700, taxShipping: true },
  }),
};

function fixture(overrides = {}) {
  const records = new Map();
  const orders = new Map();
  const attempts = new Map();
  const payments = new Map();
  const drafts = new Map();
  const draftCalls = [];
  let submits = 0;
  let failDraft = false;
  let submitFailure;
  let submitHold;
  let invalidVariant = false;
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
    if (url.hostname === 'api.prodigi.com') {
      assert.equal(init.headers['X-API-Key'], 'sandbox_fixture');
      if (url.pathname.startsWith('/v5/catalogue/variants/')) {
        const sku = url.pathname.split('/').at(-1);
        const [width, height] = sku.endsWith('small') ? [9, 12] : [12, 16];
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
          ...body, id: `prodigi-${drafts.size + 1}`, status: 'draft', allowedActions: ['submit'],
          costs: { total: { amount: '12.34', currency: 'USD' } },
          shipments: [],
        });
        return Response.json({ data: drafts.get(key) }, { status: 202 });
      }
      const draft = [...drafts.values()].find(value => value.id === url.pathname.split('/').at(-1).split(':')[0]);
      assert(draft, url.pathname);
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
  const handler = createHandler({ env: { ...env, ...overrides }, openStore: () => store, fetcher });
  const request = (action, body, headers = {}, origin = base) => handler(new Request(origin + '/api/studio-print/' + action, {
    method: 'POST', body, headers: { 'Content-Type': 'application/json', ...(action === 'checkout' && { Origin: base }), ...headers },
  }));
  const post = (action, body, headers) => request(action, JSON.stringify(body), headers);
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
    records, orders, drafts, draftCalls, pay, notify, post, request, admin, submits: () => submits,
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
      const response = await f.post('checkout', customer({ artwork, size, priceCents: 1 }));
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
      assert(!JSON.stringify(data).includes('files.example.com'));
      assert.equal(typeof data.recipientBox, 'string');
      const draft = f.draftCalls.at(-1);
      assert.equal(draft.submit, false);
      assert.equal(draft.recipient.address.countryCode, 'US');
      assert.deepEqual(draft.items, [{
        sku: size === '9x12' ? 'fixture-small' : 'fixture-large', quantity: 2, sizing: 'fitPrintArea',
        assets: [{ printArea: 'default', url: `https://files.example.com/${artwork}-${size}.jpg?fixture=download` }],
      }]);
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
  ]) assert.equal((await f.post('checkout', customer(input))).status, 400);
  f.setInvalidVariant(true);
  assert.equal((await f.post('checkout', customer())).status, 503);
  assert.equal(f.orders.size, 0);
  assert.equal((await f.post('checkout', customer(), { Origin: 'https://other.example.test' })).status, 403);
});

test('unsigned events, unsuccessful payments and amount changes cannot create drafts', async () => {
  const f = fixture();
  const { orderId } = await (await f.post('checkout', customer())).json();
  assert.equal((await f.notify(f.pay(orderId), 'forged')).status, 401);
  assert.deepEqual(await (await f.notify(f.pay(orderId, { status: 'FAILED' }))).json(), { ignored: true });
  assert.deepEqual(await (await f.notify(f.pay(orderId), undefined, 'PENDING')).json(), { ignored: true });
  assert.equal((await f.notify(f.pay(orderId, { amount_money: { amount: 1, currency: 'USD' } }))).status, 502);
  assert.equal(f.drafts.size, 0);
});

test('duplicate webhooks, temporary provider failures, and concurrent admin approvals are safe', async () => {
  const f = fixture();
  const input = customer();
  const { orderId } = await (await f.post('checkout', input)).json();
  assert.equal((await (await f.post('checkout', input)).json()).orderId, orderId);
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
    [{ STUDIO_PRINT_FILES: '{}' }, 503],
    [{ PRODIGI_SANDBOX_KEY: 'live_never' }, 503],
    [{ CONTEXT: 'production' }, 404],
    [{ STUDIO_SANDBOX_ENABLED: 'false' }, 404],
  ]) assert.equal((await fixture(overrides).post('checkout', customer())).status, status);
});

async function draftOrder(f) {
  const response = await f.post('checkout', customer());
  assert.equal(response.status, 200);
  const { orderId } = await response.json();
  const paymentId = f.pay(orderId);
  assert.equal((await f.notify(paymentId)).status, 200);
  return { orderId, paymentId, supplier: [...f.drafts.values()][0] };
}

test('rejects stale authenticated events, wrong currency, order mutations and unauthorized admin requests', async () => {
  const f = fixture();
  const { orderId } = await (await f.post('checkout', customer())).json();
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
  const f = fixture({ STUDIO_MAX_QUANTITY: '2' });
  assert.equal((await f.post('checkout', customer({ quantity: 3 }))).status, 400);
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
  const unpaid = await (await f.post('checkout', customer())).json();
  assert.deepEqual(await (await f.admin({ action: 'pause' })).json(), { paused: true });
  assert.equal((await approve()).status, 503);
  assert.equal((await f.notify(f.pay(unpaid.orderId))).status, 503);
  assert.equal((await f.post('checkout', customer())).status, 503);
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

test('private URL configuration rejects credentials, alternate hosts and internal hosts', async () => {
  for (const value of [
    'https://files.example.com@bad.example.com/master.jpg',
    'https://files.example.com:8080/master.jpg',
    'https://172.16.0.1/master.jpg',
    'https://files.example.com/master.svg?fixture=download',
    'https://files.example.com/master.jpg',
  ]) {
    const files = JSON.parse(env.STUDIO_PRINT_FILES);
    files['mother-nature']['9x12'] = value;
    const f = fixture({ STUDIO_PRINT_FILES: JSON.stringify(files) });
    assert.equal((await f.post('checkout', customer())).status, 503);
  }
  assert.equal((await fixture({ STUDIO_FULFILLMENT_ENABLED: 'false' }).post('checkout', customer())).status, 503);
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
