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
            <a href="?view=content" class="${view === 'content' ? 'active' : ''}">📝 Site Content</a>
            <a href="?view=recipes" class="${view === 'recipes' ? 'active' : ''}">🍳 Recipes</a>
            <a href="?view=reviews" class="${view === 'reviews' ? 'active' : ''}">⭐ Reviews</a>
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

  function renderSearchBar(id, placeholder) {
    return `<div class="admin-filters" style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap">
      <input id="${id}" type="search" placeholder="${placeholder}" aria-label="${placeholder}" style="flex:1;min-width:180px;padding:0.5rem">
    </div>`;
  }

  function bindTableSearch(inputId, tableId, emptyMessage, additionalMatch = () => true) {
    const input = DOM.$(`#${inputId}`);
    const table = DOM.$(`#${tableId}`);
    if (!input || !table) return () => {};

    const applyFilter = () => {
      const query = input.value.trim().toLowerCase();
      const rows = DOM.$$('tbody tr', table);
      let visibleRows = 0;
      rows.forEach(row => {
        const matches = (!query || row.textContent.toLowerCase().includes(query)) && additionalMatch(row);
        row.hidden = !matches;
        if (matches) visibleRows++;
      });

      let emptyRow = table.querySelector('.table-filter-empty');
      if (!visibleRows && rows.length) {
        if (!emptyRow) {
          emptyRow = document.createElement('tr');
          emptyRow.className = 'table-filter-empty';
          emptyRow.innerHTML = `<td colspan="${table.tHead.rows[0].cells.length}" style="text-align:center;color:var(--color-text-muted)">${emptyMessage}</td>`;
          table.tBodies[0].appendChild(emptyRow);
        }
        emptyRow.hidden = false;
      } else if (emptyRow) {
        emptyRow.hidden = true;
      }
    };

    input.addEventListener('input', applyFilter);
    return applyFilter;
  }

  function renderOrdersTable(orders, compact, tableId) {
    if (!orders.length) return '<p style="color:var(--color-text-muted)">No orders yet.</p>';
    return `<table class="admin-table"${tableId ? ` id="${tableId}"` : ''}>
      <thead><tr><th>Order ID</th><th>Customer</th><th>Date Placed</th><th>Total</th><th>Status</th>${compact ? '' : '<th>Update Status</th><th></th>'}</tr></thead>
      <tbody>${orders.map(o => `
        <tr data-status="${o.status.toLowerCase()}" data-created="${o.createdAt || ''}">
          <td>${o.id}</td>
          <td>${DOM.escapeHtml(o.userName || 'Guest')}</td>
          <td>${o.createdAt ? Format.dateTime(o.createdAt) : '—'}</td>
          <td>${Format.currency(o.total)}</td>
          <td><span class="order-status order-status--${o.status.replace(/ /g, '\\ ')}">${o.status}</span></td>
          ${compact ? '' : `<td><select class="status-select" data-id="${o.id}">
            ${CONFIG.orderStatuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select></td>
          <td><button class="btn btn--outline btn--sm view-order" data-id="${o.id}">View</button></td>`}
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
    const auditSnap = await FirebaseApp.collections.auditLogs().orderBy('timestamp', 'desc').limit(5).get();
    const recentActivity = auditSnap.docs.map(d => d.data());
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
      ${renderOrdersTable(recentOrders.slice(0, 5), true)}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1.5rem">
        <h2 style="margin:0">Recent Activity</h2>
        <a href="?view=audit" class="btn btn--outline btn--sm">View All</a>
      </div>
      <table class="admin-table">
        <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>${recentActivity.length ? recentActivity.map(l => `
          <tr><td>${Format.dateTime(l.timestamp)}</td><td>${l.admin || '—'}</td><td>${l.action}</td><td>${JSON.stringify(l.details)}</td></tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted)">No recent activity</td></tr>'}</tbody>
      </table>`);
    bindOrderActions();
    bindTableSearch('dashboard-order-search', 'dashboard-orders-table', 'No recent orders match your search.');
  }

  if (view === 'orders') {
    const { data: orders } = await API.order.getAll();
    renderLayout(`
      <div class="admin-header"><h1>Order Management</h1></div>
      <div class="admin-filters" style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap">
        <input id="orders-search" type="search" placeholder="Search orders..." aria-label="Search orders" style="flex:1;min-width:180px;padding:0.5rem">
        <select id="orders-status-filter" aria-label="Filter orders by status" style="padding:0.5rem">
          <option value="">All Statuses</option>
          ${CONFIG.orderStatuses.map(s => `<option value="${s.toLowerCase()}">${s}</option>`).join('')}
        </select>
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:var(--color-text-muted)">From
          <input id="orders-date-from" type="date" aria-label="Filter orders from date" style="padding:0.5rem">
        </label>
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:var(--color-text-muted)">To
          <input id="orders-date-to" type="date" aria-label="Filter orders to date" style="padding:0.5rem">
        </label>
        <button class="btn btn--outline btn--sm" id="orders-filter-clear" type="button">Clear</button>
      </div>
      ${renderOrdersTable(orders, false, 'orders-table')}
      <div id="order-detail" style="margin-top:1.5rem"></div>`);
    bindOrderActions();
    const applyOrderFilter = bindTableSearch('orders-search', 'orders-table', 'No orders match your filters.', row => {
      const status = DOM.$('#orders-status-filter').value;
      if (status && row.dataset.status !== status) return false;

      const created = row.dataset.created ? new Date(row.dataset.created) : null;
      const fromVal = DOM.$('#orders-date-from').value;
      const toVal = DOM.$('#orders-date-to').value;
      if (fromVal && (!created || created < new Date(fromVal + 'T00:00:00'))) return false;
      if (toVal && (!created || created > new Date(toVal + 'T23:59:59'))) return false;

      return true;
    });
    DOM.$('#orders-status-filter').addEventListener('change', applyOrderFilter);
    DOM.$('#orders-date-from').addEventListener('change', applyOrderFilter);
    DOM.$('#orders-date-to').addEventListener('change', applyOrderFilter);
    DOM.$('#orders-filter-clear').addEventListener('click', () => {
      DOM.$('#orders-search').value = '';
      DOM.$('#orders-status-filter').value = '';
      DOM.$('#orders-date-from').value = '';
      DOM.$('#orders-date-to').value = '';
      applyOrderFilter();
    });

    DOM.$$('.view-order').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await API.order.getById(btn.dataset.id);
        if (!result.success) { Components.toast('Could not load order', 'error'); return; }
        renderOrderDetail(result.data);
        DOM.$('#order-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    function renderOrderDetail(order) {
      const needsPaymentConfirmation = order.paymentStatus === 'awaiting_manual_verification';
      DOM.$('#order-detail').innerHTML = `
        <div class="admin-form" style="max-width:640px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <h2 style="margin:0">${order.id}</h2>
              <small style="color:var(--color-text-muted)">Placed ${Format.dateTime(order.createdAt)}</small>
            </div>
            <span class="order-status order-status--${order.status.replace(/ /g, '\\ ')}">${order.status}</span>
          </div>

          ${needsPaymentConfirmation ? `
            <div style="background:#fff3cd;border:1px solid #ffe69c;border-radius:6px;padding:0.75rem;margin-top:1rem">
              <p style="margin:0 0 0.5rem;font-size:0.9rem"><strong>Awaiting manual payment verification</strong> — check your ${DOM.escapeHtml(order.paymentMethod)} app for a payment of ${Format.currency(order.total)} from this customer before confirming.</p>
              <button class="btn btn--primary btn--sm" id="confirm-payment-btn">✅ Confirm Payment Received</button>
            </div>` : ''}

          <h3 style="margin-top:1.5rem">Items</h3>
          ${order.items.map(i => `<div class="summary-row"><span>${i.quantity}x ${DOM.escapeHtml(i.name)} (${i.unit})</span><span>${Format.currency(i.lineTotal)}</span></div>`).join('')}
          <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
          <div class="summary-row"><span>Subtotal</span><span>${Format.currency(order.subtotal)}</span></div>
          ${order.discount ? `<div class="summary-row"><span>Discount${order.promoCode ? ` (${order.promoCode})` : ''}</span><span>-${Format.currency(order.discount)}</span></div>` : ''}
          <div class="summary-row"><span>Delivery</span><span>${order.deliveryFee === 0 ? 'FREE' : Format.currency(order.deliveryFee)}</span></div>
          <div class="summary-row summary-row--total"><span>Total</span><span>${Format.currency(order.total)}</span></div>
          <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
          <p><strong>Customer:</strong> ${DOM.escapeHtml(order.userName || 'Guest')}</p>
          <p><strong>Delivery:</strong> ${Format.date(order.deliveryDate)} · ${order.deliverySlot} · ${order.zone}</p>
          <p><strong>Address:</strong> ${order.address ? DOM.escapeHtml(order.address.street) + ', ' + DOM.escapeHtml(order.address.city) : 'N/A'}</p>
          ${order.address?.lat && order.address?.lng ? `
            <div class="order-location">
              <div class="order-location__map" id="order-location-map"></div>
              <a class="btn btn--outline btn--sm" style="margin-top:0.5rem"
                 href="https://www.google.com/maps?q=${order.address.lat},${order.address.lng}" target="_blank" rel="noopener">
                📍 Open pinned location in Google Maps
              </a>
            </div>` : `
            <p style="font-size:0.85rem;color:var(--color-text-muted)">No pinned delivery location saved for this order.</p>`}
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus || '—'}</p>

          <h3 style="margin-top:1.5rem">Status History</h3>
          ${(order.statusHistory || []).map(h => `
            <p style="font-size:0.85rem;color:var(--color-text-muted);margin:0.25rem 0">
              ${Format.dateTime(h.timestamp)} — <strong>${h.status}</strong>${h.note ? ` (${DOM.escapeHtml(h.note)})` : ''}
            </p>`).join('')}

          <button class="btn btn--outline btn--sm" id="close-order-detail" style="margin-top:1rem">Close</button>
        </div>`;

      if (order.address?.lat && order.address?.lng && window.mapboxgl && CONFIG.mapboxToken && !CONFIG.mapboxToken.includes('YOUR_')) {
        mapboxgl.accessToken = CONFIG.mapboxToken;
        const { lat, lng } = order.address;
        const dispatchMap = new mapboxgl.Map({
          container: 'order-location-map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 16,
          interactive: false // read-only dispatch view — not for repositioning
        });
        dispatchMap.on('load', () => dispatchMap.resize());
        new mapboxgl.Marker({ color: '#2d6a4f' }).setLngLat([lng, lat]).addTo(dispatchMap);
      }

      DOM.$('#close-order-detail').addEventListener('click', () => { DOM.$('#order-detail').innerHTML = ''; });

      DOM.$('#confirm-payment-btn')?.addEventListener('click', async () => {
        if (!confirm(`Confirm you received ${Format.currency(order.total)} via ${order.paymentMethod} for this order?`)) return;
        const result = await API.order.confirmPayment(order.id);
        if (result.success) {
          Components.toast('Payment confirmed — order fulfilled.');
          window.location.reload();
        } else {
          Components.toast(result.error || 'Could not confirm payment', 'error');
        }
      });
    }
  }

if (view === 'products') {
    const { data: allProducts } = await API.catalog.getProducts();
    let filters = { search: '', categoryId: '', status: '', tag: '', sort: '' };
    const allTags = [...new Set(allProducts.flatMap(p => p.tags || []))].sort();

    function applyFilters() {
      let result = allProducts.filter(p => {
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        const status = totalStock > 0 ? 'active' : 'out_of_stock';
        if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
        if (filters.status && status !== filters.status) return false;
        if (filters.tag && !(p.tags || []).includes(filters.tag)) return false;
        return true;
      });
      const stockOf = p => p.variants.reduce((s, v) => s + v.stock, 0);
      const priceOf = p => Math.min(...p.variants.map(v => v.price));
      if (filters.sort === 'stock-desc') result = [...result].sort((a, b) => stockOf(b) - stockOf(a));
      else if (filters.sort === 'stock-asc') result = [...result].sort((a, b) => stockOf(a) - stockOf(b));
      else if (filters.sort === 'price-desc') result = [...result].sort((a, b) => priceOf(b) - priceOf(a));
      else if (filters.sort === 'price-asc') result = [...result].sort((a, b) => priceOf(a) - priceOf(b));
      else if (filters.sort === 'name-asc') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
      return result;
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
        <div class="form-group"><label>Tags (comma-separated — used for the clickable tag filter above)</label>
          <input id="pe-tags" placeholder="native, organic, best-seller" value="${DOM.escapeHtml((p.tags || []).join(', '))}">
        </div>
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
          tags: DOM.$('#pe-tags').value.split(',').map(t => t.trim()).filter(Boolean),
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
      ${allTags.length ? `
      <div class="admin-filters" style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
        <button type="button" class="tag-filter-pill ${!filters.tag ? 'active' : ''}" data-tag="">All Tags</button>
        ${allTags.map(t => `<button type="button" class="tag-filter-pill ${filters.tag === t ? 'active' : ''}" data-tag="${DOM.escapeHtml(t)}">${DOM.escapeHtml(t)}</button>`).join('')}
      </div>` : ''}
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Category</th><th>Price Range <button type="button" class="column-sort" data-sort-key="price" aria-label="Sort by price range">↕</button></th><th>Stock <button type="button" class="column-sort" data-sort-key="stock" aria-label="Sort by stock">↕</button></th><th>Status <button type="button" class="column-sort" data-sort-key="status" aria-label="Sort by status">↕</button></th><th>Actions</th></tr></thead>
        <tbody id="products-table-body"></tbody>
      </table>
      <div id="product-editor" class="admin-form" hidden></div>`);

    DOM.$('#filter-search').addEventListener('input', e => { filters.search = e.target.value; renderProductsTable(); });
    DOM.$('#filter-category').addEventListener('change', e => { filters.categoryId = e.target.value; renderProductsTable(); });
    DOM.$('#filter-status').addEventListener('change', e => { filters.status = e.target.value; renderProductsTable(); });
    DOM.$$('.column-sort').forEach(button => button.addEventListener('click', () => {
      const sortKey = button.dataset.sortKey;
      const ascending = filters.sort !== `${sortKey}-asc`;
      filters.sort = `${sortKey}-${ascending ? 'asc' : 'desc'}`;
      DOM.$$('.column-sort').forEach(otherButton => {
        const isActive = otherButton === button;
        otherButton.textContent = isActive ? (ascending ? '↑' : '↓') : '↕';
        otherButton.setAttribute('aria-label', `Sort by ${otherButton.dataset.sortKey} ${isActive ? (ascending ? 'ascending' : 'descending') : ''}`.trim());
      });
      renderProductsTable();
    }));
    DOM.$$('.tag-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        filters.tag = btn.dataset.tag;
        DOM.$$('.tag-filter-pill').forEach(b => b.classList.toggle('active', b.dataset.tag === filters.tag));
        renderProductsTable();
      });
    });
    DOM.$('#add-product').addEventListener('click', () => openProductEditor(null));

    renderProductsTable();
  }

  if (view === 'inventory') {
    const { data: products } = await API.catalog.getProducts();
    renderLayout(`
      <div class="admin-header"><h1>Inventory</h1></div>
      <h2 style="margin-bottom:1rem">Low Stock Alerts</h2>
      ${renderSearchBar('inventory-search', 'Search inventory...')}
      <table class="admin-table" id="inventory-table">
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

    bindTableSearch('inventory-search', 'inventory-table', 'No inventory items match your search.');

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
    const adminsSnap = await FirebaseApp.collections.admins().get();
    const adminRoles = new Map(adminsSnap.docs.map(d => [d.id, d.data().role || 'admin']));

    // Admin-only accounts (e.g. the initial super admin from
    // scripts/seed-admin.js) may have no users/{uid} profile doc at
    // all — include them so they're not invisible in this list.
    const userIds = new Set(users.map(u => u.id));
    const adminOnlyRows = adminsSnap.docs
      .filter(d => !userIds.has(d.id))
      .map(d => ({ id: d.id, name: d.data().name || d.data().email, email: d.data().email, phone: null, createdAt: d.data().createdAt || null, _adminOnly: true }));
    const allRows = [...users, ...adminOnlyRows];

    renderLayout(`
      <div class="admin-header"><h1>Customers</h1><span>${allRows.length} registered</span></div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Role</th></tr></thead>
        <tbody>${(await Promise.all(allRows.map(async u => {
          const { data: userOrders } = u._adminOnly ? { data: [] } : await API.order.getAll({ userId: u.id });
          const currentRole = adminRoles.get(u.id) || 'customer';
          const isSelf = u.id === admin.id;
          return `<tr>
            <td>${DOM.escapeHtml(u.name)}</td>
            <td>${DOM.escapeHtml(u.email)}</td>
            <td>${DOM.escapeHtml(u.phone || '—')}</td>
            <td>${u.createdAt ? Format.date(u.createdAt) : '—'}</td>
            <td>${userOrders.length}</td>
            <td>
              ${admin.role === 'super_admin' ? `
              <select class="role-select" data-uid="${u.id}" data-email="${DOM.escapeHtml(u.email)}" data-prev="${currentRole}" ${isSelf ? 'disabled title="You cannot change your own role"' : ''}>
                <option value="customer" ${currentRole === 'customer' ? 'selected' : ''}>Customer</option>
                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="super_admin" ${currentRole === 'super_admin' ? 'selected' : ''}>Super Admin</option>
              </select>` : `<span title="Only super admins can change roles">${{ customer: 'Customer', admin: 'Admin', super_admin: 'Super Admin' }[currentRole]}</span>`}
            </td>
          </tr>`;
        }))).join('')}</tbody>
      </table>`);

    if (admin.role === 'super_admin') {
    DOM.$$('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const prev = sel.dataset.prev;
        const newRole = sel.value;
        const roleLabel = { customer: 'Customer', admin: 'Admin', super_admin: 'Super Admin' }[newRole];
        if (!confirm(`Change ${sel.dataset.email}'s role to ${roleLabel}?`)) {
          sel.value = prev;
          return;
        }
        const result = await API.user.updateRole(sel.dataset.uid, newRole);
        if (result.success) {
          sel.dataset.prev = newRole;
          Components.toast(`Role updated to ${roleLabel}`);
        } else {
          sel.value = prev;
          Components.toast(result.error || 'Role update failed', 'error');
        }
      });
    });
    }
  }

  if (view === 'recipes') {
    const cmsDoc = await FirebaseApp.collections.cms().doc('main').get();
    const cms = cmsDoc.exists ? cmsDoc.data() : {};
    const recipes = cms.recipes || cms.blogPosts || [];

    function renderRecipes() {
      DOM.$('#recipes-table-wrap').innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${recipes.length ? recipes.map((recipe, index) => `
            <tr>
              <td>${DOM.escapeHtml(recipe.title || '')}</td>
              <td>${DOM.escapeHtml(recipe.category || 'Recipes')}</td>
              <td>${recipe.date ? Format.date(recipe.date) : '—'}</td>
              <td>
                <button class="btn btn--outline btn--sm edit-recipe" data-index="${index}">Edit</button>
                <button class="btn btn--outline btn--sm delete-recipe" data-index="${index}">Delete</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted)">No recipes yet</td></tr>'}</tbody>
        </table>`;
      bindRecipeActions();
    }

    async function saveRecipes() {
      await FirebaseApp.collections.cms().doc('main').set({ recipes }, { merge: true });
      await API.admin.logAction('UPDATE_RECIPES', { count: recipes.length });
      renderRecipes();
    }

    function openRecipeEditor(index) {
      const isNew = index === undefined;
      const recipe = isNew
        ? { title: '', category: 'Recipes', date: new Date().toISOString().split('T')[0], image: '🍲', excerpt: '', content: '' }
        : recipes[index];
      DOM.$('#recipe-editor').hidden = false;
      DOM.$('#recipe-editor').innerHTML = `
        <h2>${isNew ? 'Add Recipe' : 'Edit Recipe'}</h2>
        <div class="form-group"><label>Title</label><input id="re-title" value="${DOM.escapeHtml(recipe.title || '')}" required></div>
        <div class="form-group"><label>Category</label><input id="re-category" value="${DOM.escapeHtml(recipe.category || 'Recipes')}"></div>
        <div class="form-group"><label>Date</label><input id="re-date" type="date" value="${DOM.escapeHtml(recipe.date || '')}"></div>
        <div class="form-group"><label>Image or Emoji</label><input id="re-image" value="${DOM.escapeHtml(recipe.image || '🍲')}" placeholder="Emoji or image URL"></div>
        <div class="form-group"><label>Short Description</label><textarea id="re-excerpt" rows="2">${DOM.escapeHtml(recipe.excerpt || '')}</textarea></div>
        <div class="form-group"><label>Recipe Content</label><textarea id="re-content" rows="6">${DOM.escapeHtml(recipe.content || '')}</textarea></div>
        <p class="form-error" id="re-error"></p>
        <div class="modal-actions" style="display:flex;gap:0.5rem">
          <button class="btn btn--primary" id="re-save">Save Recipe</button>
          <button class="btn btn--outline" id="re-cancel">Cancel</button>
        </div>`;

      DOM.$('#re-cancel').addEventListener('click', () => { DOM.$('#recipe-editor').hidden = true; });
      DOM.$('#re-save').addEventListener('click', async () => {
        const title = DOM.$('#re-title').value.trim();
        if (!title) { DOM.$('#re-error').textContent = 'Title is required.'; return; }
        const updated = {
          id: isNew ? `recipe-${Date.now()}` : recipe.id,
          title,
          category: DOM.$('#re-category').value.trim() || 'Recipes',
          date: DOM.$('#re-date').value,
          image: DOM.$('#re-image').value.trim() || '🍲',
          excerpt: DOM.$('#re-excerpt').value.trim(),
          content: DOM.$('#re-content').value.trim()
        };
        if (isNew) recipes.push(updated);
        else recipes[index] = updated;
        DOM.$('#recipe-editor').hidden = true;
        await saveRecipes();
      });
    }

    function bindRecipeActions() {
      DOM.$$('.edit-recipe').forEach(button => button.addEventListener('click', () => openRecipeEditor(parseInt(button.dataset.index, 10))));
      DOM.$$('.delete-recipe').forEach(button => button.addEventListener('click', async () => {
        if (!confirm('Delete this recipe?')) return;
        recipes.splice(parseInt(button.dataset.index, 10), 1);
        await saveRecipes();
      }));
    }

    renderLayout(`
      <div class="admin-header"><h1>Recipes</h1><button class="btn btn--primary btn--sm" id="add-recipe">+ Add Recipe</button></div>
      <div id="recipes-table-wrap"></div>
      <div id="recipe-editor" class="admin-form" hidden></div>`);
    DOM.$('#add-recipe').addEventListener('click', () => openRecipeEditor());
    renderRecipes();
  }

  if (view === 'reviews') {
    const [reviewsSnap, productsResult] = await Promise.all([
      FirebaseApp.collections.reviews().get(),
      API.catalog.getProducts()
    ]);
    const products = new Map(productsResult.data.map(product => [product.id, product]));
    const reviews = reviewsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    renderLayout(`
      <div class="admin-header"><h1>Reviews</h1><span>${reviews.length} submitted</span></div>
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${reviews.length ? reviews.map(review => `
          <tr>
            <td>${DOM.escapeHtml(products.get(review.productId)?.name || 'Product')}</td>
            <td>${DOM.escapeHtml(review.userName || 'Customer')}</td>
            <td><span class="review-card__rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></td>
            <td>${DOM.escapeHtml(review.comment || '')}</td>
            <td>${review.date ? Format.date(review.date) : '—'}</td>
            <td>${review.verified ? 'Verified Purchase' : 'Unverified'}</td>
            <td>
              <button class="btn btn--outline btn--sm edit-review" data-id="${review.id}">Edit</button>
              <button class="btn btn--outline btn--sm delete-review" data-id="${review.id}">Delete</button>
            </td>
          </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted)">No reviews yet</td></tr>'}</tbody>
      </table>`);

    DOM.$$('.edit-review').forEach(button => button.addEventListener('click', () => {
      const review = reviews.find(item => item.id === button.dataset.id);
      if (!review) return;
      const rating = prompt('Rating from 1 to 5:', review.rating);
      if (rating === null) return;
      const parsedRating = parseInt(rating, 10);
      if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) { Components.toast('Rating must be between 1 and 5', 'error'); return; }
      const comment = prompt('Review comment:', review.comment || '');
      if (comment === null) return;
      API.reviews.update(review.id, { rating: parsedRating, comment: comment.trim() })
        .then(() => API.admin.logAction('UPDATE_REVIEW', { reviewId: review.id }))
        .then(() => { Components.toast('Review updated'); window.location.reload(); })
        .catch(() => Components.toast('Could not update review', 'error'));
    }));
    DOM.$$('.delete-review').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Delete this review? This cannot be undone.')) return;
      try {
        await API.reviews.remove(button.dataset.id);
        await API.admin.logAction('DELETE_REVIEW', { reviewId: button.dataset.id });
        Components.toast('Review deleted');
        window.location.reload();
      } catch (err) {
        Components.toast('Could not delete review', 'error');
      }
    }));
  }

  if (view === 'content') {
    const cmsDoc = await FirebaseApp.collections.cms().doc('main').get();
    const cms = cmsDoc.exists ? cmsDoc.data() : {};
    const banners = cms.banners || [];

    function renderBannersTable() {
      return `
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Subtitle</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>${banners.length ? banners.map((b, i) => `
            <tr>
              <td>${DOM.escapeHtml(b.title)}</td>
              <td>${DOM.escapeHtml(b.subtitle || '')}</td>
              <td>${b.active ? '✅' : '❌'}</td>
              <td>
                <button class="btn btn--outline btn--sm edit-banner" data-idx="${i}">Edit</button>
                <button class="btn btn--outline btn--sm toggle-banner" data-idx="${i}">${b.active ? 'Deactivate' : 'Activate'}</button>
                <button class="btn btn--outline btn--sm delete-banner" data-idx="${i}">Delete</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted)">No promo banners yet</td></tr>'}</tbody>
        </table>`;
    }

    renderLayout(`
      <div class="admin-header"><h1>Site Content</h1></div>

      <h2>Homepage Hero</h2>
      <p style="color:var(--color-text-muted)">The big headline and subtitle shown at the top of the homepage.</p>
      <form id="hero-content-form" class="admin-form" style="max-width:600px">
        <div class="form-group"><label>Hero Title</label>
          <input id="hero-title-input" value="${DOM.escapeHtml(cms.heroTitle || 'Palengke-Fresh, Delivered Tomorrow')}">
        </div>
        <div class="form-group"><label>Hero Subtitle</label>
          <textarea id="hero-subtitle-input" rows="2">${DOM.escapeHtml(cms.heroSubtitle || 'Fresh produce, seafood, and meat sourced daily from trusted wet markets — delivered straight to your doorstep in Metro Manila & Rizal.')}</textarea>
        </div>
        <p class="form-error" id="hero-content-error"></p>
        <button type="submit" class="btn btn--primary">Save Hero</button>
      </form>

      <h2 style="margin-top:2rem">Promo Banners</h2>
      <p style="color:var(--color-text-muted)">Shown as scrolling promo cards on the homepage. Only active banners are visible to customers.</p>
      <div id="banners-table-wrap">${renderBannersTable()}</div>
      <button class="btn btn--outline btn--sm" id="add-banner" style="margin-top:0.75rem">+ Add Banner</button>
      <div id="banner-editor" class="admin-form" style="max-width:480px" hidden></div>

      <h2 style="margin-top:2rem">Manual Payment QR Codes</h2>
      <p style="color:var(--color-text-muted)">
        Customers who choose GCash or Maya at checkout will see whichever QR code you set here.
        Paste a direct image link (e.g. from Imgur — right-click the uploaded photo → "Copy image address",
        not the page URL). Payments made this way are NOT automatically confirmed — you'll need to verify
        the payment yourself and update the order status manually in Orders.
      </p>
      <form id="qr-content-form" class="admin-form" style="max-width:480px">
        <div class="form-group">
          <label>GCash QR Code Image URL</label>
          <input type="text" id="gcash-qr-url" value="${DOM.escapeHtml(cms.gcashQrUrl || '')}" placeholder="https://...">
        </div>
        ${cms.gcashQrUrl ? `<img src="${DOM.escapeHtml(cms.gcashQrUrl)}" alt="GCash QR preview" style="width:140px;height:140px;object-fit:cover;border:1px solid var(--color-border);border-radius:8px;margin-bottom:1rem">` : ''}
        <div class="form-group">
          <label>Maya QR Code Image URL</label>
          <input type="text" id="maya-qr-url" value="${DOM.escapeHtml(cms.mayaQrUrl || '')}" placeholder="https://...">
        </div>
        ${cms.mayaQrUrl ? `<img src="${DOM.escapeHtml(cms.mayaQrUrl)}" alt="Maya QR preview" style="width:140px;height:140px;object-fit:cover;border:1px solid var(--color-border);border-radius:8px;margin-bottom:1rem">` : ''}
        <p class="form-error" id="qr-content-error"></p>
        <button type="submit" class="btn btn--primary">Save QR Codes</button>
      </form>`);

    DOM.$('#hero-content-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errorEl = DOM.$('#hero-content-error');
      try {
        await FirebaseApp.collections.cms().doc('main').set({
          heroTitle: DOM.$('#hero-title-input').value.trim(),
          heroSubtitle: DOM.$('#hero-subtitle-input').value.trim()
        }, { merge: true });
        await API.admin.logAction('UPDATE_CMS', { type: 'hero' });
        Components.toast('Hero content saved');
      } catch (err) {
        errorEl.textContent = err.message || 'Could not save. Please try again.';
      }
    });

    async function saveBanners() {
      await FirebaseApp.collections.cms().doc('main').set({ banners }, { merge: true });
      await API.admin.logAction('UPDATE_CMS', { type: 'banners' });
      DOM.$('#banners-table-wrap').innerHTML = renderBannersTable();
      bindBannerRowActions();
    }

    function openBannerEditor(idx) {
      const isNew = idx === undefined;
      const b = isNew ? { title: '', subtitle: '', cta: 'Shop Now', link: 'pages/shop.html', active: true } : banners[idx];
      DOM.$('#banner-editor').hidden = false;
      DOM.$('#banner-editor').innerHTML = `
        <h3>${isNew ? 'Add Banner' : 'Edit Banner'}</h3>
        <div class="form-group"><label>Title</label><input id="be-title" value="${DOM.escapeHtml(b.title)}"></div>
        <div class="form-group"><label>Subtitle</label><input id="be-subtitle" value="${DOM.escapeHtml(b.subtitle || '')}"></div>
        <div class="form-group"><label>Button Text</label><input id="be-cta" value="${DOM.escapeHtml(b.cta || 'Shop Now')}"></div>
        <div class="form-group"><label>Link</label><input id="be-link" value="${DOM.escapeHtml(b.link || 'pages/shop.html')}"></div>
        <label style="display:flex;align-items:center;gap:0.5rem;margin:0.5rem 0">
          <input type="checkbox" id="be-active" ${b.active ? 'checked' : ''}> Active
        </label>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn--primary btn--sm" id="be-save">Save</button>
          <button class="btn btn--outline btn--sm" id="be-cancel">Cancel</button>
        </div>`;

      DOM.$('#be-cancel').addEventListener('click', () => { DOM.$('#banner-editor').hidden = true; });
      DOM.$('#be-save').addEventListener('click', async () => {
        const updated = {
          title: DOM.$('#be-title').value.trim(),
          subtitle: DOM.$('#be-subtitle').value.trim(),
          cta: DOM.$('#be-cta').value.trim() || 'Shop Now',
          link: DOM.$('#be-link').value.trim() || 'pages/shop.html',
          active: DOM.$('#be-active').checked
        };
        if (!updated.title) { Components.toast('Title is required', 'error'); return; }
        if (isNew) banners.push(updated);
        else banners[idx] = updated;
        DOM.$('#banner-editor').hidden = true;
        await saveBanners();
      });
    }

    function bindBannerRowActions() {
      DOM.$$('.edit-banner').forEach(btn => btn.addEventListener('click', () => openBannerEditor(parseInt(btn.dataset.idx, 10))));
      DOM.$$('.toggle-banner').forEach(btn => btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        banners[idx].active = !banners[idx].active;
        await saveBanners();
      }));
      DOM.$$('.delete-banner').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Delete this banner?')) return;
        banners.splice(parseInt(btn.dataset.idx, 10), 1);
        await saveBanners();
      }));
    }
    bindBannerRowActions();
    DOM.$('#add-banner').addEventListener('click', () => openBannerEditor());

    DOM.$('#qr-content-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errorEl = DOM.$('#qr-content-error');
      try {
        await FirebaseApp.collections.cms().doc('main').set({
          gcashQrUrl: DOM.$('#gcash-qr-url').value.trim(),
          mayaQrUrl: DOM.$('#maya-qr-url').value.trim()
        }, { merge: true });
        await API.admin.logAction('UPDATE_CMS', { type: 'payment_qr_codes' });
        Components.toast('QR codes saved');
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message || 'Could not save. Please try again.';
      }
    });
  }

  if (view === 'audit') {
    const snap = await FirebaseApp.collections.auditLogs().orderBy('timestamp', 'desc').limit(50).get();
    const logs = snap.docs.map(d => d.data());
    renderLayout(`
      <div class="admin-header"><h1>Audit Trail</h1></div>
      ${renderSearchBar('audit-search', 'Search audit log...')}
      <table class="admin-table" id="audit-table">
        <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>${logs.length ? logs.map(l => `
          <tr><td>${Format.dateTime(l.timestamp)}</td><td>${l.admin || '—'}</td><td>${l.action}</td><td>${JSON.stringify(l.details)}</td></tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted)">No audit logs yet</td></tr>'}</tbody>
      </table>`);
    bindTableSearch('audit-search', 'audit-table', 'No audit entries match your search.');
  }
});
