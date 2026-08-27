/**
 * server/middleware/auth.js
 */
const { getAuth, getDb } = require('../services/firebase-admin');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    return next();
  } catch (err) {
    console.error('verifyToken failed:', err.message);
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

async function requireSuperAdmin(req, res, next) {
  // Must run AFTER requireAdmin (relies on req.admin being set).
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super admin access required' });
  }
  return next();
}

module.exports = { verifyToken, requireAdmin, requireSuperAdmin };
