/**
 * server/routes/webhooks.js
 * POST /api/webhooks/paymongo — PayMongo calls this when a payment succeeds or fails.
 * Needs the RAW request body to check the signature, so index.js mounts this router
 * BEFORE express.json().
 */
const express = require('express');
const { getDb } = require('../services/firebase-admin');
const { verifyWebhookSignature } = require('../services/paymongo');
const { markOrderPaid, markOrderFailed } = require('../services/payments');

const router = express.Router();

async function findOrderRef(paymentIntentId) {
  if (!paymentIntentId) return null;
  const snap = await getDb().collection('orders')
    .where('paymongoPaymentIntentId', '==', paymentIntentId).limit(1).get();
  return snap.empty ? null : snap.docs[0].ref;
}

router.post('/paymongo', express.raw({ type: '*/*' }), async (req, res) => {
  const signature = req.headers['paymongo-signature'] || '';
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Shape: { data: { id: 'evt_..', attributes: { type: 'payment.paid', data: { id: 'pay_..', attributes: {...} } } } }
  const eventId = event.data && event.data.id;
  const eventType = event.data && event.data.attributes && event.data.attributes.type;
  const resource = event.data && event.data.attributes && event.data.attributes.data;
  if (!eventId || !eventType) return res.status(400).json({ error: 'Malformed webhook event' });

  const processedRef = getDb().collection('webhook_events').doc(eventId);
  if ((await processedRef.get()).exists) return res.status(200).json({ received: true, duplicate: true });

  try {
    const attrs = (resource && resource.attributes) || {};
    if (eventType === 'payment.paid') {
      const orderRef = await findOrderRef(attrs.payment_intent_id);
      if (orderRef) await markOrderPaid(orderRef, resource.id);
    } else if (eventType === 'payment.failed') {
      const orderRef = await findOrderRef(attrs.payment_intent_id);
      if (orderRef) await markOrderFailed(orderRef, attrs.failed_message || 'Payment failed');
    }
    await processedRef.set({ type: eventType, processedAt: new Date().toISOString() });
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] processing error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
