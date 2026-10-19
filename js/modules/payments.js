/**
 * js/modules/payments.js
 * Online payments through PayMongo (card and QR Ph).
 *  - Our server (CONFIG.apiBaseUrl) creates the payment from the saved order, so the amount can't be changed here.
 *  - Card details go straight from the browser to PayMongo with the PUBLIC key. They never touch our server.
 */
const Payments = {
  enabled() {
    return !!CONFIG.apiBaseUrl;
  },

  async _token() {
    const user = firebase.auth().currentUser;
    return user ? user.getIdToken() : null;
  },

  async _server(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = await this._token();
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
      res = await fetch(CONFIG.apiBaseUrl + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (err) {
      return { success: false, error: 'Could not reach the payment server. Please try again in a moment.' };
    }
    let json = {};
    try { json = await res.json(); } catch (err) { json = {}; }
    if (!res.ok || json.success === false) {
      return { success: false, error: json.error || 'Payment request failed (' + res.status + ')' };
    }
    return json;
  },

  async _paymongo(path, publicKey, attributes) {
    let res;
    try {
      res = await fetch('https://api.paymongo.com/v1' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(publicKey + ':') },
        body: JSON.stringify({ data: { attributes } })
      });
    } catch (err) {
      return { ok: false, message: 'Could not reach PayMongo. Please check your connection.' };
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const first = json.errors && json.errors[0];
      return { ok: false, message: (first && (first.detail || first.code)) || 'PayMongo could not process the card.' };
    }
    return { ok: true, data: json.data };
  },

  async getConfig() {
    try {
      const res = await fetch(CONFIG.apiBaseUrl + '/api/payments/config');
      const json = await res.json();
      return json.data || {};
    } catch (err) {
      return {};
    }
  },

  /**
   * card = { name, number, expiry: 'MM/YY', cvc }
   * Returns { success, status: 'succeeded' | 'redirect' | 'processing', redirectUrl, error }
   */
  async payWithCard(orderId, card, email) {
    const intent = await this._server('POST', '/api/payments/intent', { orderId });
    if (!intent.success) return { success: false, error: intent.error };
    const info = intent.data;

    const parts = String(card.expiry).split('/');
    const month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (year > 99) year = year % 100; // PayMongo takes the 2-digit year
    if (!month || month < 1 || month > 12 || !year) {
      return { success: false, error: 'Enter the expiry date as MM/YY.' };
    }

    const method = await this._paymongo('/payment_methods', info.publicKey, {
      type: 'card',
      details: { card_number: String(card.number).replace(/\D/g, ''), exp_month: month, exp_year: year, cvc: String(card.cvc) },
      billing: { name: card.name, email: email || 'customer@gocery.ph' }
    });
    if (!method.ok) return { success: false, error: method.message };

    const returnUrl = this._paymentReturnUrl(orderId);
    const attached = await this._paymongo('/payment_intents/' + info.paymentIntentId + '/attach', info.publicKey, {
      payment_method: method.data.id, client_key: info.clientKey, return_url: returnUrl
    });
    if (!attached.ok) return { success: false, error: attached.message };

    const attrs = attached.data.attributes;
    if (attrs.status === 'succeeded') return { success: true, status: 'succeeded' };
    if (attrs.status === 'processing') return { success: true, status: 'processing' };
    if (attrs.status === 'awaiting_next_action' && attrs.next_action && attrs.next_action.redirect) {
      return { success: true, status: 'redirect', redirectUrl: attrs.next_action.redirect.url };
    }
    const lastError = attrs.last_payment_error;
    return { success: false, error: (lastError && (lastError.failed_message || lastError.message)) || 'The card was declined. Please try another card.' };
  },

  /** GCash: returns { success, data: { redirectUrl } }. The customer approves the payment on PayMongo's page. */
  startEwallet(orderId) {
    const returnUrl = this._paymentReturnUrl(orderId);
    return this._server('POST', '/api/payments/ewallet', { orderId, returnUrl });
  },

  _paymentReturnUrl(orderId) {
    const host = window.location.hostname;
    const notPublic = host === 'localhost' || host === '127.0.0.1';
    const origin = (notPublic && CONFIG.publicAppUrl ? CONFIG.publicAppUrl : window.location.origin).replace(/\/$/, '');
    const path = notPublic ? '/orders.html' : window.location.pathname;
    return origin + path + '?id=' + encodeURIComponent(orderId) + '&pm=return';
  },

  startQr(orderId) {
    return this._server('POST', '/api/payments/qrph', { orderId });
  },

  /** Asks the server to check with PayMongo whether this order has been paid. */
  verify(orderId) {
    return this._server('POST', '/api/payments/verify', { orderId });
  }
};
