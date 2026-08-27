/**
 * Seed data – initial catalog, CMS, and demo admin
 */
const SeedData = {
  products: [
    { id: 'p001', name: 'Ripe Mangoes (Carabao)', categoryId: 'fruits', description: 'Sweet Carabao mangoes sourced fresh from Guimaras. Perfect for desserts or eating as-is.', origin: 'Guimaras', image: '🥭', featured: true, tags: ['seasonal', 'best-seller'], variants: [{ id: 'v001a', unit: 'kg', price: 180, stock: 50 }, { id: 'v001b', unit: '500g', price: 95, stock: 80 }] },
    { id: 'p002', name: 'Banana Saba', categoryId: 'fruits', description: 'Firm saba bananas ideal for turon, ginanggang, or cooking.', origin: 'Bukidnon', image: '🍌', featured: true, tags: ['best-seller'], variants: [{ id: 'v002a', unit: 'kg', price: 65, stock: 100 }] },
    { id: 'p003', name: 'Calamansi', categoryId: 'fruits', description: 'Freshly picked calamansi for sawsawan, juice, and marinades.', origin: 'Laguna', image: '🍋', featured: false, tags: [], variants: [{ id: 'v003a', unit: 'kg', price: 120, stock: 40 }, { id: 'v003b', unit: '500g', price: 65, stock: 60 }] },
    { id: 'p004', name: 'Pomelo', categoryId: 'fruits', description: 'Large, juicy pomelo from Davao. Less bitter, more sweet.', origin: 'Davao', image: '🍊', featured: false, tags: ['seasonal'], variants: [{ id: 'v004a', unit: 'pc', price: 250, stock: 30 }] },
    { id: 'p005', name: 'Kangkong', categoryId: 'vegetables', description: 'Crisp water spinach, washed and bundled fresh daily.', origin: 'Bulacan', image: '🥬', featured: true, tags: ['best-seller'], variants: [{ id: 'v005a', unit: 'bunch', price: 25, stock: 120 }] },
    { id: 'p006', name: 'Tomatoes (Native)', categoryId: 'vegetables', description: 'Native red tomatoes perfect for ginisa and salads.', origin: 'Benguet', image: '🍅', featured: true, tags: [], variants: [{ id: 'v006a', unit: 'kg', price: 90, stock: 70 }, { id: 'v006b', unit: '500g', price: 48, stock: 90 }] },
    { id: 'p007', name: 'Eggplant (Talong)', categoryId: 'vegetables', description: 'Medium-sized talong for tortang talong and pinakbet.', origin: 'Pampanga', image: '🍆', featured: false, tags: [], variants: [{ id: 'v007a', unit: 'kg', price: 75, stock: 55 }] },
    { id: 'p008', name: 'Ampalaya (Bitter Gourd)', categoryId: 'vegetables', description: 'Fresh ampalaya for pinakbet and stir-fry dishes.', origin: 'Ilocos', image: '🥒', featured: false, tags: [], variants: [{ id: 'v008a', unit: 'kg', price: 85, stock: 45 }] },
    { id: 'p009', name: 'Sitaw (String Beans)', categoryId: 'vegetables', description: 'Long green beans, tender and crisp.', origin: 'Laguna', image: '🫛', featured: false, tags: [], variants: [{ id: 'v009a', unit: 'kg', price: 70, stock: 60 }] },
    { id: 'p010', name: 'Fresh Ginger (Luya)', categoryId: 'herbs-spices', description: 'Aromatic luya for tinola, salabat, and marinades.', origin: 'Bicol', image: '🫚', featured: false, tags: [], variants: [{ id: 'v010a', unit: '250g', price: 35, stock: 80 }] },
    { id: 'p011', name: 'Garlic (Bawang)', categoryId: 'herbs-spices', description: 'Local garlic bulbs, pungent and fresh.', origin: 'Ilocos', image: '🧄', featured: true, tags: ['best-seller'], variants: [{ id: 'v011a', unit: '250g', price: 45, stock: 100 }] },
    { id: 'p012', name: 'Red Onion (Sibuyas)', categoryId: 'herbs-spices', description: 'Red onions for everyday Filipino cooking.', origin: 'Bongabon', image: '🧅', featured: false, tags: [], variants: [{ id: 'v012a', unit: 'kg', price: 110, stock: 90 }] },
    { id: 'p013', name: 'Fresh Bangus (Milkfish)', categoryId: 'seafood', description: 'Whole bangus, cleaned and ready to cook. Daing or sinigang ready.', origin: 'Tañay', image: '🐟', featured: true, tags: ['best-seller'], variants: [{ id: 'v013a', unit: 'kg', price: 220, stock: 25 }, { id: 'v013b', unit: 'pc', price: 180, stock: 40 }] },
    { id: 'p014', name: 'Fresh Tilapia', categoryId: 'seafood', description: 'Live-fresh tilapia, descaled and gutted on request.', origin: 'Laguna', image: '🐠', featured: true, tags: [], variants: [{ id: 'v014a', unit: 'kg', price: 160, stock: 35 }] },
    { id: 'p015', name: 'Large Shrimp (Sugpo)', categoryId: 'seafood', description: 'Premium sugpo for sinigang sa sugpo or grilled shrimp.', origin: 'Bataan', image: '🦐', featured: true, tags: ['premium'], variants: [{ id: 'v015a', unit: 'kg', price: 650, stock: 15 }] },
    { id: 'p016', name: 'Squid (Pusit)', categoryId: 'seafood', description: 'Fresh whole pusit, ideal for adobong pusit.', origin: 'Navotas', image: '🦑', featured: false, tags: [], variants: [{ id: 'v016a', unit: 'kg', price: 380, stock: 20 }] },
    { id: 'p017', name: 'Pork Kasim (Shoulder)', categoryId: 'meat', description: 'Fresh pork kasim for menudo, afritada, and adobo.', origin: 'Bulacan', image: '🥩', featured: true, tags: ['best-seller'], variants: [{ id: 'v017a', unit: 'kg', price: 320, stock: 30 }] },
    { id: 'p018', name: 'Chicken Leg Quarter', categoryId: 'meat', description: 'Fresh chicken leg quarters for fried chicken or tinola.', origin: 'Pampanga', image: '🍗', featured: true, tags: [], variants: [{ id: 'v017b', unit: 'kg', price: 195, stock: 45 }] },
    { id: 'p019', name: 'Beef Bulalo Cut', categoryId: 'meat', description: 'Beef shank cuts perfect for bulalo and soup.', origin: 'Cagayan de Oro', image: '🥩', featured: false, tags: ['premium'], variants: [{ id: 'v019a', unit: 'kg', price: 480, stock: 18 }] },
    { id: 'p020', name: 'Ground Pork (Giniling)', categoryId: 'meat', description: 'Freshly ground pork for lumpia, spaghetti, and meatballs.', origin: 'Bulacan', image: '🍖', featured: false, tags: [], variants: [{ id: 'v020a', unit: '500g', price: 145, stock: 40 }] },
    { id: 'p021', name: 'Jasmine Rice (Sinandomeng)', categoryId: 'rice-grains', description: 'Premium sinandomeng rice, 5kg sack.', origin: 'Nueva Ecija', image: '🍚', featured: true, tags: ['best-seller'], variants: [{ id: 'v021a', unit: 'pack', price: 285, stock: 60 }] },
    { id: 'p022', name: 'Brown Rice', categoryId: 'rice-grains', description: 'Healthy brown rice, unpolished and nutritious.', origin: 'Isabela', image: '🌾', featured: false, tags: [], variants: [{ id: 'v022a', unit: 'kg', price: 75, stock: 50 }] },
    { id: 'p023', name: 'Fresh Eggs (Medium)', categoryId: 'eggs-dairy', description: 'Farm-fresh medium eggs, tray of 30.', origin: 'Cavite', image: '🥚', featured: true, tags: ['best-seller'], variants: [{ id: 'v023a', unit: 'pack', price: 210, stock: 80 }] },
    { id: 'p024', name: 'Carabao\'s Milk (Fresh)', categoryId: 'eggs-dairy', description: 'Fresh carabao milk from local dairy farms.', origin: 'Cavite', image: '🥛', featured: false, tags: [], variants: [{ id: 'v024a', unit: '500g', price: 85, stock: 25 }] },
    { id: 'p025', name: 'Kesong Puti', categoryId: 'deli', description: 'Soft white cheese from Laguna, perfect with pandesal.', origin: 'Laguna', image: '🧀', featured: true, tags: [], variants: [{ id: 'v025a', unit: 'pc', price: 65, stock: 35 }] },
    { id: 'p026', name: 'Longganisa (Vigan)', categoryId: 'deli', description: 'Garlicky Vigan longganisa, frozen fresh.', origin: 'Ilocos', image: '🌭', featured: false, tags: [], variants: [{ id: 'v026a', unit: 'pack', price: 180, stock: 30 }] },
    { id: 'p027', name: 'Cooking Oil (1L)', categoryId: 'essentials', description: 'Pure vegetable cooking oil, 1 liter.', origin: 'Local', image: '🫗', featured: false, tags: [], variants: [{ id: 'v027a', unit: 'pc', price: 95, stock: 100 }] },
    { id: 'p028', name: 'Patis (Fish Sauce)', categoryId: 'essentials', description: 'Premium patis for Filipino dishes, 350ml.', origin: 'Local', image: '🍶', featured: false, tags: [], variants: [{ id: 'v028a', unit: 'pc', price: 55, stock: 90 }] }
  ],

  cms: {
    banners: [
      { id: 'b1', title: 'Free Delivery Above ₱4,000', subtitle: 'Order before 7:30 PM for next-day delivery', cta: 'Shop Now', link: 'pages/shop.html', active: true },
      { id: 'b2', title: 'Palengke-Fresh Guarantee', subtitle: 'Not satisfied? Full refund on freshness claims', cta: 'Learn More', link: 'pages/about.html', active: true }
    ],
    blogPosts: [
      { id: 'blog1', title: 'Sinigang sa Sugpo Recipe', excerpt: 'A classic Filipino sour soup with fresh sugpo shrimp from the palengke.', category: 'Recipes', date: '2026-06-15', image: '🍲', content: 'Start with fresh sugpo, kangkong, radish, and ripe tomatoes. Simmer with tamarind broth for 30 minutes.' },
      { id: 'blog2', title: 'How to Pick the Perfect Mango', excerpt: 'Tips from our palengke vendors on choosing sweet, ripe mangoes every time.', category: 'Kitchen Guides', date: '2026-06-01', image: '🥭', content: 'Look for a fruity aroma at the stem end. Color should be golden-yellow with slight give when pressed.' },
      { id: 'blog3', title: 'Weekly Meal Prep with Palengke Finds', excerpt: 'Plan your week with fresh produce that stays crisp and flavorful.', category: 'Kitchen Guides', date: '2026-05-20', image: '📋', content: 'Buy hardy vegetables like talong and sitaw early in the week. Save leafy greens for mid-week delivery.' }
    ],
    pages: {
      about: 'Go! Cery brings the wet market to your doorstep. We partner with trusted palengke vendors across Metro Manila to deliver the freshest produce, seafood, and meat — next day, guaranteed.',
      faq: [
        { q: 'Do I need an account to place an order?', a: 'Yes. You need to create an account to place orders. Your account also allows you to save your delivery information, manage your orders, and make future purchases faster and more convenient.' },
        { q: 'What areas do you deliver to?', a: 'We deliver to Metro Manila and select areas in Rizal Province. Check your address at checkout.' },
        { q: 'What is the order cut-off time?', a: 'Orders placed before 7:30 PM are delivered the next day. Orders after cut-off are scheduled for the day after.' },
        { q: 'How does the freshness guarantee work?', a: 'If any item doesn\'t meet our freshness standard, contact us within 24 hours of delivery for a full refund on that item.' },
        { q: 'Is delivery free?', a: 'Yes! Free delivery on orders ₱4,000 and above. Below that, a zone-based fee applies.' },
        { q: 'What payment methods do you accept?', a: 'Cash on Delivery, GCash, Maya, and credit/debit cards.' }
      ]
    }
  },

  admins: [
    { id: 'admin1', email: 'admin@gocery.ph', password: 'admin123', name: 'Super Admin', role: 'super_admin' }
  ],

  reviews: [
    { id: 'r1', productId: 'p001', userId: 'demo', userName: 'Maria S.', rating: 5, comment: 'Sweetest mangoes! Arrived perfectly ripe.', date: '2026-06-10', verified: true },
    { id: 'r2', productId: 'p013', userId: 'demo2', userName: 'Juan D.', rating: 5, comment: 'Bangus was so fresh, made perfect daing.', date: '2026-06-08', verified: true },
    { id: 'r3', productId: 'p005', userId: 'demo3', userName: 'Ana L.', rating: 4, comment: 'Kangkong was crisp and clean. Will order again.', date: '2026-06-05', verified: true }
  ]
};

function initializeSeedData() {
  /* Seeding handled by FirebaseApp._seedIfNeeded() */
}
