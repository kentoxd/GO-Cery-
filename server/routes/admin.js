const express = require('express');
const { getDb, getAuth } = require('../services/firebase-admin');
const { logAudit } = require('../services/audit');
const { verifyToken, requireAdmin, validateOrderStatus, validateRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.patch('/orders/:id/status', async (req, res) => {
  const { status, note = '' } = req.body;
  if (!validateOrderStatus(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Allowed: ${require('../middleware/auth').ORDER_STATUSES.join(', ')}`
    });
  }

  const ref = getDb().collection('orders').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const data = doc.data();
  const oldStatus = data.status;
  const statusHistory = [
    ...(data.statusHistory || []),
    { status, timestamp: new Date().toISOString(), note, changedBy: req.admin.email }
  ];

  await ref.update({ status, statusHistory });

  await logAudit({
    action: 'UPDATE_ORDER_STATUS',
    actorUid: req.admin.id,
    actorEmail: req.admin.email,
    target: req.params.id,
    details: { orderId: req.params.id, oldStatus, newStatus: status, note }
  });

  return res.json({
    success: true,
    data: { id: req.params.id, ...data, status, statusHistory }
  });
});

router.post('/users/:uid/role', async (req, res) => {
  const { role } = req.body;
  if (!validateRole(role)) {
    return res.status(400).json({
      success: false,
      error: `Invalid role. Allowed: ${require('../middleware/auth').VALID_ROLES.join(', ')}`
    });
  }

  const targetUid = req.params.uid;
  const userDoc = await getDb().collection('users').doc(targetUid).get();
  if (!userDoc.exists) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const userData = userDoc.data();
  const adminRef = getDb().collection('admins').doc(targetUid);

  if (role === 'customer') {
    await adminRef.delete().catch(() => {});
    await getAuth().setCustomUserClaims(targetUid, { role: 'customer' });
    await getDb().collection('users').doc(targetUid).update({ role: 'customer' });
  } else {
    await adminRef.set({
      email: userData.email,
      name: userData.name || userData.email,
      role
    });
    await getAuth().setCustomUserClaims(targetUid, { role });
    await getDb().collection('users').doc(targetUid).update({ role });
  }

  await logAudit({
    action: 'UPDATE_USER_ROLE',
    actorUid: req.admin.id,
    actorEmail: req.admin.email,
    target: targetUid,
    details: { targetEmail: userData.email, newRole: role }
  });

  return res.json({
    success: true,
    data: { uid: targetUid, email: userData.email, role },
    tokenRefreshRequired: true
  });
});

module.exports = router;
