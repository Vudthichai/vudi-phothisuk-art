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
export async function destinationOffer(prodigi, census, config, selected) {
  const address = selected.recipient.address;
  const retailTax = await retailTaxFor(census, config, address);
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
  const approvedSupplierCents = config.individualSupplierAllowances[selected.size];
  if (shipping !== config.standardShippingCents || items !== config.productionCostCents[selected.size] ||
      total > approvedSupplierCents ||
      quote.shipments.length !== 1 || quote.shipments[0].fulfillmentLocation?.countryCode !== 'US' ||
      quote.shipments[0].fulfillmentLocation?.labCode !== 'prodigi_us') {
    throw new StudioError(409, 'Current Standard shipping, supplier cost or fulfillment differs from the approved terms.');
  }
  return { ...selected, ...retailTax, shippingCents: shipping, approvedSupplierCents, supplierQuoteCents: total };
}


// PA point-of-delivery local rates depend on county, and a ZIP can span counties.
async function retailTaxFor(census, config, address) {
  const result = await census(new URLSearchParams({
    street: address.line1, city: address.townOrCity, state: address.stateOrCounty,
    zip: address.postalOrZipCode.slice(0, 5),
    benchmark: 'Public_AR_Current', vintage: 'Current_Current', format: 'json', layers: 'Counties',
  }).toString());
  const matches = result?.result?.addressMatches;
  const match = matches?.[0];
  if (!Array.isArray(matches) || matches.length !== 1 ||
      match?.addressComponents?.state !== address.stateOrCounty ||
      match?.addressComponents?.zip !== address.postalOrZipCode.slice(0, 5)) {
    throw new StudioError(400, 'The shipping address could not be verified for sales tax.');
  }
  if (!config.retailCollectionStates.includes(address.stateOrCounty)) {
    return { taxBps: 0, taxShipping: false };
  }
  const counties = match.geographies?.Counties;
  const county = counties?.[0]?.GEOID;
  if (!Array.isArray(counties) || counties.length !== 1 || typeof county !== 'string' ||
      !/^42[0-9]{3}$/.test(county)) {
    throw new StudioError(400, 'Pennsylvania sales tax could not be verified for this delivery address.');
  }
  return { taxBps: county === '42101' ? 800 : county === '42003' ? 700 : 600, taxShipping: true };
}
