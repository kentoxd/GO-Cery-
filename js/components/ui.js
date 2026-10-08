
const Components = {
  async renderHeader(activePage = '') {
    const user = API.user.getCurrent();
    const admin = API.admin.getCurrent();
    const userId = user?.id || null;
    const cart = await API.cart.getEnriched(userId);
    this._cartCount = cart.itemCount || 0;
    const cutoff = API.delivery.isBeforeCutoff();
    const deliveryDate = API.delivery.getNextDeliveryDate();

    return `
      <div class="top-bar">
        <div class="container top-bar__inner">
          <span class="top-bar__msg">
            ${cutoff
              ? `🕐 Order before 7:30 PM for delivery on ${Format.date(deliveryDate)}`
              : `⏰ Cut-off passed — earliest delivery: ${Format.date(deliveryDate)}`}
          </span>
          <span class="top-bar__promo">Free delivery on orders ${Format.currency(CONFIG.freeDeliveryThreshold)}+</span>
        </div>
      </div>
      <header class="header">
        <div class="container header__inner">
          <a href="${this._root()}index.html" class="header__logo">
            <img src="https://res.cloudinary.com/m0uovtom/image/upload/v1787825182/GOCERY_LOGO.png" width="65" height="55">
          </a>
          <nav class="header__nav" id="main-nav">
            <a href="${this._root()}pages/shop.html" class="${activePage === 'shop' ? 'active' : ''}">Shop</a>
            <a href="${this._root()}pages/faq.html">FAQs</a>
            <a href="${this._root()}pages/about.html">About Us</a>
            <a href="${this._root()}pages/blog.html">Recipes</a>
            <a href="${this._root()}pages/contact.html">Contact</a>
            <a href="${this._root()}pages/reviews.html">Reviews</a>
          </nav>
          <div class="header__actions">
            <form class="search-form" action="${this._root()}pages/shop.html" method="get">
              <input type="search" name="search" placeholder="Search products…" aria-label="Search products">
              <button type="submit" aria-label="Search">🔍</button>
            </form>
            ${user
              ? `<a href="${this._root()}pages/account.html" class="header__account" title="${DOM.escapeHtml(user.name)}">👤 ${DOM.escapeHtml(user.name.split(' ')[0])}</a>`
              : admin
                ? `<a href="${this._root()}pages/admin.html" class="header__account" title="${DOM.escapeHtml(admin.email)}">🛠️ ${DOM.escapeHtml(admin.name || admin.email.split('@')[0])}</a>`
                : `<a href="${this._root()}pages/login.html" class="header__account">Login</a>`}
            ${user ? `<a href="${this._root()}pages/account.html?tab=notifications" class="header__cart header__bell" id="notif-link" aria-label="Notifications" title="Notifications">
              🔔<span class="cart-badge" id="notif-count"></span>
            </a>` : ''}
            <a href="${this._root()}pages/cart.html" class="header__cart" aria-label="Cart">
              🛒<span class="cart-badge" id="cart-count">${cart.itemCount || ''}</span>
            </a>
            <button class="header__menu-btn" id="menu-toggle" aria-label="Toggle menu">☰</button>
          </div>
        </div>
      </header>`;
  },

  renderFooter() {
    return `
      <footer class="footer">
        <div class="container footer__grid">
          <div class="footer__brand">
            <h3>${CONFIG.appName}</h3>
            <p>Palengke-fresh produce, seafood, and meat delivered to your doorstep in Metro Manila & Rizal.</p>
            <div class="trust-badges">
              <span class="badge">Palengke-Fresh Guarantee</span>
              <span class="badge">Next-Day Delivery</span>
              <span class="badge">Trusted by 5,000+ Sukis</span>
            </div>
          </div>
          <div class="footer__links">
            <h4>Shop</h4>
            <a href="${this._root()}pages/shop.html">All Products</a>
            <a href="${this._root()}pages/shop.html?category=fruits">Fruits</a>
            <a href="${this._root()}pages/shop.html?category=vegetables">Vegetables</a>
            <a href="${this._root()}pages/shop.html?category=seafood">Seafood</a>
            <a href="${this._root()}pages/shop.html?category=meat">Meat</a>
          </div>
          <div class="footer__links">
            <h4>Help</h4>
            <a href="${this._root()}pages/faq.html">FAQs</a>
            <a href="${this._root()}pages/about.html">About Us</a>
            <a href="${this._root()}pages/blog.html">Recipes</a>
            <a href="${this._root()}pages/contact.html">Contact</a>
            <a href="${this._root()}pages/reviews.html">Reviews</a>
          </div>
          <div class="footer__newsletter">
            <h4>Suki Newsletter</h4>
            <p>Get recipes, promos & freshness tips.</p>
            <form class="newsletter-form" id="newsletter-form">
              <input type="email" placeholder="Your email" required aria-label="Email for newsletter">
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>
        <div class="footer__bottom">
          <div class="container">
            <p>&copy; 2026 ${CONFIG.appName}. All rights reserved.</p>
          </div>
        </div>
      </footer>`;
  },

  productCard(product, options = {}) {
    const minPrice = Math.min(...product.variants.map(v => v.price));
    const maxPrice = Math.max(...product.variants.map(v => v.price));
    const inStock = product.variants.some(v => v.stock > 0);
    const totalStock = product.variants.reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0);
    const lowStock = totalStock > 0 && totalStock <= 10;
    const rating = options.rating || 0;
    const wishlisted = options.wishlisted || false;
    const priceDisplay = minPrice === maxPrice
      ? Format.currency(minPrice)
      : `${Format.currency(minPrice)} – ${Format.currency(maxPrice)}`;
    const user = API.user.getCurrent();

    return `
      <article class="product-card ${!inStock ? 'product-card--sold-out' : ''}" data-id="${product.id}">
        <a href="${this._root()}pages/product.html?id=${product.id}" class="product-card__image">
          ${product.imageUrl
          ? `<img src="${DOM.escapeHtml(product.imageUrl)}" alt="${DOM.escapeHtml(product.name)}" loading="lazy" class="product-card__photo" style="width:100%;height:100%;object-fit:cover" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-emoji" hidden>${product.image}</span>`
          : `<span class="product-emoji">${product.image}</span>`}
          ${product.featured ? '<span class="product-card__badge">Suki Pick</span>' : ''}
          ${!inStock ? '<span class="product-card__badge product-card__badge--sold">Sold Out</span>' : ''}
          ${inStock && lowStock ? `<span class="product-card__badge product-card__badge--low">Only ${totalStock} left</span>` : ''}
        </a>
        <div class="product-card__body">
          <h3 class="product-card__title">
            <a href="${this._root()}pages/product.html?id=${product.id}">${DOM.escapeHtml(product.name)}</a>
          </h3>
          ${rating > 0 ? `<div class="product-card__rating">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))} <small>(${rating.toFixed(1)})</small></div>` : ''}
          <p class="product-card__price">${priceDisplay}</p>
          <div class="product-card__actions">
            ${inStock && options.showAdd
              ? `<div class="qty-stepper qty-stepper--sm">
                   <button type="button" class="card-qty-minus">−</button>
                   <span class="card-qty-value">1</span>
                   <button type="button" class="card-qty-plus">+</button>
                 </div>
                 <button class="btn btn--primary btn--sm add-to-cart-btn" data-id="${product.id}" data-variant="${product.variants[0].id}">Add to Cart</button>`
              : ''}
            ${user ? `<button class="btn btn--ghost btn--sm wishlist-btn ${wishlisted ? 'active' : ''}" data-id="${product.id}" title="Wishlist">${wishlisted ? '❤️' : '🤍'}</button>` : ''}
          </div>
        </div>
      </article>`;
  },

  async productCardsHtml(products, options = {}) {
    const user = API.user.getCurrent();
    const wishlist = user ? await API.wishlist.get(user.id) : [];
    const ratings = await API.reviews.getAverageRatings();
    return products.map(p => this.productCard(p, {
      ...options,
      rating: ratings[p.id] || 0,
      wishlisted: wishlist.includes(p.id)
    })).join('');
  },

  toast(message, type = 'success') {
    let container = DOM.$('#toast-container');
    if (!container) {
      container = DOM.create('div', { id: 'toast-container', className: 'toast-container' });
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    const toast = DOM.create('div', { className: `toast toast--${type}`, textContent: message });
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  setCartBadge(count) {
    const badge = DOM.$('#cart-count');
    if (badge) {
      badge.textContent = count || '';
      badge.style.display = count ? 'flex' : 'none';
    }
  },

  async updateCartBadge() {
    const user = API.user.getCurrent();
    const cart = await API.cart.get(user?.id || null);
    this._cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    this.setCartBadge(this._cartCount);
  },

  // Counts order status updates the user has not looked at yet and shows it on the bell.
  async updateNotifBadge() {
    const user = API.user.getCurrent();
    const badge = DOM.$('#notif-count');
    if (!user || !badge) return;
    try {
      const { data: orders } = await API.order.getAll({ userId: user.id });
      const lastSeen = Storage.get(`gocery_notif_seen_${user.id}`, null);
      const unread = orders.reduce((total, o) => total + (o.statusHistory || []).filter(h =>
        !lastSeen || new Date(h.timestamp) > new Date(lastSeen)).length, 0);
      badge.textContent = unread > 9 ? '9+' : (unread || '');
      badge.style.display = unread ? 'flex' : 'none';
    } catch (e) {
      badge.style.display = 'none';
    }
  },

  // Header/footer are re-rendered on every initLayout, so their listeners are re-bound each time.
  bindLayoutEvents() {
    const menuToggle = DOM.$('#menu-toggle');
    const nav = DOM.$('#main-nav');
    if (menuToggle && nav) {
      menuToggle.addEventListener('click', () => nav.classList.toggle('nav--open'));
    }

    const newsletter = DOM.$('#newsletter-form');
    if (newsletter) {
      newsletter.addEventListener('submit', e => {
        e.preventDefault();
        Components.toast('Thanks for subscribing, Suki!');
        newsletter.reset();
      });
    }

  },

  // Document-level listeners must only be added once, or one click would run the handler several times.
  bindGlobalEvents() {
    this.bindLayoutEvents();
    if (this._globalBound) return;
    this._globalBound = true;
    document.addEventListener('click', async e => {
      const qtyMinus = e.target.closest('.card-qty-minus');
      const qtyPlus = e.target.closest('.card-qty-plus');
      if (qtyMinus || qtyPlus) {
        const stepper = (qtyMinus || qtyPlus).closest('.qty-stepper');
        const valueEl = stepper?.querySelector('.card-qty-value');
        if (valueEl) {
          let qty = parseInt(valueEl.textContent, 10) || 1;
          qty = qtyPlus ? qty + 1 : Math.max(1, qty - 1);
          valueEl.textContent = qty;
        }
        return;
      }
      if (e.target.closest('.add-to-cart-btn')) {
        const btn = e.target.closest('.add-to-cart-btn');
        const card = btn.closest('.product-card');
        const qtyEl = card?.querySelector('.card-qty-value');
        const qty = qtyEl ? (parseInt(qtyEl.textContent, 10) || 1) : 1;
        const user = API.user.getCurrent();
        await API.cart.add(user?.id || null, btn.dataset.id, btn.dataset.variant, qty);
        const productName = card?.querySelector('.product-card__title')?.textContent.trim() || 'Item';
        Components.toast(`Added ${qty}x ${productName} to your cart!`);
        Components.updateCartBadge();
        if (qtyEl) qtyEl.textContent = '1';
      }
      if (e.target.closest('.wishlist-btn')) {
        const btn = e.target.closest('.wishlist-btn');
        const user = API.user.getCurrent();
        if (!user) { window.location.href = Components._root() + 'pages/login.html'; return; }
        await API.wishlist.toggle(user.id, btn.dataset.id);
        btn.classList.toggle('active');
        btn.textContent = btn.classList.contains('active') ? '❤️' : '🤍';
        Components.toast('Wishlist updated');
      }
    });

    document.addEventListener('gocery:cart:updated', () => Components.updateCartBadge());
    document.addEventListener('gocery:auth:changed', () => this.initLayout(this._activePage));
  },

  _activePage: '',
  _globalBound: false,
  _cartCount: 0,

  _root() {
    const path = window.location.pathname;
    if (path.includes('/pages/')) return '../';
    return '';
  },

  _categoryName(id) {
    const cat = CONFIG.categories.find(c => c.id === id);
    return cat ? `${cat.icon} ${cat.name}` : id;
  },

  async initLayout(activePage = '') {
    this._activePage = activePage;
    const headerEl = DOM.$('#site-header');
    const footerEl = DOM.$('#site-footer');
    if (headerEl) headerEl.innerHTML = await this.renderHeader(activePage);
    if (footerEl) footerEl.innerHTML = this.renderFooter();
    this.bindGlobalEvents();
    this.setCartBadge(this._cartCount || 0);
    this.updateNotifBadge();
  }
};
