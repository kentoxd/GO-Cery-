App.ready().then(async () => {
  const admin = API.admin.getCurrent();
  const params = DOM.getQueryParams();
  let view = params.view || 'dashboard';

  if (!admin && view !== 'login') {
    window.location.href = 'admin.html?view=login';
    return;
  }

  if (view === 'login') {
    document.body.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <h1>🛒 Admin Panel</h1>
          <p>${CONFIG.appName} Back Office</p>
            <form id="admin-login-form">
              <div class="form-group"><label>Email</label><input type="email" name="email" required autocomplete="username"></div>
              <div class="form-group"><label>Password</label><input type="password" name="password" required autocomplete="current-password"></div>
              <p class="form-error" id="admin-error"></p>
              <button type="submit" class="btn btn--primary">Login</button>
            </form>
            <div class="auth-divider">or continue with</div>
            <button type="button" class="btn btn--google" id="admin-google-login" aria-label="Sign in with Google">
              Continue with Google
            </button>
            <p class="auth-switch"><a href="../index.html">← Back to Store</a></p>
        </div>
      </div>`;
      DOM.$('#admin-google-login').addEventListener('click', async () => {
      const errorEl = DOM.$('#admin-error');
      errorEl.textContent = '';
      const result = await API.admin.loginWithGoogle();
      if (result.success) window.location.href = 'admin.html';
      else errorEl.textContent = result.error;
    });
    return;
  }

  function renderLayout(content) {
    document.body.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="admin-sidebar__brand">🛒 ${CONFIG.appName}<br><small style="font-weight:400;opacity:.7">Admin Panel</small></div>
          <nav class="admin-nav">
            <a href="?view=dashboard" class="${view === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
            <a href="?view=orders" class="${view === 'orders' ? 'active' : ''}">📦 Orders</a>
            <a href="?view=products" class="${view === 'products' ? 'active' : ''}">🥬 Products</a>
            <a href="?view=inventory" class="${view === 'inventory' ? 'active' : ''}">📋 Inventory</a>
            <a href="?view=users" class="${view === 'users' ? 'active' : ''}">👥 Customers</a>
            <a href="?view=audit" class="${view === 'audit' ? 'active' : ''}">📝 Audit Log</a>
            <a href="#" id="admin-logout">🚪 Logout</a>
            <a href="../index.html">🏠 View Store</a>
          </nav>
        </aside>
        <main class="admin-main">${content}</main>
      </div>`;
    DOM.$('#admin-logout').addEventListener('click', async e => {
      e.preventDefault();
      await API.admin.logout();
      window.location.href = 'admin.html?view=login';
    });
  }

  function renderOrdersTable(orders, compact) {
    if (!orders.length) return '<p style="color:var(--color-text-muted)">No orders yet.</p>';
    return `<table class="admin-table">
      <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th>${compact ? '' : '<th>Update Status</th>'}</tr></thead>
      <tbody>${orders.map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${DOM.escapeHtml(o.userName || 'Guest')}</td>
          <td>${Format.currency(o.total)}</td>
          <td><span class="order-status order-status--${o.status.replace(/ /g, '\\ ')}">${o.status}</span></td>
          ${compact ? '' : `<td><select class="status-select" data-id="${o.id}">
            ${CONFIG.orderStatuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select></td>`}
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  function bindOrderActions() {
    DOM.$$('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        await API.order.updateStatus(sel.dataset.id, sel.value);
        await API.admin.logAction('UPDATE_ORDER_STATUS', { orderId: sel.dataset.id, status: sel.value });
        Components.toast('Order status updated');
      });
    });
  }

  if (view === 'dashboard') {
    const stats = await API.admin.getStats();
    const { data: recentOrders } = await API.order.getAll();
    renderLayout(`
      <div class="admin-header"><h1>Dashboard</h1><span>Welcome, ${DOM.escapeHtml(admin.name)}</span></div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-card__value">${stats.totalOrders}</div><div class="stat-card__label">Total Orders</div></div>
        <div class="stat-card"><div class="stat-card__value">${Format.currency(stats.totalRevenue)}</div><div class="stat-card__label">Revenue</div></div>
        <div class="stat-card"><div class="stat-card__value">${stats.pendingOrders}</div><div class="stat-card__label">Pending Orders</div></div>
        <div class="stat-card"><div class="stat-card__value">${stats.totalProducts}</div><div class="stat-card__label">Products</div></div>
        <div class="stat-card"><div class="stat-card__value">${stats.totalUsers}</div><div class="stat-card__label">Customers</div></div>
        <div class="stat-card"><div class="stat-card__value">${stats.lowStock}</div><div class="stat-card__label">Low Stock Items</div></div>
      </div>
      <h2>Recent Orders</h2>
      ${renderOrdersTable(recentOrders.slice(0, 5), true)}`);
    bindOrderActions();
  }

  if (view === 'orders') {
    const { data: orders } = await API.order.getAll();
    renderLayout(`
      <div class="admin-header"><h1>Order Management</h1></div>
      ${renderOrdersTable(orders)}`);
    bindOrderActions();
  }

if (view === 'products') {
    const { data: allProducts } = await API.catalog.getProducts();
    let filters = { search: '', categoryId: '', status: '' };

    function applyFilters() {
      return allProducts.filter(p => {
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        const status = totalStock > 0 ? 'active' : 'out_of_stock';
        if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
        if (filters.status && status !== filters.status) return false;
        return true;
      });
    }

    function renderProductsTable() {
      const products = applyFilters();
      const tbody = DOM.$('#products-table-body');
      if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted)">No products match your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = products.map(p => {
        const minP = Math.min(...p.variants.map(v => v.price));
        const maxP = Math.max(...p.variants.map(v => v.price));
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        const cat = CONFIG.categories.find(c => c.id === p.categoryId);
        const thumb = p.imageUrl
          ? `<img src="${DOM.escapeHtml(p.imageUrl)}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:0.5rem" onerror="this.style.display='none'">`
          : `<span style="margin-right:0.5rem">${p.image}</span>`;
        return `<tr>
          <td>${thumb}${DOM.escapeHtml(p.name)}</td>
          <td>${cat?.name || p.categoryId}</td>
          <td>${minP === maxP ? Format.currency(minP) : Format.currency(minP) + ' – ' + Format.currency(maxP)}</td>
          <td>${totalStock}</td>
          <td>${totalStock > 0 ? '✅ Active' : '❌ Out of Stock'}</td>
          <td>
            <button class="btn btn--outline btn--sm edit-product" data-id="${p.id}">Edit</button>
            <button class="btn btn--outline btn--sm delete-product" data-id="${p.id}">Delete</button>
          </td>
        </tr>`;
      }).join('');

      DOM.$$('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => openProductEditor(allProducts.find(p => p.id === btn.dataset.id)));
      });
      DOM.$$('.delete-product').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this product? This cannot be undone.')) return;
          await API.catalog.deleteProduct(btn.dataset.id);
          await API.admin.logAction('DELETE_PRODUCT', { productId: btn.dataset.id });
          window.location.reload();
        });
      });
    }

    function openProductEditor(product) {
      const isNew = !product;
      const p = product || { name: '', categoryId: CONFIG.categories[0].id, description: '', origin: '', image: '🥬', imageUrl: '', variants: [{ id: 'v' + Date.now(), unit: 'kg', price: 100, stock: 50 }] };

      DOM.$('#product-editor').innerHTML = `
        <h2>${isNew ? 'Add Product' : 'Edit Product'}</h2>
        <div class="form-group"><label>Name</label><input id="pe-name" value="${DOM.escapeHtml(p.name)}"></div>
        <div class="form-group"><label>Category</label>
          <select id="pe-category">${CONFIG.categories.map(c => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Description</label><textarea id="pe-description" rows="2">${DOM.escapeHtml(p.description || '')}</textarea></div>
        <div class="form-group"><label>Origin</label><input id="pe-origin" value="${DOM.escapeHtml(p.origin || '')}"></div>
        <div class="form-group"><label>Photo URL (optional — leave blank to keep the emoji icon)</label>
          <input id="pe-image-url" placeholder="https://..." value="${DOM.escapeHtml(p.imageUrl || '')}">
        </div>
        <div class="form-group"><label>Emoji icon (used if no photo URL is set)</label><input id="pe-emoji" maxlength="4" value="${DOM.escapeHtml(p.image || '')}"></div>
        <h3 style="margin-top:1rem">Variants (price & stock per unit)</h3>
        <table class="admin-table" id="pe-variants-table">
          <thead><tr><th>Unit</th><th>Price (₱)</th><th>Stock</th></tr></thead>
          <tbody>${p.variants.map(v => `
            <tr data-vid="${v.id}">
              <td><input class="pe-v-unit" value="${DOM.escapeHtml(v.unit)}" style="width:80px"></td>
              <td><input class="pe-v-price" type="number" step="0.01" value="${v.price}" style="width:100px"></td>
              <td><input class="pe-v-stock" type="number" value="${v.stock}" style="width:80px"></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <p class="form-error" id="pe-error"></p>
        <div class="modal-actions" style="margin-top:1rem;display:flex;gap:0.5rem">
          <button class="btn btn--primary" id="pe-save">Save</button>
          <button class="btn btn--outline" id="pe-cancel">Cancel</button>
        </div>`;
      DOM.$('#product-editor').hidden = false;
      DOM.$('#product-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });

      DOM.$('#pe-cancel').addEventListener('click', () => { DOM.$('#product-editor').hidden = true; });

      DOM.$('#pe-save').addEventListener('click', async () => {
        const errorEl = DOM.$('#pe-error');
        const name = DOM.$('#pe-name').value.trim();
        if (!name) { errorEl.textContent = 'Name is required.'; return; }

        const variants = DOM.$$('#pe-variants-table tbody tr').map(row => ({
          id: row.dataset.vid,
          unit: row.querySelector('.pe-v-unit').value.trim(),
          price: Math.round(parseFloat(row.querySelector('.pe-v-price').value) || 0),
          stock: parseInt(row.querySelector('.pe-v-stock').value, 10) || 0
        }));
        if (!variants.length || variants.some(v => !v.unit)) { errorEl.textContent = 'Every variant needs a unit.'; return; }

        const payload = {
          name,
          categoryId: DOM.$('#pe-category').value,
          description: DOM.$('#pe-description').value.trim(),
          origin: DOM.$('#pe-origin').value.trim(),
          imageUrl: DOM.$('#pe-image-url').value.trim(),
          image: DOM.$('#pe-emoji').value.trim() || '🥬',
          variants
        };

        try {
          if (isNew) {
            await API.catalog.createProduct(payload);
            await API.admin.logAction('CREATE_PRODUCT', { name });
          } else {
            await API.catalog.updateProduct(product.id, payload);
            await API.admin.logAction('UPDATE_PRODUCT', { productId: product.id, name });
          }
          window.location.reload();
        } catch (err) {
          errorEl.textContent = err.message || 'Could not save product.';
        }
      });
    }

    renderLayout(`
      <div class="admin-header"><h1>Products</h1><button class="btn btn--primary btn--sm" id="add-product">+ Add Product</button></div>
      <div class="admin-filters" style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap">
        <input id="filter-search" placeholder="Search products..." style="flex:1;min-width:180px;padding:0.5rem">
        <select id="filter-category" style="padding:0.5rem">
          <option value="">All Categories</option>
          ${CONFIG.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <select id="filter-status" style="padding:0.5rem">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Category</th><th>Price Range</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="products-table-body"></tbody>
      </table>
      <div id="product-editor" class="admin-form" hidden></div>`);

    DOM.$('#filter-search').addEventListener('input', e => { filters.search = e.target.value; renderProductsTable(); });
    DOM.$('#filter-category').addEventListener('change', e => { filters.categoryId = e.target.value; renderProductsTable(); });
    DOM.$('#filter-status').addEventListener('change', e => { filters.status = e.target.value; renderProductsTable(); });
    DOM.$('#add-product').addEventListener('click', () => openProductEditor(null));

    renderProductsTable();
  }

  if (view === 'inventory') {
    const { data: products } = await API.catalog.getProducts();
    renderLayout(`
      <div class="admin-header"><h1>Inventory</h1></div>
      <h2 style="margin-bottom:1rem">Low Stock Alerts</h2>
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Unit</th><th>Stock</th><th>Action</th></tr></thead>
        <tbody>${products.flatMap(p => p.variants.filter(v => v.stock < 20).map(v => `
          <tr style="${v.stock < 10 ? 'background:#fef2f2' : ''}">
            <td>${p.image} ${DOM.escapeHtml(p.name)}</td>
            <td>${v.unit}</td>
            <td>${v.stock}</td>
            <td><button class="btn btn--outline btn--sm restock-btn" data-pid="${p.id}" data-vid="${v.id}" data-stock="${v.stock}">Restock</button></td>
          </tr>
        `)).join('')}</tbody>
      </table>`);

    DOM.$$('.restock-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStock = prompt('New stock level:', btn.dataset.stock);
        if (newStock !== null) {
          await API.inventory.updateStock(btn.dataset.pid, btn.dataset.vid, parseInt(newStock) || 0);
          await API.admin.logAction('RESTOCK', { productId: btn.dataset.pid });
          window.location.reload();
        }
      });
    });
  }

  if (view === 'users') {
    const users = await API.user.getAll();
    renderLayout(`
      <div class="admin-header"><h1>Customers</h1><span>${users.length} registered</span></div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th></tr></thead>
        <tbody>${(await Promise.all(users.map(async u => {
          const { data: userOrders } = await API.order.getAll({ userId: u.id });
          return `<tr><td>${DOM.escapeHtml(u.name)}</td><td>${DOM.escapeHtml(u.email)}</td><td>${DOM.escapeHtml(u.phone || '—')}</td><td>${Format.date(u.createdAt)}</td><td>${userOrders.length}</td></tr>`;
        }))).join('')}</tbody>
      </table>`);
  }

  if (view === 'audit') {
    const snap = await FirebaseApp.collections.auditLogs().orderBy('timestamp', 'desc').limit(50).get();
    const logs = snap.docs.map(d => d.data());
    renderLayout(`
      <div class="admin-header"><h1>Audit Trail</h1></div>
      <table class="admin-table">
        <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>${logs.length ? logs.map(l => `
          <tr><td>${Format.dateTime(l.timestamp)}</td><td>${l.admin || '—'}</td><td>${l.action}</td><td>${JSON.stringify(l.details)}</td></tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted)">No audit logs yet</td></tr>'}</tbody>
      </table>`);
  }
});
