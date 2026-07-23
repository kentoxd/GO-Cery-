App.ready().then(async () => {
  await Components.initLayout('checkout');

  const user = API.user.getCurrent();
  if (!user) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const cart = await API.cart.getEnriched(user.id);
  if (!cart.items.length) {
    window.location.href = 'cart.html';
    return;
  }

  let step = 1;
  let checkoutData = {
    addressId: user.addresses?.[0]?.id || null,
    zoneId: CONFIG.deliveryZones[0].id,
    slotId: CONFIG.deliverySlots[0].id,
    deliveryDate: API.delivery.getNextDeliveryDate(),
    paymentMethod: 'cod',
    promoCode: '',
    discount: 0,
    freeShip: false
  };

  function renderSteps() {
    const steps = ['Address', 'Delivery', 'Payment', 'Review'];
    DOM.$('#checkout-steps').innerHTML = steps.map((s, i) =>
      `<div class="checkout-step ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}">${i + 1}. ${s}</div>`
    ).join('');
  }

  async function renderPanel() {
    const panel = DOM.$('#checkout-panel');
    renderSteps();

    if (step === 1) {
      panel.innerHTML = `
        <h3>Shipping Address</h3>
        ${user.addresses?.length ? user.addresses.map(a => `
          <label class="payment-option">
            <input type="radio" name="address" value="${a.id}" ${checkoutData.addressId === a.id ? 'checked' : ''}>
            <div><strong>${DOM.escapeHtml(a.label || 'Home')}</strong><br>${DOM.escapeHtml(a.street)}, ${DOM.escapeHtml(a.city)}</div>
          </label>
        `).join('') : '<p>No saved addresses. Add one below.</p>'}
        <form id="new-address-form" style="margin-top:1rem">
          <div class="form-group"><label>Label</label><input name="label" placeholder="Home, Office…" required></div>
          <div class="form-group"><label>Street Address</label><input name="street" required></div>
          <div class="form-group"><label>City / Barangay</label><input name="city" required></div>
          <div class="form-group"><label>Delivery Zone</label>
            <select name="zoneId">${CONFIG.deliveryZones.map(z => `<option value="${z.id}">${z.name} (${Format.currency(z.fee)})</option>`).join('')}</select>
          </div>
          <button type="submit" class="btn btn--outline btn--sm">Add Address</button>
        </form>
        <button class="btn btn--primary" style="margin-top:1rem" id="next-step" ${!user.addresses?.length ? 'disabled' : ''}>Continue to Delivery</button>`;

      DOM.$$('input[name="address"]').forEach(r => {
        r.addEventListener('change', () => { checkoutData.addressId = r.value; DOM.$('#next-step').disabled = false; });
      });

      DOM.$('#new-address-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const result = await API.user.addAddress(Object.fromEntries(fd));
        if (result.success) {
          checkoutData.addressId = result.data.id;
          checkoutData.zoneId = fd.get('zoneId');
          if (!user.addresses) user.addresses = [];
          user.addresses.push(result.data);
          Components.toast('Address added!');
          renderPanel();
        }
      });
    }

    if (step === 2) {
      panel.innerHTML = `
        <h3>Delivery Schedule</h3>
        <p style="margin-bottom:1rem;color:var(--color-text-muted)">Delivery date: <strong>${Format.date(checkoutData.deliveryDate)}</strong></p>
        <div class="form-group"><label>Time Slot</label>
          <div class="payment-options">${CONFIG.deliverySlots.map(s => `
            <label class="payment-option"><input type="radio" name="slot" value="${s.id}" ${checkoutData.slotId === s.id ? 'checked' : ''}> ${s.label}</label>
          `).join('')}</div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          <button class="btn btn--outline" id="prev-step">Back</button>
          <button class="btn btn--primary" id="next-step">Continue to Payment</button>
        </div>`;

      DOM.$$('input[name="slot"]').forEach(r => {
        r.addEventListener('change', () => { checkoutData.slotId = r.value; });
      });
    }

    if (step === 3) {
      panel.innerHTML = `
        <h3>Payment Method</h3>
        <div class="payment-options">${CONFIG.paymentMethods.map(m => `
          <label class="payment-option"><input type="radio" name="payment" value="${m.id}" ${checkoutData.paymentMethod === m.id ? 'checked' : ''}> ${m.icon} ${m.name}</label>
        `).join('')}</div>
        <div class="form-group" style="margin-top:1rem"><label>Promo Code</label>
          <div style="display:flex;gap:0.5rem"><input id="promo-input" placeholder="Enter code"><button class="btn btn--outline btn--sm" id="apply-promo">Apply</button></div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          <button class="btn btn--outline" id="prev-step">Back</button>
          <button class="btn btn--primary" id="next-step">Review Order</button>
        </div>`;

      DOM.$$('input[name="payment"]').forEach(r => {
        r.addEventListener('change', () => { checkoutData.paymentMethod = r.value; });
      });

      DOM.$('#apply-promo').addEventListener('click', () => {
        const code = DOM.$('#promo-input').value.trim().toUpperCase();
        if (code === 'SUKI10') { checkoutData.discount = cart.subtotal * 0.1; checkoutData.promoCode = code; Components.toast('10% discount applied!'); }
        else if (code === 'FREESHIP') { checkoutData.discount = 0; checkoutData.freeShip = true; Components.toast('Free shipping applied!'); }
        else Components.toast('Invalid promo code', 'error');
      });
    }

    if (step === 4) {
      const address = user.addresses?.find(a => a.id === checkoutData.addressId);
      const zone = CONFIG.deliveryZones.find(z => z.id === checkoutData.zoneId);
      const slot = CONFIG.deliverySlots.find(s => s.id === checkoutData.slotId);
      const payment = CONFIG.paymentMethods.find(m => m.id === checkoutData.paymentMethod);
      let deliveryFee = checkoutData.freeShip ? 0 : await API.delivery.calculateFee(cart.subtotal, checkoutData.zoneId);
      const total = cart.subtotal - checkoutData.discount + deliveryFee;

      panel.innerHTML = `
        <h3>Review Your Order</h3>
        ${cart.items.map(i => `<div class="summary-row"><span>${i.quantity}x ${DOM.escapeHtml(i.product.name)} (${i.variant.unit})</span><span>${Format.currency(i.lineTotal)}</span></div>`).join('')}
        <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
        <div class="summary-row"><span>Subtotal</span><span>${Format.currency(cart.subtotal)}</span></div>
        ${checkoutData.discount ? `<div class="summary-row"><span>Discount (${checkoutData.promoCode})</span><span>-${Format.currency(checkoutData.discount)}</span></div>` : ''}
        <div class="summary-row"><span>Delivery (${zone?.name})</span><span>${deliveryFee === 0 ? 'FREE' : Format.currency(deliveryFee)}</span></div>
        <div class="summary-row summary-row--total"><span>Total</span><span>${Format.currency(total)}</span></div>
        <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
        <p><strong>Deliver to:</strong> ${address ? DOM.escapeHtml(address.street) + ', ' + DOM.escapeHtml(address.city) : 'N/A'}</p>
        <p><strong>Date & Slot:</strong> ${Format.date(checkoutData.deliveryDate)} · ${slot?.label}</p>
        <p><strong>Payment:</strong> ${payment?.icon} ${payment?.name}</p>
        <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
          <button class="btn btn--outline" id="prev-step">Back</button>
          <button class="btn btn--primary btn--lg" id="place-order">Place Order</button>
        </div>`;

      DOM.$('#place-order').addEventListener('click', async () => {
        const btn = DOM.$('#place-order');
        btn.disabled = true;
        btn.textContent = 'Processing…';
        const paymentResult = await API.payment.process(checkoutData.paymentMethod, total);
        if (paymentResult.success) {
          const order = await API.order.create({
            userId: user.id,
            userName: user.name,
            items: cart.items.map(i => ({
              productId: i.productId, variantId: i.variantId, quantity: i.quantity,
              name: i.product.name, unit: i.variant.unit, price: i.variant.price, lineTotal: i.lineTotal
            })),
            subtotal: cart.subtotal,
            discount: checkoutData.discount,
            deliveryFee,
            total,
            address,
            zone: zone?.name,
            deliveryDate: checkoutData.deliveryDate,
            deliverySlot: slot?.label,
            paymentMethod: payment?.name,
            transactionId: paymentResult.data.transactionId,
            promoCode: checkoutData.promoCode
          });
          await API.cart.clear(user.id);
          window.location.href = `orders.html?id=${order.data.id}&success=1`;
        }
      });
    }

    DOM.$('#next-step')?.addEventListener('click', () => { step++; renderPanel(); });
    DOM.$('#prev-step')?.addEventListener('click', () => { step--; renderPanel(); });
  }

  const summaryEl = DOM.$('#checkout-summary');
  if (summaryEl) {
    summaryEl.innerHTML = cart.items.map(i =>
      `<div class="summary-row"><span>${i.quantity}x ${DOM.escapeHtml(i.product.name)}</span><span>${Format.currency(i.lineTotal)}</span></div>`
    ).join('') + `<div class="summary-row summary-row--total"><span>Subtotal</span><span>${Format.currency(cart.subtotal)}</span></div>`;
  }

  await renderPanel();
});
