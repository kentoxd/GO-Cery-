/**
 * server/services/audit.js
 * Shared audit-log writer for backend-initiated actions (role changes,
 * manual payment confirmations, etc.) — uses the Admin SDK so it
 * bypasses firestore.rules the same way client-side admin.logAction()
 * relies on rules to allow, but from a trusted server context instead.
 */
const { getDb } = require('./firebase-admin');

async function logAudit({ action, actorUid, actorEmail, target, details }) {
  try {
    await getDb().collection('auditLogs').add({
      action,
      admin: actorEmail || actorUid || null,
      actorUid: actorUid || null,
      target: target || null,
      details: details || {},
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`logAudit: failed to write "${action}" audit entry:`, err);
  }
}

module.exports = { logAudit };
