App.ready().then(async () => {
  await Components.initLayout('cart');

  const user = API.user.getCurrent();
  const userId = user?.id || null;

  const SELECT_KEY = 'gocery_checkout_selection';
  const keyOf = i => `${i.productId}|${i.variantId}`;
  let selected = null; // Set of item keys chosen for checkout (null = not initialised yet)

  async function render() {
    const cart = await API.cart.getEnriched(userId);
    const itemsEl = DOM.$('#cart-items');
    const summaryEl = DOM.$('#cart-summary');

    if (!cart.items.length) {
      itemsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some palengke-fresh items to get started!</p>
          <a href="shop.html" class="btn btn--primary" style="margin-top:1rem">Shop Now</a>
        </div>`;
      summaryEl.innerHTML = '';
      return;
    }

    // Default: everything selected. Afterwards keep only keys that still exist in the cart.
    if (selected === null) selected = new Set(cart.items.map(keyOf));
    else selected = new Set(cart.items.map(keyOf).filter(k => selected.has(k)));

    const selectedItems = cart.items.filter(i => selected.has(keyOf(i)));
    const selectedSubtotal = selectedItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
    const allSelected = selectedItems.length === cart.items.length;

    itemsEl.innerHTML = `
      <label class="cart-select-all">
        <input type="checkbox" id="select-all" ${allSelected ? 'checked' : ''}>
        <span>Select all (${cart.items.length})</span>
      </label>` + cart.items.map(item => `
      <div class="cart-item cart-item--selectable" data-pid="${item.productId}" data-vid="${item.variantId}">
        <input type="checkbox" class="cart-item__check" aria-label="Select ${DOM.escapeHtml(item.product.name)} for checkout" ${selected.has(keyOf(item)) ? 'checked' : ''}>
        <div class="cart-item__emoji">${item.product.imageUrl
          ? `<img src="${DOM.escapeHtml(item.product.imageUrl)}" alt="${DOM.escapeHtml(item.product.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`
          : item.product.image}</div>
        <div>
          <div class="cart-item__name">${DOM.escapeHtml(item.product.name)}</div>
          <div class="cart-item__unit">${Format.unitLabel(item.variant.unit)} · ${Format.currency(item.variant.price)} each</div>
          <div class="qty-stepper" style="margin-top:0.5rem">
            <button class="cart-qty-minus">−</button>
            <input type="number" value="${item.quantity}" readonly>
            <button class="cart-qty-plus">+</button>
          </div>
        </div>
        <div class="cart-item__price">${Format.currency(item.lineTotal)}</div>
        <button class="cart-item__remove">Remove</button>
      </div>
    `).join('');

    const deliveryFee = selectedItems.length
      ? await API.delivery.calculateFee(selectedSubtotal, CONFIG.deliveryZones[0].id)
      : 0;
    const total = selectedSubtotal + deliveryFee;
    const progress = Math.min(100, (selectedSubtotal / CONFIG.freeDeliveryThreshold) * 100);
    const remaining = Math.max(0, CONFIG.freeDeliveryThreshold - selectedSubtotal);

    summaryEl.innerHTML = `
      <h3>Order Summary</h3>
      <div class="summary-row"><span>Subtotal (${selectedCount} of ${cart.itemCount} items selected)</span><span>${Format.currency(selectedSubtotal)}</span></div>
      <div class="summary-row"><span>Delivery Fee</span><span>${deliveryFee === 0 ? 'FREE' : Format.currency(deliveryFee)}</span></div>
      ${remaining > 0 ? `
        <div class="delivery-progress">
          Add ${Format.currency(remaining)} more for free delivery!
          <div class="delivery-progress__bar"><div class="delivery-progress__fill" style="width:${progress}%"></div></div>
        </div>` : '<div class="delivery-progress" style="color:var(--color-success);font-weight:600">🎉 You qualify for free delivery!</div>'}
      <div class="summary-row summary-row--total"><span>Total</span><span>${Format.currency(total)}</span></div>
      <button class="btn btn--primary btn--lg" id="checkout-btn" style="width:100%;margin-top:1rem" ${selectedItems.length ? '' : 'disabled'}>
        ${selectedItems.length ? `Checkout (${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'})` : 'Select items to checkout'}
      </button>
      <a href="shop.html" class="btn btn--outline" style="width:100%;margin-top:0.5rem">Continue Shopping</a>`;

    DOM.$('#select-all').addEventListener('change', e => {
      selected = e.target.checked ? new Set(cart.items.map(keyOf)) : new Set();
      render();
    });
    DOM.$('#checkout-btn').addEventListener('click', () => {
      if (!selectedItems.length) return;
      sessionStorage.setItem(SELECT_KEY, JSON.stringify([...selected]));
      if (!user) {
        Components.toast('Please log in to continue to checkout. Your cart will be saved.', 'error');
        setTimeout(() => { window.location.href = 'login.html?redirect=checkout.html&notice=checkout'; }, 1200);
        return;
      }
      window.location.href = 'checkout.html';
    });

    DOM.$$('.cart-item').forEach(row => {
      const pid = row.dataset.pid;
      const vid = row.dataset.vid;
      row.querySelector('.cart-item__check').addEventListener('change', e => {
        if (e.target.checked) selected.add(`${pid}|${vid}`);
        else selected.delete(`${pid}|${vid}`);
        render();
      });
      row.querySelector('.cart-qty-minus').addEventListener('click', async () => {
        const item = cart.items.find(i => i.productId === pid && i.variantId === vid);
        if (item && item.quantity > 1) await API.cart.updateQty(userId, pid, vid, item.quantity - 1);
        else await API.cart.remove(userId, pid, vid);
        render();
      });
      row.querySelector('.cart-qty-plus').addEventListener('click', async () => {
        const item = cart.items.find(i => i.productId === pid && i.variantId === vid);
        if (item && item.quantity < item.variant.stock) await API.cart.updateQty(userId, pid, vid, item.quantity + 1);
        render();
      });
      row.querySelector('.cart-item__remove').addEventListener('click', async () => {
        await API.cart.remove(userId, pid, vid);
        Components.toast('Item removed');
        render();
      });
    });
  }

  await render();
});
