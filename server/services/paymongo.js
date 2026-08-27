const crypto = require('crypto');

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function getSecretKey() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not configured');
  return key;
}

function authHeader(secretKey) {
  return 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
}

async function createPaymentIntent({ amountCentavos, orderId, description }) {
  const res = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(getSecretKey())
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          currency: 'PHP',
          payment_method_allowed: ['card', 'gcash', 'paymaya'],
          description: description || `Go! Cery order ${orderId}`,
          metadata: { orderId }
        }
      }
    })
  });

  const body = await res.json();
  if (!res.ok) {
    const msg = body?.errors?.[0]?.detail || body?.errors?.[0]?.code || 'PayMongo error';
    throw new Error(msg);
  }
  return body.data;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => {
      const [k, v] = p.split('=');
      return [k.trim(), v];
    })
  );

  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  const expectedSig = testSig || liveSig;
  if (!timestamp || !expectedSig) return false;

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    return false;
  }
}

module.exports = {
  createPaymentIntent,
  verifyWebhookSignature,
  getPublicKey: () => process.env.PAYMONGO_PUBLIC_KEY || ''
};
