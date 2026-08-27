App.ready().then(async () => {
  await Components.initLayout('home');

  const hero = await API.cms.getHero();
  const heroTitleEl = DOM.$('#hero-title');
  const heroSubtitleEl = DOM.$('#hero-subtitle');
  if (heroTitleEl) heroTitleEl.textContent = hero.heroTitle;
  if (heroSubtitleEl) heroSubtitleEl.textContent = hero.heroSubtitle;

  const banners = await API.cms.getBanners();
  const promoEl = DOM.$('#promo-strip');
  if (promoEl) {
    promoEl.innerHTML = banners.map(b => `
      <div class="promo-card">
        <h3>${DOM.escapeHtml(b.title)}</h3>
        <p>${DOM.escapeHtml(b.subtitle)}</p>
        <a href="${b.link}" class="btn btn--accent btn--sm">${DOM.escapeHtml(b.cta)}</a>
      </div>
    `).join('');
  }

  const catEl = DOM.$('#categories-grid');
  if (catEl) {
    catEl.innerHTML = CONFIG.categories.map(c => `
      <a href="pages/shop.html?category=${c.id}" class="category-card">
        <img  src="${c.icon}"  alt="${DOM.escapeHtml(c.name)}" class="category-card__icon">
        <span class="category-card__name">${DOM.escapeHtml(c.name)}</span>
      </a>
    `).join('');
  }


  const featuredEl = DOM.$('#featured-products');
  if (featuredEl) {
    const { data: products } = await API.catalog.getProducts({ featured: true });
    featuredEl.innerHTML = await Components.productCardsHtml(products.slice(0, 8), { showAdd: true });
  }

  const trendingEl = DOM.$('#trending-products');
  if (trendingEl) {
    const { data: products } = await API.catalog.getProducts({ sort: 'name' });
    trendingEl.innerHTML = await Components.productCardsHtml(products.slice(0, 4), { showAdd: true });
  }
});
