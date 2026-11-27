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

// Require a full Standard quote, with the authoritative product, shipment and tax breakdown.
export async function destinationOffer(prodigi, salesTax, config, selected) {
  const address = selected.recipient.address;
  const quote = await prodigi('/quotes/order', {
    items: [{ catalogueVariantId: selected.sku, quantity: selected.quantity }],
    shippingAddress: address, shippingMethod: 'standard', currencyCode: 'USD',
  });
  const line = quote?.lineItems?.[0];
  const [items, shipping, tax, total] = ['items', 'shipping', 'tax', 'total']
    .map(field => supplierCents(quote?.[field]));
  if (!Array.isArray(quote?.lineItems) || quote.lineItems.length !== 1 ||
      typeof line?.catalogueVariantId !== 'string' || line.catalogueVariantId.toUpperCase() !== selected.sku ||
      line.quantity !== selected.quantity || !validId(line.id) ||
      !Array.isArray(quote.shipments) || !quote.shipments.length ||
      quote.shipments.some(shipment => !Array.isArray(shipment?.itemIds) ||
        shipment.itemIds.length !== 1 || shipment.itemIds[0] !== line.id) ||
      (quote.shippingOptions != null && (!Array.isArray(quote.shippingOptions) ||
        !quote.shippingOptions.some(option => option?.method === 'standard'))) ||
      [items, shipping, tax, total].some(cents => cents === null) || items <= 0 ||
      total !== items + shipping + tax) {
    throw new StudioError(503, 'A verified destination-specific Standard shipping quote is unavailable.');
  }
  if (total > config.maxCostCents) {
    throw new StudioError(409, 'Current supplier costs exceed the approved amount.');
  }

  const origin = config.taxOrigin;
  const merchandise = selected.unitCents * selected.quantity;
  const result = await salesTax({
    from_country: 'US', from_state: origin.state, from_zip: origin.zip,
    from_city: origin.city, from_street: origin.street,
    to_country: 'US', to_state: address.stateOrCounty, to_zip: address.postalOrZipCode,
    to_city: address.townOrCity, to_street: [address.line1, address.line2].filter(Boolean).join(' '),
    amount: merchandise / 100, shipping: shipping / 100,
    line_items: [{ id: 'studio-print', quantity: selected.quantity, unit_price: selected.unitCents / 100 }],
  });
  const retail = result?.tax;
  const cents = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001 ? Math.round(value * 100) : null;
  const expectedTaxCents = cents(retail?.amount_to_collect);
  const taxable = cents(retail?.taxable_amount);
  const taxBps = Math.round(retail?.rate * 1000000) / 100;
  const taxShipping = shipping > 0 && taxable === merchandise + shipping;
  if (typeof retail?.has_nexus !== 'boolean' || expectedTaxCents === null || taxable === null ||
      cents(retail.order_total_amount) !== merchandise + shipping || cents(retail.shipping) !== shipping ||
      !Number.isFinite(taxBps) || taxBps < 0 || taxBps > 2000 ||
      (!retail.has_nexus && (expectedTaxCents !== 0 || address.stateOrCounty === 'PA')) ||
      (expectedTaxCents > 0 && ![merchandise, merchandise + shipping].includes(taxable))) {
    throw new StudioError(503, 'Retail sales tax could not be verified for this address.');
  }
  return {
    ...selected, shippingCents: shipping, approvedSupplierCents: total,
    expectedTaxCents, taxShipping, taxBps: expectedTaxCents === 0 ? 0 : taxBps,
  };
}
