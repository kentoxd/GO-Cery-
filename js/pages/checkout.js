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
  let paymongoPublicKey = null;
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

  const paymentConfig = await API.payment.getConfig();
  if (paymentConfig.success) {
    paymongoPublicKey = paymentConfig.data.publicKey;
  }

  function renderSteps() {
    const steps = ['Address', 'Delivery', 'Payment', 'Review'];
    DOM.$('#checkout-steps').innerHTML = steps.map((s, i) =>
      `<div class="checkout-step ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}">${i + 1}. ${s}</div>`
    ).join('');
  }

  function isOnlinePayment(method) {
    return method !== 'cod';
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
            <select name="zoneId">${CONFIG.deliveryZones.map(z => `<option value="${z.id}">${z.name} (${Format.currency(Format.toCentavos(z.fee))})</option>`).join('')}</select>
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
      const onlineMethods = CONFIG.paymentMethods.filter(m => m.id !== 'cod');
      const codAvailable = CONFIG.paymentMethods.find(m => m.id === 'cod');
      panel.innerHTML = `
        <h3>Payment Method</h3>
        <div class="payment-options">${CONFIG.paymentMethods.map(m => {
          const disabled = isOnlinePayment(m.id) && !paymongoPublicKey;
          return `<label class="payment-option ${disabled ? 'disabled' : ''}">
            <input type="radio" name="payment" value="${m.id}" ${checkoutData.paymentMethod === m.id ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
            ${m.icon} ${m.name}${disabled ? ' (unavailable)' : ''}
          </label>`;
        }).join('')}</div>
        ${!paymongoPublicKey ? '<p style="color:var(--color-text-muted);font-size:0.9rem;margin-top:0.5rem">Online payments require the API server. COD is still available.</p>' : ''}
        <div id="card-fields" style="display:${checkoutData.paymentMethod === 'card' ? 'block' : 'none'};margin-top:1rem">
          <div class="form-group"><label>Card Number</label><input id="card-number" placeholder="4571 7360 0000 0008" maxlength="19"></div>
          <div style="display:flex;gap:0.75rem">
            <div class="form-group" style="flex:1"><label>Exp Month</label><input id="card-exp-month" placeholder="12" maxlength="2"></div>
            <div class="form-group" style="flex:1"><label>Exp Year</label><input id="card-exp-year" placeholder="2028" maxlength="4"></div>
            <div class="form-group" style="flex:1"><label>CVC</label><input id="card-cvc" placeholder="123" maxlength="4"></div>
          </div>
          <p style="font-size:0.85rem;color:var(--color-text-muted)">Sandbox test card: 4571 7360 0000 0008</p>
        </div>
        <div class="form-group" style="margin-top:1rem"><label>Promo Code</label>
          <div style="display:flex;gap:0.5rem"><input id="promo-input" placeholder="Enter code"><button class="btn btn--outline btn--sm" id="apply-promo">Apply</button></div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          <button class="btn btn--outline" id="prev-step">Back</button>
          <button class="btn btn--primary" id="next-step">Review Order</button>
        </div>`;

      DOM.$$('input[name="payment"]').forEach(r => {
        r.addEventListener('change', () => {
          checkoutData.paymentMethod = r.value;
          const cardFields = DOM.$('#card-fields');
          if (cardFields) cardFields.style.display = r.value === 'card' ? 'block' : 'none';
        });
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

        const orderPayload = {
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
          promoCode: checkoutData.promoCode
        };

        try {
          if (isOnlinePayment(checkoutData.paymentMethod)) {
            if (!paymongoPublicKey) {
              Components.toast('Online payment not configured', 'error');
              btn.disabled = false;
              btn.textContent = 'Place Order';
              return;
            }

            const order = await API.order.create(orderPayload, { awaitingPayment: true });
            const intentResult = await API.payment.createIntent(order.data.id);
            if (!intentResult.success) {
              Components.toast(intentResult.error || 'Payment setup failed', 'error');
              btn.disabled = false;
              btn.textContent = 'Place Order';
              return;
            }

            const billing = { name: user.name, email: user.email };
            const returnUrl = `${window.location.origin}${window.location.pathname.replace('checkout.html', 'orders.html')}?id=${order.data.id}&payment=return`;

            if (checkoutData.paymentMethod === 'card') {
              const card = {
                number: DOM.$('#card-number')?.value || '4571736000000008',
                expMonth: DOM.$('#card-exp-month')?.value || '12',
                expYear: DOM.$('#card-exp-year')?.value || '2028',
                cvc: DOM.$('#card-cvc')?.value || '123'
              };
              await API.payment.processOnline(paymongoPublicKey, {
                paymentIntentId: intentResult.data.paymentIntentId,
                clientKey: intentResult.data.clientKey,
                method: 'card',
                card,
                billing,
                returnUrl
              });
            } else {
              await API.payment.processOnline(paymongoPublicKey, {
                paymentIntentId: intentResult.data.paymentIntentId,
                clientKey: intentResult.data.clientKey,
                method: checkoutData.paymentMethod,
                billing,
                returnUrl
              });
            }

            await API.cart.clear(user.id);
            window.location.href = `orders.html?id=${order.data.id}&success=1`;
          } else {
            const order = await API.order.create(orderPayload);
            await API.cart.clear(user.id);
            window.location.href = `orders.html?id=${order.data.id}&success=1`;
          }
        } catch (err) {
          Components.toast(err.message || 'Checkout failed', 'error');
          btn.disabled = false;
          btn.textContent = 'Place Order';
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
