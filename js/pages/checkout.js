App.ready().then(async () => {
  await Components.initLayout('checkout');

  const user = API.user.getCurrent();
  if (!user) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const returnParams = DOM.getQueryParams();
  if (returnParams.id && returnParams.pm === 'return') {
    window.location.replace('orders.html?id=' + encodeURIComponent(returnParams.id) + '&pm=return');
    return;
  }

  const fullCart = await API.cart.getEnriched(user.id);

  // Only pay for the items picked on the cart page (all items if nothing was picked).
  let pickedKeys = null;
  try { pickedKeys = JSON.parse(sessionStorage.getItem('gocery_checkout_selection') || 'null'); } catch (e) { pickedKeys = null; }
  const cartItems = pickedKeys
    ? fullCart.items.filter(i => pickedKeys.includes(`${i.productId}|${i.variantId}`))
    : fullCart.items;
  const cart = {
    items: cartItems,
    subtotal: cartItems.reduce((sum, i) => sum + i.lineTotal, 0),
    itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0)
  };
  if (!cart.items.length) {
    window.location.href = 'cart.html';
    return;
  }

  // After an order, remove only the items that were paid for and keep the rest in the cart.
  async function removePaidItems() {
    for (const i of cart.items) {
      await API.cart.remove(user.id, i.productId, i.variantId);
    }
    sessionStorage.removeItem('gocery_checkout_selection');
  }

  let step = 1;
  let addressMap = null;
  // Returning customers: start from the address and payment method they used last time.
  const lastPick = Storage.get('gocery_last_checkout', {}) || {};
  const rememberedAddress = (user.addresses || []).some(a => a.id === lastPick.addressId) ? lastPick.addressId : null;
  const paymentsOnline = typeof Payments !== 'undefined' && Payments.enabled();
  const availableMethods = CONFIG.paymentMethods.filter(m => {
    if (m.online && !CONFIG.apiBaseUrl) return false;
    // When PayMongo is configured, use GCash/Maya (Online) instead of manual merchant QR codes.
    if (paymentsOnline && (m.id === 'gcash' || m.id === 'maya')) return false;
    return true;
  });
  function normalizePaymentId(id) {
    if (!paymentsOnline) return id;
    if (id === 'gcash') return 'gcash_online';
    if (id === 'maya') return 'maya_online';
    return id;
  }
  const rememberedPayment = availableMethods.some(m => m.id === normalizePaymentId(lastPick.paymentMethod))
    ? normalizePaymentId(lastPick.paymentMethod)
    : 'cod';
  let checkoutData = {
    addressId: rememberedAddress || user.addresses?.[0]?.id || null,
    zoneId: CONFIG.deliveryZones[0].id,
    slotId: CONFIG.deliverySlots[0].id,
    deliveryDate: API.delivery.getNextDeliveryDate(),
    paymentMethod: rememberedPayment,
    promoCode: '',
    discount: 0,
    freeShip: false
  };

  function renderSteps() {
    const steps = step === 5
      ? ['Address', 'Delivery', 'Payment', 'Review', 'Pay']
      : ['Address', 'Delivery', 'Payment', 'Review'];
    DOM.$('#checkout-steps').innerHTML = steps.map((s, i) => {
      const n = i + 1;
      const isDone = n < step || (step === 5 && n < 5);
      const isActive = n === step;
      return `<div class="checkout-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" ${isActive ? 'aria-current="step"' : ''}>${isDone ? '✓' : n}. ${s}</div>`;
    }).join('');
  }

  function isManualQrPayment(method) {
    return method === 'gcash' || method === 'maya';
  }

  function isOnlinePaymentMethod(methodId) {
    const entry = CONFIG.paymentMethods.find(m => m.id === methodId);
    return !!(entry && entry.online);
  }

  /** PayMongo UI after the order is saved (same flows as orders.js). */
  let payPolling = false;

  function showOnlinePayPanel(order) {
    step = 5;
    renderSteps();
    const panel = DOM.$('#checkout-panel');
    if (!paymentsOnline) {
      panel.innerHTML = `
        <h3>Complete payment</h3>
        <p class="form-error">Online payment is not available right now. Open your order to try again or contact the seller.</p>
        <a href="orders.html?id=${DOM.escapeHtml(order.id)}" class="btn btn--primary">View My Order</a>`;
      return;
    }

    const failed = order.paymentStatus === 'failed'
      ? `<p class="form-error" role="alert">Your last payment did not go through${order.paymentFailureReason ? ': ' + DOM.escapeHtml(order.paymentFailureReason) : ''}. You can try again.</p>`
      : '';

    panel.innerHTML = `
      <h3>Complete payment</h3>
      <p class="receipt-panel__alert" role="alert">Pay ${Format.currency(order.total)} to confirm order ${DOM.escapeHtml(order.id)}.</p>
      ${failed}
      <div id="pay-body"></div>
      <p class="form-error" id="pay-error" role="alert"></p>
      <p style="margin-top:1rem"><a href="orders.html?id=${DOM.escapeHtml(order.id)}" class="btn btn--outline btn--sm">View order details</a></p>`;

    if (order.paymentMethod === 'QR Ph') renderCheckoutQrPanel(order);
    else if (order.paymentMethod === 'GCash (Online)' || order.paymentMethod === 'Maya (Online)') renderCheckoutEwalletPanel(order);
    else renderCheckoutCardPanel(order);
  }

  async function renderCheckoutCardPanel(o) {
    const cfg = await Payments.getConfig();
    DOM.$('#pay-body').innerHTML = `
      <h3 style="margin:0.5rem 0">Pay with card</h3>
      ${cfg.mode === 'test' ? '<p class="pay-test-note">Test mode: use card 4343 4343 4343 4345, any future expiry date, and any 3-digit CVC. For a 3D Secure test, use 4120 0000 0000 0007. No real money is charged.</p>' : ''}
      <div class="form-group"><label for="card-name">Name on card</label><input id="card-name" autocomplete="cc-name" value="${DOM.escapeHtml(user.name || '')}"></div>
      <div class="form-group"><label for="card-number">Card number</label><input id="card-number" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="4343 4343 4343 4345"></div>
      <div class="pay-row">
        <div class="form-group"><label for="card-expiry">Expiry (MM/YY)</label><input id="card-expiry" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="12/30"></div>
        <div class="form-group"><label for="card-cvc">CVC</label><input id="card-cvc" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123"></div>
      </div>
      <button class="btn btn--primary" id="card-pay-btn">Pay ${Format.currency(o.total)}</button>
      <small class="pay-secure">Your card details are sent directly to PayMongo and are never stored on our servers.</small>`;

    DOM.$('#card-number').addEventListener('input', e => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
      e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
    });
    DOM.$('#card-expiry').addEventListener('input', e => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
      e.target.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
    });

    DOM.$('#card-pay-btn').addEventListener('click', async () => {
      const btn = DOM.$('#card-pay-btn');
      const errorEl = DOM.$('#pay-error');
      errorEl.textContent = '';
      const card = {
        name: DOM.$('#card-name').value.trim(),
        number: DOM.$('#card-number').value,
        expiry: DOM.$('#card-expiry').value,
        cvc: DOM.$('#card-cvc').value.trim()
      };
      if (!card.name || card.number.replace(/\D/g, '').length < 13 || !card.expiry || card.cvc.length < 3) {
        errorEl.textContent = 'Please fill in the name, card number, expiry date, and CVC.';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Processing…';
      const result = await Payments.payWithCard(o.id, card, user.email);
      DOM.$('#card-number').value = '';
      DOM.$('#card-cvc').value = '';
      if (!result.success) {
        errorEl.textContent = result.error;
        btn.disabled = false;
        btn.textContent = 'Pay ' + Format.currency(o.total);
        return;
      }
      if (result.status === 'redirect') {
        btn.textContent = 'Opening your bank…';
        window.location.href = result.redirectUrl;
        return;
      }
      await waitForCheckoutPayment(o.id, 8);
    });
  }

  async function renderCheckoutEwalletPanel(o) {
    const wallet = o.paymentMethod === 'Maya (Online)' ? 'Maya' : 'GCash';
    const cfg = await Payments.getConfig();
    DOM.$('#pay-body').innerHTML = `
      <h3 style="margin:0.5rem 0">Pay with ${wallet}</h3>
      <p style="color:var(--color-text-muted)">You will be taken to PayMongo to approve the payment in your ${wallet} account, then brought back here.</p>
      ${cfg.mode === 'test' ? '<p class="pay-test-note">Test mode: PayMongo will show a test page. Choose <strong>Authorize</strong> to simulate a successful payment, or <strong>Fail</strong> to simulate a failed one. No real money is charged.</p>' : ''}
      <button class="btn btn--primary" id="ewallet-pay-btn">Pay ${Format.currency(o.total)} with ${wallet}</button>`;
    DOM.$('#ewallet-pay-btn').addEventListener('click', async () => {
      const btn = DOM.$('#ewallet-pay-btn');
      const errorEl = DOM.$('#pay-error');
      errorEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Opening ' + wallet + '…';
      try {
        const result = await Payments.startEwallet(o.id);
        if (!result.success) {
          errorEl.textContent = result.error || 'Could not start payment. Please try again.';
          btn.disabled = false;
          btn.textContent = 'Pay ' + Format.currency(o.total) + ' with ' + wallet;
          return;
        }
        if (!result.data?.redirectUrl) {
          errorEl.textContent = 'Payment server did not return a redirect URL.';
          btn.disabled = false;
          btn.textContent = 'Pay ' + Format.currency(o.total) + ' with ' + wallet;
          return;
        }
        window.location.href = result.data.redirectUrl;
      } catch (err) {
        console.error('E-wallet payment failed:', err);
        errorEl.textContent = err.message || 'Payment failed. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Pay ' + Format.currency(o.total) + ' with ' + wallet;
      }
    });
  }

  function renderCheckoutQrPanel(o) {
    DOM.$('#pay-body').innerHTML = `
      <h3 style="margin:0.5rem 0">Pay with QR Ph</h3>
      <p style="color:var(--color-text-muted)">Works with GCash, Maya, GoTyme, and most banking apps.</p>
      <button class="btn btn--primary" id="qr-start-btn">Show my QR code</button>
      <div id="qr-box"></div>`;
    DOM.$('#qr-start-btn').addEventListener('click', async () => {
      const btn = DOM.$('#qr-start-btn');
      const errorEl = DOM.$('#pay-error');
      errorEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Creating QR code…';
      try {
        const result = await Payments.startQr(o.id);
        btn.disabled = false;
        btn.textContent = 'Show a new QR code';
        if (!result.success) {
          errorEl.textContent = result.error || 'Could not create QR code.';
          return;
        }
        DOM.$('#qr-box').innerHTML = `
          <div style="text-align:center;margin:1rem 0">
            <img class="qr-image" src="${result.data.imageUrl}" alt="QR Ph code for ${Format.currency(o.total)}" style="margin:0 auto">
            <p><strong>${Format.currency(o.total)}</strong></p>
            <p style="color:var(--color-text-muted);font-size:0.85rem">Scan it in your banking or e-wallet app. This code works once and expires in ${result.data.expiresInMinutes} minutes.</p>
            <p id="qr-wait" style="font-size:0.85rem">Waiting for your payment…</p>
          </div>
          ${result.data.testUrl ? `<p class="pay-test-note">Test mode: do not scan this code with a real app. Use <a href="${DOM.escapeHtml(result.data.testUrl)}" target="_blank" rel="noopener">this PayMongo link</a> to simulate the payment instead.</p>` : ''}`;
        waitForCheckoutPayment(o.id, 450, true);
      } catch (err) {
        console.error('QR payment failed:', err);
        btn.disabled = false;
        btn.textContent = 'Show my QR code';
        errorEl.textContent = err.message || 'Could not create QR code.';
      }
    });
  }

  async function waitForCheckoutPayment(orderId, tries, quiet) {
    if (payPolling) return;
    payPolling = true;
    const errorEl = DOM.$('#pay-error');
    for (let i = 0; i < tries; i++) {
      const result = await Payments.verify(orderId);
      if (result.success && result.data.paymentStatus === 'paid') {
        payPolling = false;
        Components.toast('Payment received. Thank you!');
        window.location.href = 'orders.html?id=' + orderId + '&success=1';
        return;
      }
      if (result.success && result.data.paymentStatus === 'failed') {
        payPolling = false;
        if (errorEl) errorEl.textContent = result.data.message || 'The payment did not go through.';
        return;
      }
      await new Promise(r => setTimeout(r, quiet ? 4000 : 2000));
    }
    payPolling = false;
    if (errorEl && !quiet) errorEl.textContent = 'We are still waiting for the bank to confirm. Refresh this page or open your order to check again.';
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
            <select id="addr-region" required><option value="">Select region…</option></select>
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
          <input type="hidden" name="zoneId" id="addr-zone-hidden" value="${CONFIG.deliveryZones[0].id}">
          <button type="submit" class="btn btn--outline btn--sm">Add Address</button>
          <p class="form-error" id="addr-error" role="alert"></p>
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

      // ---- PSGC cascading dropdowns (local static dataset, no network dependency) ----
      let selectedRegion = null, selectedProvince = null, selectedCity = null, selectedBarangay = null;

      // Each supported region maps 1:1 to a single delivery zone — no manual
      // zone picking needed, it's fully determined by the region selected above.
      function zoneIdForRegion(regionCode) {
        return regionCode === 'RIZAL' ? 'rizal' : 'metro-manila';
      }

      function fillSelect(el, items, placeholder) {
        el.innerHTML = `<option value="">${placeholder}</option>` +
          items.map(i => `<option value="${i.psgc_id}">${i.name}</option>`).join('');
        el.disabled = false;
      }

      PSGC.getRegions().then(regions => fillSelect(DOM.$('#addr-region'), regions, 'Select region…'));

      DOM.$('#addr-region').addEventListener('change', async e => {
        const code = e.target.value;
        selectedRegion = e.target.options[e.target.selectedIndex]?.text || '';
        DOM.$('#addr-region-hidden').value = selectedRegion;
        DOM.$('#addr-zone-hidden').value = zoneIdForRegion(code);
        const provinceSelect = DOM.$('#addr-province');
        const citySelect = DOM.$('#addr-city-select');
        const barangaySelect = DOM.$('#addr-barangay');
        citySelect.innerHTML = '<option value="">Select a province first</option>'; citySelect.disabled = true;
        barangaySelect.innerHTML = '<option value="">Select a city first</option>'; barangaySelect.disabled = true;
        if (!code) { provinceSelect.innerHTML = '<option value="">Select a region first</option>'; provinceSelect.disabled = true; return; }

        const provinces = await PSGC.getProvinces(code);
        if (!provinces.length) {
          // No province layer for this region (e.g. Rizal) — cities sit directly under the region.
          provinceSelect.innerHTML = '<option value="">N/A for this region</option>';
          provinceSelect.disabled = true;
          const cities = await PSGC.getCitiesMunicipalities(code);
          fillSelect(citySelect, cities, 'Select city/municipality…');
        } else {
          fillSelect(provinceSelect, provinces, 'Select province…');
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
        const cities = await PSGC.getCitiesMunicipalities(code);
        fillSelect(citySelect, cities, 'Select city/municipality…');
      });

      DOM.$('#addr-city-select').addEventListener('change', async e => {
        const code = e.target.value;
        selectedCity = e.target.options[e.target.selectedIndex]?.text || '';
        const barangaySelect = DOM.$('#addr-barangay');
        if (!code) { barangaySelect.innerHTML = '<option value="">Select a city first</option>'; barangaySelect.disabled = true; return; }
        const barangays = await PSGC.getBarangays(code);
        fillSelect(barangaySelect, barangays, 'Select barangay…');
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
        DOM.$('#addr-error').textContent = '';
        if (!selectedBarangay || !selectedCity) {
          DOM.$('#addr-error').textContent = 'Please choose your region, province, city, and barangay from the lists above.';
          DOM.$('#addr-region').focus();
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
        <div class="payment-options">${availableMethods.map(m =>
          `<label class="payment-option">
            <input type="radio" name="payment" value="${m.id}" ${checkoutData.paymentMethod === m.id ? 'checked' : ''}>
            ${m.icon} ${m.name}
          </label>`
        ).join('')}</div>
        <p style="color:var(--color-text-muted);font-size:0.9rem;margin-top:0.5rem">${paymentsOnline
          ? 'Card and GCash/Maya (Online) are processed securely through PayMongo after you review and place your order.'
          : 'GCash and Maya payments are verified manually by the seller after you scan their QR code. Set <code>apiBaseUrl</code> in config to enable online PayMongo checkout.'}</p>
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

        Storage.set('gocery_last_checkout', { addressId: checkoutData.addressId, paymentMethod: checkoutData.paymentMethod });
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

          if (isOnlinePaymentMethod(checkoutData.paymentMethod)) {
            await removePaidItems();
            showOnlinePayPanel(order.data);
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
            await removePaidItems();
            showManualQrPanel(qrUrl, order.data.id, payment?.name);
            return;
          }

          await removePaidItems();
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
            <img src="${qrUrl}" alt="${DOM.escapeHtml(methodName)} QR code" class="qr-image" style="border:1px solid var(--color-border);border-radius:8px">
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
