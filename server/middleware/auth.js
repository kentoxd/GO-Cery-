const { getAuth, getDb } = require('../services/firebase-admin');

const ORDER_STATUSES = [
  'Pending',
  'Awaiting Payment',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Refunded'
];

const VALID_ROLES = ['customer', 'admin', 'super_admin'];

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      role: decoded.role || null
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const adminDoc = await getDb().collection('admins').doc(req.user.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    req.admin = { id: req.user.uid, email: req.user.email, ...adminDoc.data() };
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function validateOrderStatus(status) {
  return ORDER_STATUSES.includes(status);
}

function validateRole(role) {
  return VALID_ROLES.includes(role);
}

module.exports = {
  verifyToken,
  requireAdmin,
  validateOrderStatus,
  validateRole,
  ORDER_STATUSES,
  VALID_ROLES
};
