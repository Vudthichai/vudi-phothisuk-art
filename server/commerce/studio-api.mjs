import { createHash, createHmac, randomUUID } from 'node:crypto';
import { encryptRecipient, equal, fileIdentity, fulfillmentDetails, selection, StudioError, validId } from './studio-config.mjs';

import { artworkMasters, artworkReady, signArtwork } from './studio-artwork.mjs';
import { orderFinancials, reserveDailySpend, shippingQuote, supplierCents } from './studio-finance.mjs';

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

export function providers(config, fetcher = fetch) {
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
      throw new Error(`${provider} transport failure`);
    }
    if (!result.ok) {
      const correlation = result.headers.get('x-correlation-id') ?? result.headers.get('x-request-id');
      const reference = validId(correlation) ? ` (request ${correlation})` : '';
      throw new ProviderError(provider, result.status, reference);
    }
    return result.json();
  }
  return {
    square: (path, body) => call('Square', 'https://connect.squareupsandbox.com/v2', {
      Authorization: `Bearer ${config.squareToken}`, 'Square-Version': '2026-11-18',
    }, path, body),
    quote: (body) => call('Prodigi', 'https://api.sandbox.prodigi.com/v4.0', {
      'X-API-Key': config.prodigiKey.slice('sandbox_'.length),
    }, '/quotes', body),
    prodigi: async (path, body, extra, method) => (await call('Prodigi', 'https://api.prodigi.com/v5', {
      'X-API-Key': config.prodigiKey,
    }, path, body, extra, method)).data,
  };
}

export function checkVariant(variant, selected) {
  const [width, height] = selected.size.split('x').map(Number);
  const sides = [variant?.dimensions?.width?.in, variant?.dimensions?.height?.in].sort((a, b) => a - b);
  const printArea = variant?.printAreas?.find(area => area.required && area.name === 'default');
  const requiredAreas = variant?.printAreas?.filter(area => area.required);
  if (variant?.sku?.toUpperCase() !== selected.sku || !/(?:\blustre\b|\blpp\b)/i.test(variant?.name ?? '') ||
      !/\b240\s*gsm\b/i.test(variant.name) ||
      Math.abs(sides[0] - width) > 0.02 || Math.abs(sides[1] - height) > 0.02 ||
      sides.some(side => !Number.isFinite(side)) || requiredAreas?.length !== 1 || !printArea ||
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
      url.hostname !== 'sandbox.square.link' || url.port || !/^\/u\/[a-z\d_-]+$/i.test(url.pathname)) {
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
  'retry-draft', 'refresh', 'approve', 'reset-approval', 'pause', 'resume', 'pause-checkout', 'resume-checkout', 'view', 'catalogue', 'artwork-status',
]);
const quoteValidMs = 10 * 60 * 1000;
const quoteKey = id => 'quote-' + id;
const quoteIdValid = value => typeof value === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/.test(value);

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

export function studioService(config, store, { square, prodigi, quote: requestQuote }, artworkStore) {
  async function enabled() {
    if (!config.fulfillmentEnabled) return false;
    const gate = await store.getWithMetadata(pauseKey, { type: 'json', consistency: 'strong' });
    return !gate || gate.data?.paused === false;
  }

  async function requireEnabled() {
    if (!await enabled()) throw new StudioError(503, 'Studio Print fulfillment is paused.');
  }
  async function checkoutEnabled() {
    if (!config.checkoutEnabled || !await enabled()) return false;
    const gate = await store.getWithMetadata('control-checkout', { type: 'json', consistency: 'strong' });
    return !gate || gate.data?.paused === false;
  }

  async function requireCheckout() {
    await requireEnabled();
    if (!await checkoutEnabled()) throw new StudioError(503, 'Studio Print checkout is paused.');
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

  async function quote(input) {
    await requireCheckout();
    const id = randomUUID();
    const selected = selection({ ...input, attemptId: id }, config);
    await requireArtwork(selected.artwork);
    await variantFor(selected);
    const offer = await shippingQuote(requestQuote, selected);
    if (offer.productionCents + offer.shippingCents > config.maxCostCents) {
      throw new StudioError(503, 'This print and shipping option exceeds the current order limit.');
    }
    const printCents = selected.unitCents * selected.quantity;
    const taxCents = Math.round((printCents + (selected.taxShipping ? offer.shippingCents : 0)) * selected.taxBps / 10000);
    const totalCents = printCents + offer.shippingCents + taxCents;
    const expires = Date.now() + quoteValidMs;
    const saved = await store.setJSON(quoteKey(id), {
      version: 2, orderId: id, artwork: selected.artwork, size: selected.size, quantity: selected.quantity,
      attemptId: id, sku: selected.sku, fileIdentity: fileIdentity(selected.file), unitCents: selected.unitCents,
      taxBps: selected.taxBps, taxShipping: selected.taxShipping, quote: offer, taxCents, totalCents, expires,
      recipientBox: encryptRecipient(selected.recipient, id, config.dataKey),
    }, { onlyIfNew: true });
    if (!saved.modified) throw new Error('Quote could not be saved');
    return { quoteId: id, printCents, shippingCents: offer.shippingCents, taxCents, totalCents, expires };
  }

  async function checkout(input) {
    await requireCheckout();
    if (!quoteIdValid(input.quoteId)) throw new StudioError(400, 'Request a shipping quote before checkout.');
    const entry = await store.getWithMetadata(quoteKey(input.quoteId), { type: 'json', consistency: 'strong' });
    const savedQuote = entry?.data;
    if (!savedQuote || !Number.isSafeInteger(savedQuote.expires) || savedQuote.expires <= Date.now()) {
      throw new StudioError(409, 'The shipping quote has expired. Request a new quote.');
    }
    const selected = fulfillmentDetails(savedQuote, config);
    await requireArtwork(selected.artwork);
    const { artwork, size, quantity, unitCents, taxBps, taxShipping, recipient, attemptId, sku, file } = selected;
    const { shippingCents } = savedQuote.quote;
    if (!Number.isSafeInteger(shippingCents) || shippingCents < 0 || savedQuote.quote.currency !== 'USD' ||
        savedQuote.quote.method !== 'standard') throw new Error('Invalid stored quote');
    if (savedQuote.quote.productionCents + shippingCents > config.maxCostCents) {
      throw new StudioError(409, 'The order limit changed. Request a new shipping quote.');
    }
    if (savedQuote.orderId !== input.quoteId || savedQuote.attemptId !== input.quoteId ||
        unitCents !== savedQuote.unitCents || taxBps !== savedQuote.taxBps || taxShipping !== savedQuote.taxShipping) {
      throw new StudioError(409, 'Pricing or tax rules changed. Request a new shipping quote.');
    }
    const lineName = `${selected.title} · Studio Print · ${size.replace('x', ' × ')} in`;
    await requireCheckout();
    if (savedQuote.expires <= Date.now()) throw new StudioError(409, 'The shipping quote has expired. Request a new quote.');
    const { payment_link: link } = await square('/online-checkout/payment-links', {
      idempotency_key: attemptId,
      order: {
        location_id: config.locationId, reference_id: attemptId,
        line_items: [{ uid: 'studio-print', name: lineName, quantity: String(quantity), base_price_money: money(unitCents) }],
        ...(shippingCents > 0 && { service_charges: [{
          uid: 'studio-shipping', name: 'U.S. shipping', amount_money: money(shippingCents),
          calculation_phase: 'SUBTOTAL_PHASE', taxable: taxShipping,
        }] }),
        ...(taxBps > 0 && { taxes: [{
          name: 'Sales tax', percentage: String(taxBps / 100), scope: 'ORDER', type: 'ADDITIVE',
        }] }),
      },
      checkout_options: { allow_tipping: false, ask_for_shipping_address: false },
      pre_populated_data: { buyer_email: recipient.email },
    });
    if (!validId(link?.order_id)) throw new Error('Missing Square order ID');
    const url = checkoutURL(link.url);
    const { order } = await square('/orders/' + link.order_id);
    const tax = order?.total_tax_money;
    if (!usdAmount(tax) || tax.amount !== savedQuote.taxCents) {
      throw new Error('Unexpected Square tax calculation');
    }
    const record = {
      orderId: link.order_id, attemptId, artwork, size, quantity, unitCents, shippingCents,
      taxCents: tax.amount, totalCents: savedQuote.totalCents, quote: savedQuote.quote,
      lineName, version: 2, recipientBox: encryptRecipient(recipient, link.order_id, config.dataKey),
      sku, fileIdentity: fileIdentity(file), state: 'awaiting_payment', createdAt: now(),
    };
    checkOrder(order, record, config.locationId);
    const created = await store.setJSON(record.orderId, record, { onlyIfNew: true });
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
    const result = await store.getWithMetadata(id, { type: 'json', consistency: 'strong' });
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
    const entry = await store.getWithMetadata(payment.order_id, { type: 'json', consistency: 'strong' });
    if (!entry) return { ignored: true };
    let { data: record, etag } = entry;
    if (record.orderId !== payment.order_id || !isMoney(payment.amount_money, record.totalCents) ||
        !isMoney(payment.total_money, record.totalCents) || (record.paymentId && record.paymentId !== id)) {
      throw new Error('Square payment mismatch');
    }
    if (record.prodigiId) return { state: record.state };
    const details = fulfillmentDetails(record, config);
    await requireArtwork(details.artwork);
    const { order } = await square('/orders/' + record.orderId);
    checkOrder(order, record, config.locationId);
    await requireEnabled();

    if (!record.paymentId) {
      record = { ...record, paymentId: id };
      const claim = await store.setJSON(record.orderId, record, { onlyIfMatch: etag });
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
    }, { 'Idempotency-Key': hash(['studio-print-sandbox', record.orderId]) });
    if (!validId(result?.id) || result.status !== 'draft') throw new Error('Prodigi did not return a draft');
    const saved = await store.setJSON(record.orderId, {
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
    if (['pause', 'resume', 'pause-checkout', 'resume-checkout'].includes(input.action)) {
      const paused = input.action.startsWith('pause');
      const checkoutOnly = input.action.endsWith('-checkout');
      if (!paused && (!config.fulfillmentEnabled || (checkoutOnly && !config.checkoutEnabled) ||
          input.confirm !== (checkoutOnly ? 'resume-sandbox-checkout' : 'resume-sandbox-fulfillment'))) {
        throw new StudioError(409, 'Sandbox fulfillment requires explicit resume confirmation.');
      }
      await store.setJSON(checkoutOnly ? 'control-checkout' : pauseKey, { paused, updatedAt: now() });
      return { paused };
    }
    if (input.action === 'artwork-status') {
      const results = await Promise.all(Object.keys(artworkMasters).map(async artwork => ({
        artwork, ready: await artworkReady(artworkStore, artwork),
      })));
      return { results };
    }
    if (input.action === 'catalogue') {
      const results = await Promise.all(Object.entries(config.variants).map(async ([size, sku]) => {
        const selected = { size, sku, quantity: 1 };
        const variant = await variantFor(selected);
        return { size, sku, name: variant.name, dimensions: variant.dimensions, printAreas: variant.printAreas,
          shipsTo: variant.shipsTo, quote: await shippingQuote(requestQuote, selected) };
      }));
      return { results };
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
        orderId: record.orderId, artwork: record.artwork, size: record.size, quantity: record.quantity,
        paymentStatus: payment?.status ?? 'awaiting_payment', refundedCents: payment?.refunded_money?.amount ?? 0,
        approval: record.approval ?? null, fulfillment: supplier ? fulfillmentSnapshot(supplier) : null,
        financials: orderFinancials(record, payment, supplier),
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
        await store.setJSON(record.orderId, { ...record, ...snapshot, updatedAt: now() }, { onlyIfMatch: etag });
      } else if (settled(record) && submissionStates.has(snapshot.state)) {
        const saved = await store.setJSON(record.orderId, {
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
      const saved = await store.setJSON(record.orderId, { ...record, ...snapshot, approval: 'rejected' }, { onlyIfMatch: etag });
      if (!saved.modified) throw new StudioError(409, 'Order changed. Refresh and try again.');
      return { state: snapshot.state, approval: 'rejected' };
    }

    if (record.approvalCompletedAt || record.approval === 'pending') {
      throw new StudioError(409, 'Approval already started. Refresh and reconcile the supplier state.');
    }
    matchDraft(order, record, details);
    checkBudget(order, config);
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
    const lock = await store.setJSON(record.orderId, claim, { onlyIfMatch: etag });
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
      await reserveDailySpend(store, record.orderId, checkBudget(refreshed, config), config.dailyCents);
      await requireEnabled();
      submissionStarted = true;
      result = await prodigi(apiPath + ':submit', {});
    } catch (error) {
      // Only an ambiguous submission can leave an order pending reconciliation.
      if (!submissionStarted || (error instanceof ProviderError && [400, 422].includes(error.status))) {
        await store.setJSON(record.orderId, { ...claim, approval: 'rejected' }, { onlyIfMatch: lock.etag });
      }
      throw error;
    }
    if (result?.id !== record.prodigiId || !submissionStates.has(result.status)) {
      throw new Error('Prodigi submission outcome requires reconciliation');
    }
    const state = result.status;
    const saved = await store.setJSON(record.orderId, {
      ...claim, approval: 'accepted', approvalCompletedAt: now(), state, updatedAt: now(),
    }, { onlyIfMatch: lock.etag });
    if (!saved.modified) throw new Error('Approval result requires reconciliation');
    return { orderId: record.orderId, prodigiId: record.prodigiId, state };
  }

  return { quote, checkout, webhook, admin, enabled: checkoutEnabled };
}
