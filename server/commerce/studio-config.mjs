import { createHash, timingSafeEqual } from 'node:crypto';
import catalog from '../../src/studio/print-catalog.json' with { type: 'json' };

export class StudioError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function equal(a, b) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

function https(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Invalid HTTPS URL');
  return url;
}

const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export const validId = value => typeof value === 'string' && /^[a-z\d_-]{1,100}$/i.test(value);

export function studioConfig(env) {
  if (env.STUDIO_SANDBOX_ENABLED !== 'true' || !['deploy-preview', 'branch-deploy', 'dev', 'dev-server'].includes(env.CONTEXT)) {
    throw new StudioError(404, 'Studio Print checkout is unavailable.');
  }
  try {
    const {
      SQUARE_SANDBOX_TOKEN: squareToken, SQUARE_SANDBOX_LOCATION: locationId,
      SQUARE_SANDBOX_MERCHANT: merchantId, SQUARE_WEBHOOK_KEY: webhookKey,
      STUDIO_WEBHOOK_URL: webhookUrl, STUDIO_ADMIN_TOKEN: adminToken,
      PRODIGI_SANDBOX_KEY: prodigiKey, STUDIO_VARIANTS: variantsJSON,
      STUDIO_PRINT_FILES: filesJSON, STUDIO_DESTINATIONS: destinationsJSON,
    } = env;
    const url = https(webhookUrl);
    if (url.origin === 'https://vudiphothisukart.com' || url.hostname.endsWith('.vudiphothisukart.com') ||
        url.pathname !== '/api/studio-print/webhook' || url.search ||
        !squareToken || !validId(locationId) || !validId(merchantId) || !webhookKey ||
        !adminToken || adminToken.length < 32 || !/^sandbox_.+/.test(prodigiKey ?? '')) {
      throw new Error('Missing or unsafe credential configuration');
    }
    const variants = JSON.parse(variantsJSON);
    const files = JSON.parse(filesJSON);
    const destinations = JSON.parse(destinationsJSON);
    for (const size of Object.keys(catalog.prices)) {
      if (!validId(variants[size])) throw new Error('Missing catalogue variant');
    }
    for (const id of Object.keys(catalog.artworks)) {
      for (const size of Object.keys(catalog.prices)) https(files[id][size]);
    }
    if (!Object.keys(destinations).length) throw new Error('Missing destination policies');
    for (const [key, rate] of Object.entries(destinations)) {
      if (!/^[A-Z]{2}-\d{5}$/.test(key) || !integer(rate.shippingCents, 0, 10000) ||
          !integer(rate.additionalCents, 0, 10000) || !integer(rate.taxBps, 0, 2000) ||
          typeof rate.taxShipping !== 'boolean') throw new Error('Invalid destination policy');
    }
    return {
      squareToken, locationId, merchantId, webhookKey, webhookUrl: url.href, adminToken,
      prodigiKey, variants, files, destinations,
    };
  } catch {
    throw new StudioError(503, 'Sandbox checkout configuration is incomplete.');
  }
}

function field(value, length, optional = false) {
  const text = typeof value === 'string' ? value.trim() : '';
  if ((text || optional) && text.length <= length && !/[\u0000-\u001f\u007f]/.test(text)) return text;
  throw new StudioError(400, 'Check the required shipping and contact fields.');
}

export function selection(input, config) {
  const { artwork, size, quantity, country, attemptId } = input;
  if (!Object.hasOwn(catalog.artworks, artwork) || !Object.hasOwn(catalog.prices, size) ||
      !integer(quantity, 1, 10) || typeof attemptId !== 'string' ||
      !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(attemptId)) {
    throw new StudioError(400, 'Choose an available Studio Print, size, and quantity.');
  }
  const name = field(input.name, 100);
  const email = field(input.email, 254);
  const line1 = field(input.line1, 100);
  const line2 = field(input.line2, 100, true);
  const townOrCity = field(input.city, 80);
  const stateOrCounty = field(input.state, 2).toUpperCase();
  const postalOrZipCode = field(input.zip, 10);
  if (country !== 'US' || !/^[A-Z]{2}$/.test(stateOrCounty) || !/^\d{5}(-\d{4})?$/.test(postalOrZipCode) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StudioError(400, 'Enter a valid email and U.S. shipping address.');
  }
  const rate = config.destinations[`${stateOrCounty}-${postalOrZipCode.slice(0, 5)}`];
  if (!rate) throw new StudioError(400, 'This ZIP code is outside the sandbox shipping area.');
  return {
    artwork, size, quantity, attemptId, title: catalog.artworks[artwork], unitCents: catalog.prices[size],
    sku: config.variants[size], file: config.files[artwork][size],
    shippingCents: rate.shippingCents + (quantity - 1) * rate.additionalCents,
    taxBps: rate.taxBps, taxShipping: rate.taxShipping,
    recipient: { name, email, address: { line1, line2, townOrCity, stateOrCounty, postalOrZipCode, countryCode: 'US' } },
  };
}
