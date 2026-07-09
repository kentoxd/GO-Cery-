const express = require('express');
const { getDb } = require('../services/firebase-admin');
const { createPaymentIntent, getPublicKey } = require('../services/paymongo');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/config', (_req, res) => {
  res.json({
    success: true,
    data: { publicKey: getPublicKey() }
  });
});

router.post('/intent', verifyToken, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'orderId is required' });
  }

  const orderRef = getDb().collection('orders').doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const order = orderDoc.data();
  if (order.userId !== req.user.uid) {
    return res.status(403).json({ success: false, error: 'Not your order' });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, error: 'Order already paid' });
  }

  const amountCentavos = Math.round(order.total);
  if (amountCentavos < 2000) {
    return res.status(400).json({ success: false, error: 'Minimum payment amount is ₱20.00' });
  }

  try {
    const intent = await createPaymentIntent({
      amountCentavos,
      orderId,
      description: `Go! Cery order ${orderId}`
    });

    await orderRef.update({
      paymongoPaymentIntentId: intent.id,
      paymentStatus: 'pending'
    });

    return res.json({
      success: true,
      data: {
        paymentIntentId: intent.id,
        clientKey: intent.attributes.client_key,
        amount: amountCentavos
      }
    });
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

module.exports = router;
