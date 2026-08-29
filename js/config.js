/**
 * Go! Cery – Application Configuration
 * Central config for all modules (modular monolith pattern)
 */
const CONFIG = {
  appName: 'Go! Cery',
  tagline: 'Palengke-Fresh Delivered Tomorrow',
  currency: 'PHP',
  currencySymbol: '₱',
  freeDeliveryThreshold: 4000,
  vipFreeShippingThreshold: 2000,
  defaultDeliveryFee: 99,
  promoCodes: {
    SUKI10: { type: 'percent', value: 0.10 },
    FREESHIP: { type: 'free_shipping' }
  },
  manualPaymentMethods: ['GCash', 'Maya'],
  // Get a free public token at mapbox.com — safe to expose client-side.
  mapboxToken: 'pk.eyJ1Ijoic2lsbHliaXJiIiwiYSI6ImNtcnZ2ZWVjejAwZG8yeXB5Mm94ZHV1ejQifQ.9EL2hIT3HdGPXbsmtyOHVQ',
  orderCutoffHour: 19,
  orderCutoffMinute: 30,
  apiVersion: 'v1',
  storageKeys: {
    users: 'gocery_users',
    currentUser: 'gocery_current_user',
    cart: 'gocery_cart',
    orders: 'gocery_orders',
    products: 'gocery_products',
    categories: 'gocery_categories',
    inventory: 'gocery_inventory',
    reviews: 'gocery_reviews',
    loyalty: 'gocery_loyalty',
    cms: 'gocery_cms',
    admins: 'gocery_admins',
    currentAdmin: 'gocery_current_admin',
    auditLog: 'gocery_audit_log',
    wishlist: 'gocery_wishlist',
    initialized: 'gocery_initialized'
  },
  deliveryZones: [
    { id: 'mm-north', name: 'Metro Manila – North', fee: 99 },
    { id: 'mm-south', name: 'Metro Manila – South', fee: 99 },
    { id: 'mm-east', name: 'Metro Manila – East', fee: 99 },
    { id: 'mm-west', name: 'Metro Manila – West', fee: 99 },
    { id: 'rizal', name: 'Rizal Province', fee: 149 }
  ],
  deliverySlots: [
    { id: 'morning', label: '8:00 AM – 12:00 PM', start: 8, end: 12 },
    { id: 'afternoon', label: '1:00 PM – 5:00 PM', start: 13, end: 17 },
    { id: 'evening', label: '5:00 PM – 8:00 PM', start: 17, end: 20 }
  ],
  orderStatuses: [
    'Pending',
    'Confirmed',
    'Preparing',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Refunded'
  ],
  paymentMethods: [
    { id: 'cod', name: 'Cash on Delivery', icon: '💵' },
    { id: 'gcash', name: 'GCash', icon: '📱' },
    { id: 'maya', name: 'Maya', icon: '💳' }
  ],
  loyaltyTiers: [
    { id: 'regular', name: 'Regular Suki', minPoints: 0, perks: ['Earn 1 point per ₱100'] },
    { id: 'vip', name: 'VIP Suki', minPoints: 500, perks: ['Free delivery on orders ₱2,000+', '2x points'] },
    { id: 'gold', name: 'Gold Suki', minPoints: 2000, perks: ['Always free delivery', '3x points', 'Early access to promos'] }
  ],
  categories: [
    { id: 'fruits', name: 'Fruits', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/fru.png', slug: 'fruits' },
    { id: 'vegetables', name: 'Vegetables', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/veg.png', slug: 'vegetables' },
    { id: 'herbs-spices', name: 'Herbs & Spices', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/herb.png', slug: 'herbs-spices' },
    { id: 'seafood', name: 'Fresh Seafood', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/sea.png', slug: 'seafood' },
    { id: 'meat', name: 'Fresh Meat', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/meat.png', slug: 'meat' },
    { id: 'rice-grains', name: 'Rice & Grains', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/tice.png', slug: 'rice-grains' },
    { id: 'eggs-dairy', name: 'Eggs & Dairy', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/egg.png', slug: 'eggs-dairy' },
    { id: 'deli', name: 'Deli & More', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000264/dely.png', slug: 'deli' },
    { id: 'essentials', name: 'Essentials', icon: 'https://res.cloudinary.com/m0uovtom/image/upload/v1788000263/esse.png', slug: 'essentials' }
  ]
};
