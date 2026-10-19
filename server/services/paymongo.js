/**
 * server/services/paymongo.js
 * Thin wrapper around the PayMongo REST API (Payment Intent workflow).
 * Money rules: PayMongo amounts are in CENTAVOS; Go! Cery order totals are in PESOS,
 * so callers must multiply by 100 (see routes/payments.js).
 */
const crypto = require('crypto');

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function getSecretKey() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not configured');
  return key;
}

function getPublicKey() {
  return process.env.PAYMONGO_PUBLIC_KEY || '';
}

/** 'test' for sk_test_ / pk_test_ keys, 'live' otherwise. */
function getMode() {
  const key = process.env.PAYMONGO_SECRET_KEY || '';
  return key.indexOf('sk_live_') === 0 ? 'live' : 'test';
}

function authHeader(key) {
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

async function call(method, path, attributes) {
  const res = await fetch(PAYMONGO_API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(getSecretKey()) },
    body: attributes ? JSON.stringify({ data: { attributes } }) : undefined
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = body && body.errors && body.errors[0];
    const err = new Error((first && (first.detail || first.code)) || 'PayMongo error');
    err.status = res.status;
    throw err;
  }
  return body.data;
}

function createPaymentIntent({ amountCentavos, orderId, description, methods }) {
  return call('POST', '/payment_intents', {
    amount: amountCentavos,
    currency: 'PHP',
    payment_method_allowed: methods,
    capture_type: 'automatic',
    description: description || 'Go! Cery order ' + orderId,
    statement_descriptor: 'Go! Cery',
    metadata: { orderId }
  });
}

function getPaymentIntent(id) {
  return call('GET', '/payment_intents/' + id);
}

function createPaymentMethod({ type, billing }) {
  return call('POST', '/payment_methods', { type, billing });
}

function attachPaymentMethod(intentId, paymentMethodId, returnUrl) {
  const attributes = { payment_method: paymentMethodId };
  if (returnUrl) attributes.return_url = returnUrl;
  return call('POST', '/payment_intents/' + intentId + '/attach', attributes);
}

/** Finds a key anywhere inside an object (PayMongo puts QR test links in different places). */
function findKey(obj, wanted) {
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj[wanted] === 'string') return obj[wanted];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const found = findKey(obj[keys[i]], wanted);
    if (found) return found;
  }
  return null;
}

/**
 * PayMongo signs webhooks with HMAC-SHA256 over "<timestamp>.<raw body>".
 * Header looks like: t=1700000000,te=<test signature>,li=<live signature>
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = {};
  signatureHeader.split(',').forEach(piece => {
    const at = piece.indexOf('=');
    if (at > 0) parts[piece.slice(0, at).trim()] = piece.slice(at + 1).trim();
  });
  if (!parts.t) return false;

  const computed = crypto.createHmac('sha256', secret)
    .update(parts.t + '.' + rawBody.toString('utf8'))
    .digest('hex');

  const candidates = [parts.te, parts.li];
  for (let i = 0; i < candidates.length; i++) {
    const sig = candidates[i];
    if (!sig || sig.length !== computed.length) continue;
    if (crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig))) return true;
  }
  return false;
}

module.exports = {
  createPaymentIntent, getPaymentIntent, createPaymentMethod, attachPaymentMethod,
  verifyWebhookSignature, findKey, getPublicKey, getMode
};
