const express = require('express');
const { getDb } = require('../services/firebase-admin');
const { verifyWebhookSignature } = require('../services/paymongo');

const router = express.Router();

async function deductInventory(items) {
  for (const { productId, variantId, quantity } of items) {
    const ref = getDb().collection('products').doc(productId);
    const doc = await ref.get();
    if (!doc.exists) continue;
    const product = doc.data();
    const variants = product.variants.map(v =>
      v.id === variantId ? { ...v, stock: Math.max(0, v.stock - quantity) } : v
    );
    await ref.update({ variants });
  }
}

async function restoreInventory(items) {
  for (const { productId, variantId, quantity } of items) {
    const ref = getDb().collection('products').doc(productId);
    const doc = await ref.get();
    if (!doc.exists) continue;
    const product = doc.data();
    const variants = product.variants.map(v =>
      v.id === variantId ? { ...v, stock: v.stock + quantity } : v
    );
    await ref.update({ variants });
  }
}

async function handlePaymentPaid(eventData) {
  const payment = eventData.data;
  const paymentIntentId = payment.attributes?.payment_intent_id
    || payment.attributes?.data?.attributes?.payment_intent_id;

  if (!paymentIntentId) return;

  const ordersSnap = await getDb().collection('orders')
    .where('paymongoPaymentIntentId', '==', paymentIntentId)
    .limit(1)
    .get();

  if (ordersSnap.empty) return;

  const orderRef = ordersSnap.docs[0].ref;
  const order = ordersSnap.docs[0].data();

  if (order.paymentStatus === 'paid') return;

  const statusHistory = [
    ...(order.statusHistory || []),
    {
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
      note: 'Payment confirmed via PayMongo webhook'
    }
  ];

  await orderRef.update({
    status: 'Confirmed',
    paymentStatus: 'paid',
    paymongoPaymentId: payment.id,
    statusHistory
  });

  if (!order.inventoryDeducted) {
    await deductInventory(order.items);
    await orderRef.update({ inventoryDeducted: true });
  }
}

async function handlePaymentFailed(eventData) {
  const payment = eventData.data;
  const paymentIntentId = payment.attributes?.payment_intent_id
    || payment.attributes?.data?.attributes?.payment_intent_id;
  const failReason = payment.attributes?.failed_message || payment.attributes?.last_payment_error?.message || 'Payment failed';

  if (!paymentIntentId) return;

  const ordersSnap = await getDb().collection('orders')
    .where('paymongoPaymentIntentId', '==', paymentIntentId)
    .limit(1)
    .get();

  if (ordersSnap.empty) return;

  const orderRef = ordersSnap.docs[0].ref;
  const order = ordersSnap.docs[0].data();

  if (order.paymentStatus === 'paid') return;

  const statusHistory = [
    ...(order.statusHistory || []),
    {
      status: 'Cancelled',
      timestamp: new Date().toISOString(),
      note: `Payment failed: ${failReason}`
    }
  ];

  await orderRef.update({
    status: 'Cancelled',
    paymentStatus: 'failed',
    paymentFailureReason: failReason,
    statusHistory
  });
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
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

  const eventId = event.data?.id;
  const eventType = event.data?.attributes?.type;

  if (!eventId || !eventType) {
    return res.status(400).json({ error: 'Malformed webhook event' });
  }

  const processedRef = getDb().collection('webhook_events').doc(eventId);
  const processed = await processedRef.get();
  if (processed.exists) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  try {
    if (eventType === 'payment.paid') {
      await handlePaymentPaid(event.data);
    } else if (eventType === 'payment.failed') {
      await handlePaymentFailed(event.data);
    }

    await processedRef.set({
      type: eventType,
      processedAt: new Date().toISOString()
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] processing error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

if (!order.inventoryDeducted) {
    await deductInventory(order.items);
    await orderRef.update({ inventoryDeducted: true });
  }
 
  const { earnPoints } = require('../services/loyalty');   // add near top of file instead
  await earnPoints(order.userId, order.total);
module.exports = router;
