import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import launchPolicy from '../server/commerce/studio-policy.json' with { type: 'json' };
import catalog from '../server/commerce/studio-catalog.json' with { type: 'json' };
import { artworkMasters, artworkReference, maxArtworkBytes, signArtwork } from '../server/commerce/studio-artwork.mjs';
import { createHandler } from '../netlify/functions/studio-print.mjs';

import { createArtworkUploader } from './upload-studio-masters.mjs';

import { checkVariant } from '../server/commerce/studio-api.mjs';
import { studioConfig } from '../server/commerce/studio-config.mjs';
import { destinationSupplierQuote } from '../server/commerce/studio-finance.mjs';
const base = 'https://vudiphothisukart.com';
const preview = 'https://deploy-preview-199--vudi-phothisuk-art.netlify.app';
const env = {
  STUDIO_MODE: 'live',
  SQUARE_ACCESS_TOKEN: 'fixture', SQUARE_WEBHOOK_SIGNATURE_KEY: 'webhook-fixture',
  STUDIO_ADMIN_TOKEN: '1'.repeat(64), STUDIO_MASTER_KEY: '2'.repeat(64), PRODIGI_API_KEY: 'live_fixture',
};
const rate = { shippingCents: { '9x12': 799, '12x16': 799 },
  approvedSupplierCents: { '9x12': 2000, '12x16': 2000 }, taxBps: 700, taxShipping: true };
const policy = {
  square: { locationId: 'location', merchantId: 'merchant' },
  origins: { 'live-test': preview, live: base }, testRun: 'fixture-first',
  limits: { customerCents: 15000, supplierCents: 3500 }, destinations: { 'PA-15201': rate },
};

const prodigiVariants = {
  'GLOBAL-PAP-9X12': {
    sku: 'GLOBAL-PAP-9X12', name: 'Photographic Art Print 23x31cm / 9x12"',
    attributes: { paperType: 'lpp', substrateWeight: '240gsm' },
    dimensions: { width: { in: 9.02 }, height: { in: 12.01 } },
    printAreas: [{ name: 'default', required: true, widthMm: 229, heightMm: 305, recommendedDpi: 300 }],
    shipsTo: ['Worldwide'],
  },
  'GLOBAL-PAP-12X16': {
    sku: 'GLOBAL-PAP-12X16', name: 'Photographic Art Print, 240gsm, 30x40cm / 12x16"',
    attributes: { paperType: 'lpp', substrateWeight: '240gsm' },
    dimensions: { width: { in: 12 }, height: { in: 16 } },
    printAreas: [{ name: 'default', required: true, widthMm: 304.8, heightMm: 406.4, recommendedDpi: 300 }],
    shipsTo: ['Worldwide'],
  },
};

function fixture(overrides = {}, context = 'production', launchPolicy = policy) {
  const deployContext = context ? { deploy: { context } } : {};
  const origin = context === 'deploy-preview' ? preview : base;
  const endpoint = origin + '/api/studio-print/';
  const diagnostics = [];
  const providerDiagnostics = [];
  const records = new Map();
  const orders = new Map();
  const attempts = new Map();
  const payments = new Map();
  const drafts = new Map();
  const draftCalls = [];
  let submits = 0;
  let failDraft = false;
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
  let invalidVariant = false;
  let quoteCurrency = 'USD';
  let quoteFailure = false;
  let catalogueUnauthorized = false;
  const store = {
    async list({ prefix }) {
      return { blobs: [...records.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) };
    },
    async getWithMetadata(id) { return structuredClone(records.get(id) ?? null); },
    async setJSON(id, data, { onlyIfNew, onlyIfMatch } = {}) {
      const previous = records.get(id);
      if ((onlyIfNew && previous) || (onlyIfMatch && onlyIfMatch !== previous?.etag)) return { modified: false };
      const etag = randomUUID();
      records.set(id, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
  };
  function priceOrder(order) {
    const subtotal = Number(order.line_items[0].quantity) * order.line_items[0].base_price_money.amount;
    const shipping = order.service_charges?.[0]?.amount_money.amount ?? 0;
    const tax = Math.round((subtotal + (order.service_charges?.[0]?.taxable ? shipping : 0)) *
      Number(order.taxes?.[0]?.percentage ?? 0) / 100);
    return { ...order, total_tax_money: { currency: 'USD', amount: tax },
      total_money: { currency: 'USD', amount: subtotal + shipping + tax } };
  }
  let destinationShipping = 1285;
  let destinationOptions = [{ method: 'standard' }];
  let county = '42003';
  let badQuoteLineId = false;
  let rejectMuseum = false;
  const fetcher = async (address, init) => {
    const url = new URL(address);
    const body = init.body && JSON.parse(init.body);
    if (url.hostname === 'connect.squareup.com') {
      assert.equal(init.headers.Authorization, 'Bearer fixture');
      if (url.pathname === '/v2/online-checkout/payment-links') {
        if (attempts.has(body.idempotency_key)) return Response.json(attempts.get(body.idempotency_key));
        assert.equal(body.checkout_options.ask_for_shipping_address, false);
        const id = 'order-' + (orders.size + 1);
        const order = priceOrder({ ...body.order, id });
        orders.set(id, order);
        const result = { payment_link: { id: 'link-' + id, order_id: id, url: `https://square.link/u/${id}` } };
        attempts.set(body.idempotency_key, result);
        return Response.json(result);
      }
      if (url.pathname === '/v2/orders/calculate') return Response.json({ order: priceOrder(body.order) });
      if (url.pathname === '/v2/locations/location') {
        return Response.json({ location: { id: 'location', country: 'US', currency: 'USD', status: 'ACTIVE', merchant_id: 'merchant' } });
      }
      if (url.pathname === '/v2/merchants/merchant') return Response.json({ merchant: { id: 'merchant', status: 'ACTIVE', country: 'US', currency: 'USD', main_location_id: 'location' } });
      if (url.pathname.startsWith('/v2/orders/')) return Response.json({ order: orders.get(url.pathname.split('/').at(-1)) });
      if (url.pathname.startsWith('/v2/payments/')) return Response.json({ payment: payments.get(url.pathname.split('/').at(-1)) });
    }
    if (url.href === 'https://api.prodigi.com/v4.0/quotes') {
      assert.equal(init.headers['X-API-Key'], 'fixture');
      assert.equal(body.destinationCountryCode, 'US');
      assert.equal(body.currencyCode, 'USD');
      assert.equal(body.shippingMethod, 'Standard');
      if (quoteFailure) return new Response('sensitive upstream body fixture', { status: quoteFailure === true ? 503 : quoteFailure });
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
    if (url.hostname === 'geocoding.geo.census.gov') {
      assert.equal(url.pathname, '/geocoder/geographies/address');
      const state = url.searchParams.get('state');
      const zip = url.searchParams.get('zip');
      const matchedCounty = { '15213': '42003', '19130': '42101', '19106': '42101', '17101': '42043' }[zip] ?? county;
      const match = state === 'PA' ? matchedCounty && !(rejectMuseum && zip === '19130') : zip === '90012';
      return Response.json({ result: { addressMatches: match ? [{
        addressComponents: { state, zip },
        geographies: { Counties: [{ GEOID: matchedCounty }] },
      }] : [] } });
    }
    if (url.href === 'https://api.prodigi.com/v5/quotes/order') {
      assert.equal(init.headers['X-API-Key'], 'live_fixture');
      assert.equal(body.shippingMethod, 'standard');
      assert.notEqual(body.shippingAddress.line2, '');
      if (quoteFailure) return new Response('sensitive upstream response fixture', { status: 503 });
      assert(['PA', 'CA'].includes(body.shippingAddress.stateOrCounty));
      const [line] = body.items;
      const usd = cents => ({ amount: (cents / 100).toFixed(2), currency: 'USD' });
      const production = line.catalogueVariantId.endsWith('9X12') ? 1300 : 1400;
      return Response.json({ data: {
        lineItems: [{ id: badQuoteLineId ? null : 'line', ...line }], shipments: [{ itemIds: ['line'], fulfillmentLocation: { countryCode: 'US', labCode: 'prodigi_us' } }],
        shippingOptions: destinationOptions,
        items: usd(production), shipping: usd(destinationShipping), tax: usd(180),
        total: usd(production + 180 + destinationShipping),
      } });
    }
    if (url.hostname === 'api.prodigi.com') {
      assert.equal(init.headers['X-API-Key'], 'live_fixture');
      if (url.pathname.startsWith('/v5/catalogue/variants/')) {
        if (catalogueUnauthorized) return new Response('sensitive upstream body fixture', { status: 401 });
        const sku = url.pathname.split('/').at(-1);
        const data = structuredClone(prodigiVariants[sku]);
        if (invalidVariant) data.attributes.paperType = 'matte';
        return Response.json({ data });
      }
      if (url.pathname === '/v5/orders') {
        draftCalls.push(body);
        if (failDraft) return new Response(null, { status: 503 });
        const key = init.headers['Idempotency-Key'];
        assert.equal(key.length, 64);
        if (!drafts.has(key)) drafts.set(key, {
          ...body, items: body.items.map(item => ({
            ...item, id: 'item-1', status: 'pending',
            assets: item.assets.map(asset => ({ ...asset, status: 'NotYetDownloaded' })),
          })),
          id: `prodigi-${drafts.size + 1}`, status: 'draft', allowedActions: ['submit'],
          totals: { total: { amount: '12.34', currency: 'USD' } },
          shipments: [],
        });
        return Response.json({ data: drafts.get(key) }, { status: 202 });
      }
      const draft = [...drafts.values()].find(value => value.id === url.pathname.split('/')[3]?.split(':')[0]);
      assert(draft, url.pathname);
      if (url.pathname.endsWith(':submit')) submits++;
      assert.equal(init.method, 'GET', 'Dashboard preparation must not write to an existing supplier draft');
      return Response.json({ data: draft });
    }
    assert.fail('Unexpected provider address ' + url.origin + url.pathname);
  };
  const handler = createHandler({ env: { ...env, ...overrides }, launchPolicy, openStore: () => store, openArtworkStore: () => artworkStore, fetcher, reportProvider: message => providerDiagnostics.push(message), reportConfig: issues => diagnostics.push(...issues) });
  const request = (action, body, headers = {}, targetOrigin = origin) => handler(new Request(targetOrigin + '/api/studio-print/' + action, {
    method: 'POST', body, headers: { 'Content-Type': 'application/json', ...(['checkout', 'review'].includes(action) && { Origin: origin }), ...headers },
  }), deployContext);
  const post = (action, body, headers) => request(action, JSON.stringify(body), headers);
  async function purchase(input, headers) {
    const response = await post('review', input, headers);
    if (!response.ok) return response;
    const { reviewId } = await response.json();
    return post('checkout', { reviewId, invite: input.invite, shippingCents: 1, totalCents: 1, quantity: 1000 }, headers);
  }
  function pay(orderId, options = {}) {
    const id = 'payment-' + orderId;
    const money = orders.get(orderId).total_money;
    payments.set(id, { id, order_id: orderId, location_id: 'location', status: 'COMPLETED', amount_money: money, total_money: money, ...options });
    return id;
  }
  const notify = (id, signature, status = 'COMPLETED', createdAt = new Date().toISOString()) => {
    const event = { created_at: createdAt, type: 'payment.updated', merchant_id: 'merchant', data: { object: { payment: { id, status } } } };
    const valid = createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY).update(endpoint + 'webhook').update(JSON.stringify(event)).digest('base64');
    return post('webhook', event, { 'x-square-hmacsha256-signature': signature ?? valid });
  };
  const admin = input => post('admin', input, { Authorization: 'Bearer ' + env.STUDIO_ADMIN_TOKEN });
  return {
    records, orders, drafts, draftCalls, pay, notify, post, purchase, request, admin, submits: () => submits,
    masters, image, served: () => served, download: (url, method = 'GET') => handler(new Request(url, { method }), deployContext),
    status: () => handler(new Request(endpoint + 'status'), deployContext), diagnostics, providerDiagnostics,
    denyCatalogue: () => { catalogueUnauthorized = true; },
    setQuoteCurrency: value => { quoteCurrency = value; }, setQuoteFailure: value => { quoteFailure = value; },
    invalidateQuoteLineId: () => { badQuoteLineId = true; },
    rejectMuseumAddress: () => { rejectMuseum = true; },
    setDestinationShipping: value => { destinationShipping = value; },
    setDestinationOptions: value => { destinationOptions = value; },
    setCounty: value => { county = value; },
    setFailDraft: value => { failDraft = value; }, setInvalidVariant: value => { invalidVariant = value; },
  };
}

function customer(overrides = {}) {
  return {
    attemptId: randomUUID(), artwork: 'mother-nature', size: '9x12', quantity: 1,
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
      const { data } = f.records.get('order-' + orderId);
      assert.equal(data.unitCents, price);
      assert.equal(data.shippingCents, 799);
      assert.equal(data.taxCents, Math.round((price + 799) * 0.07));
      assert.equal(data.state, 'draft');
      assert(!JSON.stringify(data).includes('sandbox-buyer@example.com'));
      assert(!JSON.stringify(data).includes('sig='));
      assert.equal(typeof data.recipientBox, 'string');
      const draft = f.draftCalls.at(-1);
      assert.equal(draft.submit, false);
      assert.equal(draft.recipient.address.countryCode, 'US');
      const [item] = draft.items;
      assert.equal(item.sku, catalog.variants[size]);
      assert.equal(item.quantity, 1);
      assert.equal(item.sizing, 'fitPrintArea');
      const asset = item.assets[0];
      assert.equal(asset.printArea, 'default');
      const artworkURL = new URL(asset.url);
      assert.equal(artworkURL.origin + artworkURL.pathname, artworkReference(base, artwork));
      assert(artworkURL.searchParams.has('grant'));
    }
  }
  assert.equal(f.drafts.size, 10);
  assert.equal(f.submits(), 0);
});

test('v5 Standard quotes use selected top-level totals and shipments, not alternative options', async () => {
  const config = studioConfig(env, 'production', launchPolicy);
  const usd = amount => ({ amount, currency: 'USD' });

  for (const [size, production, total] of [['9x12', '13.00', '25.85'], ['12x16', '14.00', '26.85']]) {
    const sku = catalog.variants[size];
    const address = { line1: '4400 Forbes Avenue', townOrCity: 'Pittsburgh',
      stateOrCounty: 'PA', postalOrZipCode: '15213', countryCode: 'US' };
    const selected = { sku, size, quantity: 1, recipient: { address } };
    const standard = {
      items: usd(production), shipping: usd('12.85'), tax: usd('0.00'), total: usd(total),
      lineItems: [{ id: 'line-1', catalogueVariantId: sku, quantity: 1 }],
      shipments: [{ itemIds: ['line-1'], carrier: 'USPS', service: 'USPS Priority Mail',
        fulfillmentLocation: { countryCode: 'US', labCode: 'prodigi_us' } }],
    };
    const run = data => destinationSupplierQuote(async request => {
      assert.deepEqual(request, { items: [{ catalogueVariantId: sku, quantity: 1 }],
        shippingAddress: address, shippingMethod: 'standard', currencyCode: 'USD' });
      return { quote: data, upstreamStatus: 200 };
    }, config, selected);

    const alternatives = [{ method: 'budget', cost: usd('1.00') }, { method: 'express', cost: usd('90.00') }];
    for (const shippingOptions of [undefined, [], alternatives]) {
      const result = await run({ ...standard, shippingOptions });
      assert.equal(result.shippingCents, 1285);
      assert.equal(result.supplierQuoteCents, Math.round(Number(total) * 100));
    }
    await assert.rejects(run({ shippingOptions: alternatives }), { code: 'QUOTE_PRODUCT' });
    await assert.rejects(run({ ...standard, shipping: { amount: '12.85', currency: 'CAD' } }),
      { code: 'QUOTE_TOTALS' });
    await assert.rejects(run({ ...standard, shipments: [{ ...standard.shipments[0], itemIds: ['unrelated'] }] }),
      { code: 'QUOTE_SHIPMENT_ITEMS' });
    await assert.rejects(run({ ...standard, shipments: [{ ...standard.shipments[0],
      fulfillmentLocation: { countryCode: 'CA', labCode: 'other' } }] }), { status: 409 });
  }
});

test('production quotes verified Standard shipping and calculates Pennsylvania-only destination tax', async () => {
  const nationwide = { ...launchPolicy, square: policy.square, origins: policy.origins };
  const input = customer({ state: 'CA', city: 'Los Angeles', zip: '90012', size: '12x16' });
  const missing = fixture({}, 'production', { ...nationwide, retailCollectionStates: [] });
  assert.equal((await missing.status()).status, 503);
  const f = fixture({}, 'production', nationwide);
  for (const address of [{ state: 'HI', zip: '96801' }, { state: 'AK', zip: '99501' }, { zip: '96201' }]) {
    assert.equal((await f.post('review', { ...input, ...address })).status, 400);
  }
  f.setDestinationOptions([{ method: 'budget' }]);
  assert.equal((await f.post('review', input)).status, 200);

  const pa = customer({ zip: '15024', size: '12x16' });
  for (const [county, tax] of [['42003', 755], ['42101', 863], ['42001', 647]]) {
    f.setCounty(county);
    const review = await (await f.post('review', pa)).json();
    assert.equal(review.shippingCents, 1285);
    assert.equal(review.taxCents, tax);
  }
  f.setCounty(null);
  assert.equal((await f.post('review', pa)).status, 400);
  assert.equal((await f.post('review', { ...input, zip: '15024' })).status, 400);

  const review = await (await f.post('review', input)).json();
  assert.equal(review.shippingCents, 1285);
  assert.equal(review.taxCents, 0);
  assert.equal(review.totalCents, 10785);
  f.setDestinationShipping(1385);
  assert.equal((await f.post('checkout', { reviewId: review.reviewId })).status, 409);
  assert.equal(f.orders.size, 0);
  f.setDestinationShipping(1285);
  const link = await f.post('checkout', { reviewId: review.reviewId });
  assert.equal(link.status, 200);
  const { orderId } = await link.json();
  const paymentId = f.pay(orderId);
  assert.equal((await f.notify(paymentId)).status, 200);
  assert.equal((await f.notify(paymentId)).status, 200);
  assert.equal(f.drafts.size, 1);
  assert.equal(f.draftCalls[0].shippingMethod, 'standard');
  assert.equal(f.draftCalls[0].items[0].sku, 'GLOBAL-PAP-12X16');
  const record = f.records.get('order-' + orderId).data;
  assert.equal(record.supplierQuoteCents, 2865);
  assert.equal(record.approvedSupplierCents, 3100);
  const supplier = [...f.drafts.values()][0];
  supplier.status = 'in_production';
  supplier.totals = { tax: { amount: '1.88', currency: 'USD' },
    total: { amount: '28.73', currency: 'USD' } };
  const reconciliation = await (await f.admin({ action: 'refresh', orderId })).json();
  assert.equal(reconciliation.costs.total.amount, '28.73');
  assert.equal(f.records.get('order-' + orderId).data.supplierQuoteCents, 2865);
  assert.equal(f.drafts.size, 1);
  assert.equal(f.submits(), 0);
});

test('the two fixed bundle definitions bind five distinct private masters without enabling checkout', async () => {
  assert.equal(catalog.bundleArtworkIds.length, 5);
  assert.equal(new Set(catalog.bundleArtworkIds).size, 5);
  assert.deepEqual(catalog.bundlePrices, { '9x12': 18000, '12x16': 38000 });
  const f = fixture();
  for (const size of Object.keys(catalog.bundlePrices)) {
    const assets = catalog.bundleArtworkIds.map(id => artworkReference(base, id));
    assert.equal(new Set(assets).size, 5);
    assert(assets.every(url => url.startsWith(base + '/api/studio-print/artwork/')));
    assert.equal((await f.post('review', customer({
      artwork: 'studio-forest-and-flowers-collection', size,
    }))).status, 400);
  }
  assert.equal(f.orders.size, 0);
  assert.equal(f.drafts.size, 0);
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

test('duplicate webhooks and dashboard reconciliation preserve one draft', async () => {
  const f = fixture();
  const { reviewId } = await (await f.post('review', customer())).json();
  const checkout = { reviewId };
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
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 409);
  f.pay(orderId);
  assert.equal((await f.admin({ action: 'approve', orderId })).status, 400);
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 200);
  assert.equal(f.submits(), 0);
  const supplier = [...f.drafts.values()][0];
  supplier.status = 'shipped';
  supplier.shipments = [{ carrier: 'Fixture carrier', trackingNumber: '12345', trackingUrl: 'https://carrier.example.test/12345' }];
  const refreshed = await (await f.admin({ action: 'refresh', orderId })).json();
  assert.equal(refreshed.state, 'shipped');
  assert.equal(refreshed.approval, 'accepted');
  assert.equal(f.records.get('order-' + orderId).data.approval, 'accepted');
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 409);
  assert.equal(refreshed.costs.total.amount, '12.34');
  assert.equal(refreshed.tracking[0].trackingNumber, '12345');
});

test('missing credentials, a sandbox Prodigi key, and off mode all fail closed', async () => {
  for (const [overrides, status] of [
    [{ SQUARE_ACCESS_TOKEN: '' }, 503],
    [{ STUDIO_MASTER_KEY: '' }, 503],
    [{ PRODIGI_API_KEY: 'sandbox_never' }, 503],
    [{ STUDIO_MODE: 'off' }, 404],
    [{ STUDIO_MODE: 'unknown' }, 404],
  ]) assert.equal((await fixture(overrides).purchase(customer())).status, status);
});

async function draftOrder(f, address = {}) {
  const response = await f.purchase(customer(address));
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
  const f = fixture();
  assert.equal((await f.purchase(customer({ quantity: 3 }))).status, 400);
  const { orderId, supplier } = await draftOrder(f);
  const approve = () => f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId });
  delete supplier.items[0].sku;
  const missingSKU = await approve();
  assert.equal(missingSKU.status, 409);
  assert.equal((await missingSKU.json()).code, 'DRAFT_PRODUCT');
  supplier.items[0].sku = 'GLOBAL-PAP-9X12';
  supplier.totals.total.amount = '20.01';
  assert.equal((await approve()).status, 409);
  delete supplier.totals;
  supplier.costs = { total: { amount: '12.34', currency: 'USD' } };
  const missingTotals = await approve();
  assert.equal(missingTotals.status, 409);
  assert.equal((await missingTotals.json()).code, 'SUPPLIER_TOTAL_INVALID');
  for (const total of [{ amount: '12.34', currency: 'GBP' }, { amount: 12.34, currency: 'USD' },
    { amount: '12.345', currency: 'USD' }, { amount: '0.00', currency: 'USD' },
    { amount: '35.01', currency: 'USD' }]) {
    supplier.totals = { total };
    assert.equal((await approve()).status, 409);
  }
  delete supplier.costs;
  supplier.totals = { total: { amount: '20.00', currency: 'USD' } };
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
  assert.equal((await f.admin({ action: 'resume', confirm: 'resume-studio-print' })).status, 200);
  assert.equal((await approve()).status, 200);
});

test('private artwork is gated by the allowlist, signature, expiry, origin, and sandbox environment', async () => {
  const f = fixture();
  const config = studioConfig(env, 'production', policy);
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
  assert.equal((await fixture({ STUDIO_MODE: 'off' }).download(signed)).status, 404);
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
  const { artwork: readiness } = await (await f.admin({ action: 'preflight' })).json();
  assert.equal(readiness.find(result => result.artwork === 'mother-nature').ready, false);
  assert.equal(readiness.filter(result => result.ready).length, 4);
  assert.equal((await fixture({ STUDIO_MODE: 'off' }).purchase(customer())).status, 404);
});

test('approval renews an expired artwork grant without changing the supplier item', async () => {
  const f = fixture();
  const { orderId, supplier } = await draftOrder(f);
  const item = structuredClone(supplier.items[0]);
  const url = item.assets[0].url;
  const token = new URL(url).searchParams.get('grant');
  const grant = f.records.get('artwork-grant-' + createHash('sha256').update(token).digest('hex')).data;
  const otherMaster = url.replace(artworkMasters['mother-nature'].key, artworkMasters['tiger-lily'].key);
  assert.equal((await f.download(otherMaster)).status, 404);
  grant.validUntil = Date.now() - 1000;
  assert.equal((await f.download(url, 'HEAD')).status, 404);
  grant.revoked = true;
  const blocked = await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId });
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).code, 'ARTWORK_ACCESS');
  assert.equal(f.records.get('order-' + orderId).data.approval, undefined);
  delete grant.revoked;
  const deadline = grant.deadline;
  grant.deadline = Date.now() + 1000;
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 409);
  assert.equal(f.records.get('order-' + orderId).data.approval, undefined);
  grant.deadline = deadline;
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 200);
  assert.equal(f.submits(), 0);
  assert.deepEqual(supplier.items[0], item);
  assert.equal((await f.download(url, 'HEAD')).status, 200);
});

test('legacy artwork must be authentic and have sufficient time left before approval', async () => {
  const f = fixture();
  const { orderId, supplier } = await draftOrder(f);
  delete f.records.get('order-' + orderId).data.artworkGrant;
  const reference = artworkReference(base, 'mother-nature');
  const config = studioConfig(env, 'production', policy);
  const asset = supplier.items[0].assets[0];
  const signed = signArtwork(config, reference);
  for (const invalid of [
    signArtwork(config, reference, Date.now() - 25 * 3600000),
    signed.replace(/sig=./, 'sig=z'),
  ]) {
    asset.url = invalid;
    const result = await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId });
    assert.equal(result.status, 409);
    assert.equal((await result.json()).code, 'ARTWORK_ACCESS');
    assert.equal(f.records.get('order-' + orderId).data.approval, undefined);
  }
  asset.url = signed;
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 200);
  assert.equal(f.submits(), 0);
  assert.equal(asset.url, signed);
});

test('dashboard preparation renews only the exact expired legacy link for the recovered test draft', async () => {
  const testPolicy = { ...policy, destinations: launchPolicy.destinations };
  const testEnv = { ...env, STUDIO_MODE: 'live-test' };
  const f = fixture(testEnv, 'deploy-preview', testPolicy);
  const { invite } = await (await f.admin({ action: 'test-invite' })).json();
  const { orderId, supplier } = await draftOrder(f, { zip: '15024', invite });
  const record = f.records.get('order-' + orderId).data;
  supplier.id = record.prodigiId = '75431017083608576';
  record.approval = 'rejected';
  delete record.artworkGrant;
  const config = studioConfig(testEnv, 'deploy-preview', testPolicy);
  const artwork = artworkReference(preview, 'mother-nature');
  const expired = signArtwork(config, artwork, Date.now() - 49 * 3600000);
  const other = signArtwork(config, artwork, Date.now() - 50 * 3600000);
  supplier.items[0].id = '75448401795763712';
  supplier.items[0].assets[0].url = expired;
  supplier.items.push({ id: '75431017103042048', status: 'ignored', quantity: 1 });
  supplier.totals = { total: { amount: '25.85', currency: 'USD' } };
  assert.equal((await f.download(expired)).status, 404);
  const reply = await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId });
  assert.equal(reply.status, 200);
  const ready = await reply.json();
  assert.equal(ready.prodigiId, '75431017083608576');
  assert.equal(ready.supplierTotalCents, 2585);
  assert(ready.artworkValidUntil > Date.now());
  assert.equal((await f.download(expired, 'HEAD')).status, 200);
  assert.equal((await f.download(other)).status, 404);
  assert.equal(record.approval, 'rejected');
  assert.equal(f.submits(), 0);
  assert.equal(supplier.items[0].assets[0].url, expired);
});

test('review expires and live supplier checks block payment without a usable quote', async () => {
  const f = fixture();
  const response = await f.post('review', customer({ artwork: 'ethereal-bloom', size: '12x16' }));
  assert.equal(response.status, 200);
  const offer = await response.json();
  assert.equal(offer.printCents, 9500);
  assert.equal(offer.shippingCents, 799);
  assert.equal(offer.taxCents, 721);
  assert.equal(offer.totalCents, 11020);
  assert.equal(f.orders.size, 0);
  f.records.get('review-' + offer.reviewId).data.expires = Date.now() - 1;
  assert.equal((await f.post('checkout', { reviewId: offer.reviewId })).status, 409);
  assert.equal((await f.post('checkout', { reviewId: randomUUID() })).status, 409);
  f.setQuoteCurrency('GBP');
  assert.equal((await f.purchase(customer())).status, 503);
  f.setQuoteFailure(true);
  assert.equal((await f.purchase(customer())).status, 502);
  assert.equal(f.orders.size, 0);
});

test('Prodigi catalogue variants use structured paper stock and inclusive dimension bounds', () => {
  for (const [size, sku] of Object.entries(catalog.variants)) {
    const variant = prodigiVariants[sku];
    assert.doesNotThrow(() => checkVariant(variant, { size, sku }));
  }

  const selected = { size: '9x12', sku: 'GLOBAL-PAP-9X12' };
  const baseVariant = prodigiVariants[selected.sku];
  const failures = [
    variant => { variant.sku = 'GLOBAL-PAP-12X16'; },
    variant => { variant.attributes.paperType = 'matte'; },
    variant => { variant.attributes.substrateWeight = '200gsm'; },
    variant => { delete variant.attributes; },
    variant => { variant.dimensions.width.in = 9.0201; },
    variant => { variant.dimensions.width.in = '9.02'; },
    variant => { variant.printAreas[0].name = 'back'; },
    variant => { variant.printAreas[0].required = false; },
    variant => { variant.printAreas.push({ name: 'back', required: true }); },
    variant => { variant.shipsTo = ['GB']; },
  ];
  for (const change of failures) {
    const variant = structuredClone(baseVariant);
    variant.name = 'Lustre Photo Paper, 240gsm';
    change(variant);
    assert.throws(() => checkVariant(variant, selected), /Lustre print variant is unavailable/);
  }
});

test('the recovered pending item can be prepared without fulfilling the ignored line', async () => {
  const f = fixture({}, 'production', { ...policy, destinations: launchPolicy.destinations });
  const { orderId, supplier } = await draftOrder(f, { zip: '15024' });
  const replacement = {
    ...supplier.items[0], id: '75448401795763712', status: 'pending',
    assets: supplier.items[0].assets.map(asset => ({ ...asset, status: 'NotYetDownloaded' })),
  };
  supplier.items = [
    { id: '75431017103042048', status: 'ignored', quantity: 1,
      assets: [{ ...replacement.assets[0], status: 'NotYetDownloaded' }] },
    replacement,
  ];
  supplier.totals = {
    items: { amount: '13.00', currency: 'USD' },
    shipping: { amount: '12.85', currency: 'USD' },
    tax: { amount: '0.00', currency: 'USD' },
    total: { amount: '25.85', currency: 'USD' },
  };
  const record = f.records.get('order-' + orderId).data;
  record.approval = 'rejected';
  const result = await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).supplierTotalCents, 2585);
  assert.equal(f.records.get('order-' + orderId).data.approval, 'rejected');
  const assertConflict = async code => {
    const conflict = await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).code, code);
  };
  replacement.status = 'unexpected';
  await assertConflict('DRAFT_ITEM_STATUS');
  replacement.status = 'pending';
  replacement.assets[0].status = 'unexpected';
  await assertConflict('DRAFT_ASSET_STATUS');
  replacement.assets[0].status = 'NotYetDownloaded';
  supplier.items.push({ ...replacement, id: 'extra-item' });
  await assertConflict('DRAFT_PRODUCT');
  assert.equal(f.submits(), 0);
});

test('admin view and approval use the documented Prodigi v5 draft totals', async () => {
  const f = fixture({}, 'production', { ...policy, destinations: launchPolicy.destinations });
  const { orderId, supplier } = await draftOrder(f, { zip: '15024' });
  supplier.totals = {
    items: { amount: '13.00', currency: 'USD' },
    shipping: { amount: '12.85', currency: 'USD' },
    tax: { amount: '0.00', currency: 'USD' },
    total: { amount: '25.85', currency: 'USD' },
  };
  const view = await f.admin({ action: 'view', orderId });
  assert.equal(view.status, 200);
  assert.deepEqual((await view.json()).fulfillment.costs, supplier.totals);
  assert.equal(f.submits(), 0);
  assert.equal((await f.admin({ action: 'prepare-dashboard', confirm: 'prepare-dashboard-fulfillment', orderId })).status, 200);
  assert.equal((await f.admin({ action: 'prepare-dashboard', orderId })).status, 409);
  assert.equal(f.submits(), 0);
});

test('preflight validates both SKUs and private artwork; reviewed orders show tracking and contact', async () => {
  const f = fixture();
  const response = await f.admin({ action: 'preflight' });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.deepEqual(report.results.map(x => x.sku), Object.values(catalog.variants));
  assert.deepEqual(report.results[0].standardQuote.fulfillmentCountries, ['US']);
  assert.equal(report.artwork.filter(x => x.ready).length, 5);
  const { orderId } = await draftOrder(f);
  const { orders } = await (await f.admin({ action: 'list' })).json();
  assert.equal(orders[0].orderId, orderId);
  assert(!JSON.stringify(orders).includes('sandbox-buyer@example.com'));
  const view = await (await f.admin({ action: 'view', orderId })).json();
  assert.equal(view.paymentStatus, 'COMPLETED');
  assert.equal(view.fulfillment.state, 'draft');
  assert.equal(view.email, 'sandbox-buyer@example.com');
});

test('private test requires an invite and atomically limits checkout to one $45 print', async () => {
  const f = fixture({ STUDIO_MODE: 'live-test' }, 'deploy-preview');
  const { invite } = await (await f.admin({ action: 'test-invite' })).json();
  assert.equal(invite.length, 64);
  assert.equal((await f.post('review', customer())).status, 404);
  assert.equal((await f.post('review', customer({ invite, size: '12x16' }))).status, 400);
  const reviews = await Promise.all([1, 2].map(async () => (await f.post('review', customer({ invite }))).json()));
  const checked = await Promise.all(reviews.map(({ reviewId }) => f.post('checkout', { reviewId, invite })));
  assert.deepEqual(checked.map(response => response.status).sort(), [200, 409]);
  assert.equal(f.orders.size, 1);
  const { orderId } = await checked.find(response => response.ok).json();
  assert.equal((await f.notify(f.pay(orderId))).status, 200);
  assert.equal(f.drafts.size, 1);
  assert.equal(f.submits(), 0);
});

test('approved PA 15024 policy keeps the controlled offer within its caps', async () => {
  const previewPolicy = { ...launchPolicy, origins: { ...launchPolicy.origins, 'live-test': preview } };
  const off = fixture({ STUDIO_MODE: 'off' }, 'deploy-preview', previewPolicy);
  assert.deepEqual(await (await off.status()).json(), { mode: 'off', checkout: false });
  assert.equal((await off.admin({ action: 'test-invite' })).status, 404);

  const f = fixture({ STUDIO_MODE: 'live-test' }, 'deploy-preview', previewPolicy);
  const { invite } = await (await f.admin({ action: 'test-invite' })).json();
  const approvedAddress = { invite, zip: '15024' };
  const response = await f.post('review', customer(approvedAddress));
  assert.equal(response.status, 200);
  const { printCents, shippingCents, taxCents, totalCents } = await response.json();
  assert.deepEqual({ printCents, shippingCents, taxCents, totalCents },
    { printCents: 4500, shippingCents: 1285, taxCents: 405, totalCents: 6190 });

  for (const change of [{ zip: '15222' }, { size: '12x16' }, { artwork: 'tiger-lily' }, { quantity: 2 }]) {
    assert.equal((await f.post('review', customer({ ...approvedAddress, ...change }))).status, 400);
  }
  assert.equal(f.orders.size + f.drafts.size + f.submits(), 0);
});

test('controlled test caps supplier spend at $35 and customer charges at $65', () => {
  const testEnv = { ...env, STUDIO_MODE: 'live-test' };
  const config = studioConfig(testEnv, 'deploy-preview', {
    ...policy, limits: { supplierCents: 4000, customerCents: 15000 },
  });
  assert.equal(config.maxCostCents, 3500);
  assert.equal(config.maxCustomerCents, 6500);
  const lower = studioConfig(testEnv, 'deploy-preview', {
    ...policy, limits: { supplierCents: 3000, customerCents: 5500 },
  });
  assert.equal(lower.maxCostCents, 3000);
  assert.equal(lower.maxCustomerCents, 5500);
});

test('configured shipping, customer and supplier caps fail before any link is created', async () => {
  const costlyShipping = { ...policy, destinations: { 'PA-15201': { ...rate, shippingCents: { '9x12': 2000, '12x16': 2000 } } } };
  assert.equal((await fixture({ STUDIO_MODE: 'live-test' }, 'deploy-preview', costlyShipping)
    .post('review', customer({ invite: studioConfig({ ...env, STUDIO_MODE: 'live-test' }, 'deploy-preview', costlyShipping).testInvite }))).status, 409);
  const lowerEstimate = { ...policy, destinations: { 'PA-15201': { ...rate, approvedSupplierCents: { '9x12': 1200, '12x16': 1200 } } } };
  const f = fixture({}, 'production', lowerEstimate);
  assert.equal((await f.purchase(customer())).status, 409);
  assert.equal(f.orders.size, 0);
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


test('off mode and the platform deploy context keep checkout and webhook guarded', async () => {
  const off = fixture({ STUDIO_MODE: undefined, SQUARE_ACCESS_TOKEN: undefined });
  assert.deepEqual(await (await off.status()).json(), { mode: 'off', checkout: false });
  assert.equal((await off.purchase(customer())).status, 404);
  for (const context of [null, 'deploy-preview']) assert.equal((await fixture({}, context).status()).status, 404);
  assert.equal((await fixture({ STUDIO_MODE: 'live-test' }).status()).status, 404);
  const empty = fixture({}, 'production', { ...policy, destinations: {} });
  assert.deepEqual(await (await empty.status()).json(), { mode: 'live', checkout: false, maxQuantity: 1 });
});

test('private diagnostics contain variable names and never raw credential values', async () => {
  const f = fixture({ SQUARE_ACCESS_TOKEN: '', PRODIGI_API_KEY: 'bad-secret-fixture' });
  const response = await f.status();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Studio Print configuration is incomplete.' });
  assert.deepEqual(f.diagnostics, ['SQUARE_ACCESS_TOKEN: missing', 'PRODIGI_API_KEY: invalid']);
});


test('off-mode preview exposes only authenticated read-only preflight at the pinned host', async () => {
  const f = fixture({ STUDIO_MODE: 'off' }, 'deploy-preview', { ...policy, destinations: {} });
  assert.deepEqual(await (await f.status()).json(), { mode: 'off', checkout: false });
  assert.equal((await f.post('admin', { action: 'preflight' })).status, 401);
  for (const action of ['test-invite', 'approve', 'retry-draft', 'resume']) {
    assert.equal((await f.admin({ action })).status, 404);
  }
  assert.equal((await f.purchase(customer())).status, 404);
  assert.equal((await f.notify('payment-unknown')).status, 404);
  const response = await f.admin({ action: 'preflight' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.results.length, 2);
  assert.equal(data.artwork.filter(item => item.ready).length, 5);
  assert.equal(f.orders.size + f.drafts.size + f.records.size + f.submits(), 0);
  const auth = { Authorization: 'Bearer ' + env.STUDIO_ADMIN_TOKEN };
  assert.equal((await f.request('admin', '{"action":"preflight"}', auth, base)).status, 404);
  assert.equal((await f.post('admin', { action: 'preflight' }, { ...auth, Origin: preview })).status, 401);
});


test('off-mode production preflight and signature diagnostics never process an event', async () => {
  const productionPolicy = { ...launchPolicy, square: policy.square, origins: policy.origins };
  const f = fixture({ STUDIO_MODE: 'off' }, 'production', productionPolicy);
  assert.deepEqual(await (await f.status()).json(), { mode: 'off', checkout: false });
  assert.equal((await f.post('admin', { action: 'preflight' })).status, 401);
  assert.equal((await f.admin({ action: 'prepare-dashboard' })).status, 404);
  assert.equal((await f.purchase(customer())).status, 404);
  const response = await f.admin({ action: 'preflight' });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.ok, true);
  assert.equal(report.checks.filter(check => check.name.startsWith('artwork:')).length, 5);
  assert.equal(report.checks.filter(check => check.name.startsWith('prodigi-standard:')).length, 2);
  assert.deepEqual(report.checks.filter(check => check.name.startsWith('census-and-retail-tax:'))
    .map(check => check.taxBps), [700, 800, 600, 0]);
  assert.equal(f.served(), 5);
  f.setDestinationShipping(1385);
  const mismatch = await f.admin({ action: 'preflight' });
  assert.equal(mismatch.status, 503);
  assert((await mismatch.json()).checks.some(check => check.name === 'prodigi-standard:9x12' && !check.ok));

  const raw = JSON.stringify({ type: 'payment.updated', data: { object: { payment: { status: 'COMPLETED' } } } });
  assert.equal((await f.request('webhook', raw)).status, 401);
  const signed = createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(base + '/api/studio-print/webhook').update(raw).digest('base64');
  const probe = await f.request('webhook', raw, { 'x-square-hmacsha256-signature': signed });
  assert.equal(probe.status, 409);
  assert.deepEqual(await probe.json(), { mode: 'off', signatureVerified: true, processed: false });
  assert.equal(f.orders.size + f.drafts.size + f.records.size + f.submits(), 0);
});

test('production readiness distinguishes an upstream 503, a rejected HTTP 200 quote and a Philadelphia no-match', async () => {
  const productionPolicy = { ...launchPolicy, square: policy.square, origins: policy.origins };
  const f = fixture({ STUDIO_MODE: 'off' }, 'production', productionPolicy);
  f.invalidateQuoteLineId();
  f.rejectMuseumAddress();
  const response = await f.admin({ action: 'preflight' });
  assert.equal(response.status, 503);
  const report = await response.json();
  assert.deepEqual(report.checks.find(check => check.name === 'prodigi-standard:9x12'), {
    name: 'prodigi-standard:9x12', ok: false, status: 503, code: 'QUOTE_LINE_ID', upstreamStatus: 200,
  });
  const philadelphia = report.checks.find(check => check.name === 'census-and-retail-tax:philadelphia');
  assert.equal(philadelphia.ok, true);
  assert.equal(philadelphia.taxBps, 800);
  assert.equal(philadelphia.originalSampleCode, 'CENSUS_NO_MATCH');
  f.setQuoteFailure(true);
  const upstream = await (await f.admin({ action: 'preflight' })).json();
  assert.deepEqual(upstream.checks.find(check => check.name === 'prodigi-standard:12x16'), {
    name: 'prodigi-standard:12x16', ok: false, status: 503, upstreamStatus: 503,
  });
  assert.equal(f.orders.size + f.drafts.size + f.records.size + f.submits(), 0);
});

test('private preflight logs distinguish Prodigi v5 catalogue 401 from v4 quote 401', async () => {
  for (const version of [4, 5]) {
    const f = fixture({ STUDIO_MODE: 'off' }, 'deploy-preview');
    if (version === 4) f.setQuoteFailure(401);
    else f.denyCatalogue();
    const response = await f.admin({ action: 'preflight' });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /401|catalogue|sensitive|quote/);
    const expected = version === 4 ? ['Prodigi v4 POST /v4.0/quotes: HTTP 401']
      : Object.values(catalog.variants).map(sku => `Prodigi v5 GET /v5/catalogue/variants/${sku}: HTTP 401`);
    assert.deepEqual([...new Set(f.providerDiagnostics)].sort(), expected.sort());
    assert.equal(f.orders.size + f.drafts.size + f.submits(), 0);
  }
});
