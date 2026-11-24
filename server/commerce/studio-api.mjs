import { createHash, createHmac, randomUUID } from 'node:crypto';
import { decryptRecipient, encryptRecipient, equal, fileIdentity, fulfillmentDetails, selection, StudioError, validId } from './studio-config.mjs';

import { artworkMasters, artworkReady, signArtwork } from './studio-artwork.mjs';
import { shippingQuote, supplierCents } from './studio-finance.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const money = amount => ({ amount, currency: 'USD' });
const isMoney = (value, amount) => value?.currency === 'USD' && value.amount === amount;
const usdAmount = value => value?.currency === 'USD' && Number.isSafeInteger(value.amount) && value.amount >= 0;
const now = () => new Date().toISOString();

class ProviderError extends Error {
  constructor(provider, status, reference) {
    super(`${provider} API returned HTTP ${status}${reference}`);
    this.status = status;
  }
}

export function providers(config, fetcher = fetch, reportProvider = message => console.warn('[studio-print provider]', message)) {
  function reportProdigiFailure(base, path, method, outcome) {
    if (base.endsWith('/v4.0') && path === '/quotes') {
      reportProvider(`Prodigi v4 POST /v4.0/quotes: ${outcome}`);
    } else if (base.endsWith('/v5')) {
      const sku = Object.values(config.variants).find(value => path === '/catalogue/variants/' + encodeURIComponent(value));
      if (method === 'GET' && sku) {
        reportProvider(`Prodigi v5 GET /v5/catalogue/variants/${sku}: ${outcome}`);
      }
    }
  }

  async function call(provider, base, headers, path, body, extra, method = body === undefined ? 'GET' : 'POST') {
    let result;
    try {
      result = await fetcher(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers, ...extra },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(7000),
        redirect: 'error',
      });
    } catch {
      if (provider === 'Prodigi') reportProdigiFailure(base, path, method, 'transport failure');
      throw new Error(`${provider} transport failure`);
    }
    if (!result.ok) {
      if (provider === 'Prodigi') reportProdigiFailure(base, path, method, `HTTP ${result.status}`);
      const correlation = result.headers.get('x-correlation-id') ?? result.headers.get('x-request-id');
      const reference = validId(correlation) ? ` (request ${correlation})` : '';
      throw new ProviderError(provider, result.status, reference);
    }
    return result.json();
  }
  return {
    square: (path, body) => call('Square', 'https://connect.squareup.com/v2', {
      Authorization: `Bearer ${config.squareToken}`, 'Square-Version': '2026-11-18',
    }, path, body),
    quote: (body) => call('Prodigi', 'https://api.prodigi.com/v4.0', {
      'X-API-Key': config.prodigiKey.slice('live_'.length),
    }, '/quotes', body),
    prodigi: async (path, body, extra, method) => (await call('Prodigi', 'https://api.prodigi.com/v5', {
      'X-API-Key': config.prodigiKey,
    }, path, body, extra, method)).data,
  };
}

export function checkVariant(variant, selected) {
  const [width, height] = selected.size.split('x').map(Number);
  const sides = [variant?.dimensions?.width?.in, variant?.dimensions?.height?.in].sort((a, b) => a - b);
  const requiredAreas = Array.isArray(variant?.printAreas)
    ? variant.printAreas.filter(area => area?.required === true) : [];
  const dimensionTolerance = 0.02;
  // Compare against inclusive bounds so subtraction doesn't inflate a boundary difference.
  const matchesDimension = (actual, expected) => Number.isFinite(actual) &&
    actual >= expected - dimensionTolerance && actual <= expected + dimensionTolerance;
  if (typeof variant?.sku !== 'string' || variant.sku.toUpperCase() !== selected.sku ||
      variant.attributes?.paperType !== 'lpp' || variant.attributes?.substrateWeight !== '240gsm' ||
      !matchesDimension(sides[0], width) || !matchesDimension(sides[1], height) ||
      requiredAreas.length !== 1 || requiredAreas[0].name !== 'default' ||
      !Array.isArray(variant.shipsTo) || !variant.shipsTo.some(country => ['US', 'Worldwide'].includes(country))) {
    throw new StudioError(503, 'The requested Lustre print variant is unavailable.');
  }
}

function checkOrder(order, record, locationId) {
  const line = order?.line_items?.[0];
  const charge = order?.service_charges?.[0];
  if (!order || order.id !== record.orderId || order.location_id !== locationId || order.reference_id !== record.attemptId ||
      order.line_items?.length !== 1 || line.uid !== 'studio-print' || line.name !== record.lineName ||
      line.quantity !== String(record.quantity) || !isMoney(line.base_price_money, record.unitCents) ||
      (record.shippingCents
        ? order.service_charges?.length !== 1 || charge.uid !== 'studio-shipping' || !isMoney(charge.amount_money, record.shippingCents)
        : order.service_charges?.length) ||
      !isMoney(order.total_tax_money, record.taxCents) || !isMoney(order.total_money, record.totalCents) ||
      (order.total_discount_money && !isMoney(order.total_discount_money, 0)) ||
      (order.total_tip_money && !isMoney(order.total_tip_money, 0)) || order.returns?.length) {
    throw new Error('Square order does not match Studio checkout');
  }
}

function checkoutURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.hostname !== 'square.link' || url.port || !/^\/u\/[a-z\d_-]+$/i.test(url.pathname)) {
    throw new Error('Unexpected Square checkout URL');
  }
  return url.href;
}

function fulfillmentSnapshot(order) {
  return {
    state: order.status,
    costs: order.costs ?? null,
    tracking: (order.shipments ?? []).map(shipment => ({
      carrier: shipment.carrier, trackingNumber: shipment.trackingNumber, trackingUrl: shipment.trackingUrl,
    })),
  };
}

const pauseKey = 'control-fulfillment';
const submissionStates = new Set([
  'pending_submission', 'submitted', 'in_production', 'partially_shipped', 'shipped', 'completed', 'paused', 'on_hold',
]);
const settled = record => Date.now() - Date.parse(record.approvalAttemptAt) >= 120000;
const adminActions = new Set([
  'retry-draft', 'refresh', 'approve', 'reset-approval', 'pause', 'resume', 'view', 'list', 'preflight', 'test-invite',
]);
const reviewValidMs = 10 * 60 * 1000;
const reviewKey = id => 'review-' + id;
const orderKey = id => 'order-' + id;
const reviewIdValid = value => typeof value === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/.test(value);

function matchDraft(order, record, details) {
  const actual = order.items?.[0];
  const asset = actual?.assets?.[0];
  const expected = details.recipient;
  const recipient = order.recipient;
  if (order.status !== 'draft' || !order.allowedActions?.includes('submit') ||
      order.shippingMethod !== 'standard' || order.items?.length !== 1 ||
      (actual.sku ?? actual.catalogueVariantId)?.toUpperCase() !== record.sku ||
      actual.quantity !== record.quantity || actual.sizing !== 'fitPrintArea' ||
      actual.assets?.length !== 1 || asset.printArea !== 'default' ||
      typeof asset.url !== 'string' || fileIdentity(asset.url) !== record.fileIdentity ||
      recipient?.name !== expected.name || recipient.email !== expected.email ||
      Object.entries(expected.address).some(([key, value]) => (recipient.address?.[key] ?? '') !== value)) {
    throw new StudioError(409, 'Prodigi draft or shipping information differs from the verified order.');
  }
}

function checkBudget(order, config) {
  const amount = supplierCents(order.costs?.total);
  if (amount === null || amount <= 0 || amount > config.maxCostCents) {
    throw new StudioError(409, 'A verified USD supplier total within the configured spending limit is required.');
  }
  return amount;
}

// Keep the off-mode route independent of the order store and all write paths.
export async function studioPreflight(config, { square, prodigi, quote: requestQuote }, artworkStore) {
  const [location, merchant, results, artwork] = await Promise.all([
    square('/locations/' + config.locationId), square('/merchants/' + config.merchantId),
    Promise.all(Object.entries(config.variants).map(async ([size, sku]) => {
      const selected = { size, sku, quantity: 1 };
      const variant = await prodigi('/catalogue/variants/' + encodeURIComponent(sku));
      checkVariant(variant, selected);
      return { size, sku, name: variant.name, dimensions: variant.dimensions, printAreas: variant.printAreas,
        shipsTo: variant.shipsTo, standardQuote: await shippingQuote(requestQuote, selected) };
    })),
    Promise.all(Object.keys(artworkMasters).map(async id => ({ artwork: id, ready: await artworkReady(artworkStore, id) }))),
  ]);
  if (location.location?.id !== config.locationId || location.location.country !== 'US' ||
      location.location.currency !== 'USD' || location.location.status !== 'ACTIVE' ||
      location.location.merchant_id !== config.merchantId || merchant.merchant?.id !== config.merchantId ||
      merchant.merchant.status !== 'ACTIVE' || merchant.merchant.country !== 'US' ||
      merchant.merchant.currency !== 'USD' || merchant.merchant.main_location_id !== config.locationId) {
    throw new StudioError(409, 'Square merchant or location failed validation.');
  }
  return { results, artwork };
}

export function studioService(config, store, { square, prodigi, quote: requestQuote }, artworkStore) {
  async function enabled() {
    if (!Object.keys(config.destinations).length) return false;
    const gate = await store.getWithMetadata(pauseKey, { type: 'json', consistency: 'strong' });
    return !gate || gate.data?.paused === false;
  }

  async function requireEnabled() {
    if (!await enabled()) throw new StudioError(503, 'Studio Print checkout or fulfillment is paused.');
  }

  function authorizeTest(input) {
    if (config.mode === 'live-test' &&
        (typeof input.invite !== 'string' || input.invite.length !== 64 || !equal(input.invite, config.testInvite))) {
      throw new StudioError(404, 'Studio Print checkout is unavailable.');
    }
  }

  async function claimTest(attemptId) {
    if (config.mode !== 'live-test') return;
    const key = 'live-test-' + config.testRun;
    const saved = await store.setJSON(key, { attemptId }, { onlyIfNew: true });
    if (!saved.modified && (await store.getWithMetadata(key, { type: 'json', consistency: 'strong' }))?.data.attemptId !== attemptId) {
      throw new StudioError(409, 'The one-order test has already been claimed.');
    }
  }

  async function requireArtwork(artwork) {
    if (!await artworkReady(artworkStore, artwork)) {
      throw new StudioError(503, 'The verified Studio Print master is unavailable.');
    }
  }

  async function variantFor(selected) {
    const variant = await prodigi('/catalogue/variants/' + encodeURIComponent(selected.sku));
    checkVariant(variant, selected);
    return variant;
  }

  function checkOffer(selected) {
    if (config.mode === 'live-test' &&
        (selected.artwork !== 'mother-nature' || selected.size !== '9x12' || selected.unitCents !== 4500)) {
      throw new StudioError(400, 'The private test is limited to one $45 Mother Nature print.');
    }
    const { shippingCents, approvedSupplierCents, taxShipping, taxBps } = selected;
    const printCents = selected.unitCents * selected.quantity;
    const taxCents = Math.round((printCents + (taxShipping ? shippingCents : 0)) * taxBps / 10000);
    const totalCents = printCents + shippingCents + taxCents;
    if (totalCents > config.maxCustomerCents || approvedSupplierCents > config.maxCostCents) {
      throw new StudioError(409, 'The order exceeds the approved spending limit.');
    }
    return { printCents, shippingCents, taxCents, totalCents };
  }

  function squareOrderFor(selected, offer) {
    const { attemptId, size, title, quantity, unitCents, taxShipping, taxBps } = selected;
    const lineName = `${title} · Studio Print · ${size.replace('x', ' × ')} in`;
    const { shippingCents } = offer;
    return {
      location_id: config.locationId, reference_id: attemptId,
      line_items: [{ uid: 'studio-print', name: lineName, quantity: String(quantity), base_price_money: money(unitCents) }],
      ...(shippingCents > 0 && { service_charges: [{
        uid: 'studio-shipping', name: 'U.S. shipping', amount_money: money(shippingCents),
        calculation_phase: 'SUBTOTAL_PHASE', taxable: taxShipping,
      }] }),
      ...(taxBps > 0 && { taxes: [{
        name: 'Sales tax', percentage: String(taxBps / 100), scope: 'ORDER', type: 'ADDITIVE',
      }] }),
    };
  }

  async function review(input) {
    authorizeTest(input);
    await requireEnabled();
    const id = randomUUID();
    const selected = selection({ ...input, attemptId: id }, config);
    const estimate = checkOffer(selected);
    await requireArtwork(selected.artwork);
    await variantFor(selected);
    // Square may round tax on the print and shipping separately.
    const { order } = await square('/orders/calculate', { order: squareOrderFor(selected, estimate) });
    const tax = order?.total_tax_money;
    const tolerance = selected.taxShipping && estimate.shippingCents > 0 ? 1 : 0;
    if (!usdAmount(tax) || Math.abs(tax.amount - estimate.taxCents) > tolerance ||
        !isMoney(order.total_money, estimate.printCents + estimate.shippingCents + tax.amount)) {
      throw new Error('Unexpected Square tax calculation');
    }
    const offer = { ...estimate, taxCents: tax.amount, totalCents: order.total_money.amount };
    if (offer.totalCents > config.maxCustomerCents) {
      throw new StudioError(409, 'The order exceeds the approved spending limit.');
    }
    const expires = Date.now() + reviewValidMs;
    const saved = await store.setJSON(reviewKey(id), {
      version: 2, orderId: id, artwork: selected.artwork, size: selected.size, quantity: selected.quantity,
      attemptId: id, sku: selected.sku, fileIdentity: fileIdentity(selected.file), unitCents: selected.unitCents,
      taxBps: selected.taxBps, taxShipping: selected.taxShipping, approvedSupplierCents: selected.approvedSupplierCents,
      ...offer, expires, recipientBox: encryptRecipient(selected.recipient, id, config.dataKey),
    }, { onlyIfNew: true });
    if (!saved.modified) throw new Error('Order review could not be saved');
    return { reviewId: id, ...offer, expires };
  }

  async function checkout(input) {
    authorizeTest(input);
    await requireEnabled();
    if (!reviewIdValid(input.reviewId)) throw new StudioError(400, 'Review shipping and tax before checkout.');
    const entry = await store.getWithMetadata(reviewKey(input.reviewId), { type: 'json', consistency: 'strong' });
    const savedReview = entry?.data;
    if (!savedReview || !Number.isSafeInteger(savedReview.expires) || savedReview.expires <= Date.now()) {
      throw new StudioError(409, 'The order review has expired. Review shipping and tax again.');
    }
    const selected = fulfillmentDetails(savedReview, config);
    const offer = checkOffer(selected);
    await requireArtwork(selected.artwork);
    const { artwork, size, quantity, unitCents, taxBps, taxShipping, recipient, attemptId, sku, file } = selected;
    const { shippingCents } = offer;
    if (savedReview.orderId !== input.reviewId || savedReview.attemptId !== input.reviewId ||
        unitCents !== savedReview.unitCents || taxBps !== savedReview.taxBps || taxShipping !== savedReview.taxShipping ||
        selected.approvedSupplierCents !== savedReview.approvedSupplierCents ||
        savedReview.printCents !== offer.printCents || savedReview.shippingCents !== offer.shippingCents ||
        !Number.isSafeInteger(savedReview.taxCents) || savedReview.taxCents < 0 ||
        Math.abs(savedReview.taxCents - offer.taxCents) > (taxShipping && shippingCents > 0 ? 1 : 0) ||
        savedReview.totalCents !== offer.printCents + offer.shippingCents + savedReview.taxCents ||
        savedReview.totalCents > config.maxCustomerCents) {
      throw new StudioError(409, 'Pricing, shipping, or tax rules changed. Review the order again.');
    }
    const lineName = `${selected.title} · Studio Print · ${size.replace('x', ' × ')} in`;
    await requireEnabled();
    if (savedReview.expires <= Date.now()) throw new StudioError(409, 'The order review has expired.');
    await variantFor(selected);
    const supplierEstimate = await shippingQuote(requestQuote, selected);
    if (supplierEstimate.productionCents + supplierEstimate.shippingCents > config.maxCostCents ||
        supplierEstimate.productionCents + supplierEstimate.shippingCents > selected.approvedSupplierCents) {
      throw new StudioError(409, 'Current supplier costs exceed the approved amount.');
    }
    await requireEnabled();
    if (savedReview.expires <= Date.now()) throw new StudioError(409, 'The order review has expired.');
    await claimTest(attemptId);
    const { payment_link: link } = await square('/online-checkout/payment-links', {
      idempotency_key: attemptId,
      order: squareOrderFor(selected, offer),
      checkout_options: { allow_tipping: false, ask_for_shipping_address: false },
      pre_populated_data: { buyer_email: recipient.email },
    });
    if (!validId(link?.order_id) || !validId(link.id)) throw new Error('Missing Square order ID');
    const url = checkoutURL(link.url);
    const { order } = await square('/orders/' + link.order_id);
    const tax = order?.total_tax_money;
    if (!usdAmount(tax) || tax.amount !== savedReview.taxCents) {
      throw new Error('Unexpected Square tax calculation');
    }
    const record = {
      orderId: link.order_id, paymentLinkId: link.id, attemptId, artwork, size, quantity, unitCents, shippingCents,
      taxCents: tax.amount, totalCents: savedReview.totalCents, approvedSupplierCents: selected.approvedSupplierCents,
      lineName, version: 2, recipientBox: encryptRecipient(recipient, link.order_id, config.dataKey),
      sku, fileIdentity: fileIdentity(file), state: 'awaiting_payment', createdAt: now(),
    };
    checkOrder(order, record, config.locationId);
    const created = await store.setJSON(orderKey(record.orderId), record, { onlyIfNew: true });
    if (!created.modified) {
      const { data } = await load(record.orderId);
      const previous = fulfillmentDetails(data, config);
      if (data.attemptId !== attemptId || hash(previous.recipient) !== hash(recipient) ||
          data.artwork !== artwork || data.size !== size || data.quantity !== quantity ||
          data.totalCents !== record.totalCents || data.paymentId || data.state !== 'awaiting_payment') {
        throw new StudioError(409, 'This checkout attempt is no longer available.');
      }
    }
    return { url, orderId: record.orderId };
  }

  async function load(id) {
    const result = await store.getWithMetadata(orderKey(id), { type: 'json', consistency: 'strong' });
    if (!result) throw new StudioError(404, 'Studio Print order not found.');
    return result;
  }

  async function verifiedPayment(id, record) {
    const { payment } = await square('/payments/' + id);
    if (payment?.id !== id || payment.location_id !== config.locationId ||
        payment.status !== 'COMPLETED' ||
        (payment.refunded_money && !isMoney(payment.refunded_money, 0)) ||
        (payment.tip_money && !isMoney(payment.tip_money, 0)) ||
        payment.refund_ids?.length) return;
    if (record && (payment.order_id !== record.orderId || !isMoney(payment.amount_money, record.totalCents) ||
        !isMoney(payment.total_money, record.totalCents))) throw new Error('Square payment amount or order mismatch');
    return payment;
  }

  async function draft(id) {
    if (!validId(id)) throw new StudioError(400, 'Invalid Square payment ID.');
    const payment = await verifiedPayment(id);
    if (!payment || !validId(payment.order_id)) return { ignored: true };
    const entry = await store.getWithMetadata(orderKey(payment.order_id), { type: 'json', consistency: 'strong' });
    if (!entry) return { ignored: true };
    let { data: record, etag } = entry;
    if (record.orderId !== payment.order_id || !isMoney(payment.amount_money, record.totalCents) ||
        !isMoney(payment.total_money, record.totalCents) || (record.paymentId && record.paymentId !== id)) {
      throw new Error('Square payment mismatch');
    }
    if (record.prodigiId) return { state: record.state };
    if (record.totalCents > config.maxCustomerCents || record.approvedSupplierCents > config.maxCostCents) {
      throw new StudioError(409, 'The order exceeds the current spending limits.');
    }
    const details = fulfillmentDetails(record, config);
    await requireArtwork(details.artwork);
    const { order } = await square('/orders/' + record.orderId);
    checkOrder(order, record, config.locationId);
    await requireEnabled();

    if (!record.paymentId) {
      record = { ...record, paymentId: id };
      const claim = await store.setJSON(orderKey(record.orderId), record, { onlyIfMatch: etag });
      if (!claim.modified) {
        const latest = await load(record.orderId);
        if (latest.data.paymentId !== id) throw new StudioError(409, 'Order payment changed.');
        if (latest.data.prodigiId) return { state: latest.data.state };
        ({ data: record, etag } = latest);
      } else {
        etag = claim.etag;
      }
    }
    await requireEnabled();
    const result = await prodigi('/orders', {
      submit: false, merchantReference: record.orderId, shippingMethod: 'standard',
      recipient: details.recipient,
      items: [{
        sku: record.sku, quantity: record.quantity, sizing: 'fitPrintArea',
        assets: [{ printArea: 'default', url: signArtwork(config, details.file) }],
      }],
    }, { 'Idempotency-Key': hash(['studio-print-launch-v1', record.orderId]) });
    if (!validId(result?.id) || result.status !== 'draft') throw new Error('Prodigi did not return a draft');
    const saved = await store.setJSON(orderKey(record.orderId), {
      ...record, prodigiId: result.id, ...fulfillmentSnapshot(result), updatedAt: now(),
    }, { onlyIfMatch: etag });
    if (!saved.modified && (await load(record.orderId)).data.prodigiId !== result.id) {
      throw new Error('Prodigi draft could not be reconciled');
    }
    return { state: 'draft' };
  }

  async function webhook(raw, signature) {
    const expected = createHmac('sha256', config.webhookKey).update(config.webhookUrl).update(raw).digest('base64');
    if (!equal(expected, signature ?? '')) throw new StudioError(401, 'Invalid webhook signature.');
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      throw new StudioError(400, 'Invalid webhook event.');
    }
    const age = Date.now() - Date.parse(event?.created_at);
    if (!Number.isFinite(age) || age < -5 * 60000 || age > 72 * 3600000) return { ignored: true };
    if (event.merchant_id !== config.merchantId || !['payment.created', 'payment.updated'].includes(event.type) ||
      event.data?.object?.payment?.status !== 'COMPLETED') return { ignored: true };
    return draft(event.data.object.payment.id);
  }

  async function admin(input) {
    if (!adminActions.has(input.action)) throw new StudioError(400, 'Unknown admin action.');
    if (input.action === 'pause' || input.action === 'resume') {
      const paused = input.action === 'pause';
      if (!paused && input.confirm !== 'resume-studio-print') throw new StudioError(409, 'Explicit resume confirmation is required.');
      await store.setJSON(pauseKey, { paused, updatedAt: now() });
      return { paused };
    }
    if (input.action === 'test-invite') {
      if (config.mode !== 'live-test') throw new StudioError(404, 'Private test mode is unavailable.');
      return { invite: config.testInvite };
    }
    if (input.action === 'list') {
      const { blobs } = await store.list({ prefix: 'order-' });
      const entries = await Promise.all(blobs.map(async ({ key }) => {
        const snapshot = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
        const record = snapshot?.data;
        return record && {
          orderId: record.orderId, paymentLinkId: record.paymentLinkId, artwork: record.artwork, size: record.size,
          state: record.state, approval: record.approval ?? null, createdAt: record.createdAt,
        };
      }));
      return { orders: entries.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    }
    if (input.action === 'preflight') {
      return studioPreflight(config, { square, prodigi, quote: requestQuote }, artworkStore);
    }
    if (input.action === 'retry-draft') return draft(input.paymentId);
    if (!validId(input.orderId)) throw new StudioError(400, 'Invalid Square order ID.');
    const { data: record, etag } = await load(input.orderId);
    if (input.action === 'view') {
      const [squareOrder, paid, supplier] = await Promise.all([
        square('/orders/' + record.orderId),
        validId(record.paymentId) ? square('/payments/' + record.paymentId) : {},
        validId(record.prodigiId) ? prodigi('/orders/' + record.prodigiId) : null,
      ]);
      checkOrder(squareOrder.order, record, config.locationId);
      if (supplier && (supplier.id !== record.prodigiId || supplier.merchantReference !== record.orderId)) {
        throw new Error('Prodigi order mismatch');
      }
      const payment = paid.payment;
      if (payment && (payment.id !== record.paymentId || payment.order_id !== record.orderId ||
          payment.location_id !== config.locationId || !isMoney(payment.total_money, record.totalCents))) {
        throw new Error('Square payment mismatch');
      }
      return {
        orderId: record.orderId, paymentLinkId: record.paymentLinkId, artwork: record.artwork, size: record.size, quantity: record.quantity,
        paymentStatus: payment?.status ?? 'awaiting_payment', refundedCents: payment?.refunded_money?.amount ?? 0,
        approval: record.approval ?? null, fulfillment: supplier ? fulfillmentSnapshot(supplier) : null,
        amounts: { totalCents: record.totalCents, shippingCents: record.shippingCents, taxCents: record.taxCents },
        email: decryptRecipient(record, config).email,
      };
    }
    if (!record.prodigiId) throw new StudioError(409, 'No Prodigi draft. Retry using the Square payment ID.');
    if (record.orderId !== input.orderId || !validId(record.prodigiId)) throw new Error('Invalid order record');
    const apiPath = '/orders/' + record.prodigiId;
    const order = await prodigi(apiPath);
    if (order?.id !== record.prodigiId || order.merchantReference !== record.orderId) {
      throw new Error('Prodigi order mismatch');
    }
    const snapshot = fulfillmentSnapshot(order);
    if (input.action === 'refresh') {
      // A refresh must never invalidate the ETag held by an in-flight submission.
      let approval = record.approval ?? null;
      if (approval !== 'pending') {
        await store.setJSON(orderKey(record.orderId), { ...record, ...snapshot, updatedAt: now() }, { onlyIfMatch: etag });
      } else if (settled(record) && submissionStates.has(snapshot.state)) {
        const saved = await store.setJSON(orderKey(record.orderId), {
          ...record, ...snapshot, approval: 'accepted', approvalCompletedAt: now(), updatedAt: now(),
        }, { onlyIfMatch: etag });
        if (saved.modified) approval = 'accepted';
      }
      return { orderId: record.orderId, prodigiId: record.prodigiId, ...snapshot, approval };
    }

    const details = fulfillmentDetails(record, config);
    if (input.action === 'reset-approval') {
      if (record.approval !== 'pending' || input.confirm !== 'confirmed-no-submission' ||
          !settled(record)) {
        throw new StudioError(409, 'Confirm the previous attempt was not accepted after reconciling with Prodigi.');
      }
      matchDraft(order, record, details);
      const saved = await store.setJSON(orderKey(record.orderId), { ...record, ...snapshot, approval: 'rejected' }, { onlyIfMatch: etag });
      if (!saved.modified) throw new StudioError(409, 'Order changed. Refresh and try again.');
      return { state: snapshot.state, approval: 'rejected' };
    }

    if (record.approvalCompletedAt || record.approval === 'pending') {
      throw new StudioError(409, 'Approval already started. Refresh and reconcile the supplier state.');
    }
    matchDraft(order, record, details);
    if (checkBudget(order, config) > record.approvedSupplierCents) {
      throw new StudioError(409, 'The supplier total exceeds the approved order amount.');
    }
    await requireArtwork(details.artwork);
    const itemId = order.items[0].id;
    if (!validId(itemId)) throw new Error('Missing Prodigi draft item ID');
    if (!validId(record.paymentId) || !await verifiedPayment(record.paymentId, record)) {
      throw new StudioError(409, 'Square payment is no longer eligible.');
    }
    const { order: squareOrder } = await square('/orders/' + record.orderId);
    checkOrder(squareOrder, record, config.locationId);
    await requireEnabled();
    const approvalAttemptAt = now();
    const claim = { ...record, approval: 'pending', approvalAttemptAt };
    const lock = await store.setJSON(orderKey(record.orderId), claim, { onlyIfMatch: etag });
    if (!lock.modified) throw new StudioError(409, 'Order changed. Refresh and try again.');
    let result;
    let submissionStarted = false;
    try {
      await requireEnabled();
      // Renew the same artwork binding after any delay, expiry, retry, or signing-key rotation.
      const url = signArtwork(config, details.file);
      await prodigi(apiPath + '/items/' + itemId, { assets: [{ printArea: 'default', url }] }, undefined, 'PATCH');
      const refreshed = await prodigi(apiPath);
      if (refreshed?.id !== record.prodigiId || refreshed.merchantReference !== record.orderId ||
          refreshed.items?.[0]?.id !== itemId || refreshed.items[0].assets?.[0]?.url !== url) {
        throw new Error('Prodigi draft did not retain the renewed artwork link');
      }
      matchDraft(refreshed, record, details);
      if (checkBudget(refreshed, config) > record.approvedSupplierCents) {
        throw new StudioError(409, 'The supplier total exceeds the approved order amount.');
      }
      await requireEnabled();
      submissionStarted = true;
      result = await prodigi(apiPath + ':submit', {});
    } catch (error) {
      // Only an ambiguous submission can leave an order pending reconciliation.
      if (!submissionStarted || (error instanceof ProviderError && [400, 422].includes(error.status))) {
        await store.setJSON(orderKey(record.orderId), { ...claim, approval: 'rejected' }, { onlyIfMatch: lock.etag });
      }
      throw error;
    }
    if (result?.id !== record.prodigiId || !submissionStates.has(result.status)) {
      throw new Error('Prodigi submission outcome requires reconciliation');
    }
    const state = result.status;
    const saved = await store.setJSON(orderKey(record.orderId), {
      ...claim, approval: 'accepted', approvalCompletedAt: now(), state, updatedAt: now(),
    }, { onlyIfMatch: lock.etag });
    if (!saved.modified) throw new Error('Approval result requires reconciliation');
    return { orderId: record.orderId, prodigiId: record.prodigiId, state };
  }

  return { review, checkout, webhook, admin, enabled };
}
