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

  reviews: [
    { id: 'r1', productId: 'p001', userId: 'demo', userName: 'Maria S.', rating: 5, comment: 'Sweetest mangoes! Arrived perfectly ripe.', date: '2026-06-10', verified: true },
    { id: 'r2', productId: 'p013', userId: 'demo2', userName: 'Juan D.', rating: 5, comment: 'Bangus was so fresh, made perfect daing.', date: '2026-06-08', verified: true },
    { id: 'r3', productId: 'p005', userId: 'demo3', userName: 'Ana L.', rating: 4, comment: 'Kangkong was crisp and clean. Will order again.', date: '2026-06-05', verified: true }
  ]
};

/* Detailed recipes. Ingredients with a productId can be ordered straight from the recipe page. */
SeedData.recipes = [
  {
    id: 'blog1', title: 'Sinigang sa Sugpo', category: 'Recipes', date: '2026-06-15', image: '🍲',
    excerpt: 'A classic Filipino sour soup with fresh sugpo shrimp from the palengke.',
    content: 'A comforting sour soup that is ready in under an hour. Sugpo gives the broth a sweet, rich flavor, and kangkong adds a fresh crunch.',
    servings: 4, prepTime: '15 min', cookTime: '35 min', difficulty: 'Easy',
    ingredients: [
      { name: 'Large Shrimp (Sugpo)', amount: '500 g', productId: 'p015', variantId: 'v015a', qty: 1 },
      { name: 'Kangkong', amount: '2 bunches', productId: 'p005', variantId: 'v005a', qty: 2 },
      { name: 'Tomatoes (Native)', amount: '3 pcs', productId: 'p006', variantId: 'v006b', qty: 1 },
      { name: 'Red Onion', amount: '1 large', productId: 'p012', variantId: 'v012a', qty: 1 },
      { name: 'Patis (Fish Sauce)', amount: '2 tbsp', productId: 'p028', variantId: 'v028a', qty: 1 },
      { name: 'Sinigang sa sampalok mix', amount: '1 pack' },
      { name: 'Labanos (radish)', amount: '1 medium' },
      { name: 'Siling haba', amount: '2 pcs' }
    ],
    steps: [
      'Boil 6 cups of water in a pot. Add the onion and tomatoes and simmer for 10 minutes until soft.',
      'Add the radish and cook for 5 minutes.',
      'Stir in the sinigang mix, then add the sugpo and siling haba.',
      'Cook the shrimp for 5 to 7 minutes until pink. Do not overcook.',
      'Season with patis. Add the kangkong and turn off the heat after 1 minute.',
      'Serve hot with steamed rice.'
    ],
    tips: ['Keep the sugpo heads on. The fat adds a lot of flavor to the broth.', 'Add the kangkong last so it stays green and crisp.']
  },
  {
    id: 'recipe-daing', title: 'Daing na Bangus', category: 'Recipes', date: '2026-06-12', image: '🐟',
    excerpt: 'Garlicky, vinegar-marinated bangus fried until crisp. A perfect breakfast with sinangag.',
    content: 'Butterflied bangus marinated overnight in vinegar, garlic, and pepper, then fried until golden.',
    servings: 4, prepTime: '15 min + overnight marinade', cookTime: '15 min', difficulty: 'Easy',
    ingredients: [
      { name: 'Fresh Bangus (Milkfish)', amount: '2 pcs', productId: 'p013', variantId: 'v013b', qty: 2 },
      { name: 'Garlic (Bawang)', amount: '1 whole head, crushed', productId: 'p011', variantId: 'v011a', qty: 1 },
      { name: 'Calamansi', amount: '6 pcs', productId: 'p003', variantId: 'v003b', qty: 1 },
      { name: 'Cooking Oil (1L)', amount: '1 cup for frying', productId: 'p027', variantId: 'v027a', qty: 1 },
      { name: 'Cane vinegar', amount: '1 cup' },
      { name: 'Salt and whole peppercorns', amount: 'to taste' }
    ],
    steps: [
      'Ask for the bangus to be butterflied and deboned, or do it at home. Rinse and pat dry.',
      'Mix vinegar, crushed garlic, calamansi juice, salt, and pepper in a dish.',
      'Soak the bangus in the marinade, cover, and refrigerate overnight.',
      'Drain the fish and pat dry so the oil does not splatter.',
      'Fry in medium-hot oil for 4 to 5 minutes per side until golden and crisp.',
      'Serve with garlic fried rice, fresh tomatoes, and spiced vinegar.'
    ],
    tips: ['Dry the fish well before frying for a crispier skin.', 'Fry skin-side down first so the fillet does not curl.']
  },
  {
    id: 'recipe-tinola', title: 'Tinolang Manok', category: 'Recipes', date: '2026-06-08', image: '🍗',
    excerpt: 'Light, gingery chicken soup that is warm and easy on the stomach.',
    content: 'Chicken simmered with plenty of ginger, onion, and garlic in a clear broth.',
    servings: 4, prepTime: '10 min', cookTime: '40 min', difficulty: 'Easy',
    ingredients: [
      { name: 'Chicken Leg Quarter', amount: '1 kg', productId: 'p018', variantId: 'v017b', qty: 1 },
      { name: 'Fresh Ginger (Luya)', amount: '1 thumb-size piece, sliced', productId: 'p010', variantId: 'v010a', qty: 1 },
      { name: 'Garlic (Bawang)', amount: '4 cloves', productId: 'p011', variantId: 'v011a', qty: 1 },
      { name: 'Red Onion', amount: '1 medium', productId: 'p012', variantId: 'v012a', qty: 1 },
      { name: 'Patis (Fish Sauce)', amount: '2 tbsp', productId: 'p028', variantId: 'v028a', qty: 1 },
      { name: 'Green papaya or sayote', amount: '1 medium' },
      { name: 'Sili or malunggay leaves', amount: '1 cup' }
    ],
    steps: [
      'Saute garlic, onion, and ginger in a little oil until fragrant.',
      'Add the chicken and cook for 5 minutes until lightly browned. Season with patis.',
      'Pour in 6 cups of water. Bring to a boil, then simmer for 25 minutes.',
      'Add the papaya or sayote and cook for 8 to 10 minutes until tender.',
      'Stir in the leaves, cook for 1 minute, and serve hot.'
    ],
    tips: ['Skim the foam from the top for a clearer broth.', 'Rice washings (hugas bigas) make the soup slightly creamier.']
  },
  {
    id: 'recipe-pinakbet', title: 'Pinakbet', category: 'Recipes', date: '2026-06-03', image: '🥘',
    excerpt: 'Ilocano vegetable stew with pork, ampalaya, talong, and sitaw.',
    content: 'A hearty mix of palengke vegetables cooked with pork and bagoong. Salty, savory, and slightly bitter.',
    servings: 4, prepTime: '20 min', cookTime: '25 min', difficulty: 'Medium',
    ingredients: [
      { name: 'Pork Kasim (Shoulder)', amount: '250 g, cubed', productId: 'p017', variantId: 'v017a', qty: 1 },
      { name: 'Ampalaya (Bitter Gourd)', amount: '1 medium', productId: 'p008', variantId: 'v008a', qty: 1 },
      { name: 'Eggplant (Talong)', amount: '2 pcs', productId: 'p007', variantId: 'v007a', qty: 1 },
      { name: 'Sitaw (String Beans)', amount: '1 bundle', productId: 'p009', variantId: 'v009a', qty: 1 },
      { name: 'Tomatoes (Native)', amount: '2 pcs', productId: 'p006', variantId: 'v006b', qty: 1 },
      { name: 'Garlic (Bawang)', amount: '3 cloves', productId: 'p011', variantId: 'v011a', qty: 1 },
      { name: 'Red Onion', amount: '1 medium', productId: 'p012', variantId: 'v012a', qty: 1 },
      { name: 'Bagoong isda', amount: '3 tbsp' },
      { name: 'Kalabasa (squash)', amount: '1 cup, cubed' }
    ],
    steps: [
      'Saute garlic, onion, and tomatoes in a pot. Add the pork and cook until browned.',
      'Add the bagoong and 1 cup of water. Simmer for 15 minutes until the pork is tender.',
      'Add the kalabasa first, then the sitaw and talong, and cook for 5 minutes.',
      'Add the ampalaya last and cook for 3 minutes.',
      'Do not stir too much. Shake the pot gently so the vegetables stay whole.'
    ],
    tips: ['Soak sliced ampalaya in salted water for 10 minutes to reduce the bitterness.']
  },
  {
    id: 'recipe-tortang-talong', title: 'Tortang Talong', category: 'Recipes', date: '2026-05-28', image: '🍆',
    excerpt: 'Grilled eggplant dipped in egg and pan-fried, with a savory ground pork filling.',
    content: 'Smoky grilled talong coated in beaten egg and fried until golden. It is quick, cheap, and loved by everyone.',
    servings: 3, prepTime: '10 min', cookTime: '20 min', difficulty: 'Easy',
    ingredients: [
      { name: 'Eggplant (Talong)', amount: '4 medium', productId: 'p007', variantId: 'v007a', qty: 1 },
      { name: 'Fresh Eggs (Medium)', amount: '3 eggs (sold per tray of 30)', productId: 'p023', variantId: 'v023a', qty: 1 },
      { name: 'Ground Pork (Giniling)', amount: '200 g', productId: 'p020', variantId: 'v020a', qty: 1 },
      { name: 'Red Onion', amount: '1 small', productId: 'p012', variantId: 'v012a', qty: 1 },
      { name: 'Cooking Oil (1L)', amount: '3 tbsp', productId: 'p027', variantId: 'v027a', qty: 1 },
      { name: 'Salt and pepper', amount: 'to taste' }
    ],
    steps: [
      'Grill or roast the whole talong until the skin is charred and the flesh is soft.',
      'Peel off the skin, leaving the stem on. Flatten the flesh gently with a fork.',
      'Saute onion and ground pork until cooked. Season with salt and pepper.',
      'Beat the eggs with a pinch of salt. Dip each talong, then top with the pork if you like.',
      'Pan-fry in oil for 2 to 3 minutes per side until golden. Serve with banana ketchup.'
    ],
    tips: ['Poke the talong with a fork before grilling so it cooks evenly.']
  },
  {
    id: 'blog2', title: 'How to Pick the Perfect Mango', category: 'Kitchen Guides', date: '2026-06-01', image: '🥭',
    excerpt: 'Tips from our palengke vendors on choosing sweet, ripe mangoes every time.',
    content: 'Carabao mangoes are best when they are fully ripe. Use your nose and your fingers, not just your eyes.',
    steps: [
      'Smell the stem end. A strong fruity aroma means the mango is sweet and ripe.',
      'Check the color. Golden-yellow is ideal, with a few green patches being fine.',
      'Press gently. A ripe mango has a slight give, like a ripe avocado.',
      'Feel the weight. A heavy mango for its size is juicier.',
      'Ripen firm mangoes in a paper bag at room temperature for 1 to 2 days.'
    ],
    tips: ['Store ripe mangoes in the fridge for up to 5 days.', 'Skip mangoes with dark sunken spots or a sour smell.']
  },
  {
    id: 'blog3', title: 'Weekly Meal Prep with Palengke Finds', category: 'Kitchen Guides', date: '2026-05-20', image: '📋',
    excerpt: 'Plan your week with fresh produce that stays crisp and flavorful.',
    content: 'A little planning lets you eat fresh all week and waste less food.',
    steps: [
      'Buy hardy vegetables like talong, sitaw, and ampalaya early in the week.',
      'Save leafy greens like kangkong for a mid-week delivery.',
      'Cook your rice and one or two viands in bulk on Sunday.',
      'Marinate meat and fish in portions and freeze what you will not use in 2 days.',
      'Wash and cut vegetables, then store them in airtight containers lined with paper towels.'
    ],
    tips: ['Order twice a week: once for sturdy items, once for leafy greens and seafood.']
  }
];

function initializeSeedData() {
  /* Seeding handled by FirebaseApp._seedIfNeeded() */
}
