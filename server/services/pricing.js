/**
 * server/services/pricing.js
 * Computes an order's authoritative pricing server-side, in PESOS
 * (matching this project's convention). Never trust price/subtotal/
 * total fields from the client — only productId/variantId/quantity.
 */
const { getDb } = require('./firebase-admin');
const CONFIG = require('../config');

class PricingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function computeOrderPricing({ rawItems, zoneId, userId, promoCode }) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw new PricingError('Order must contain at least one item.');
  }

  const db = getDb();

  const items = [];
  for (const raw of rawItems) {
    const { productId, variantId, quantity } = raw;
    if (!productId || !variantId || !Number.isInteger(quantity) || quantity < 1) {
      throw new PricingError('Each item requires productId, variantId, and a positive integer quantity.');
    }
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) throw new PricingError(`Product ${productId} no longer exists.`);
    const product = productDoc.data();
    const variant = (product.variants || []).find(v => v.id === variantId);
    if (!variant) throw new PricingError(`Variant not found on product "${product.name}".`);
    if (variant.stock < quantity) {
      throw new PricingError(`Insufficient stock for "${product.name}" (${variant.unit}). Only ${variant.stock} left.`);
    }
    items.push({
      productId,
      variantId,
      quantity,
      name: product.name,
      unit: variant.unit,
      price: variant.price, // pesos, from Firestore — never from client
      lineTotal: Math.round(variant.price * quantity * 100) / 100
    });
  }

  const subtotal = Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;

  let discount = 0;
  let freeShip = false;
  let appliedPromoCode = '';
  if (promoCode) {
    const promo = CONFIG.promoCodes[promoCode.toUpperCase()];
    if (!promo) throw new PricingError(`Invalid promo code "${promoCode}".`);
    appliedPromoCode = promoCode.toUpperCase();
    if (promo.type === 'percent') discount = Math.round(subtotal * promo.value * 100) / 100;
    else if (promo.type === 'free_shipping') freeShip = true;
  }

  const zone = CONFIG.deliveryZones.find(z => z.id === zoneId);
  if (!zone) throw new PricingError(`Invalid delivery zone "${zoneId}".`);

  let deliveryFee = zone.fee;
  if (freeShip) {
    deliveryFee = 0;
  } else if (subtotal >= CONFIG.freeDeliveryThreshold) {
    deliveryFee = 0;
  } else if (userId) {
    const loyaltyDoc = await db.collection('loyalty').doc(userId).get();
    const tier = loyaltyDoc.exists ? loyaltyDoc.data().tier : 'regular';
    if (tier === 'gold') deliveryFee = 0;
    else if (tier === 'vip' && subtotal >= CONFIG.vipFreeShippingThreshold) deliveryFee = 0;
  }

  const total = Math.round((subtotal - discount + deliveryFee) * 100) / 100;

  return { items, subtotal, discount, promoCode: appliedPromoCode, freeShip, deliveryFee, total, zoneName: zone.name };
}

module.exports = { computeOrderPricing, PricingError };
