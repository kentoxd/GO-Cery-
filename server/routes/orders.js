/**
 * server/routes/orders.js
 * POST /api/orders — the only way orders are created. Client sends
 * identifiers only; price/subtotal/total are always computed here.
 */
const express = require('express');
const { getDb } = require('../services/firebase-admin');
const { verifyToken } = require('../middleware/auth');
const { computeOrderPricing, PricingError } = require('../services/pricing');
const { deductInventory } = require('../services/inventory');
const { earnPoints } = require('../services/loyalty');
const CONFIG = require('../config');

const router = express.Router();

router.post('/', verifyToken, async (req, res) => {
  const { items, addressId, zoneId, slotId, deliveryDate, paymentMethod, promoCode } = req.body;
  const userId = req.user.uid;

  if (!addressId || !zoneId || !slotId || !paymentMethod) {
    return res.status(400).json({ success: false, error: 'addressId, zoneId, slotId, and paymentMethod are required.' });
  }

  const db = getDb();

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User profile not found.' });
    const userData = userDoc.data();
    const address = (userData.addresses || []).find(a => a.id === addressId);
    if (!address) return res.status(400).json({ success: false, error: 'Address not found on your account.' });

    const slot = CONFIG.deliverySlots.find(s => s.id === slotId);
    if (!slot) return res.status(400).json({ success: false, error: 'Invalid delivery slot.' });

    const pricing = await computeOrderPricing({ rawItems: items, zoneId, userId, promoCode });

    const isCod = paymentMethod === 'Cash on Delivery' || paymentMethod === 'cod';

    // All payments are confirmed manually by admin (GCash/Maya QR) or
    // collected on delivery (COD). Inventory is deducted at order time.
    const fulfillImmediately = true;

    const ref = db.collection('orders').doc();
    const order = {
      id: ref.id,
      userId,
      userName: userData.name || userData.email,
      items: pricing.items,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      promoCode: pricing.promoCode,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
      address,
      zone: pricing.zoneName,
      deliveryDate: deliveryDate || null,
      deliverySlot: slot.label,
      paymentMethod,
      status: 'Pending', // uses existing CONFIG.orderStatuses enum
      paymentStatus: isCod ? 'pending_collection' : 'awaiting_manual_verification',
      inventoryDeducted: fulfillImmediately,
      statusHistory: [{ status: 'Pending', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    };

    await ref.set(order);

    if (fulfillImmediately) {
      await deductInventory(order.items);
      await earnPoints(userId, order.total);
    }

    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err instanceof PricingError) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('POST /api/orders failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to create order.' });
  }
});

module.exports = router;
