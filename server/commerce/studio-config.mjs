import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { artworkReference } from './studio-artwork.mjs';
import catalog from './studio-catalog.json' with { type: 'json' };

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
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) throw new Error('Invalid HTTPS URL');
  return url;
}

const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const states = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const hexKey = value => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);
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
      PRODIGI_SANDBOX_KEY: prodigiKey,
      STUDIO_DESTINATIONS: destinationsJSON,
      STUDIO_ARTWORK_SIGNING_KEY: artworkKey, STUDIO_DATA_KEY: dataKey,
      STUDIO_MAX_QUANTITY: maxQuantityValue = '10', STUDIO_MAX_FULFILLMENT_CENTS: maxCostValue,
      STUDIO_FULFILLMENT_ENABLED: fulfillmentEnabled, STUDIO_CHECKOUT_ENABLED: checkoutEnabled,
      STUDIO_DAILY_FULFILLMENT_CENTS: dailyValue,
    } = env;
    const url = https(webhookUrl);
    if (url.origin === 'https://vudiphothisukart.com' || url.hostname.endsWith('.vudiphothisukart.com') ||
        url.pathname !== '/api/studio-print/webhook' || url.search ||
        !squareToken || !validId(locationId) || !validId(merchantId) || !webhookKey ||
        !hexKey(adminToken) || !hexKey(dataKey) || !hexKey(artworkKey) ||
        new Set([adminToken, dataKey, artworkKey].map(key => key.toLowerCase())).size !== 3 || !/^sandbox_.+/.test(prodigiKey ?? '')) {
      throw new Error('Missing or unsafe credential configuration');
    }
    const maxQuantity = Number(maxQuantityValue);
    const maxCostCents = Number(maxCostValue);
    const dailyCents = Number(dailyValue);
    if (!integer(maxQuantity, 1, 10) || !integer(maxCostCents, 1, 100000) || !integer(dailyCents, maxCostCents, 1000000)) {
      throw new Error('Invalid order limits');
    }
    const variants = catalog.variants;
    const destinations = JSON.parse(destinationsJSON);
    if (!Object.keys(destinations).length) throw new Error('Missing destination policies');
    for (const [key, rate] of Object.entries(destinations)) {
      if (!/^[A-Z]{2}-\d{5}$/.test(key) || !states.has(key.slice(0, 2)) || ['AK', 'HI'].includes(key.slice(0, 2)) ||
          !integer(rate.taxBps, 0, 2000) ||
          typeof rate.taxShipping !== 'boolean') throw new Error('Invalid destination policy');
    }
    return {
      squareToken, locationId, merchantId, webhookKey, webhookUrl: url.href, adminToken,
      prodigiKey, variants, destinations, origin: url.origin, artworkKey: Buffer.from(artworkKey, 'hex'),
      dataKey: Buffer.from(dataKey, 'hex'), maxQuantity, maxCostCents,
      fulfillmentEnabled: fulfillmentEnabled === 'true', checkoutEnabled: checkoutEnabled === 'true', dailyCents,
    };
  } catch {
    throw new StudioError(503, 'Sandbox checkout configuration is incomplete.');
  }
}

function field(value, length, optional = false) {
  if (optional && value === undefined) return '';
  const text = typeof value === 'string' ? value.trim() : null;
  if (text !== null && (text || optional) && text.length <= length && !/[\u0000-\u001f\u007f]/.test(text)) return text;
  throw new StudioError(400, 'Check the required shipping and contact fields.');
}

export function selection(input, config) {
  const { artwork, size, quantity, country, attemptId } = input;
  if (typeof artwork !== 'string' || typeof size !== 'string' ||
      !Object.hasOwn(catalog.artworks, artwork) || !Object.hasOwn(catalog.prices, size) ||
      !integer(quantity, 1, config.maxQuantity) || typeof attemptId !== 'string' ||
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
  if (country !== 'US' || !states.has(stateOrCounty) || !/^\d{5}(-\d{4})?$/.test(postalOrZipCode) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StudioError(400, 'Enter a valid email and U.S. shipping address.');
  }
  const rate = config.destinations[`${stateOrCounty}-${postalOrZipCode.slice(0, 5)}`];
  if (!rate) throw new StudioError(400, 'This ZIP code is outside the sandbox shipping area.');
  return {
    artwork, size, quantity, attemptId, title: catalog.artworks[artwork], unitCents: catalog.prices[size],
    sku: config.variants[size], file: artworkReference(config.origin, artwork),
    taxBps: rate.taxBps, taxShipping: rate.taxShipping,
    recipient: { name, email, address: { line1, line2, townOrCity, stateOrCounty, postalOrZipCode, countryCode: 'US' } },
  };
}

// The order ID authenticates the association between ciphertext and its order record.
export function encryptRecipient(recipient, orderId, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(orderId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(recipient), 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

export function decryptRecipient(record, config) {
  if (record.version !== 2 || typeof record.recipientBox !== 'string') {
    throw new StudioError(409, 'Legacy sandbox order requires manual reconciliation.');
  }
  const bytes = Buffer.from(record.recipientBox, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', config.dataKey, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(record.orderId));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}

export function fulfillmentDetails(record, config) {
  const recipient = decryptRecipient(record, config);
  const addr = recipient.address;
  const resolved = selection({
    artwork: record.artwork, size: record.size, quantity: record.quantity, attemptId: record.attemptId,
    name: recipient.name, email: recipient.email, country: addr.countryCode, line1: addr.line1,
    line2: addr.line2, city: addr.townOrCity, state: addr.stateOrCounty, zip: addr.postalOrZipCode,
  }, config);
  if (resolved.sku !== record.sku || fileIdentity(resolved.file) !== record.fileIdentity) {
    throw new StudioError(409, 'The order print binding requires manual reconciliation.');
  }
  return resolved;
}

export function fileIdentity(value) {
  const url = https(value);
  return createHash('sha256').update(url.origin + url.pathname).digest('hex');
}
