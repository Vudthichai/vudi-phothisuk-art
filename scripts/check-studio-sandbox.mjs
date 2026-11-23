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
  STUDIO_ADMIN_TOKEN: 'administrator-fixture-with-at-least-32-characters', PRODIGI_SANDBOX_KEY: 'sandbox_fixture',
  STUDIO_VARIANTS: JSON.stringify({ '9x12': 'fixture-small', '12x16': 'fixture-large' }),
  STUDIO_PRINT_FILES: JSON.stringify(Object.fromEntries(Object.keys(catalog.artworks).map(id => [
    id, Object.fromEntries(Object.keys(catalog.prices).map(size => [size, `https://files.example.test/${id}-${size}.jpg`])),
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
  let invalidVariant = false;
  const store = {
    async getWithMetadata(id) { return structuredClone(records.get(id) ?? null); },
    async setJSON(id, data, { onlyIfNew, onlyIfMatch }) {
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
        const order = body.order;
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
        draft.status = 'submitted';
        draft.allowedActions = [];
      }
      return Response.json({ data: draft });
    }
    assert.fail('Unexpected provider address ' + url.origin + url.pathname);
  };
  const handler = createHandler({ env: { ...env, ...overrides }, openStore: () => store, fetcher });
  const post = (action, body, headers = {}) => handler(new Request(endpoint + action, {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
  }));
  function pay(orderId, options = {}) {
    const id = 'payment-' + orderId;
    const money = orders.get(orderId).total_money;
    payments.set(id, { id, order_id: orderId, location_id: 'location', status: 'COMPLETED', amount_money: money, total_money: money, ...options });
    return id;
  }
  const notify = (id, signature, status = 'COMPLETED') => {
    const event = { type: 'payment.updated', merchant_id: 'merchant', data: { object: { payment: { id, status } } } };
    const valid = createHmac('sha256', env.SQUARE_WEBHOOK_KEY).update(env.STUDIO_WEBHOOK_URL).update(JSON.stringify(event)).digest('base64');
    return post('webhook', event, { 'x-square-hmacsha256-signature': signature ?? valid });
  };
  const admin = input => post('admin', input, { Authorization: 'Bearer ' + env.STUDIO_ADMIN_TOKEN });
  return {
    records, orders, drafts, draftCalls, pay, notify, post, admin, submits: () => submits,
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
      const draft = f.draftCalls.at(-1);
      assert.equal(draft.submit, false);
      assert.equal(draft.recipient.address.countryCode, 'US');
      assert.deepEqual(draft.items, [{
        sku: size === '9x12' ? 'fixture-small' : 'fixture-large', quantity: 2, sizing: 'fitPrintArea',
        assets: [{ printArea: 'default', url: `https://files.example.test/${artwork}-${size}.jpg` }],
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
