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
            <div class="form-group"><label>Email</label><input type="email" name="email" value="admin@gocery.ph" required></div>
            <div class="form-group"><label>Password</label><input type="password" name="password" value="admin123" required></div>
            <p class="form-error" id="admin-error"></p>
            <button type="submit" class="btn btn--primary">Login</button>
          </form>
          <p class="auth-switch"><a href="../index.html">← Back to Store</a></p>
        </div>
      </div>`;
    DOM.$('#admin-login-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const result = await API.admin.login(fd.get('email'), fd.get('password'));
      if (result.success) window.location.href = 'admin.html';
      else DOM.$('#admin-error').textContent = result.error;
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
    const { data: products } = await API.catalog.getProducts();
    renderLayout(`
      <div class="admin-header"><h1>Products</h1><button class="btn btn--primary btn--sm" id="add-product">+ Add Product</button></div>
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Category</th><th>Price Range</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${products.map(p => {
          const minP = Math.min(...p.variants.map(v => v.price));
          const maxP = Math.max(...p.variants.map(v => v.price));
          const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
          const cat = CONFIG.categories.find(c => c.id === p.categoryId);
          return `<tr>
            <td>${p.image} ${DOM.escapeHtml(p.name)}</td>
            <td>${cat?.name || p.categoryId}</td>
            <td>${minP === maxP ? Format.currency(minP) : Format.currency(minP) + ' – ' + Format.currency(maxP)}</td>
            <td>${totalStock}</td>
            <td>${totalStock > 0 ? '✅ Active' : '❌ Out of Stock'}</td>
            <td><button class="btn btn--outline btn--sm edit-stock" data-id="${p.id}">Edit Stock</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`);

    DOM.$('#add-product')?.addEventListener('click', async () => {
      const name = prompt('Product name:');
      if (!name) return;
      await API.catalog.createProduct({
        name, categoryId: 'vegetables', description: 'New product', origin: 'Local',
        image: '🥬', featured: false, tags: [],
        variants: [{ id: 'v' + Date.now(), unit: 'kg', price: 100, stock: 50 }]
      });
      await API.admin.logAction('CREATE_PRODUCT', { name });
      window.location.reload();
    });

    DOM.$$('.edit-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const product = (await API.catalog.getProduct(btn.dataset.id)).data;
        for (const v of product.variants) {
          const newStock = prompt(`Stock for ${product.name} (${v.unit}):`, v.stock);
          if (newStock !== null) await API.inventory.updateStock(product.id, v.id, parseInt(newStock) || 0);
        }
        await API.admin.logAction('UPDATE_STOCK', { productId: product.id });
        window.location.reload();
      });
    });
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
