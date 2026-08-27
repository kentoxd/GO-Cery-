/**
 * Internal API Gateway – Firestore-backed /api/v1/* layer
 * All data methods return Promises.
 */
const API = {
  _emit(event, payload) {
    document.dispatchEvent(new CustomEvent(`gocery:${event}`, { detail: payload }));
  },

  _applyProductFilters(products, filters = {}) {
    let result = [...products];
    if (filters.categoryId) result = result.filter(p => p.categoryId === filters.categoryId);
    if (filters.featured) result = result.filter(p => p.featured);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.includes(q))
      );
    }
    if (filters.inStock) result = result.filter(p => p.variants.some(v => v.stock > 0));
    if (filters.sort === 'price-asc') {
      result.sort((a, b) => Math.min(...a.variants.map(v => v.price)) - Math.min(...b.variants.map(v => v.price)));
    } else if (filters.sort === 'price-desc') {
      result.sort((a, b) => Math.max(...b.variants.map(v => v.price)) - Math.max(...a.variants.map(v => v.price)));
    } else if (filters.sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  },

  catalog: {
    async getProducts(filters = {}) {
      const snap = await FirebaseApp.collections.products().get();
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { success: true, data: API._applyProductFilters(products, filters) };
    },

    async getProduct(id) {
      const doc = await FirebaseApp.collections.products().doc(id).get();
      return doc.exists
        ? { success: true, data: { id: doc.id, ...doc.data() } }
        : { success: false, error: 'Product not found' };
    },

    getCategories() {
      return { success: true, data: CONFIG.categories };
    },

    async updateProduct(id, updates) {
      await FirebaseApp.collections.products().doc(id).update(updates);
      const doc = await FirebaseApp.collections.products().doc(id).get();
      const product = { id: doc.id, ...doc.data() };
      API._emit('catalog:updated', product);
      return { success: true, data: product };
    },

    async createProduct(product) {
      const ref = FirebaseApp.collections.products().doc();
      product.id = ref.id;
      await ref.set(product);
      return { success: true, data: product };
    },

    async deleteProduct(id) {
      await FirebaseApp.collections.products().doc(id).delete();
      return { success: true };
    }
  },

  user: {
    _current: null,

    async register({ name, email, password, phone }) {
      try {
        const cred = await FirebaseApp.auth.createUserWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        const profile = {
          name,
          email,
          phone,
          addresses: [],
          emailVerified: true,
          createdAt: new Date().toISOString()
        };
        await FirebaseApp.collections.users().doc(uid).set(profile);
        await API.loyalty.initAccount(uid);
        API.user._current = { id: uid, ...profile, emailVerified: true };
        return { success: true, data: API.user._current };
      } catch (e) {
        const message = e.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Try logging in instead.'
          : (e.message || 'Registration failed');
        return { success: false, error: message };
      }
    },

    async login(email, password) {
      try {
        const cred = await FirebaseApp.auth.signInWithEmailAndPassword(email, password);
        return API.user._finalizeLogin(cred.user);
      } catch (e) {
        return { success: false, error: 'Invalid email or password' };
      }
    },

    async loginWithGoogle() {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const cred = await FirebaseApp.auth.signInWithPopup(provider);
        const uid = cred.user.uid;
        const profileDoc = await FirebaseApp.collections.users().doc(uid).get();

        if (!profileDoc.exists) {
          const profile = {
            name: cred.user.displayName || '',
            email: cred.user.email,
            phone: cred.user.phoneNumber || '',
            addresses: [],
            emailVerified: true,
            provider: 'google',
            createdAt: new Date().toISOString()
          };
          await FirebaseApp.collections.users().doc(uid).set(profile);
          await API.loyalty.initAccount(uid);
        }

        return API.user._finalizeLogin(cred.user);
      } catch (e) {
        if (e.code === 'auth/popup-closed-by-user') {
          return { success: false, error: 'Google sign-in was cancelled' };
        }
        return { success: false, error: e.message || 'Google sign-in failed' };
      }
    },

    async _finalizeLogin(firebaseUser) {
      const uid = firebaseUser.uid;
      const adminDoc = await FirebaseApp.collections.admins().doc(uid).get();
      if (adminDoc.exists) {
        API.admin._current = { id: uid, email: firebaseUser.email, ...adminDoc.data() };
        return { success: true, data: API.admin._current };
      }

      const profileDoc = await FirebaseApp.collections.users().doc(uid).get();
      API.user._current = profileDoc.exists
        ? { id: uid, email: firebaseUser.email, ...profileDoc.data() }
        : { id: uid, email: firebaseUser.email, name: firebaseUser.displayName || '', addresses: [] };
      await API.cart.mergeGuestCart(uid);
      return { success: true, data: API.user._current };
    },

    async logout() {
      await FirebaseApp.auth.signOut();
      API.user._current = null;
      API.admin._current = null;
      return { success: true };
    },

    getCurrent() {
      return API.user._current;
    },

    async updateProfile(updates) {
      const current = API.user._current;
      if (!current) return { success: false, error: 'Not logged in' };
      await FirebaseApp.collections.users().doc(current.id).update(updates);
      API.user._current = { ...current, ...updates };
      return { success: true, data: API.user._current };
    },

    async addAddress(address) {
      const current = API.user._current;
      if (!current) return { success: false, error: 'Not logged in' };
      address.id = 'addr' + Date.now();
      const addresses = [...(current.addresses || []), address];
      await FirebaseApp.collections.users().doc(current.id).update({ addresses });
      API.user._current = { ...current, addresses };
      return { success: true, data: address };
    },

    async getAll() {
      const snap = await FirebaseApp.collections.users().get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Grants/revokes admin access via Firestore (free Spark tier — no Cloud Functions).
     */
    async updateRole(uid, role) {
      const admin = API.admin.getCurrent();
      if (!admin || admin.role !== 'super_admin') {
        return { success: false, error: 'Super admin access required' };
      }
      if (uid === admin.id) {
        return { success: false, error: 'You cannot change your own role.' };
      }

      const VALID_ROLES = ['customer', 'admin', 'super_admin'];
      if (!VALID_ROLES.includes(role)) {
        return { success: false, error: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` };
      }

      const userDoc = await FirebaseApp.collections.users().doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const adminRef = FirebaseApp.collections.admins().doc(uid);

      if (role === 'customer') {
        await adminRef.delete().catch(() => {});
      } else {
        await adminRef.set({
          email: userData.email || null,
          name: userData.name || userData.email || null,
          role
        });
      }

      await FirebaseApp.collections.users().doc(uid).set({ role }, { merge: true });
      await API.admin.logAction('UPDATE_USER_ROLE', { targetEmail: userData.email, newRole: role });

      return { success: true, data: { uid, role } };
    }
  },

  cart: {
    _guestKey() {
      let id = Storage.get('gocery_guest_id');
      if (!id) {
        id = 'guest_' + Date.now();
        Storage.set('gocery_guest_id', id);
      }
      return id;
    },

    _docId(userId) {
      return userId || this._guestKey();
    },

    async get(userId) {
      if (!userId) {
        return Storage.get(`${CONFIG.storageKeys.cart}_guest`, { items: [] });
      }
      const doc = await FirebaseApp.collections.carts().doc(userId).get();
      return doc.exists ? doc.data() : { items: [] };
    },

    async _save(userId, cart) {
      if (!userId) {
        Storage.set(`${CONFIG.storageKeys.cart}_guest`, cart);
      } else {
        await FirebaseApp.collections.carts().doc(userId).set(cart);
      }
      API._emit('cart:updated', cart);
    },

    async add(userId, productId, variantId, quantity = 1) {
      const cart = await this.get(userId);
      const existing = cart.items.find(i => i.productId === productId && i.variantId === variantId);
      if (existing) existing.quantity += quantity;
      else cart.items.push({ productId, variantId, quantity });
      await this._save(userId, cart);
      return { success: true, data: cart };
    },

    async updateQty(userId, productId, variantId, quantity) {
      const cart = await this.get(userId);
      const item = cart.items.find(i => i.productId === productId && i.variantId === variantId);
      if (item) item.quantity = Math.max(1, quantity);
      await this._save(userId, cart);
      return { success: true, data: cart };
    },

    async remove(userId, productId, variantId) {
      const cart = await this.get(userId);
      cart.items = cart.items.filter(i => !(i.productId === productId && i.variantId === variantId));
      await this._save(userId, cart);
      return { success: true, data: cart };
    },

    async clear(userId) {
      await this._save(userId, { items: [] });
      return { success: true };
    },

    async mergeGuestCart(userId) {
      if (!userId) return;
      const guest = Storage.get(`${CONFIG.storageKeys.cart}_guest`, { items: [] });
      if (!guest.items.length) return;
      for (const item of guest.items) {
        await API.cart.add(userId, item.productId, item.variantId, item.quantity);
      }
      Storage.set(`${CONFIG.storageKeys.cart}_guest`, { items: [] });
    },

    async getEnriched(userId) {
      const cart = await this.get(userId);
      const { data: products } = await API.catalog.getProducts();
      const items = cart.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const variant = product?.variants.find(v => v.id === item.variantId);
        return { ...item, product, variant, lineTotal: variant ? variant.price * item.quantity : 0 };
      }).filter(i => i.product && i.variant);
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      return { items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
    }
  },

  order: {
    async create({ items, addressId, zoneId, slotId, deliveryDate, paymentMethod, promoCode }) {
      const user = API.user.getCurrent();
      if (!user) return { success: false, error: 'You must be logged in to place an order.' };

      const userDoc = await FirebaseApp.collections.users().doc(user.id).get();
      if (!userDoc.exists) return { success: false, error: 'User profile not found.' };
      const userData = userDoc.data();
      const address = (userData.addresses || []).find(a => a.id === addressId);
      if (!address) return { success: false, error: 'Address not found on your account.' };

      const slot = CONFIG.deliverySlots.find(s => s.id === slotId);
      if (!slot) return { success: false, error: 'Invalid delivery slot.' };

      try {
        const pricing = await Pricing.computeOrderPricing({
          rawItems: items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          zoneId,
          userId: user.id,
          promoCode
        });

        const isCod = paymentMethod === 'Cash on Delivery' || paymentMethod === 'cod';
        const ref = FirebaseApp.collections.orders().doc();
        const order = {
          id: ref.id,
          userId: user.id,
          userName: userData.name || userData.email,
          items: pricing.items,
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          promoCode: pricing.promoCode,
          deliveryFee: pricing.deliveryFee,
          total: pricing.total,
          address,
          zone: pricing.zoneName,
          deliveryDate: deliveryDate || null,
          deliverySlot: slot.label,
          paymentMethod,
          status: 'Pending',
          paymentStatus: isCod ? 'pending_collection' : 'awaiting_manual_verification',
          inventoryDeducted: false,
          statusHistory: [{ status: 'Pending', timestamp: new Date().toISOString() }],
          createdAt: new Date().toISOString()
        };

        await ref.set(order);
        API._emit('order:created', order);
        return { success: true, data: order };
      } catch (err) {
        return { success: false, error: err.message || 'Failed to create order.' };
      }
    },

    async getAll(filters = {}) {
      let snap;
      if (filters.userId) {
        snap = await FirebaseApp.collections.orders()
          .where('userId', '==', filters.userId)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        snap = await FirebaseApp.collections.orders().orderBy('createdAt', 'desc').get();
      }
      let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filters.status) orders = orders.filter(o => o.status === filters.status);
      return { success: true, data: orders };
    },

    async getById(id) {
      const doc = await FirebaseApp.collections.orders().doc(id).get();
      return doc.exists
        ? { success: true, data: { id: doc.id, ...doc.data() } }
        : { success: false, error: 'Order not found' };
    },

    async updateStatus(id, status, note = '') {
      const ref = FirebaseApp.collections.orders().doc(id);
      const doc = await ref.get();
      if (!doc.exists) return { success: false, error: 'Order not found' };
      const data = doc.data();
      const statusHistory = [...(data.statusHistory || []), { status, timestamp: new Date().toISOString(), note }];
      const updates = { status, statusHistory };

      if (status === 'Confirmed' && !data.inventoryDeducted) {
        await API.inventory.deduct(data.items);
        await API.loyalty.earnPoints(data.userId, data.total);
        updates.inventoryDeducted = true;
        if (data.paymentStatus === 'pending_collection') {
          updates.paymentStatus = 'paid';
        }
      }

      await ref.update(updates);
      const updated = { id, ...data, ...updates };
      API._emit('order:updated', updated);
      return { success: true, data: updated };
    },

    /**
     * Admin confirms manual GCash/Maya payment — deducts stock and awards loyalty.
     */
    async confirmPayment(id) {
      const admin = API.admin.getCurrent();
      if (!admin) return { success: false, error: 'Admin access required' };

      const ref = FirebaseApp.collections.orders().doc(id);
      const doc = await ref.get();
      if (!doc.exists) return { success: false, error: 'Order not found' };
      const order = doc.data();

      if (order.paymentStatus === 'paid') {
        return { success: false, error: 'This order is already confirmed as paid.' };
      }
      if (!CONFIG.manualPaymentMethods.includes(order.paymentMethod)) {
        return { success: false, error: 'This order was not paid via a manual QR method.' };
      }

      const statusHistory = [
        ...(order.statusHistory || []),
        { status: 'Confirmed', timestamp: new Date().toISOString(), note: `Payment manually confirmed by ${admin.email}` }
      ];

      await ref.update({
        status: 'Confirmed',
        paymentStatus: 'paid',
        statusHistory
      });

      if (!order.inventoryDeducted) {
        await API.inventory.deduct(order.items);
        await ref.update({ inventoryDeducted: true });
      }
      await API.loyalty.earnPoints(order.userId, order.total);

      await API.admin.logAction('CONFIRM_MANUAL_PAYMENT', {
        orderId: id,
        paymentMethod: order.paymentMethod,
        total: order.total
      });

      const result = { id, status: 'Confirmed', paymentStatus: 'paid' };
      API._emit('order:updated', result);
      return { success: true, data: result };
    }
  },

  inventory: {
    async deduct(items) {
      for (const { productId, variantId, quantity } of items) {
        const ref = FirebaseApp.collections.products().doc(productId);
        const doc = await ref.get();
        if (!doc.exists) continue;
        const product = doc.data();
        const variants = product.variants.map(v =>
          v.id === variantId ? { ...v, stock: Math.max(0, v.stock - quantity) } : v
        );
        await ref.update({ variants });
      }
    },

    async updateStock(productId, variantId, stock) {
      const ref = FirebaseApp.collections.products().doc(productId);
      const doc = await ref.get();
      if (!doc.exists) return { success: false };
      const product = doc.data();
      const variants = product.variants.map(v =>
        v.id === variantId ? { ...v, stock } : v
      );
      await ref.update({ variants });
      return { success: true };
    }
  },

  delivery: {
    getZones() {
      return { success: true, data: CONFIG.deliveryZones };
    },

    getSlots() {
      return { success: true, data: CONFIG.deliverySlots };
    },

    getNextDeliveryDate() {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(CONFIG.orderCutoffHour, CONFIG.orderCutoffMinute, 0, 0);
      const delivery = new Date(now);
      delivery.setDate(delivery.getDate() + (now > cutoff ? 2 : 1));
      return delivery.toISOString().split('T')[0];
    },

    async calculateFee(subtotal, zoneId) {
      const user = API.user.getCurrent();
      const loyalty = user ? await API.loyalty.getAccount(user.id) : null;
      if (subtotal >= CONFIG.freeDeliveryThreshold) return 0;
      if (loyalty?.tier === 'gold') return 0;
      if (loyalty?.tier === 'vip' && subtotal >= 2000) return 0;
      const zone = CONFIG.deliveryZones.find(z => z.id === zoneId);
      return zone ? zone.fee : CONFIG.defaultDeliveryFee;
    },

    isBeforeCutoff() {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(CONFIG.orderCutoffHour, CONFIG.orderCutoffMinute, 0, 0);
      return now <= cutoff;
    }
  },

  loyalty: {
    async initAccount(userId) {
      await FirebaseApp.collections.loyalty().doc(userId).set({
        points: 0, tier: 'regular', referrals: 0
      });
    },

    async getAccount(userId) {
      const doc = await FirebaseApp.collections.loyalty().doc(userId).get();
      return doc.exists ? doc.data() : { points: 0, tier: 'regular', referrals: 0 };
    },

    async earnPoints(userId, orderTotal) {
      if (!userId) return;
      const ref = FirebaseApp.collections.loyalty().doc(userId);
      const doc = await ref.get();
      let account = doc.exists ? doc.data() : { points: 0, tier: 'regular', referrals: 0 };
      const multiplier = account.tier === 'gold' ? 3 : account.tier === 'vip' ? 2 : 1;
      account.points += Math.floor(orderTotal / 100) * multiplier;
      if (account.points >= 2000) account.tier = 'gold';
      else if (account.points >= 500) account.tier = 'vip';
      await ref.set(account);
    },

    getTierInfo(tierId) {
      return CONFIG.loyaltyTiers.find(t => t.id === tierId);
    }
  },

  reviews: {
    async getByProduct(productId) {
      const snap = await FirebaseApp.collections.reviews()
        .where('productId', '==', productId).get();
      return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    },

    async getAverageRating(productId) {
      const { data } = await this.getByProduct(productId);
      if (!data.length) return 0;
      return data.reduce((s, r) => s + r.rating, 0) / data.length;
    },

    async add(review) {
      const ref = FirebaseApp.collections.reviews().doc();
      const data = {
        ...review,
        id: ref.id,
        date: new Date().toISOString().split('T')[0]
      };
      await ref.set(data);
      return { success: true, data };
    },

    async update(id, updates) {
      await FirebaseApp.collections.reviews().doc(id).update(updates);
      return { success: true };
    },

    async remove(id) {
      await FirebaseApp.collections.reviews().doc(id).delete();
      return { success: true };
    }
  },

  cms: {
    async _getCms() {
      const doc = await FirebaseApp.collections.cms().doc('main').get();
      return doc.exists ? doc.data() : SeedData.cms;
    },

    async getBanners() {
      const cms = await this._getCms();
      return (cms.banners || []).filter(b => b.active);
    },

    async getBlogPosts() {
      const cms = await this._getCms();
      return cms.blogPosts || [];
    },

    async getRecipes() {
      const cms = await this._getCms();
      return cms.recipes || cms.blogPosts || [];
    },

    async getFaq() {
      const cms = await this._getCms();
      return cms.pages?.faq || [];
    },

    async getPaymentQrCodes() {
      const cms = await this._getCms();
      return { gcashQrUrl: cms.gcashQrUrl || '', mayaQrUrl: cms.mayaQrUrl || '' };
    },

    async getHero() {
      const cms = await this._getCms();
      return {
        heroTitle: cms.heroTitle || 'Palengke-Fresh, Delivered Tomorrow',
        heroSubtitle: cms.heroSubtitle || 'Fresh produce, seafood, and meat sourced daily from trusted wet markets — delivered straight to your doorstep in Metro Manila & Rizal.'
      };
    },

    async getAbout() {
      const cms = await this._getCms();
      return cms.pages?.about || '';
    }
  },

  admin: {
    _current: null,
    async loginWithGoogle() {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const cred = await FirebaseApp.auth.signInWithPopup(provider);
        const adminDoc = await FirebaseApp.collections.admins().doc(cred.user.uid).get();
        if (!adminDoc.exists) {
          await FirebaseApp.auth.signOut();
          return { success: false, error: 'This Google account is not authorized as admin' };
        }
        API.admin._current = { id: cred.user.uid, email: cred.user.email, ...adminDoc.data() };
        return { success: true, data: API.admin._current };
      } catch (e) {
        if (e.code === 'auth/popup-closed-by-user') {
          return { success: false, error: 'Google sign-in was cancelled' };
        }
        return { success: false, error: e.message || 'Google sign-in failed' };
      }
    },
    
    async login(email, password) {
      try {
        const cred = await FirebaseApp.auth.signInWithEmailAndPassword(email, password);
        const adminDoc = await FirebaseApp.collections.admins().doc(cred.user.uid).get();
        if (!adminDoc.exists) {
          await FirebaseApp.auth.signOut();
          return { success: false, error: 'Not authorized as admin' };
        }
        API.admin._current = { id: cred.user.uid, email: cred.user.email, ...adminDoc.data() };
        return { success: true, data: API.admin._current };
      } catch (e) {
        return { success: false, error: 'Invalid credentials' };
      }
    },

    async logout() {
      await FirebaseApp.auth.signOut();
      API.admin._current = null;
      return { success: true };
    },

    getCurrent() {
      return API.admin._current;
    },

    async logAction(action, details) {
      await FirebaseApp.collections.auditLogs().add({
        action,
        details,
        admin: API.admin.getCurrent()?.name,
        timestamp: new Date().toISOString()
      });
    },

    async getStats() {
      const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
        FirebaseApp.collections.orders().get(),
        FirebaseApp.collections.products().get(),
        FirebaseApp.collections.users().get()
      ]);
      const orders = ordersSnap.docs.map(d => d.data());
      const products = productsSnap.docs.map(d => d.data());
      const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
      return {
        totalOrders: orders.length,
        totalRevenue: revenue,
        totalProducts: products.length,
        totalUsers: usersSnap.size,
        pendingOrders: orders.filter(o => o.status === 'Pending').length,
        lowStock: products.filter(p => p.variants.some(v => v.stock < 10)).length
      };
    }
  },

  wishlist: {
    async get(userId) {
      const doc = await FirebaseApp.collections.wishlists().doc(userId).get();
      return doc.exists ? (doc.data().productIds || []) : [];
    },

    async toggle(userId, productId) {
      const ref = FirebaseApp.collections.wishlists().doc(userId);
      const doc = await ref.get();
      let productIds = doc.exists ? (doc.data().productIds || []) : [];
      const idx = productIds.indexOf(productId);
      if (idx >= 0) productIds.splice(idx, 1);
      else productIds.push(productId);
      await ref.set({ productIds });
      return { success: true, data: productIds };
    }
  }
};
