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
