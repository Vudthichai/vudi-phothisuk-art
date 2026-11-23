import { createHash, createHmac } from 'node:crypto';
import { equal, selection, StudioError, validId } from './studio-config.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const money = amount => ({ amount, currency: 'USD' });
const isMoney = (value, amount) => value?.currency === 'USD' && value.amount === amount;
const usdAmount = value => value?.currency === 'USD' && Number.isSafeInteger(value.amount) && value.amount >= 0;
const now = () => new Date().toISOString();

export function providers(config, fetcher = fetch) {
  async function call(provider, base, headers, path, body, extra) {
    let result;
    try {
      result = await fetcher(base + path, {
        method: body === undefined ? 'GET' : 'POST',
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
      throw new Error(`${provider} API returned HTTP ${result.status}${reference}`);
    }
    return result.json();
  }
  return {
    square: (path, body) => call('Square', 'https://connect.squareupsandbox.com/v2', {
      Authorization: `Bearer ${config.squareToken}`, 'Square-Version': '2026-11-18',
    }, path, body),
    prodigi: async (path, body, extra) => (await call('Prodigi', 'https://api.prodigi.com/v5', {
      'X-API-Key': config.prodigiKey,
    }, path, body, extra)).data,
  };
}

export function checkVariant(variant, selected) {
  const [width, height] = selected.size.split('x').map(Number);
  const sides = [variant?.dimensions?.width?.in, variant?.dimensions?.height?.in].sort((a, b) => a - b);
  const printArea = variant?.printAreas?.find(area => area.required && area.name === 'default');
  const requiredAreas = variant?.printAreas?.filter(area => area.required);
  if (variant?.sku !== selected.sku || !/(?:\blustre\b|\blpp\b)/i.test(variant?.name ?? '') ||
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
  if (!order || order.location_id !== locationId || order.reference_id !== record.attemptId ||
      order.line_items?.length !== 1 || line.uid !== 'studio-print' || line.name !== record.lineName ||
      line.quantity !== String(record.quantity) || !isMoney(line.base_price_money, record.unitCents) ||
      (record.shippingCents
        ? order.service_charges?.length !== 1 || charge.uid !== 'studio-shipping' || !isMoney(charge.amount_money, record.shippingCents)
        : order.service_charges?.length) ||
      !isMoney(order.total_money, record.totalCents)) {
    throw new Error('Square order does not match Studio checkout');
  }
}

function checkoutURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.hostname !== 'sandbox.square.link') {
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

export function studioService(config, store, { square, prodigi }) {
  async function checkout(input) {
    const selected = selection(input, config);
    const { artwork, size, quantity, unitCents, shippingCents, taxBps, taxShipping, recipient, attemptId, sku, file } = selected;
    const variant = await prodigi('/catalogue/variants/' + encodeURIComponent(sku));
    checkVariant(variant, selected);
    const lineName = `${selected.title} · Studio Print · ${size.replace('x', ' × ')} in`;
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
    const taxableBase = unitCents * quantity + (taxShipping ? shippingCents : 0);
    if (!usdAmount(tax) || Math.abs(tax.amount - Math.round(taxableBase * taxBps / 10000)) > (taxBps ? 1 : 0)) {
      throw new Error('Unexpected Square tax calculation');
    }
    const record = {
      orderId: link.order_id, attemptId, artwork, size, quantity, unitCents, shippingCents,
      taxCents: tax.amount, totalCents: unitCents * quantity + shippingCents + tax.amount,
      lineName, recipient, sku, file, state: 'awaiting_payment', createdAt: now(),
    };
    checkOrder(order, record, config.locationId);
    const created = await store.setJSON(record.orderId, record, { onlyIfNew: true });
    if (!created.modified) {
      const { data } = await load(record.orderId);
      if (data.attemptId !== attemptId || hash(data.recipient) !== hash(recipient) ||
          data.sku !== sku || data.file !== file || data.state !== 'awaiting_payment') {
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
        payment.status !== 'COMPLETED' || (payment.refunded_money?.amount ?? 0) > 0 ||
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
    const { data: record, etag } = entry;
    if (!isMoney(payment.amount_money, record.totalCents) || !isMoney(payment.total_money, record.totalCents) ||
        (record.paymentId && record.paymentId !== id)) throw new Error('Square payment mismatch');
    if (record.prodigiId) return { orderId: record.orderId, state: record.state };
    const { order } = await square('/orders/' + record.orderId);
    checkOrder(order, record, config.locationId);
    const result = await prodigi('/orders', {
      submit: false, merchantReference: record.orderId, shippingMethod: 'standard',
      recipient: record.recipient,
      items: [{
        sku: record.sku, quantity: record.quantity, sizing: 'fitPrintArea',
        assets: [{ printArea: 'default', url: record.file }],
      }],
    }, { 'Idempotency-Key': hash(['studio-print-sandbox', record.orderId]) });
    if (!validId(result?.id) || result.status !== 'draft') throw new Error('Prodigi did not return a draft');
    const { state, costs, tracking } = fulfillmentSnapshot(result);
    await store.setJSON(record.orderId, {
      ...record, paymentId: id, prodigiId: result.id, state, costs, tracking, updatedAt: now(),
    }, { onlyIfMatch: etag });
    return { orderId: record.orderId, state: 'draft' };
  }

  async function webhook(request) {
    const raw = await request.text();
    const expected = createHmac('sha256', config.webhookKey).update(config.webhookUrl).update(raw).digest('base64');
    if (!equal(expected, request.headers.get('x-square-hmacsha256-signature') ?? '')) {
      throw new StudioError(401, 'Invalid webhook signature.');
    }
    const event = JSON.parse(raw);
    if (event.merchant_id !== config.merchantId || !['payment.created', 'payment.updated'].includes(event.type) ||
      event.data?.object?.payment?.status !== 'COMPLETED') return { ignored: true };
    return draft(event.data.object.payment.id);
  }

  async function admin(input) {
    if (input.action === 'retry-draft') return draft(input.paymentId);
    if (!validId(input.orderId)) throw new StudioError(400, 'Invalid Square order ID.');
    const { data: record, etag } = await load(input.orderId);
    if (!record.prodigiId) throw new StudioError(409, 'No Prodigi draft. Retry using the Square payment ID.');
    const apiPath = '/orders/' + record.prodigiId;
    const order = await prodigi(apiPath);
    if (order?.id !== record.prodigiId || order.merchantReference !== record.orderId) {
      throw new Error('Prodigi order mismatch');
    }
    if (input.action === 'approve') {
      if (order.status !== 'draft' || !order.allowedActions?.includes('submit')) {
        throw new StudioError(409, 'Prodigi does not currently allow submission.');
      }
      if (record.approvalCompletedAt || Date.now() - Date.parse(record.approvalAttemptAt) < 60000) {
        throw new StudioError(409, 'Approval already started. Refresh to reconcile the supplier state.');
      }
      if (!await verifiedPayment(record.paymentId, record)) {
        throw new StudioError(409, 'Square payment is no longer eligible.');
      }
      const { order: squareOrder } = await square('/orders/' + record.orderId);
      checkOrder(squareOrder, record, config.locationId);
      const approvalAttemptAt = now();
      const lock = await store.setJSON(record.orderId, { ...record, approvalAttemptAt }, { onlyIfMatch: etag });
      if (!lock.modified) throw new StudioError(409, 'Order changed. Refresh and try again.');
      const result = await prodigi(apiPath + ':submit', {});
      const state = result?.status ?? 'pending_submission';
      await store.setJSON(record.orderId, {
        ...record, approvalAttemptAt, approvalCompletedAt: now(), state, updatedAt: now(),
      }, { onlyIfMatch: lock.etag });
      return { orderId: record.orderId, prodigiId: record.prodigiId, state };
    }
    if (input.action !== 'refresh') throw new StudioError(400, 'Unknown admin action.');
    const { state, costs, tracking } = fulfillmentSnapshot(order);
    await store.setJSON(record.orderId, { ...record, state, costs, tracking, updatedAt: now() }, { onlyIfMatch: etag });
    return { orderId: record.orderId, prodigiId: record.prodigiId, state, costs, tracking };
  }

  return { checkout, webhook, admin };
}
