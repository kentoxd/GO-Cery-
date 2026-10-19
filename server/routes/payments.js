/**
 * server/routes/payments.js
 *   GET  /api/payments/config   -> public key + test/live mode (for the card form)
 *   POST /api/payments/intent   -> creates (or reuses) a PayMongo payment intent for an order
 *   POST /api/payments/qrph     -> creates a QR Ph code for an order
 *   POST /api/payments/verify   -> asks PayMongo if the order was paid and updates it
 * The amount ALWAYS comes from the order stored in Firestore, never from the browser.
 */
const express = require('express');
const { getDb } = require('../services/firebase-admin');
const paymongo = require('../services/paymongo');
const { markOrderPaid } = require('../services/payments');
const { verifyToken } = require('../middleware/auth');
const CONFIG = require('../config');

const router = express.Router();
const MIN_CENTAVOS = 2000; // PHP 20.00

router.get('/config', (_req, res) => {
  res.json({ success: true, data: { publicKey: paymongo.getPublicKey(), mode: paymongo.getMode() } });
});

/** Loads the order, checks the caller owns it, and works out which PayMongo method it uses. */
async function loadOrder(req, res) {
  const orderId = req.body && req.body.orderId;
  if (!orderId) { res.status(400).json({ success: false, error: 'orderId is required' }); return null; }

  const orderRef = getDb().collection('orders').doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) { res.status(404).json({ success: false, error: 'Order not found' }); return null; }
  const order = snap.data();

  if (order.userId !== req.user.uid) { res.status(403).json({ success: false, error: 'Not your order' }); return null; }
  const method = CONFIG.onlinePaymentMethods[order.paymentMethod];
  if (!method) { res.status(400).json({ success: false, error: 'This order is not paid online.' }); return null; }
  if (order.paymentStatus === 'paid') { res.status(400).json({ success: false, error: 'Order already paid' }); return null; }
  if (order.status === 'Cancelled') { res.status(400).json({ success: false, error: 'This order was cancelled.' }); return null; }

  const amountCentavos = Math.round(Number(order.total) * 100);
  if (!(amountCentavos >= MIN_CENTAVOS)) {
    res.status(400).json({ success: false, error: 'Minimum online payment is PHP 20.00' }); return null;
  }
  return { orderRef, order, orderId, method, amountCentavos };
}

/** Reuses the order's intent when it is still open, otherwise creates a new one. */
async function getOrCreateIntent(ctx) {
  const { orderRef, order, orderId, method, amountCentavos } = ctx;
  if (order.paymongoPaymentIntentId) {
    const existing = await paymongo.getPaymentIntent(order.paymongoPaymentIntentId);
    const status = existing.attributes.status;
    if (status === 'succeeded') {
      await markOrderPaid(orderRef, existing.attributes.payments && existing.attributes.payments[0] && existing.attributes.payments[0].id);
      const err = new Error('Order already paid'); err.status = 400; throw err;
    }
    if (status === 'awaiting_payment_method' || status === 'awaiting_next_action') return existing;
  }
  const intent = await paymongo.createPaymentIntent({
    amountCentavos, orderId, description: 'Go! Cery order ' + orderId, methods: [method]
  });
  await orderRef.update({
    paymongoPaymentIntentId: intent.id, paymentProvider: 'paymongo', paymentStatus: 'awaiting_payment'
  });
  return intent;
}

function sendError(res, err) {
  console.error('[payments]', err.message);
  res.status(err.status && err.status < 500 ? err.status : 502).json({ success: false, error: err.message });
}

router.post('/intent', verifyToken, async (req, res) => {
  try {
    const ctx = await loadOrder(req, res);
    if (!ctx) return;
    if (ctx.method !== 'card') return res.status(400).json({ success: false, error: 'Use /qrph for QR Ph orders.' });
    const intent = await getOrCreateIntent(ctx);
    return res.json({ success: true, data: {
      paymentIntentId: intent.id,
      clientKey: intent.attributes.client_key,
      publicKey: paymongo.getPublicKey(),
      amount: ctx.amountCentavos,
      mode: paymongo.getMode()
    } });
  } catch (err) { return sendError(res, err); }
});

router.post('/qrph', verifyToken, async (req, res) => {
  try {
    const ctx = await loadOrder(req, res);
    if (!ctx) return;
    if (ctx.method !== 'qrph') return res.status(400).json({ success: false, error: 'This order does not use QR Ph.' });

    const intent = await getOrCreateIntent(ctx);
    let action = intent.attributes.next_action;
    let attached = intent;
    // A QR code is one-time and expires after 30 minutes. Make a new one when there is none yet.
    if (!action || !action.code) {
      const pm = await paymongo.createPaymentMethod({
        type: 'qrph',
        billing: { name: ctx.order.userName || 'Go! Cery customer', email: req.user.email || 'customer@gocery.ph' }
      });
      attached = await paymongo.attachPaymentMethod(intent.id, pm.id);
      action = attached.attributes.next_action;
    }
    if (!action || !action.code || !action.code.image_url) {
      return res.status(502).json({ success: false, error: 'PayMongo did not return a QR code. QR Ph may not be enabled for your PayMongo account yet.' });
    }
    return res.json({ success: true, data: {
      imageUrl: action.code.image_url,
      amount: ctx.amountCentavos,
      expiresInMinutes: 30,
      // Only present in test mode: a PayMongo link that simulates the payment (never scan test QR codes).
      testUrl: paymongo.getMode() === 'test' ? paymongo.findKey(attached, 'test_url') : null
    } });
  } catch (err) { return sendError(res, err); }
});

// GCash and Maya: PayMongo gives a link where the customer approves the payment in their e-wallet.
router.post('/ewallet', verifyToken, async (req, res) => {
  try {
    const ctx = await loadOrder(req, res);
    if (!ctx) return;
    if (ctx.method !== 'gcash' && ctx.method !== 'paymaya') return res.status(400).json({ success: false, error: 'This order does not use GCash or Maya.' });

    // The return address must be one of our own websites or the app, never an address sent by a stranger.
    let origin = '';
    try { origin = new URL(String(req.body.returnUrl)).origin; } catch (e) { origin = ''; }
    if (CONFIG.allowedOrigins.indexOf(origin) < 0) {
      return res.status(400).json({ success: false, error: 'Invalid return address.' });
    }

    const intent = await getOrCreateIntent(ctx);
    let action = intent.attributes.next_action;
    if (!action || !action.redirect) {
      const pm = await paymongo.createPaymentMethod({
        type: ctx.method, // 'gcash' or 'paymaya' (Maya)
        billing: { name: ctx.order.userName || 'Go! Cery customer', email: req.user.email || 'customer@gocery.ph' }
      });
      const attached = await paymongo.attachPaymentMethod(intent.id, pm.id, req.body.returnUrl);
      action = attached.attributes.next_action;
    }
    if (!action || !action.redirect || !action.redirect.url) {
      return res.status(502).json({ success: false, error: 'PayMongo did not return a payment link. This e-wallet may not be enabled for your PayMongo account.' });
    }
    return res.json({ success: true, data: { redirectUrl: action.redirect.url } });
  } catch (err) { return sendError(res, err); }
});

router.post('/verify', verifyToken, async (req, res) => {
  try {
    const orderId = req.body && req.body.orderId;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });
    const orderRef = getDb().collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const order = snap.data();
    if (order.userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not your order' });
    if (order.paymentStatus === 'paid') return res.json({ success: true, data: { paymentStatus: 'paid' } });
    if (!order.paymongoPaymentIntentId) return res.json({ success: true, data: { paymentStatus: order.paymentStatus || 'awaiting_payment' } });

    const intent = await paymongo.getPaymentIntent(order.paymongoPaymentIntentId);
    const status = intent.attributes.status;
    if (status === 'succeeded') {
      const payments = intent.attributes.payments || [];
      await markOrderPaid(orderRef, payments[0] && payments[0].id);
      return res.json({ success: true, data: { paymentStatus: 'paid' } });
    }
    const lastError = intent.attributes.last_payment_error;
    if (status === 'awaiting_payment_method' && lastError) {
      return res.json({ success: true, data: { paymentStatus: 'failed', intentStatus: status, message: lastError.failed_message || lastError.message || 'Payment failed' } });
    }
    return res.json({ success: true, data: { paymentStatus: 'awaiting_payment', intentStatus: status } });
  } catch (err) { return sendError(res, err); }
});

module.exports = router;
