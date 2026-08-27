/**
 * js/modules/pricing.js
 * Order pricing from Firestore product prices (Spark/free tier — no Cloud Functions).
 */
const Pricing = {
  async computeOrderPricing({ rawItems, zoneId, userId, promoCode }) {
    if (!Array.isArray(rawItems) || !rawItems.length) {
      throw new Error('Order must contain at least one item.');
    }

    const items = [];
    for (const raw of rawItems) {
      const { productId, variantId, quantity } = raw;
      if (!productId || !variantId || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Each item requires productId, variantId, and a positive integer quantity.');
      }
      const productDoc = await FirebaseApp.collections.products().doc(productId).get();
      if (!productDoc.exists) throw new Error(`Product ${productId} no longer exists.`);
      const product = productDoc.data();
      const variant = (product.variants || []).find(v => v.id === variantId);
      if (!variant) throw new Error(`Variant not found on product "${product.name}".`);
      if (variant.stock < quantity) {
        throw new Error(`Insufficient stock for "${product.name}" (${variant.unit}). Only ${variant.stock} left.`);
      }
      items.push({
        productId,
        variantId,
        quantity,
        name: product.name,
        unit: variant.unit,
        price: variant.price,
        lineTotal: Math.round(variant.price * quantity * 100) / 100
      });
    }

    const subtotal = Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;

    let discount = 0;
    let freeShip = false;
    let appliedPromoCode = '';
    if (promoCode) {
      const promo = CONFIG.promoCodes[promoCode.toUpperCase()];
      if (!promo) throw new Error(`Invalid promo code "${promoCode}".`);
      appliedPromoCode = promoCode.toUpperCase();
      if (promo.type === 'percent') discount = Math.round(subtotal * promo.value * 100) / 100;
      else if (promo.type === 'free_shipping') freeShip = true;
    }

    const zone = CONFIG.deliveryZones.find(z => z.id === zoneId);
    if (!zone) throw new Error(`Invalid delivery zone "${zoneId}".`);

    let deliveryFee = zone.fee;
    if (freeShip) {
      deliveryFee = 0;
    } else if (subtotal >= CONFIG.freeDeliveryThreshold) {
      deliveryFee = 0;
    } else if (userId) {
      const loyalty = await API.loyalty.getAccount(userId);
      if (loyalty.tier === 'gold') deliveryFee = 0;
      else if (loyalty.tier === 'vip' && subtotal >= CONFIG.vipFreeShippingThreshold) deliveryFee = 0;
    }

    const total = Math.round((subtotal - discount + deliveryFee) * 100) / 100;

    return { items, subtotal, discount, promoCode: appliedPromoCode, freeShip, deliveryFee, total, zoneName: zone.name };
  }
};
