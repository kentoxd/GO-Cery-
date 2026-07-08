App.ready().then(async () => {
  await Components.initLayout('account');

  const user = API.user.getCurrent();
  const params = DOM.getQueryParams();

  if (params.success) Components.toast('Order placed successfully! 🎉');

  if (params.id) {
    const result = await API.order.getById(params.id);
    if (!result.success) {
      DOM.$('#orders-content').innerHTML = '<div class="empty-state"><h3>Order not found</h3></div>';
      return;
    }
    const order = result.data;
    if (user && order.userId !== user.id) {
      window.location.href = 'login.html';
      return;
    }

    const statusIdx = CONFIG.orderStatuses.indexOf(order.status);
    DOM.$('#orders-content').innerHTML = `
      <a href="account.html?tab=orders" style="font-size:0.9rem">← Back to Orders</a>
      <div class="order-card" style="margin-top:1rem">
        <div class="order-card__header">
          <div><h2>${order.id}</h2><small>Placed ${Format.dateTime(order.createdAt)}</small></div>
          <span class="order-status order-status--${order.status.replace(/ /g, '\\ ')}">${order.status}</span>
        </div>
        <div class="order-track">
          ${CONFIG.orderStatuses.slice(0, 5).map((s, i) => `
            <div class="track-step ${i < statusIdx ? 'done' : ''} ${i === statusIdx ? 'active' : ''}">
              <div class="track-step__dot">${i < statusIdx ? '✓' : i + 1}</div>
              <div class="track-step__label">${s}</div>
            </div>
          `).join('')}
        </div>
        <h3 style="margin:1rem 0 0.5rem">Items</h3>
        ${order.items.map(i => `<div class="summary-row"><span>${i.quantity}x ${DOM.escapeHtml(i.name)} (${i.unit})</span><span>${Format.currency(i.lineTotal)}</span></div>`).join('')}
        <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
        <div class="summary-row"><span>Subtotal</span><span>${Format.currency(order.subtotal)}</span></div>
        ${order.discount ? `<div class="summary-row"><span>Discount</span><span>-${Format.currency(order.discount)}</span></div>` : ''}
        <div class="summary-row"><span>Delivery</span><span>${order.deliveryFee === 0 ? 'FREE' : Format.currency(order.deliveryFee)}</span></div>
        <div class="summary-row summary-row--total"><span>Total</span><span>${Format.currency(order.total)}</span></div>
        <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
        <p><strong>Delivery:</strong> ${Format.date(order.deliveryDate)} · ${order.deliverySlot}</p>
        <p><strong>Address:</strong> ${order.address ? DOM.escapeHtml(order.address.street) + ', ' + DOM.escapeHtml(order.address.city) : 'N/A'}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod}</p>
      </div>`;
    return;
  }

  if (!user) { window.location.href = 'login.html'; return; }

  const { data: orders } = await API.order.getAll({ userId: user.id });
  DOM.$('#orders-content').innerHTML = orders.length
    ? orders.map(o => `
        <div class="order-card">
          <div class="order-card__header">
            <div><strong>${o.id}</strong><br><small>${Format.dateTime(o.createdAt)}</small></div>
            <span class="order-status order-status--${o.status.replace(/ /g, '\\ ')}">${o.status}</span>
          </div>
          <p>${o.items.map(i => i.name).join(', ')}</p>
          <p><strong>${Format.currency(o.total)}</strong></p>
          <a href="orders.html?id=${o.id}" class="btn btn--outline btn--sm" style="margin-top:0.5rem">Track Order</a>
        </div>
      `).join('')
    : '<div class="empty-state"><div class="empty-state__icon">📦</div><h3>No orders yet</h3><a href="shop.html" class="btn btn--primary">Shop Now</a></div>';
});
