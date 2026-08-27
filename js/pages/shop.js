App.ready().then(async () => {
  await Components.initLayout('shop');

  const params = DOM.getQueryParams();
  let filters = {
    categoryId: params.category || '',
    search: params.search || '',
    inStock: false,
    sort: params.sort || ''
  };
  const categoryGroups = [
    { title: 'Fresh Produce', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542473178553786388/image_34.png?ex=6a915b97&is=6a900a17&hm=23dfe2a9834f329d72c93338daa19b72b9e9e0521ed8b1e6ab6718f55744c79b&', className: 'produce', categories: ['fruits', 'vegetables', 'herbs-spices'] },
    { title: 'Meat, Seafood & Eggs', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542473177920180284/image_35.png?ex=6a915b97&is=6a900a17&hm=0b4581643e68c13093cbc59625832e5861e8a2e2ba1d3ddfdaf1b500fff946a8&', className: 'protein', categories: ['seafood', 'meat', 'eggs-dairy'] },
    { title: 'Pantry Staples', icon: 'https://cdn.discordapp.com/attachments/1488093221014994986/1542473177245028472/image_36.png?ex=6a915b97&is=6a900a17&hm=e35590fda02c4daf00a4f1b90c3fd6013cbfb1ee79e18a02a6d6c0aa0346980e&', className: 'pantry', categories: ['rice-grains', 'deli', 'essentials'] }
  ];
  const initialGroup = categoryGroups.find(group => group.categories.includes(filters.categoryId));
  if (initialGroup) filters.categoryId = initialGroup.className;
  const bannerContent = {
    all: { eyebrow: 'Palengke-fresh picks', title: 'Shop Daily', subtitle: 'Fresh choices delivered to your doorstep.' },
    produce: { eyebrow: 'Fresh from the market', title: 'Fresh Produce', subtitle: 'Fruits, vegetables, and herbs for every meal.' },
    protein: { eyebrow: 'Quality market favorites', title: 'Meat, Seafood & Eggs', subtitle: 'Fresh protein delivered to your doorstep.' },
    pantry: { eyebrow: 'Stock your kitchen', title: 'Pantry Staples', subtitle: 'Everyday essentials for your home.' }
  };

  function renderBanner() {
    const banner = DOM.$('#shop-banner');
    if (!banner) return;
    const theme = bannerContent[filters.categoryId] || bannerContent.all;
    const groupName = categoryGroups.some(group => group.className === filters.categoryId) ? filters.categoryId : 'all';
    banner.className = `shop-banner shop-banner--${groupName}`;
    DOM.$('#shop-banner-eyebrow').textContent = theme.eyebrow;
    DOM.$('#shop-banner-title').textContent = theme.title;
    DOM.$('#shop-banner-subtitle').textContent = theme.subtitle;
  }

  function renderSidebar() {
    const sidebar = DOM.$('#shop-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="shop-category-list">
        ${categoryGroups.map(group => `
          <label class="shop-category-card shop-category-card--${group.className}">
            <input type="radio" name="category" value="${group.className}" ${filters.categoryId === group.className ? 'checked' : ''}>
            <div class="shop-category-card__header">
              <span class="shop-category-card__icon"><img src="${group.icon}" alt=""></span>
              <strong>${group.title}</strong>
            </div>
            <div class="shop-category-card__items">
              ${group.categories.map(categoryId => `<span>• ${CONFIG.categories.find(category => category.id === categoryId)?.name || categoryId}</span>`).join('')}
            </div>
          </label>
        `).join('')}
      </div>
      <label class="shop-all-products"><input type="radio" name="category" value="" ${!filters.categoryId ? 'checked' : ''}> All Products</label>
      <h3 class="shop-sidebar__heading">Filters</h3>
      <div class="filter-group">
        <label><input type="checkbox" id="filter-stock" ${filters.inStock ? 'checked' : ''}> In Stock Only</label>
      </div>
      <h3 class="shop-sidebar__heading">Sort By</h3>
      <div class="filter-group">
        <select id="sort-select">
          <option value="">Default</option>
          <option value="name" ${filters.sort === 'name' ? 'selected' : ''}>Name A–Z</option>
          <option value="price-asc" ${filters.sort === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-desc" ${filters.sort === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
        </select>
      </div>`;

    DOM.$$('input[name="category"]', sidebar).forEach(r => {
      r.addEventListener('change', () => {
        filters.categoryId = r.value;
        DOM.setQueryParams({ category: r.value || null, search: filters.search || null });
        renderBanner();
        renderProducts();
      });
    });

    DOM.$('#filter-stock', sidebar)?.addEventListener('change', e => {
      filters.inStock = e.target.checked;
      renderProducts();
    });

    DOM.$('#sort-select', sidebar)?.addEventListener('change', e => {
      filters.sort = e.target.value;
      renderProducts();
    });
  }

  async function renderProducts() {
    const grid = DOM.$('#products-grid');
    const count = DOM.$('#product-count');
    if (!grid) return;

    const { data: allProducts } = await API.catalog.getProducts({ ...filters, categoryId: '' });
    const selectedGroup = categoryGroups.find(group => group.className === filters.categoryId);
    const products = selectedGroup
      ? allProducts.filter(product => selectedGroup.categories.includes(product.categoryId))
      : allProducts;
    if (count) count.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;

    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state__icon">🔍</div><h3>No products found</h3><p>Try adjusting your filters or search term.</p></div>`;
      return;
    }

    const visibleCategories = selectedGroup
      ? selectedGroup.categories
      : categoryGroups.flatMap(group => group.categories);
    const productSections = await Promise.all(visibleCategories.map(async categoryId => {
      const categoryProducts = products.filter(product => product.categoryId === categoryId);
      if (!categoryProducts.length) return '';
      const category = CONFIG.categories.find(item => item.id === categoryId);
      return `<section class="shop-product-group">
        <h2 class="shop-product-group__title">${DOM.escapeHtml(category?.name || categoryId)}</h2>
        <div class="grid grid--3">${await Components.productCardsHtml(categoryProducts, { showAdd: true })}</div>
      </section>`;
    }));
    grid.innerHTML = productSections.join('');
  }

  if (params.search) {
    const searchInput = DOM.$('.search-form input');
    if (searchInput) searchInput.value = params.search;
  }

  renderSidebar();
  renderBanner();
  await renderProducts();
});
