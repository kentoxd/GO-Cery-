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
      if (CONFIG.pricesInCentavos && updates.variants) {
        updates.variants = updates.variants.map(v => ({
          ...v,
          price: Number.isInteger(v.price) && v.price > 1000 ? v.price : Format.toCentavos(v.price)
        }));
      }
      await FirebaseApp.collections.products().doc(id).update(updates);
      const doc = await FirebaseApp.collections.products().doc(id).get();
      const product = { id: doc.id, ...doc.data() };
      API._emit('catalog:updated', product);
      return { success: true, data: product };
    },

    async createProduct(product) {
      const ref = FirebaseApp.collections.products().doc();
      product.id = ref.id;
      if (CONFIG.pricesInCentavos && product.variants) {
        product.variants = product.variants.map(v => ({
          ...v,
          price: Number.isInteger(v.price) && v.price > 1000 ? v.price : Format.toCentavos(v.price)
        }));
      }
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

    async updateRole(uid, role) {
      const result = await Http.post(`/admin/users/${uid}/role`, { role });
      if (result.success && result.tokenRefreshRequired && FirebaseApp.auth.currentUser) {
        await FirebaseApp.auth.currentUser.getIdToken(true);
      }
      return result;
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
    async create(orderData, options = {}) {
      const isOnlinePayment = options.awaitingPayment === true;
      const ref = FirebaseApp.collections.orders().doc();
      const initialStatus = isOnlinePayment ? 'Awaiting Payment' : 'Pending';
      const order = {
        id: ref.id,
        ...orderData,
        status: initialStatus,
        paymentStatus: isOnlinePayment ? 'pending' : (orderData.paymentMethod === 'Cash on Delivery' ? 'pending_collection' : 'paid'),
        inventoryDeducted: !isOnlinePayment,
        statusHistory: [{ status: initialStatus, timestamp: new Date().toISOString() }],
        createdAt: new Date().toISOString()
      };
      await ref.set(order);
      if (!isOnlinePayment) {
        await API.inventory.deduct(order.items);
        await API.loyalty.earnPoints(orderData.userId, orderData.total);
      }
      API._emit('order:created', order);
      return { success: true, data: order };
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
      const result = await Http.patch(`/admin/orders/${id}/status`, { status, note });
      if (result.success) {
        API._emit('order:updated', result.data);
      }
      return result;
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
      const threshold = CONFIG.pricesInCentavos
        ? Format.toCentavos(CONFIG.freeDeliveryThreshold)
        : CONFIG.freeDeliveryThreshold;
      const vipThreshold = CONFIG.pricesInCentavos ? Format.toCentavos(2000) : 2000;
      if (subtotal >= threshold) return 0;
      if (loyalty?.tier === 'gold') return 0;
      if (loyalty?.tier === 'vip' && subtotal >= vipThreshold) return 0;
      const zone = CONFIG.deliveryZones.find(z => z.id === zoneId);
      const fee = zone ? zone.fee : CONFIG.defaultDeliveryFee;
      return CONFIG.pricesInCentavos ? Format.toCentavos(fee) : fee;
    },

    isBeforeCutoff() {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(CONFIG.orderCutoffHour, CONFIG.orderCutoffMinute, 0, 0);
      return now <= cutoff;
    }
  },

  payment: {
    async getConfig() {
      return Http.get('/payments/config');
    },

    async createIntent(orderId) {
      return Http.post('/payments/intent', { orderId });
    },

    async processOnline(publicKey, { paymentIntentId, clientKey, method, card, billing, returnUrl }) {
      const pmType = method === 'gcash' ? 'gcash' : method === 'maya' ? 'paymaya' : 'card';
      const pm = await PayMongoClient.createPaymentMethod(publicKey, {
        type: pmType,
        card: pmType === 'card' ? card : undefined,
        billing
      });
      const attached = await PayMongoClient.attachPaymentMethod(publicKey, {
        paymentIntentId,
        paymentMethodId: pm.id,
        clientKey,
        returnUrl
      });

      const redirectUrl = attached.attributes?.next_action?.redirect?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return { success: true, data: { redirecting: true } };
      }

      const piStatus = attached.attributes?.status;
      if (piStatus === 'succeeded' || piStatus === 'awaiting_payment_method') {
        return { success: true, data: { status: piStatus, paymentIntentId } };
      }

      return { success: true, data: attached };
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
      const pesoTotal = CONFIG.pricesInCentavos ? orderTotal / 100 : orderTotal;
      account.points += Math.floor(pesoTotal / 100) * multiplier;
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

    async getFaq() {
      const cms = await this._getCms();
      return cms.pages?.faq || [];
    },

    async getAbout() {
      const cms = await this._getCms();
      return cms.pages?.about || '';
    }
  },

  admin: {
    _current: null,

    async login(email, password) {
      try {
        await FirebaseApp.auth.signInWithEmailAndPassword(email, password);
        if (!API.admin._current) {
          await FirebaseApp.auth.signOut();
          return { success: false, error: 'Not authorized as admin' };
        }
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
      const current = API.admin.getCurrent();
      await FirebaseApp.collections.auditLogs().add({
        action,
        details,
        actorUid: current?.id || null,
        actorEmail: current?.email || null,
        admin: current?.name || current?.email || null,
        target: details?.orderId || details?.productId || details?.uid || null,
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
      const threshold = CONFIG.lowStockThreshold || 20;
      const revenue = orders
        .filter(o => o.status !== 'Cancelled' && o.status !== 'Refunded')
        .reduce((s, o) => s + o.total, 0);
      return {
        totalOrders: orders.length,
        totalRevenue: revenue,
        totalProducts: products.length,
        totalUsers: usersSnap.size,
        pendingOrders: orders.filter(o => o.status === 'Pending' || o.status === 'Awaiting Payment').length,
        lowStock: products.filter(p => p.variants.some(v => v.stock < threshold)).length
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
