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
    { id: 'fruits', name: 'Fruits', icon: 'https://media.discordapp.net/attachments/1488093221014994986/1542494785070178404/image.png?ex=6a916fb6&is=6a901e36&hm=60f2909e7991c2fbbdfd96e5382153faf4a2e27ecf25c22a33a673ba4922e055&=&format=webp&quality=lossless', slug: 'fruits' },
    { id: 'vegetables', name: 'Vegetables', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542494785439272990/image.png?ex=6a916fb7&is=6a901e37&hm=264207045f4baabc22219a908d1856ba03c7d634ef7cfe557cdfa76e611733d3&', slug: 'vegetables' },
    { id: 'herbs-spices', name: 'Herbs & Spices', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542502476010487828/image.png?ex=6a9176e0&is=6a902560&hm=5c9ebb182ab96228e3f103dc073af2e246c79fc6f2a19d40e73cbbc9e3a6d4d8&', slug: 'herbs-spices' },
    { id: 'seafood', name: 'Fresh Seafood', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542494785888329838/image.png?ex=6a916fb7&is=6a901e37&hm=307b3dc1e52aecc3f4aaa0058928114d8864bd85457d2d8cd5ed3cac8878b7eb&', slug: 'seafood' },
    { id: 'meat', name: 'Fresh Meat', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542494786194382978/image.png?ex=6a916fb7&is=6a901e37&hm=ff1dcc8a03cf8de89145c63ecb55702c47cc3b0e1db5149270781c53eb1f8c1b&', slug: 'meat' },
    { id: 'rice-grains', name: 'Rice & Grains', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542502526543470695/image.png?ex=6a9176ec&is=6a90256c&hm=df0e6537fd5f016f68335071718549fd74f55816fa498a31a99d8e8a352d50db&', slug: 'rice-grains' },
    { id: 'eggs-dairy', name: 'Eggs & Dairy', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542502585175506994/image.png?ex=6a9176fa&is=6a90257a&hm=1e52808aaadaad4b311f315d49de9255dc350e3ab35587eaefda332ab834f132&', slug: 'eggs-dairy' },
    { id: 'deli', name: 'Deli & More', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542502643530735697/image.png?ex=6a917708&is=6a902588&hm=d890b707d655a120acfb2a56e07745f98e7793988f5c06a9a0c0861b76bf7da0&', slug: 'deli' },
    { id: 'essentials', name: 'Essentials', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542502681900355705/image.png?ex=6a917711&is=6a902591&hm=aa6ff07c5224b843e5fa3229b65dfeace4fac57be19f5c43e54979c5830bbf31&', slug: 'essentials' }
  ]
};
