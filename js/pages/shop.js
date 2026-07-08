App.ready().then(async () => {
  await Components.initLayout('shop');

  const params = DOM.getQueryParams();
  let filters = {
    categoryId: params.category || '',
    search: params.search || '',
    inStock: false,
    sort: params.sort || ''
  };

  function renderSidebar() {
    const sidebar = DOM.$('#shop-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <h3>Categories</h3>
      <div class="filter-group">
        <label><input type="radio" name="category" value="" ${!filters.categoryId ? 'checked' : ''}> All Products</label>
        ${CONFIG.categories.map(c => `
          <label><input type="radio" name="category" value="${c.id}" ${filters.categoryId === c.id ? 'checked' : ''}> ${c.icon} ${c.name}</label>
        `).join('')}
      </div>
      <h3>Filters</h3>
      <div class="filter-group">
        <label><input type="checkbox" id="filter-stock" ${filters.inStock ? 'checked' : ''}> In Stock Only</label>
      </div>
      <h3>Sort By</h3>
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

    const { data: products } = await API.catalog.getProducts(filters);
    if (count) count.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;

    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state__icon">🔍</div><h3>No products found</h3><p>Try adjusting your filters or search term.</p></div>`;
      return;
    }

    grid.innerHTML = await Components.productCardsHtml(products, { showAdd: true });
  }

  if (params.search) {
    const searchInput = DOM.$('.search-form input');
    if (searchInput) searchInput.value = params.search;
  }

  renderSidebar();
  await renderProducts();
});
