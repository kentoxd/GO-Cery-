/**
 * server/services/loyalty.js
 * orderTotalPesos is already in pesos (this project's convention) —
 * no /100 conversion needed here.
 */
const { getDb } = require('./firebase-admin');

async function earnPoints(userId, orderTotalPesos) {
  if (!userId) return;
  const ref = getDb().collection('loyalty').doc(userId);
  const doc = await ref.get();
  let account = doc.exists ? doc.data() : { points: 0, tier: 'regular', referrals: 0 };

  const multiplier = account.tier === 'gold' ? 3 : account.tier === 'vip' ? 2 : 1;
  account.points = (account.points || 0) + Math.floor(orderTotalPesos / 100) * multiplier;

  if (account.points >= 2000) account.tier = 'gold';
  else if (account.points >= 500) account.tier = 'vip';

  await ref.set(account, { merge: true });
}

module.exports = { earnPoints };
