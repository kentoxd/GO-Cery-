App.ready().then(async () => {
  await Components.initLayout('account');

  const user = API.user.getCurrent();
  const params = DOM.getQueryParams();

  function paymentLabel(o) {
    if (o.status === 'Cancelled') return 'Cancelled';
    if (o.paymentStatus === 'paid') return 'Paid';
    if (o.paymentStatus === 'awaiting_payment') return 'Waiting for your payment';
    if (o.paymentStatus === 'failed') return 'Payment failed, you can try again';
    if (o.paymentStatus === 'awaiting_manual_verification') return o.receiptUrl ? 'Receipt received, awaiting verification' : 'Upload your receipt to continue';
    return 'Pay on delivery';
  }

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
    const statusMessages = {
      'Pending': 'We received your order and will confirm it shortly.',
      'Confirmed': 'Your order is confirmed. We are getting it ready.',
      'Preparing': 'Your order is being prepared at the market.',
      'Out for Delivery': 'Your order is on its way to you.',
      'Delivered': 'Your order was delivered. Enjoy! You can now review your products.',
      'Cancelled': 'This order was cancelled.',
      'Refunded': 'This order was refunded.'
    };
    const stepDate = status => {
      const entry = (order.statusHistory || []).find(h => h.status === status);
      return entry ? Format.dateTime(entry.timestamp) : '';
    };
    const isManualQr = CONFIG.manualPaymentMethods.includes(order.paymentMethod);
    const qrCodes = isManualQr ? await API.cms.getPaymentQrCodes() : null;
    const qrUrl = qrCodes ? (order.paymentMethod === 'GCash' ? qrCodes.gcashQrUrl : qrCodes.mayaQrUrl) : '';

    const isOnline = CONFIG.onlinePaymentMethods.includes(order.paymentMethod);
    const needsPayment = isOnline && order.paymentStatus !== 'paid' && !['Cancelled', 'Refunded'].includes(order.status);
    const needsReceipt = isManualQr && order.paymentStatus !== 'paid' && !['Cancelled', 'Refunded'].includes(order.status);

    // ---------- online payment (PayMongo): card and QR Ph ----------
    function renderPayPanel(o) {
      const panel = DOM.$('#pay-panel');
      if (!Payments.enabled()) {
        panel.innerHTML = '<p class="form-error">Online payment is not available right now. Please contact the seller.</p>';
        return;
      }
      const failed = o.paymentStatus === 'failed'
        ? `<p class="form-error" role="alert">Your last payment did not go through${o.paymentFailureReason ? ': ' + DOM.escapeHtml(o.paymentFailureReason) : ''}. You can try again.</p>` : '';
      panel.innerHTML = `
        <p class="receipt-panel__alert" role="alert">Action needed: pay ${Format.currency(o.total)} to confirm this order.</p>
        ${failed}
        <div id="pay-body"></div>
        <p class="form-error" id="pay-error" role="alert"></p>`;
      if (o.paymentMethod === 'QR Ph') renderQrPanel(o);
      else if (o.paymentMethod === 'GCash (Online)' || o.paymentMethod === 'Maya (Online)') renderEwalletPanel(o);
      else renderCardPanel(o);
    }

    async function renderCardPanel(o) {
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
        await waitForPayment(o.id, 8);
      });
    }

    async function renderEwalletPanel(o) {
      const wallet = o.paymentMethod === 'Maya (Online)' ? 'Maya' : 'GCash';
      const cfg = await Payments.getConfig();
      DOM.$('#pay-body').innerHTML = `
        <h3 style="margin:0.5rem 0">Pay with ${wallet}</h3>
        <p style="color:var(--color-text-muted)">You will be taken to PayMongo to approve the payment in your ${wallet} account, then brought back here.</p>
        ${cfg.mode === 'test' ? '<p class="pay-test-note">Test mode: PayMongo will show a test page. Choose <strong>Authorize</strong> to simulate a successful payment, or <strong>Fail</strong> to simulate a failed one. No real money is charged.</p>' : ''}
        <button class="btn btn--primary" id="gcash-pay-btn">Pay ${Format.currency(o.total)} with ${wallet}</button>`;
      DOM.$('#gcash-pay-btn').addEventListener('click', async () => {
        const btn = DOM.$('#gcash-pay-btn');
        const errorEl = DOM.$('#pay-error');
        errorEl.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Opening ' + wallet + '…';
        const result = await Payments.startEwallet(o.id);
        if (!result.success) {
          errorEl.textContent = result.error;
          btn.disabled = false;
          btn.textContent = 'Pay ' + Format.currency(o.total) + ' with ' + wallet;
          return;
        }
        window.location.href = result.data.redirectUrl;
      });
    }

    function renderQrPanel(o) {
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
        const result = await Payments.startQr(o.id);
        btn.disabled = false;
        btn.textContent = 'Show a new QR code';
        if (!result.success) { errorEl.textContent = result.error; return; }
        DOM.$('#qr-box').innerHTML = `
          <div style="text-align:center;margin:1rem 0">
            <img class="qr-image" src="${result.data.imageUrl}" alt="QR Ph code for ${Format.currency(o.total)}" style="margin:0 auto">
            <p><strong>${Format.currency(o.total)}</strong></p>
            <p style="color:var(--color-text-muted);font-size:0.85rem">Scan it in your banking or e-wallet app. This code works once and expires in ${result.data.expiresInMinutes} minutes.</p>
            <p id="qr-wait" style="font-size:0.85rem">Waiting for your payment…</p>
          </div>
          ${result.data.testUrl ? `<p class="pay-test-note">Test mode: do not scan this code with a real app. Use <a href="${DOM.escapeHtml(result.data.testUrl)}" target="_blank" rel="noopener">this PayMongo link</a> to simulate the payment instead.</p>` : ''}`;
        waitForPayment(o.id, 450, true);
      });
    }

    // Asks the server every few seconds whether PayMongo has marked the payment as paid.
    let polling = false;
    async function waitForPayment(orderId, tries, quiet) {
      if (polling) return;
      polling = true;
      for (let i = 0; i < tries; i++) {
        const result = await Payments.verify(orderId);
        if (result.success && result.data.paymentStatus === 'paid') {
          polling = false;
          Components.toast('Payment received. Thank you!');
          window.location.href = 'orders.html?id=' + orderId;
          return;
        }
        if (result.success && result.data.paymentStatus === 'failed') {
          polling = false;
          DOM.$('#pay-error').textContent = result.data.message || 'The payment did not go through.';
          return;
        }
        await new Promise(r => setTimeout(r, quiet ? 4000 : 2000));
      }
      polling = false;
      if (!quiet) DOM.$('#pay-error').textContent = 'We are still waiting for the bank to confirm. Refresh this page in a moment.';
    }

    // Coming back from the 3D Secure page.
    function handleCardReturn(o) {
      history.replaceState(null, '', 'orders.html?id=' + o.id);
      if (o.paymentStatus !== 'paid') waitForPayment(o.id, 8);
    }

    function receiptPanelInnerHtml() {
      return `
        ${(!order.receiptUrl && needsReceipt) ? '<p class="receipt-panel__alert" role="alert">⚠ Action needed: upload your payment receipt so we can confirm your order.</p>' : ''}
        <h3 style="margin:1rem 0 0.5rem">Payment — ${DOM.escapeHtml(order.paymentMethod)}</h3>
        ${order.paymentStatus === 'paid' ? `
          <p class="receipt-panel__status receipt-panel__status--paid">✅ Payment confirmed by the seller.</p>
        ` : `
          <p class="receipt-panel__status receipt-panel__status--pending">⏳ Awaiting payment verification.</p>
        `}
        <details ${qrUrl ? '' : 'hidden'}>
          <summary>View QR code again</summary>
          ${qrUrl ? `<img src="${DOM.escapeHtml(qrUrl)}" alt="${DOM.escapeHtml(order.paymentMethod)} QR code" class="receipt-panel__qr">` : ''}
        </details>
        <div class="receipt-panel__upload">
          <label style="font-weight:600;font-size:0.9rem">${order.receiptUrl ? 'Receipt uploaded' : 'Upload a screenshot of your payment receipt'}</label>
          ${order.receiptUrl ? `
            <a href="${DOM.escapeHtml(order.receiptUrl)}" target="_blank" rel="noopener">
              <img src="${DOM.escapeHtml(order.receiptUrl)}" alt="Uploaded payment receipt" class="receipt-panel__preview">
            </a>
            <p style="font-size:0.8rem;color:var(--color-text-muted)">Uploaded ${Format.dateTime(order.receiptUploadedAt)}. ${order.paymentStatus !== 'paid' ? 'You can replace it below if needed.' : ''}</p>
          ` : ''}
          ${order.paymentStatus !== 'paid' ? `
            <input type="file" id="receipt-file-input" accept="image/*" style="margin-top:0.5rem">
            <button class="btn btn--primary btn--sm" id="receipt-upload-btn" style="margin-top:0.5rem">
              ${order.receiptUrl ? 'Replace Receipt' : 'Upload Receipt'}
            </button>
            <p class="form-error" id="receipt-error"></p>
          ` : ''}
        </div>`;
    }

    function bindReceiptPanel() {
      DOM.$('#receipt-upload-btn')?.addEventListener('click', async () => {
        const fileInput = DOM.$('#receipt-file-input');
        const errorEl = DOM.$('#receipt-error');
        const btn = DOM.$('#receipt-upload-btn');
        const file = fileInput?.files?.[0];
        errorEl.textContent = '';
        if (!file) { errorEl.textContent = 'Please choose an image first.'; return; }

        btn.disabled = true;
        btn.textContent = 'Uploading…';
        const result = await API.order.uploadReceipt(order.id, file);
        if (result.success) {
          Components.toast('Receipt uploaded! The seller will verify it shortly.');
          order.receiptUrl = result.data.receiptUrl;
          order.receiptUploadedAt = result.data.receiptUploadedAt;
          DOM.$('#receipt-panel').innerHTML = receiptPanelInnerHtml();
          bindReceiptPanel();
        } else {
          errorEl.textContent = result.error || 'Upload failed. Please try again.';
          btn.disabled = false;
          btn.textContent = order.receiptUrl ? 'Replace Receipt' : 'Upload Receipt';
        }
      });
    }

    DOM.$('#orders-content').innerHTML = `
      <a href="account.html?tab=orders" style="font-size:0.9rem">← Back to Orders</a>
      <div class="order-card" style="margin-top:1rem">
        <div class="order-card__header">
          <div><h2>${order.id}</h2><small>Placed ${Format.dateTime(order.createdAt)}</small></div>
          <span class="order-status order-status--${order.status.replace(/ /g, '\\ ')}">${order.status}</span>
        </div>
        <p class="order-status-msg">${statusMessages[order.status] || ''}</p>
        ${needsPayment ? `<div class="pay-panel" id="pay-panel"></div>` : ''}
        ${needsReceipt ? `<div class="receipt-panel receipt-panel--top" id="receipt-panel">${receiptPanelInnerHtml()}</div>` : ''}
        <div class="order-track">
          ${CONFIG.orderStatuses.slice(0, 5).map((s, i) => `
            <div class="track-step ${i < statusIdx ? 'done' : ''} ${i === statusIdx ? 'active' : ''}">
              <div class="track-step__dot">${i < statusIdx ? '✓' : i + 1}</div>
              <div class="track-step__label">${s}</div>
              <div class="track-step__date">${stepDate(s)}</div>
            </div>
          `).join('')}
        </div>
        ${isManualQr && !needsReceipt ? `<div class="receipt-panel" id="receipt-panel">${receiptPanelInnerHtml()}</div>` : ''}
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
        <p><strong>Payment:</strong> ${order.paymentMethod} · ${paymentLabel(order)}</p>
        ${order.status === 'Pending' ? `
          <button class="btn btn--outline btn--sm" id="cancel-order-btn" style="margin-top:1rem;color:var(--color-error);border-color:var(--color-error)">Cancel Order</button>
          <p class="form-error" id="cancel-error"></p>` : ''}
      </div>`;

    bindReceiptPanel();
    if (needsPayment) renderPayPanel(order);
    if (isOnline && (params.pm === 'return' || params.payment_intent_id)) handleCardReturn(order);

    DOM.$('#cancel-order-btn')?.addEventListener('click', async () => {
      if (!confirm('Cancel this order? This cannot be undone.')) return;
      const btn = DOM.$('#cancel-order-btn');
      btn.disabled = true;
      const result = await API.order.cancel(order.id);
      if (result.success) {
        Components.toast('Order cancelled.');
        window.location.href = 'orders.html?id=' + order.id;
      } else {
        DOM.$('#cancel-error').textContent = result.error || 'Could not cancel the order.';
        btn.disabled = false;
      }
    });

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
          <p><strong>${Format.currency(o.total)}</strong> · <small>${paymentLabel(o)}</small></p>
          <a href="orders.html?id=${o.id}" class="btn btn--outline btn--sm" style="margin-top:0.5rem">Track Order</a>
        </div>
      `).join('')
    : '<div class="empty-state"><div class="empty-state__icon">📦</div><h3>No orders yet</h3><a href="shop.html" class="btn btn--primary">Shop Now</a></div>';
});
