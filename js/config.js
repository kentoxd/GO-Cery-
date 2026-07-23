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
  defaultDeliveryFee: 99,
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
    { id: 'maya', name: 'Maya', icon: '💳' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳' }
  ],
  loyaltyTiers: [
    { id: 'regular', name: 'Regular Suki', minPoints: 0, perks: ['Earn 1 point per ₱100'] },
    { id: 'vip', name: 'VIP Suki', minPoints: 500, perks: ['Free delivery on orders ₱2,000+', '2x points'] },
    { id: 'gold', name: 'Gold Suki', minPoints: 2000, perks: ['Always free delivery', '3x points', 'Early access to promos'] }
  ],
  categories: [
    { id: 'fruits', name: 'Fruits', icon: '🍎', slug: 'fruits' },
    { id: 'vegetables', name: 'Vegetables', icon: '🥬', slug: 'vegetables' },
    { id: 'herbs-spices', name: 'Herbs & Spices', icon: '🌿', slug: 'herbs-spices' },
    { id: 'seafood', name: 'Fresh Seafood', icon: '🦐', slug: 'seafood' },
    { id: 'meat', name: 'Fresh Meat', icon: '🥩', slug: 'meat' },
    { id: 'rice-grains', name: 'Rice & Grains', icon: '🍚', slug: 'rice-grains' },
    { id: 'eggs-dairy', name: 'Eggs & Dairy', icon: '🥚', slug: 'eggs-dairy' },
    { id: 'deli', name: 'Deli & More', icon: '🧀', slug: 'deli' },
    { id: 'essentials', name: 'Essentials', icon: '🛒', slug: 'essentials' }
  ]
};
