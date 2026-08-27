/**
 * server/services/firebase-admin.js
 * Single shared Firebase Admin SDK instance for the whole backend +
 * the one-off seed script. Never imported by any client-side file.
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS in your .env to the
 * path of your service account JSON (downloaded from Firebase Console
 * → Project Settings → Service Accounts → Generate new private key).
 * Never commit that JSON file — make sure it's in .gitignore.
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Cloud Functions uses the default service account automatically.
  // Locally, set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.
  admin.initializeApp();
}

function getDb() {
  return admin.firestore();
}

function getAuth() {
  return admin.auth();
}

module.exports = { admin, getDb, getAuth };
