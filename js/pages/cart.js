App.ready().then(async () => {
  await Components.initLayout('cart');

  const user = API.user.getCurrent();
  const userId = user?.id || null;

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

    itemsEl.innerHTML = cart.items.map(item => `
      <div class="cart-item" data-pid="${item.productId}" data-vid="${item.variantId}">
        <div class="cart-item__emoji">${item.product.image}</div>
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

    const deliveryFee = await API.delivery.calculateFee(cart.subtotal, 'mm-north');
    const total = cart.subtotal + deliveryFee;
    const progress = Math.min(100, (cart.subtotal / CONFIG.freeDeliveryThreshold) * 100);
    const remaining = Math.max(0, CONFIG.freeDeliveryThreshold - cart.subtotal);

    summaryEl.innerHTML = `
      <h3>Order Summary</h3>
      <div class="summary-row"><span>Subtotal (${cart.itemCount} items)</span><span>${Format.currency(cart.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery Fee</span><span>${deliveryFee === 0 ? 'FREE' : Format.currency(deliveryFee)}</span></div>
      ${remaining > 0 ? `
        <div class="delivery-progress">
          Add ${Format.currency(remaining)} more for free delivery!
          <div class="delivery-progress__bar"><div class="delivery-progress__fill" style="width:${progress}%"></div></div>
        </div>` : '<div class="delivery-progress" style="color:var(--color-success);font-weight:600">🎉 You qualify for free delivery!</div>'}
      <div class="summary-row summary-row--total"><span>Total</span><span>${Format.currency(total)}</span></div>
      <a href="checkout.html" class="btn btn--primary btn--lg" style="width:100%;margin-top:1rem">Proceed to Checkout</a>
      <a href="shop.html" class="btn btn--outline" style="width:100%;margin-top:0.5rem">Continue Shopping</a>`;

    DOM.$$('.cart-item').forEach(row => {
      const pid = row.dataset.pid;
      const vid = row.dataset.vid;
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
