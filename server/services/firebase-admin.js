const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

// firebase-admin v12+ dropped the old namespaced admin.auth()/admin.firestore()
// API in favor of these modular imports.
// On a host like Render there is no key file, so the service account can be passed
// as JSON text in FIREBASE_SERVICE_ACCOUNT_JSON. Locally, GOOGLE_APPLICATION_CREDENTIALS works.
if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    // Convert literal '\n' characters in the private key into actual linebreaks
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
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