/**
 * server/services/payments.js
 * Shared "order got paid / payment failed" logic. Used by BOTH the PayMongo webhook
 * and the /verify endpoint (which is the fallback when the webhook cannot reach the server,
 * for example while testing on a laptop). It is safe to call more than once per order.
 */
const { getDb } = require('./firebase-admin');
const { deductInventory } = require('./inventory');
const { earnPoints } = require('./loyalty');
const { sendOrderStatus } = require('./email');

async function markOrderPaid(orderRef, paymentId) {
  const db = getDb();
  let order = null;
  let flipped = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;
    order = snap.data();
    if (order.paymentStatus === 'paid') return;

    const now = new Date().toISOString();
    const update = { paymentStatus: 'paid', paidAt: now, paymongoPaymentId: paymentId || null };
    if (order.status === 'Pending') {
      update.status = 'Confirmed';
      update.statusHistory = (order.statusHistory || []).concat([{
        status: 'Confirmed', timestamp: now, note: 'Payment received via PayMongo'
      }]);
    } else if (order.status === 'Cancelled') {
      update.paymentNote = 'Paid after the order was cancelled. A refund is needed.';
    }
    tx.update(orderRef, update);
    flipped = true;
  });

  // Stock and points are only touched by the call that actually flipped the order to paid.
  if (flipped && order.status !== 'Cancelled') {
    if (!order.inventoryDeducted) {
      await deductInventory(order.items || []);
      await orderRef.update({ inventoryDeducted: true });
    }
    if (order.status === 'Pending') {
      sendOrderStatus({ ...order, id: orderRef.id, status: 'Confirmed', paymentStatus: 'paid' }, 'Confirmed', 'Payment received');
    }
    try {
      await earnPoints(order.userId, order.total);
    } catch (err) {
      console.error('[payments] earnPoints failed:', err.message);
    }
  }
  return flipped;
}

async function markOrderFailed(orderRef, reason) {
  const snap = await orderRef.get();
  if (!snap.exists) return false;
  const order = snap.data();
  if (order.paymentStatus === 'paid') return false;
  // The order stays Pending so the customer can try again or cancel it.
  await orderRef.update({ paymentStatus: 'failed', paymentFailureReason: reason || 'Payment failed' });
  return true;
}

module.exports = { markOrderPaid, markOrderFailed };
