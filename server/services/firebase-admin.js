const admin = require('firebase-admin');

if (!admin.apps?.length) {
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