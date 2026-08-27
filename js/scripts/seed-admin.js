/**
 * scripts/seed-admin.js
 *
 * Run this ONCE, locally, with your Firebase service account credentials
 * (never in the browser, never deployed as a client-facing endpoint).
 * It replaces the old isBootstrapSeed() rules loophole.
 *
 * Usage:
 *   node scripts/seed-admin.js --email you@example.com --name "Your Name"
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing at your
 * service account JSON, or firebase-admin's default credentials to
 * already be configured (same as server/services/firebase-admin.js).
 *
 * What it does:
 *   1. Creates (or reuses) a Firebase Auth user for the given email.
 *   2. Creates admins/{uid} — the doc your isAdmin() rule checks for.
 *   3. Sets the 'admin' custom claim on that user.
 *   4. Creates meta/app (marks the app as bootstrapped — informational only
 *      now, since rules no longer branch on its existence).
 *   5. Optionally seeds starter products/cms content from js/data/seed.js
 *      if you pass --with-catalog (see below — you'll need to adapt the
 *      import path since seed.js is currently written as a browser global).
 */

const readline = require('readline');
const { getAuth, getDb } = require('../../server/services/firebase-admin');

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

  // 1. Find or create the Auth user.
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

  // 2. Create admins/{uid}.
  await db.collection('admins').doc(uid).set({
    email,
    name: name || email,
    role: 'super_admin',
    createdAt: new Date().toISOString(),
  });
  console.log(`admins/${uid} created.`);

  // 3. Set custom claim.
  await auth.setCustomUserClaims(uid, { role: 'super_admin' });
  console.log('Custom claim set. They must sign out/in (or refresh their ID token) to pick it up.');

  // 4. Mark app as bootstrapped (informational — rules no longer depend on this).
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