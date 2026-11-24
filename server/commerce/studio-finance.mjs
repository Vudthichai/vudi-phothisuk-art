import { StudioError, validId } from './studio-config.mjs';

export function supplierCents(money) {
  const amount = money?.amount;
  if (money?.currency !== 'USD' || typeof amount !== 'string' || !/^\d{1,6}(?:\.\d{1,2})?$/.test(amount)) return null;
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export async function shippingQuote(quote, selected) {
  const response = await quote({
    shippingMethod: 'Standard', destinationCountryCode: 'US', currencyCode: 'USD',
    items: [{ sku: selected.sku, copies: selected.quantity, assets: [{ printArea: 'default' }] }],
  });
  const standard = response?.quotes?.find(item => item.shipmentMethod?.toLowerCase() === 'standard');
  const line = standard?.items?.[0];
  const productionCents = supplierCents(standard?.costSummary?.items);
  const shippingCents = supplierCents(standard?.costSummary?.shipping);
  if (!['created', 'createdwithissues'].includes(response?.outcome?.toLowerCase()) ||
      (response.issues ?? []).some(issue => issue.errorCode !== 'destinationCountryCode.UsSalesTaxWarning') ||
      (response.outcome.toLowerCase() === 'createdwithissues' && !response.issues?.length) ||
      !standard || standard.items?.length !== 1 || line.sku?.toUpperCase() !== selected.sku ||
      line.copies !== selected.quantity || !validId(line.id) || !standard.shipments?.length ||
      standard.shipments.some(shipment => !shipment.items?.includes(line.id)) ||
      productionCents === null || productionCents <= 0 || shippingCents === null) {
    throw new StudioError(503, 'An eligible USD shipping quote is unavailable for this print.');
  }
  return {
    productionCents, shippingCents, currency: 'USD', method: 'standard', scope: 'US-country',
    services: standard.shipments.flatMap(({ carrier, fulfillmentLocation }) =>
      carrier?.name && carrier?.service ? [{ carrier: carrier.name, service: carrier.service,
        country: fulfillmentLocation?.countryCode ?? null }] : []),
    fulfillmentCountries: [...new Set(standard.shipments.map(shipment => shipment.fulfillmentLocation?.countryCode)
      .filter(country => typeof country === 'string' && /^[A-Z]{2}$/.test(country)))],
  };
}

export async function reserveDailySpend(store, orderId, amount, limit, date = new Date()) {
  const key = 'budget-' + date.toISOString().slice(0, 10);
  for (let attempt = 0; attempt < 6; attempt++) {
    const entry = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const orders = entry?.data.orders ?? {};
    const reserved = Object.hasOwn(orders, orderId) ? orders[orderId] : 0;
    const total = entry?.data.total ?? 0;
    const increase = Math.max(0, amount - reserved);
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(reserved) || total + increase > limit) {
      throw new StudioError(409, 'The daily fulfillment spending limit has been reached.');
    }
    if (!increase) return;
    const saved = await store.setJSON(key, { orders: { ...orders, [orderId]: amount }, total: total + increase },
      entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
    if (saved.modified) return;
  }
  throw new StudioError(503, 'The daily fulfillment budget is busy. Retry approval.');
}

export function orderFinancials(record, payment, supplier) {
  const fees = payment?.status === 'COMPLETED' && Array.isArray(payment.processing_fee) && payment.processing_fee.length &&
    payment.processing_fee.every(fee => fee.amount_money?.currency === 'USD' && Number.isSafeInteger(fee.amount_money.amount))
    ? payment.processing_fee.reduce((sum, fee) => sum + fee.amount_money.amount, 0) : null;
  const production = supplierCents(supplier?.costs?.items);
  const shipping = supplierCents(supplier?.costs?.shipping);
  const total = supplierCents(supplier?.costs?.total);
  const quotedTotal = record.quote ? record.quote.productionCents + record.quote.shippingCents : null;
  const costBasis = total ?? quotedTotal;
  const revenue = record.totalCents - record.taxCents;
  const beforeFees = costBasis === null || payment?.refunded_money?.amount > 0 ? null : revenue - costBasis;
  const afterFees = fees === null || beforeFees === null ? null : beforeFees - fees;
  return {
    currency: 'USD', printCents: record.quantity * record.unitCents, shippingCollectedCents: record.shippingCents,
    customerTaxCents: record.taxCents, customerTotalCents: record.totalCents, squareFeeCents: fees,
    estimatedProductionCents: record.quote?.productionCents ?? null,
    estimatedShippingCents: record.quote?.shippingCents ?? null,
    supplierReportedProductionCents: production, supplierReportedShippingCents: shipping, supplierReportedTotalCents: total,
    estimatedContributionBeforeFeesCents: beforeFees, estimatedContributionAfterFeesCents: afterFees,
    estimatedMarginBeforeFeesPercent: beforeFees === null ? null : Math.round(beforeFees / revenue * 10000) / 100,
    estimatedMarginAfterFeesPercent: afterFees === null ? null : Math.round(afterFees / revenue * 10000) / 100,
  };
}
