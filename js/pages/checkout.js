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
  let addressMap = null;
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

  function isManualQrPayment(method) {
    return method === 'gcash' || method === 'maya';
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
          <div class="form-group"><label>Region</label>
            <select id="addr-region" required><option value="">Loading regions…</option></select>
          </div>
          <div class="form-group" id="addr-province-group"><label>Province</label>
            <select id="addr-province" required disabled><option value="">Select a region first</option></select>
          </div>
          <div class="form-group"><label>City / Municipality</label>
            <select id="addr-city-select" required disabled><option value="">Select a province first</option></select>
          </div>
          <div class="form-group"><label>Barangay</label>
            <select id="addr-barangay" required disabled><option value="">Select a city first</option></select>
          </div>
          <div class="form-group"><label>Street / House / Unit No.</label>
            <input name="street" id="addr-street" required placeholder="House no., street, subdivision" autocomplete="off">
          </div>
          <input type="hidden" name="city" id="addr-city-hidden">
          <input type="hidden" name="province" id="addr-province-hidden">
          <input type="hidden" name="region" id="addr-region-hidden">
          <div id="addr-suggestions" class="address-suggestions" hidden></div>
          <div class="form-group">
            <label>Confirm location on map (drag the pin to fine-tune)</label>
            <div id="address-map" style="height:280px;border-radius:8px;overflow:hidden;border:1px solid var(--color-border)"></div>
            <p id="addr-confirmed-text" style="font-size:0.85rem;color:var(--color-text-muted);margin-top:0.4rem">Select region → province → city → barangay to position the map.</p>
          </div>
          <div class="form-group"><label>Delivery Zone</label>
            <select name="zoneId">${CONFIG.deliveryZones.map(z => `<option value="${z.id}">${z.name} (${Format.currency(z.fee)})</option>`).join('')}</select>
          </div>
          <button type="submit" class="btn btn--outline btn--sm">Add Address</button>
        </form>
        <button class="btn btn--primary" style="margin-top:1rem" id="next-step" ${!user.addresses?.length ? 'disabled' : ''}>Continue to Delivery</button>`;

      DOM.$$('input[name="address"]').forEach(r => {
        r.addEventListener('change', () => { checkoutData.addressId = r.value; DOM.$('#next-step').disabled = false; });
      });

      addressMap = AddressMap.init('address-map', {
        onLocationSelected: ({ placeName }) => {
          DOM.$('#addr-confirmed-text').textContent = `📍 ${placeName}`;
        }
      });

      // ---- PSGC cascading dropdowns ----
      let selectedRegion = null, selectedProvince = null, selectedCity = null, selectedBarangay = null;

      function fillSelect(el, items, placeholder) {
        el.innerHTML = `<option value="">${placeholder}</option>` +
          items.map(i => `<option value="${i.psgc_id}">${i.name}</option>`).join('');
        el.disabled = false;
      }

      PSGC.getRegions()
        .then(regions => fillSelect(DOM.$('#addr-region'), regions, 'Select region…'))
        .catch(err => {
          console.error('PSGC regions failed to load:', err);
          DOM.$('#addr-region').innerHTML = '<option value="">Could not load regions — check your connection</option>';
        });

      DOM.$('#addr-region').addEventListener('change', async e => {
        const code = e.target.value;
        selectedRegion = e.target.options[e.target.selectedIndex]?.text || '';
        DOM.$('#addr-region-hidden').value = selectedRegion;
        const provinceSelect = DOM.$('#addr-province');
        const citySelect = DOM.$('#addr-city-select');
        const barangaySelect = DOM.$('#addr-barangay');
        citySelect.innerHTML = '<option value="">Select a province first</option>'; citySelect.disabled = true;
        barangaySelect.innerHTML = '<option value="">Select a city first</option>'; barangaySelect.disabled = true;
        if (!code) { provinceSelect.innerHTML = '<option value="">Select a region first</option>'; provinceSelect.disabled = true; return; }

        try {
          const provinces = await PSGC.getProvinces(code);
          if (!provinces.length) {
            // No provinces (e.g. NCR) — cities/municipalities sit directly under the region.
            provinceSelect.innerHTML = '<option value="">N/A for this region</option>';
            provinceSelect.disabled = true;
            const cities = await PSGC.getCitiesMunicipalities(code);
            fillSelect(citySelect, cities, 'Select city/municipality…');
          } else {
            fillSelect(provinceSelect, provinces, 'Select province…');
          }
        } catch (err) {
          console.error('PSGC provinces failed to load:', err);
          provinceSelect.innerHTML = '<option value="">Could not load — try again</option>';
        }
      });

      DOM.$('#addr-province').addEventListener('change', async e => {
        const code = e.target.value;
        selectedProvince = e.target.options[e.target.selectedIndex]?.text || '';
        DOM.$('#addr-province-hidden').value = selectedProvince;
        const citySelect = DOM.$('#addr-city-select');
        const barangaySelect = DOM.$('#addr-barangay');
        barangaySelect.innerHTML = '<option value="">Select a city first</option>'; barangaySelect.disabled = true;
        if (!code) { citySelect.innerHTML = '<option value="">Select a province first</option>'; citySelect.disabled = true; return; }
        try {
          const cities = await PSGC.getCitiesMunicipalities(code);
          fillSelect(citySelect, cities, 'Select city/municipality…');
        } catch (err) {
          console.error('PSGC cities failed to load:', err);
          citySelect.innerHTML = '<option value="">Could not load — try again</option>';
        }
      });

      DOM.$('#addr-city-select').addEventListener('change', async e => {
        const code = e.target.value;
        selectedCity = e.target.options[e.target.selectedIndex]?.text || '';
        const barangaySelect = DOM.$('#addr-barangay');
        if (!code) { barangaySelect.innerHTML = '<option value="">Select a city first</option>'; barangaySelect.disabled = true; return; }
        try {
          const barangays = await PSGC.getBarangays(code);
          fillSelect(barangaySelect, barangays, 'Select barangay…');
        } catch (err) {
          console.error('PSGC barangays failed to load:', err);
          barangaySelect.innerHTML = '<option value="">Could not load — try again</option>';
        }
      });

      function composeCityField() {
        const parts = [selectedBarangay, selectedCity, selectedProvince].filter(Boolean);
        DOM.$('#addr-city-hidden').value = parts.join(', ');
      }

      function searchMapFromSelection() {
        if (!selectedBarangay || !selectedCity) return;
        const query = `${selectedBarangay}, ${selectedCity}, ${selectedProvince || ''}, Philippines`;
        addressMap.search(query, (features) => {
          if (features.length) {
            addressMap.placeMarker(features[0].center[0], features[0].center[1], features[0].place_name);
          }
        });
      }

      DOM.$('#addr-barangay').addEventListener('change', e => {
        selectedBarangay = e.target.options[e.target.selectedIndex]?.text || '';
        composeCityField();
        searchMapFromSelection();
      });

      // Free-text street refines the pin further once the barangay is set.
      DOM.$('#addr-street').addEventListener('input', () => {
        if (!selectedBarangay) return;
        const query = `${DOM.$('#addr-street').value}, ${selectedBarangay}, ${selectedCity}, Philippines`;
        addressMap.search(query, (features) => {
          const box = DOM.$('#addr-suggestions');
          if (!features.length) { box.hidden = true; box.innerHTML = ''; return; }
          box.hidden = false;
          box.innerHTML = features.map((f, i) =>
            `<button type="button" class="address-suggestion" data-idx="${i}">${f.place_name}</button>`
          ).join('');
          box.querySelectorAll('.address-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
              const f = features[parseInt(btn.dataset.idx, 10)];
              addressMap.placeMarker(f.center[0], f.center[1], f.place_name);
              box.hidden = true;
              box.innerHTML = '';
            });
          });
        });
      });

      DOM.$('#new-address-form').addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedBarangay || !selectedCity) {
          Components.toast('Please select region, province, city, and barangay.', 'error');
          return;
        }
        const fd = new FormData(e.target);
        const location = addressMap?.getSelection();
        const payload = {
          ...Object.fromEntries(fd),
          lat: location?.lat ?? null,
          lng: location?.lng ?? null
        };
        const result = await API.user.addAddress(payload);
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
        <div class="payment-options">${CONFIG.paymentMethods.map(m =>
          `<label class="payment-option">
            <input type="radio" name="payment" value="${m.id}" ${checkoutData.paymentMethod === m.id ? 'checked' : ''}>
            ${m.icon} ${m.name}
          </label>`
        ).join('')}</div>
        <p style="color:var(--color-text-muted);font-size:0.9rem;margin-top:0.5rem">GCash and Maya payments are verified manually by the seller after you scan their QR code.</p>
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
        else if (code === 'FREESHIP') { checkoutData.discount = 0; checkoutData.promoCode = code; checkoutData.freeShip = true; Components.toast('Free shipping applied!'); }
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
        <p style="font-size:0.8rem;color:var(--color-text-muted)">Final total is confirmed by the server at checkout and may differ slightly if prices or stock changed.</p>
        <hr style="margin:1rem 0;border:none;border-top:1px solid var(--color-border)">
        <p><strong>Deliver to:</strong> ${address ? DOM.escapeHtml(address.street) + ', ' + DOM.escapeHtml(address.city) : 'N/A'}</p>
        <p><strong>Date & Slot:</strong> ${Format.date(checkoutData.deliveryDate)} · ${slot?.label}</p>
        <p><strong>Payment:</strong> ${payment?.icon} ${payment?.name}</p>
        <p class="form-error" id="checkout-error"></p>
        <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
          <button class="btn btn--outline" id="prev-step">Back</button>
          <button class="btn btn--primary btn--lg" id="place-order">Place Order</button>
        </div>`;

      DOM.$('#place-order').addEventListener('click', async () => {
        const btn = DOM.$('#place-order');
        const errorEl = DOM.$('#checkout-error');
        btn.disabled = true;
        btn.textContent = 'Processing…';
        errorEl.textContent = '';

        const orderPayload = {
          items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          addressId: checkoutData.addressId,
          zoneId: checkoutData.zoneId,
          slotId: checkoutData.slotId,
          deliveryDate: checkoutData.deliveryDate,
          paymentMethod: payment?.name,
          promoCode: checkoutData.promoCode
        };

        try {
          const order = await API.order.create(orderPayload);
          if (!order.success) {
            errorEl.textContent = order.error || 'Could not create order.';
            btn.disabled = false;
            btn.textContent = 'Place Order';
            return;
          }

          const isManualQr = isManualQrPayment(checkoutData.paymentMethod);
          if (isManualQr) {
            const qrCodes = await API.cms.getPaymentQrCodes();
            const qrUrl = checkoutData.paymentMethod === 'gcash' ? qrCodes.gcashQrUrl : qrCodes.mayaQrUrl;
            if (!qrUrl) {
              errorEl.textContent = `${payment?.name} isn't set up yet — please choose a different payment method.`;
              btn.disabled = false;
              btn.textContent = 'Place Order';
              return;
            }
            await API.cart.clear(user.id);
            showManualQrPanel(qrUrl, order.data.id, payment?.name);
            return;
          }

          await API.cart.clear(user.id);
          window.location.href = `orders.html?id=${order.data.id}&success=1`;
        } catch (err) {
          console.error('Checkout failed:', err);
          errorEl.textContent = err.message || 'Checkout failed. Please try again.';
          btn.disabled = false;
          btn.textContent = 'Place Order';
        }
      });

      /**
       * Shows the merchant's static GCash/Maya QR code. The admin
       * manually verifies payment and confirms via the admin panel.
       */
      function showManualQrPanel(qrUrl, orderId, methodName) {
        panel.innerHTML = `
          <h3>Scan to Pay with ${DOM.escapeHtml(methodName)}</h3>
          <p style="color:var(--color-text-muted)">Open your ${DOM.escapeHtml(methodName)} app and scan this QR code to pay the seller directly.</p>
          <div style="text-align:center;margin:1.5rem 0">
            <img src="${qrUrl}" alt="${DOM.escapeHtml(methodName)} QR code" style="width:260px;height:260px;border:1px solid var(--color-border);border-radius:8px">
          </div>
          <p style="background:#e7f3ff;border:1px solid #b6d7ff;border-radius:6px;padding:0.6rem 0.85rem;font-size:0.85rem">
            Your order has been placed. Payments made this way are confirmed manually — the seller will verify your payment and update your order status once received.
          </p>
          <div style="text-align:center;margin-top:1rem">
            <a href="orders.html?id=${orderId}" class="btn btn--primary">View My Order</a>
          </div>`;
      }
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
