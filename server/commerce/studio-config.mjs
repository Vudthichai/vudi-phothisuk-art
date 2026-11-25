import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { artworkReference } from './studio-artwork.mjs';
import catalog from './studio-catalog.json' with { type: 'json' };

export class StudioError extends Error {
  constructor(status, message, code, stage) {
    super(message);
    this.status = status;
    this.code = code;
    this.stage = stage;
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

export class StudioConfigError extends StudioError {
  constructor(status, message, issues) {
    super(status, message);
    this.issues = issues;
  }
}

export function studioConfig(env, deployContext, policy, { preflight = false } = {}) {
  const mode = env.STUDIO_MODE ?? 'off';
  const allowed = preflight
    ? mode === 'off' && deployContext === 'deploy-preview'
    : (mode === 'live-test' && deployContext === 'deploy-preview') || (mode === 'live' && deployContext === 'production');
  if (!allowed) {
    throw new StudioError(404, 'Studio Print checkout is unavailable.');
  }

  const checks = {
    SQUARE_ACCESS_TOKEN: /^\S+$/,
    SQUARE_WEBHOOK_SIGNATURE_KEY: /^\S+$/,
    PRODIGI_API_KEY: /^live_\S+$/,
    STUDIO_MASTER_KEY: /^[a-f\d]{64}$/i,
    STUDIO_ADMIN_TOKEN: /^[a-f\d]{64}$/i,
  };
  const issues = Object.entries(checks).flatMap(([name, pattern]) => {
    const value = env[name];
    return pattern.test(value ?? '') ? [] : [`${name}: ${value ? 'invalid' : 'missing'}`];
  });
  if (hexKey(env.STUDIO_MASTER_KEY) && hexKey(env.STUDIO_ADMIN_TOKEN) &&
      equal(env.STUDIO_MASTER_KEY.toLowerCase(), env.STUDIO_ADMIN_TOKEN.toLowerCase())) {
    issues.push('STUDIO_MASTER_KEY and STUDIO_ADMIN_TOKEN must be distinct');
  }
  const { locationId, merchantId } = policy.square;
  if (!validId(locationId)) issues.push('studio-policy.json: Square locationId missing or invalid');
  if (!validId(merchantId)) issues.push('studio-policy.json: Square merchantId missing or invalid');
  let origin;
  try {
    const originMode = preflight ? 'live-test' : mode;
    const url = https(policy.origins[originMode]);
    if (url.href === url.origin + '/' && (originMode === 'live-test'
      ? /^deploy-preview-\d+--vudi-phothisuk-art\.netlify\.app$/.test(url.hostname)
      : url.origin === 'https://vudiphothisukart.com')) origin = url.origin;
  } catch {}
  if (!origin) issues.push('studio-policy.json: approved deployment origin missing or invalid');
  if (!validId(policy.testRun)) issues.push('studio-policy.json: testRun invalid');
  if (!integer(policy.limits?.customerCents, 1, 100000) || !integer(policy.limits?.supplierCents, 1, 100000)) {
    issues.push('studio-policy.json: customer or supplier spending limit invalid');
  }

  const destinations = policy.destinations;
  if (!destinations || Object.entries(destinations).some(([key, rate]) =>
    !/^[A-Z]{2}-\d{5}$/.test(key) || !states.has(key.slice(0, 2)) || ['AK', 'HI'].includes(key.slice(0, 2)) ||
    !integer(rate?.taxBps, 0, 2000) || typeof rate?.taxShipping !== 'boolean' ||
    Object.keys(catalog.prices).some(size => !integer(rate.shippingCents?.[size], 0, 10000) ||
      !integer(rate.approvedSupplierCents?.[size], 1, 100000)))) {
    issues.push('studio-policy.json: invalid destination policy');
  }
  if (issues.length) throw new StudioConfigError(503, 'Studio Print configuration is incomplete.', issues);

  const master = Buffer.from(env.STUDIO_MASTER_KEY, 'hex');
  const derive = info => Buffer.from(hkdfSync('sha256', master, 'studio-print-launch-v1', info, 32));
  return {
    mode, origin, locationId, merchantId, webhookUrl: origin + '/api/studio-print/webhook',
    squareToken: env.SQUARE_ACCESS_TOKEN, webhookKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    prodigiKey: env.PRODIGI_API_KEY, adminToken: env.STUDIO_ADMIN_TOKEN,
    artworkKey: derive('artwork signatures'), dataKey: derive('recipient encryption'),
    testInvite: createHmac('sha256', derive('test invites')).update(`${merchantId}:${policy.testRun}`).digest('hex'),
    testRun: policy.testRun, variants: catalog.variants, destinations,
    maxQuantity: 1, maxCustomerCents: mode === 'live-test' ? Math.min(6500, policy.limits.customerCents) : policy.limits.customerCents,
    maxCostCents: mode === 'live-test' ? Math.min(3500, policy.limits.supplierCents) : policy.limits.supplierCents,
  };
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
  if (!rate) throw new StudioError(400, 'This ZIP code is outside the approved shipping area.');
  return {
    artwork, size, quantity, attemptId, title: catalog.artworks[artwork], unitCents: catalog.prices[size],
    sku: config.variants[size], file: artworkReference(config.origin, artwork),
    taxBps: rate.taxBps, taxShipping: rate.taxShipping,
    shippingCents: rate.shippingCents[size], approvedSupplierCents: rate.approvedSupplierCents[size],
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
    throw new StudioError(409, 'Legacy order requires manual reconciliation.');
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
