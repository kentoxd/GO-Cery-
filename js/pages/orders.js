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
    const isManualQr = CONFIG.manualPaymentMethods.includes(order.paymentMethod);
    const qrCodes = isManualQr ? await API.cms.getPaymentQrCodes() : null;
    const qrUrl = qrCodes ? (order.paymentMethod === 'GCash' ? qrCodes.gcashQrUrl : qrCodes.mayaQrUrl) : '';

    function receiptPanelInnerHtml() {
      return `
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
        <div class="order-track">
          ${CONFIG.orderStatuses.slice(0, 5).map((s, i) => `
            <div class="track-step ${i < statusIdx ? 'done' : ''} ${i === statusIdx ? 'active' : ''}">
              <div class="track-step__dot">${i < statusIdx ? '✓' : i + 1}</div>
              <div class="track-step__label">${s}</div>
            </div>
          `).join('')}
        </div>
        ${isManualQr ? `<div class="receipt-panel" id="receipt-panel">${receiptPanelInnerHtml()}</div>` : ''}
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

    bindReceiptPanel();

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
