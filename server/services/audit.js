const { getDb } = require('./firebase-admin');

async function logAudit({ action, actorUid, actorEmail, target, details = {} }) {
  await getDb().collection('audit_logs').add({
    action,
    actorUid: actorUid || null,
    actorEmail: actorEmail || null,
    admin: actorEmail || null,
    target: target || null,
    details,
    timestamp: new Date().toISOString()
  });
}

module.exports = { logAudit };
