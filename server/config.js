/**
 * server/config.js
 * Server-side mirror of the pricing-relevant parts of js/config.js.
 * This is the SOURCE OF TRUTH for order pricing — the frontend CONFIG
 * is only used for client-side preview/display. Keep in sync manually.
 * All monetary values are in PESOS (matches this project's convention —
 * Format.currency() does NOT divide by 100).
 */
module.exports = {
  deliveryZones: [
    { id: 'mm-north', name: 'Metro Manila – North', fee: 99 },
    { id: 'mm-south', name: 'Metro Manila – South', fee: 99 },
    { id: 'mm-east', name: 'Metro Manila – East', fee: 99 },
    { id: 'mm-west', name: 'Metro Manila – West', fee: 99 },
    { id: 'rizal', name: 'Rizal Province', fee: 149 }
  ],
  deliverySlots: [
    { id: 'morning', label: '8:00 AM – 12:00 PM' },
    { id: 'afternoon', label: '1:00 PM – 5:00 PM' },
    { id: 'evening', label: '5:00 PM – 8:00 PM' }
  ],
  freeDeliveryThreshold: 4000,
  vipFreeShippingThreshold: 2000,
  promoCodes: {
    SUKI10: { type: 'percent', value: 0.10 },
    FREESHIP: { type: 'free_shipping' }
  },
  lowStockThreshold: 20,

  // Payment method NAMES (matching CONFIG.paymentMethods on the frontend)
  // that are manually verified by the admin rather than processed via
  // PayMongo — customer scans a static QR the admin uploaded, admin
  // confirms receipt later. No automated webhook will ever fire for these.
  manualPaymentMethods: ['GCash', 'Maya']
};
