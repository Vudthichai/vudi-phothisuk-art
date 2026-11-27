import { createHash, createHmac, randomUUID } from 'node:crypto';
import { decryptRecipient, encryptRecipient, equal, fileIdentity, fulfillmentDetails, selection, StudioError, validId } from './studio-config.mjs';

import { prepareArtworkAccess, artworkMasters, artworkReady, createArtworkGrant, draftArtworkURL } from './studio-artwork.mjs';
import { destinationOffer, shippingQuote, supplierCents } from './studio-finance.mjs';

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
    salesTax: body => call('Retail tax', 'https://api.taxjar.com/v2', {
      Authorization: `Bearer ${config.taxToken}`,
    }, '/taxes', body),
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
    costs: order.totals ?? null,
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
  'retry-draft', 'refresh', 'prepare-dashboard', 'pause', 'resume', 'view', 'list', 'preflight', 'test-invite',
]);
const reviewValidMs = 10 * 60 * 1000;
const reviewKey = id => 'review-' + id;
const orderKey = id => 'order-' + id;
const reviewIdValid = value => typeof value === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/.test(value);

const approvalConflict = (code, message, stage = 'draft-validation') =>
  new StudioError(409, message, code, stage);

const draftItemStatuses = new Set(['pending', 'ok', 'not_yet_downloaded']);
const draftAssetStatuses = new Set(['NotYetDownloaded', 'not_yet_downloaded', 'in_progress', 'complete']);

function matchDraft(order, record, details) {
  const items = Array.isArray(order.items) ? order.items : [];
  const ignored = items.filter(item => item?.status === 'ignored');
  const candidates = items.filter(item => item?.status !== 'ignored');
  const actual = candidates[0];
  const asset = actual?.assets?.[0];
  const expected = details.recipient;
  const recipient = order.recipient;
  if (order.status !== 'draft' || !order.allowedActions?.includes('submit') || order.shippingMethod !== 'standard') {
    throw approvalConflict('DRAFT_STATE_OR_SHIPPING', 'Prodigi draft state or shipping method is invalid.');
  }
  if (candidates.length !== 1 || !validId(actual?.id) ||
      typeof (actual.sku ?? actual.catalogueVariantId) !== 'string' ||
      (actual.sku ?? actual.catalogueVariantId).toUpperCase() !== record.sku ||
      actual.quantity !== record.quantity || actual.sizing !== 'fitPrintArea') {
    throw approvalConflict('DRAFT_PRODUCT', 'Prodigi draft product differs from the verified order.');
  }
  if (!draftItemStatuses.has(actual.status)) {
    throw approvalConflict('DRAFT_ITEM_STATUS', 'Prodigi draft item status is not recognized as ready for approval.');
  }
  if (actual.assets?.length !== 1 || asset?.printArea !== 'default' || typeof asset.url !== 'string') {
    throw approvalConflict('DRAFT_ARTWORK', 'Prodigi draft artwork differs from the verified order.');
  }
  if (!draftAssetStatuses.has(asset.status)) {
    throw approvalConflict('DRAFT_ASSET_STATUS', 'Prodigi draft artwork status is not recognized as ready for approval.');
  }
  let identity;
  try { identity = fileIdentity(asset.url); } catch {
    throw approvalConflict('DRAFT_ARTWORK', 'Prodigi draft artwork differs from the verified order.');
  }
  if (identity !== record.fileIdentity) {
    throw approvalConflict('DRAFT_ARTWORK', 'Prodigi draft artwork differs from the verified order.');
  }
  if (recipient?.name !== expected.name || recipient.email !== expected.email ||
      Object.entries(expected.address).some(([key, value]) => (recipient.address?.[key] ?? '') !== value)) {
    throw approvalConflict('DRAFT_RECIPIENT', 'Prodigi draft shipping information differs from the verified order.');
  }
  // Prodigi support #392619 confirmed retained ignored lines are not fulfilled or billed.
  if (new Set(items.map(item => item?.id)).size !== items.length ||
      ignored.some(item => !validId(item.id) || item.sku != null || item.catalogueVariantId != null ||
        item.unitPrice != null || item.lineTotal != null)) {
    throw approvalConflict('DRAFT_IGNORED_ITEMS_UNEXPECTED', 'Ignored Prodigi lines contain unexpected product or pricing data.');
  }
  return asset.url;
}

function checkBudget(order, config) {
  const amount = supplierCents(order.totals?.total);
  if (amount === null || amount <= 0) {
    throw approvalConflict('SUPPLIER_TOTAL_INVALID', 'A positive, verified USD supplier total is required.');
  }
  if (amount > config.maxCostCents) {
    throw approvalConflict('SUPPLIER_CAP', 'The supplier total exceeds the configured spending limit.');
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

export function studioService(config, store, { square, prodigi, quote: requestQuote, salesTax }, artworkStore) {
  async function enabled() {
    if (!config.destinationQuotes && !Object.keys(config.destinations).length) return false;
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
    const taxCents = selected.expectedTaxCents ?? Math.round((printCents + (taxShipping ? shippingCents : 0)) * taxBps / 10000);
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
    let selected = selection({ ...input, attemptId: id }, config);
    await requireArtwork(selected.artwork);
    await variantFor(selected);
    if (config.destinationQuotes) selected = await destinationOffer(prodigi, salesTax, config, selected);
    const estimate = checkOffer(selected);
    // Square may round tax on the print and shipping separately.
    const { order } = await square('/orders/calculate', { order: squareOrderFor(selected, estimate) });
    const tax = order?.total_tax_money;
    const tolerance = !config.destinationQuotes && selected.taxShipping && estimate.shippingCents > 0 ? 1 : 0;
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
    let selected = fulfillmentDetails(savedReview, config);
    if (config.destinationQuotes) selected = await destinationOffer(prodigi, salesTax, config, selected);
    const offer = checkOffer(selected);
    await requireArtwork(selected.artwork);
    const { artwork, size, quantity, unitCents, taxBps, taxShipping, recipient, attemptId, sku, file } = selected;
    const { shippingCents } = offer;
    if (savedReview.orderId !== input.reviewId || savedReview.attemptId !== input.reviewId ||
        unitCents !== savedReview.unitCents || taxBps !== savedReview.taxBps || taxShipping !== savedReview.taxShipping ||
        selected.approvedSupplierCents !== savedReview.approvedSupplierCents ||
        savedReview.printCents !== offer.printCents || savedReview.shippingCents !== offer.shippingCents ||
        !Number.isSafeInteger(savedReview.taxCents) || savedReview.taxCents < 0 ||
        Math.abs(savedReview.taxCents - offer.taxCents) > (!config.destinationQuotes && taxShipping && shippingCents > 0 ? 1 : 0) ||
        savedReview.totalCents !== offer.printCents + offer.shippingCents + savedReview.taxCents ||
        savedReview.totalCents > config.maxCustomerCents) {
      throw new StudioError(409, 'Pricing, shipping, or tax rules changed. Review the order again.');
    }
    const lineName = `${selected.title} · Studio Print · ${size.replace('x', ' × ')} in`;
    await requireEnabled();
    if (savedReview.expires <= Date.now()) throw new StudioError(409, 'The order review has expired.');
    await variantFor(selected);
    if (!config.destinationQuotes) {
      const supplierEstimate = await shippingQuote(requestQuote, selected);
      if (supplierEstimate.productionCents + supplierEstimate.shippingCents > config.maxCostCents ||
          supplierEstimate.productionCents + supplierEstimate.shippingCents > selected.approvedSupplierCents) {
        throw new StudioError(409, 'Current supplier costs exceed the approved amount.');
      }
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
      record = { ...record, paymentId: id, artworkGrant: true };
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
    if (!record.artworkGrant) {
      throw new StudioError(409, 'The earlier draft attempt requires reconciliation.');
    }
    const artworkURL = draftArtworkURL(config, details.file, record.orderId);
    if (!await createArtworkGrant(store, artworkURL)) {
      throw new StudioError(409, 'The earlier draft artwork access requires reconciliation.');
    }
    const result = await prodigi('/orders', {
      submit: false, merchantReference: record.orderId, shippingMethod: 'standard',
      recipient: details.recipient,
      items: [{
        sku: record.sku, quantity: record.quantity, sizing: 'fitPrintArea',
        assets: [{ printArea: 'default', url: artworkURL }],
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
        orderId: record.orderId, prodigiId: record.prodigiId ?? null, paymentLinkId: record.paymentLinkId, artwork: record.artwork, size: record.size, quantity: record.quantity,
        paymentStatus: payment?.status ?? 'awaiting_payment', refundedCents: payment?.refunded_money?.amount ?? 0,
        approval: record.approval ?? null, fulfillment: supplier ? fulfillmentSnapshot(supplier) : null,
        amounts: { totalCents: record.totalCents, shippingCents: record.shippingCents, taxCents: record.taxCents },
        email: decryptRecipient(record, config).email,
      };
    }
    if (!record.prodigiId) {
      throw approvalConflict('DRAFT_NOT_LINKED', 'No Prodigi draft is linked to this order.', 'order-lookup');
    }
    if (record.orderId !== input.orderId || !validId(record.prodigiId)) throw new Error('Invalid order record');
    const apiPath = '/orders/' + record.prodigiId;
    const order = await prodigi(apiPath);
    if (order?.id !== record.prodigiId || order.merchantReference !== record.orderId) {
      throw approvalConflict('DRAFT_IDENTITY', 'Prodigi draft identity differs from the verified order.', 'order-lookup');
    }
    const snapshot = fulfillmentSnapshot(order);
    if (input.action === 'refresh') {
      const submitted = submissionStates.has(snapshot.state);
      if (record.approval === 'pending' && (!submitted || !settled(record))) {
        return { orderId: record.orderId, prodigiId: record.prodigiId, ...snapshot, approval: 'pending' };
      }
      const approval = submitted ? 'accepted' : record.approval ?? null;
      const saved = await store.setJSON(orderKey(record.orderId), {
        ...record, ...snapshot, approval, updatedAt: now(),
        ...(submitted && { approvalCompletedAt: record.approvalCompletedAt ?? now() }),
      }, { onlyIfMatch: etag });
      if (!saved.modified) {
        throw approvalConflict('RECONCILIATION_CONFLICT', 'Order changed during reconciliation.', 'order-lookup');
      }
      return { orderId: record.orderId, prodigiId: record.prodigiId, ...snapshot, approval };
    }

    if (record.approvalCompletedAt || record.approval === 'pending' || record.approval === 'accepted') {
      throw approvalConflict('APPROVAL_ALREADY_STARTED', 'Reconcile the existing supplier status before proceeding.', 'approval-lock');
    }
    if (input.confirm !== 'prepare-dashboard-fulfillment') {
      throw approvalConflict('DASHBOARD_CONFIRMATION_REQUIRED', 'Confirm preparation for dashboard fulfillment.', 'order-validation');
    }

    const details = fulfillmentDetails(record, config);
    const artworkURL = matchDraft(order, record, details);
    const supplierTotalCents = checkBudget(order, config);
    if (supplierTotalCents > record.approvedSupplierCents || record.totalCents > config.maxCustomerCents) {
      throw approvalConflict('SUPPLIER_ORDER_LIMIT', 'The order exceeds an approved spending limit.');
    }
    if (!await artworkReady(artworkStore, details.artwork)) {
      throw new StudioError(503, 'The private artwork master is unavailable.', 'ARTWORK_UNAVAILABLE', 'artwork-access');
    }
    if (!validId(record.paymentId) || !await verifiedPayment(record.paymentId, record)) {
      throw approvalConflict('PAYMENT_INELIGIBLE', 'Square payment is no longer eligible.', 'payment-validation');
    }
    const { order: squareOrder } = await square('/orders/' + record.orderId);
    checkOrder(squareOrder, record, config.locationId);
    await requireEnabled();
    const stableURL = record.artworkGrant ? draftArtworkURL(config, details.file, record.orderId) : null;
    // One existing preview draft predates renewable links. Reauthorize only its
    // exact, authentic legacy URL and keep the grant within its original-age limit.
    const recoverLegacy = config.mode === 'live-test' && record.prodigiId === '75431017083608576' &&
      order.items.some(item => item.id === '75448401795763712' && item.status !== 'ignored');
    if (recoverLegacy && supplierTotalCents !== 2585) {
      throw approvalConflict('TEST_SUPPLIER_TOTAL', 'The controlled draft no longer totals $25.85 USD.');
    }
    const artworkValidUntil = await prepareArtworkAccess(config, store, artworkURL, stableURL, recoverLegacy);
    if (!artworkValidUntil) {
      throw approvalConflict('ARTWORK_ACCESS', 'The draft artwork link cannot provide sufficient authorized access.', 'artwork-access');
    }
    return { orderId: record.orderId, prodigiId: record.prodigiId, state: 'draft',
      fulfillmentMode: 'dashboard', supplierTotalCents, artworkValidUntil };
  }

  return { review, checkout, webhook, admin, enabled };
}
