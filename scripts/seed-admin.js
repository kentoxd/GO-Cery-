/**
 * scripts/seed-admin.js
 *
 * Run this ONCE, locally, with your Firebase service account credentials.
 * Never run this in the browser, never deploy it as an API endpoint.
 *
 * Usage:
 *   node scripts/seed-admin.js --email you@example.com --name "Your Name"
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS in your .env (or already set
 * in your shell environment) pointing at your service account JSON.
 *
 * What it does:
 *   1. Creates (or reuses) a Firebase Auth user for the given email.
 *   2. Creates admins/{uid} — the doc firestore.rules' isAdmin() checks for.
 *   3. Sets the 'super_admin' custom claim on that user.
 *   4. Creates meta/app as a one-time bootstrap marker.
 */

require('dotenv').config();
const readline = require('readline');
const { getAuth, getDb } = require('../server/services/firebase-admin');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg, i, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = arr[i + 1];
      args[key] = next && !next.startsWith('--') ? next : true;
    }
  });
  return args;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  const args = parseArgs();
  const email = args.email || (await prompt('Admin email: '));
  const name = args.name || (await prompt('Admin display name: '));

  if (!email) {
    console.error('An email is required.');
    process.exit(1);
  }

  const auth = getAuth();
  const db = getDb();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Found existing user: ${userRecord.uid}`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    const tempPassword = await prompt('User does not exist yet. Set a temporary password: ');
    userRecord = await auth.createUser({ email, password: tempPassword, displayName: name });
    console.log(`Created new user: ${userRecord.uid}`);
    console.log('⚠️  Have them log in and change this password immediately.');
  }

  const uid = userRecord.uid;

  await db.collection('admins').doc(uid).set({
    email,
    name: name || email,
    role: 'super_admin',
    createdAt: new Date().toISOString(),
  });
  console.log(`admins/${uid} created.`);

  await auth.setCustomUserClaims(uid, { role: 'super_admin' });
  console.log('Custom claim set. They must sign out/in (or refresh their ID token) to pick it up.');

  const metaDoc = await db.collection('meta').doc('app').get();
  if (!metaDoc.exists) {
    await db.collection('meta').doc('app').set({
      bootstrappedAt: new Date().toISOString(),
      bootstrappedBy: email,
    });
    console.log('meta/app created.');
  } else {
    console.log('meta/app already exists — skipping.');
  }

  console.log('\n✅ Done. This admin can now log in at admin.html.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
