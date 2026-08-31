/**
 * Firebase initialization, seeding, and auth state
 */
const FirebaseApp = {
  db: null,
  auth: null,
  _initPromise: null,

  init() {
    if (!this._initPromise) {
      this._initPromise = this._doInit();
    }
    return this._initPromise;
  },

  async _doInit() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded. Add Firebase CDN scripts before firebase.js');
    }
    if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.warn('[Go! Cery] Firebase not configured. Copy js/config.firebase.example.js → js/config.firebase.js');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    this.db = firebase.firestore();
    this.auth = firebase.auth();

    await this._listenAuth();

    return { db: this.db, auth: this.auth };
  },

  async _seedIfNeeded() {
    const metaRef = this.db.collection('meta').doc('app');
    const meta = await metaRef.get();
    if (meta.exists && meta.data().seeded) return;

    let adminUid = null;
    try {
      const cred = await this.auth.createUserWithEmailAndPassword('admin@gocery.ph', 'admin123');
      adminUid = cred.user.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const cred = await this.auth.signInWithEmailAndPassword('admin@gocery.ph', 'admin123');
        adminUid = cred.user.uid;
        await this.auth.signOut();
      } else {
        console.warn('Admin seed:', e.message);
      }
    }

    const batch = this.db.batch();

    SeedData.products.forEach(p => {
      batch.set(this.db.collection('products').doc(p.id), p);
    });

    SeedData.reviews.forEach(r => {
      batch.set(this.db.collection('reviews').doc(r.id), r);
    });

    batch.set(this.db.collection('cms').doc('main'), SeedData.cms);

    if (adminUid) {
      batch.set(this.db.collection('admins').doc(adminUid), {
        email: 'admin@gocery.ph',
        name: 'Super Admin',
        role: 'super_admin'
      });
    }

    batch.set(metaRef, {
      seeded: true,
      seededAt: new Date().toISOString(),
      version: 1
    });

    await batch.commit();
  },

  _listenAuth() {
    return new Promise(resolve => {
      this.auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          const adminDoc = await this.db.collection('admins').doc(firebaseUser.uid).get();

          if (adminDoc.exists) {
            const adminData = adminDoc.data();
            API.admin._current = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: adminData.name,
              role: adminData.role
            };
            API.user._current = null;
          } else {
            const profileDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
            API.admin._current = null;
            API.user._current = profileDoc.exists
              ? { id: firebaseUser.uid, email: firebaseUser.email, ...profileDoc.data() }
              : { id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || '', addresses: [] };
          }
        } else {
          API.user._current = null;
          API.admin._current = null;
        }

        document.dispatchEvent(new CustomEvent('gocery:auth:changed'));
        resolve();
      });
    });
  },

  collections: {
    products: () => FirebaseApp.db.collection('products'),
    orders: () => FirebaseApp.db.collection('orders'),
    users: () => FirebaseApp.db.collection('users'),
    carts: () => FirebaseApp.db.collection('carts'),
    reviews: () => FirebaseApp.db.collection('reviews'),
    loyalty: () => FirebaseApp.db.collection('loyalty'),
    cms: () => FirebaseApp.db.collection('cms'),
    admins: () => FirebaseApp.db.collection('admins'),
    auditLogs: () => FirebaseApp.db.collection('auditLogs'),
    wishlists: () => FirebaseApp.db.collection('wishlists')
  }
};
