/**
 * server/routes/admin.js
 * Admin-only actions that need real server-side authority — either
 * because they touch inventory/loyalty (confirm-payment) or because
 * they grant privilege (role changes) and must not be a plain client
 * Firestore write, even an admin-gated one.
 */
const express = require('express');
const { getDb, getAuth } = require('../services/firebase-admin');
const { verifyToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { deductInventory } = require('../services/inventory');
const { earnPoints } = require('../services/loyalty');
const { logAudit } = require('../services/audit');
const CONFIG = require('../config');

const router = express.Router();
router.use(verifyToken, requireAdmin);

/**
 * POST /api/admin/orders/:id/confirm-payment
 * For manual QR (GCash/Maya) orders — admin verifies the payment
 * arrived and confirms it here. Deducts inventory + awards loyalty
 * points, guarded so it can only ever run once per order.
 */
router.post('/orders/:id/confirm-payment', async (req, res) => {
  try {
    const orderRef = getDb().collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = orderDoc.data();
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, error: 'This order is already confirmed as paid.' });
    }
    if (!CONFIG.manualPaymentMethods.includes(order.paymentMethod)) {
      return res.status(400).json({ success: false, error: 'This order was not paid via a manual QR method.' });
    }

    const statusHistory = [
      ...(order.statusHistory || []),
      { status: 'Confirmed', timestamp: new Date().toISOString(), note: `Payment manually confirmed by ${req.admin.email}` }
    ];

    await orderRef.update({
      status: 'Confirmed',
      paymentStatus: 'paid',
      statusHistory
    });

    if (!order.inventoryDeducted) {
      await deductInventory(order.items);
      await orderRef.update({ inventoryDeducted: true });
    }
    await earnPoints(order.userId, order.total);

    await logAudit({
      action: 'CONFIRM_MANUAL_PAYMENT',
      actorUid: req.admin.id,
      actorEmail: req.admin.email,
      target: req.params.id,
      details: { orderId: req.params.id, paymentMethod: order.paymentMethod, total: order.total }
    });

    return res.json({ success: true, data: { id: req.params.id, status: 'Confirmed', paymentStatus: 'paid' } });
  } catch (err) {
    console.error(`POST /api/admin/orders/${req.params.id}/confirm-payment failed:`, err);
    return res.status(500).json({ success: false, error: 'Failed to confirm payment.' });
  }
});

/**
 * POST /api/admin/users/:uid/role
 * Changes a user's role (customer / admin / super_admin). Writes both
 * the admins/{uid} doc (used by firestore.rules' isAdmin() checks) and
 * a Firebase Auth custom claim, and mirrors the role onto users/{uid}
 * for display purposes.
 */
router.post('/users/:uid/role', requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  const VALID_ROLES = ['customer', 'admin', 'super_admin'];
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` });
  }

  const targetUid = req.params.uid;

  if (targetUid === req.admin.id) {
    return res.status(400).json({ success: false, error: 'You cannot change your own role.' });
  }

  const db = getDb();

  try {
    const userDoc = await db.collection('users').doc(targetUid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const adminRef = db.collection('admins').doc(targetUid);

    if (role === 'customer') {
      await adminRef.delete().catch(() => {});
    } else {
      await adminRef.set({
        email: userData.email || null,
        name: userData.name || userData.email || null,
        role
      });
    }

    await getAuth().setCustomUserClaims(targetUid, { role });
    await db.collection('users').doc(targetUid).set({ role }, { merge: true });

    await logAudit({
      action: 'UPDATE_USER_ROLE',
      actorUid: req.admin.id,
      actorEmail: req.admin.email,
      target: targetUid,
      details: { targetEmail: userData.email, newRole: role }
    });

    return res.json({
      success: true,
      data: { uid: targetUid, role },
      tokenRefreshRequired: true
    });
  } catch (err) {
    console.error(`POST /api/admin/users/${targetUid}/role failed:`, err);
    return res.status(500).json({ success: false, error: 'Failed to update user role.' });
  }
});

module.exports = router;
