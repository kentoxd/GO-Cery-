const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    // Clean up PEM key formatting for OpenSSL compatibility
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/^"|"$/g, '')
        .trim();
    }

    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp();
  }
}

function getDb() {
  return getFirestore();
}

function getAuth() {
  return getAdminAuth();
}

module.exports = { getDb, getAuth };