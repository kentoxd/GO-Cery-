const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

// firebase-admin v12+ dropped the old namespaced admin.auth()/admin.firestore()
// API in favor of these modular imports — using the old style silently breaks
// with "admin.auth is not a function" once the package is on v12 or newer.
if (!getApps().length) {
  initializeApp();
}

function getDb() {
  return getFirestore();
}

function getAuth() {
  return getAdminAuth();
}

module.exports = { getDb, getAuth };