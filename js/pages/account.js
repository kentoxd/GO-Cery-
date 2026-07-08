App.ready().then(async () => {
  await Components.initLayout('account');

  const user = API.user.getCurrent();
  if (!user) { window.location.href = 'login.html'; return; }

  const params = DOM.getQueryParams();
  const tab = params.tab || 'profile';

  function renderNav() {
    DOM.$('#account-nav').innerHTML = `
      <a href="?tab=profile" class="${tab === 'profile' ? 'active' : ''}">👤 Profile</a>
      <a href="?tab=orders" class="${tab === 'orders' ? 'active' : ''}">📦 Orders</a>
      <a href="?tab=loyalty" class="${tab === 'loyalty' ? 'active' : ''}">⭐ Suki Rewards</a>
      <a href="?tab=addresses" class="${tab === 'addresses' ? 'active' : ''}">📍 Addresses</a>
      <a href="#" id="logout-link">🚪 Logout</a>`;
    DOM.$('#logout-link').addEventListener('click', async e => {
      e.preventDefault();
      await API.user.logout();
      window.location.href = '../index.html';
    });
  }

  async function renderContent() {
    const el = DOM.$('#account-content');

    if (tab === 'profile') {
      el.innerHTML = `
        <h2>My Profile</h2>
        <form id="profile-form" style="max-width:480px;margin-top:1rem">
          <div class="form-group"><label>Full Name</label><input name="name" value="${DOM.escapeHtml(user.name)}" required></div>
          <div class="form-group"><label>Email</label><input type="email" value="${DOM.escapeHtml(user.email)}" disabled></div>
          <div class="form-group"><label>Phone</label><input name="phone" value="${DOM.escapeHtml(user.phone || '')}" required></div>
          <button type="submit" class="btn btn--primary">Save Changes</button>
        </form>`;
      DOM.$('#profile-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await API.user.updateProfile(Object.fromEntries(fd));
        Components.toast('Profile updated!');
      });
    }

    if (tab === 'orders') {
      const { data: orders } = await API.order.getAll({ userId: user.id });
      el.innerHTML = `<h2>Order History</h2>` +
        (orders.length ? orders.map(o => `
          <div class="order-card">
            <div class="order-card__header">
              <div><strong>${o.id}</strong><br><small>${Format.dateTime(o.createdAt)}</small></div>
              <span class="order-status order-status--${o.status.replace(/ /g, '\\ ')}">${o.status}</span>
            </div>
            <p>${o.items.length} item(s) · ${Format.currency(o.total)}</p>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
              <a href="orders.html?id=${o.id}" class="btn btn--outline btn--sm">View Details</a>
              <button class="btn btn--primary btn--sm reorder-btn" data-id="${o.id}">Reorder</button>
            </div>
          </div>
        `).join('') : '<div class="empty-state"><p>No orders yet.</p><a href="shop.html" class="btn btn--primary">Start Shopping</a></div>');

      DOM.$$('.reorder-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const order = orders.find(o => o.id === btn.dataset.id);
          for (const i of order.items) {
            await API.cart.add(user.id, i.productId, i.variantId, i.quantity);
          }
          Components.toast('Items added to cart!');
          Components.updateCartBadge();
        });
      });
    }

    if (tab === 'loyalty') {
      const account = await API.loyalty.getAccount(user.id);
      const tier = API.loyalty.getTierInfo(account.tier);
      const nextTier = CONFIG.loyaltyTiers.find(t => t.minPoints > account.points);
      el.innerHTML = `
        <h2>Suki Rewards</h2>
        <div class="loyalty-card">
          <h3>${tier?.name || 'Regular Suki'}</h3>
          <div class="loyalty-points">${account.points} pts</div>
          ${nextTier ? `<p>${nextTier.minPoints - account.points} points to ${nextTier.name}</p>` : '<p>You\'ve reached the highest tier! 🎉</p>'}
        </div>
        <h3>Your Perks</h3>
        <ul style="margin:0.5rem 0 1rem 1.25rem">${(tier?.perks || []).map(p => `<li>${p}</li>`).join('')}</ul>
        <h3>All Tiers</h3>
        ${CONFIG.loyaltyTiers.map(t => `
          <div style="background:var(--color-surface);padding:1rem;border-radius:var(--radius-sm);margin-bottom:0.5rem;box-shadow:var(--shadow-sm)">
            <strong>${t.name}</strong> (${t.minPoints}+ pts)
            <ul style="margin:0.25rem 0 0 1rem;font-size:0.85rem;color:var(--color-text-muted)">${t.perks.map(p => `<li>${p}</li>`).join('')}</ul>
          </div>
        `).join('')}`;
    }

    if (tab === 'addresses') {
      el.innerHTML = `
        <h2>Saved Addresses</h2>
        ${(user.addresses || []).map(a => `
          <div class="order-card"><strong>${DOM.escapeHtml(a.label || 'Address')}</strong><br>${DOM.escapeHtml(a.street)}, ${DOM.escapeHtml(a.city)}</div>
        `).join('') || '<p style="color:var(--color-text-muted)">No saved addresses.</p>'}`;
    }
  }

  renderNav();
  await renderContent();
});
