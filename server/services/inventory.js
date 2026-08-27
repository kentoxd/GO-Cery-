/**
 * server/services/inventory.js
 */
const { getDb } = require('./firebase-admin');

async function deductInventory(items) {
  for (const { productId, variantId, quantity } of items) {
    const ref = getDb().collection('products').doc(productId);
    const doc = await ref.get();
    if (!doc.exists) continue;
    const product = doc.data();
    const variants = product.variants.map(v =>
      v.id === variantId ? { ...v, stock: Math.max(0, v.stock - quantity) } : v
    );
    await ref.update({ variants });
  }
}

async function restoreInventory(items) {
  for (const { productId, variantId, quantity } of items) {
    const ref = getDb().collection('products').doc(productId);
    const doc = await ref.get();
    if (!doc.exists) continue;
    const product = doc.data();
    const variants = product.variants.map(v =>
      v.id === variantId ? { ...v, stock: v.stock + quantity } : v
    );
    await ref.update({ variants });
  }
}

module.exports = { deductInventory, restoreInventory };
