const admin = require('firebase-admin');
const path = require('path');

let db = null;
let auth = null;

function initFirebaseAdmin() {
  if (admin.apps.length) {
    db = admin.firestore();
    auth = admin.auth();
    return { db, auth };
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set in .env');
  }

  const resolved = path.resolve(credPath);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(resolved);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  db = admin.firestore();
  auth = admin.auth();
  return { db, auth };
}

function getDb() {
  if (!db) initFirebaseAdmin();
  return db;
}

function getAuth() {
  if (!auth) initFirebaseAdmin();
  return auth;
}

module.exports = { initFirebaseAdmin, getDb, getAuth, admin };
