/**
 * js/modules/mailer.js
 * Emails the customer whenever their order status changes (placed, confirmed, preparing,
 * out for delivery, delivered, cancelled, refunded). Uses EmailJS from the browser.
 * A failed email never blocks the order update.
 */
const Mailer = {
  SITE_URL: 'https://go--cery.web.app',

  TEXT: {
    'Pending': { title: 'We received your order', message: 'Thank you for ordering from Go! Cery. We will confirm your order shortly.' },
    'Confirmed': { title: 'Your order is confirmed', message: 'Your order is confirmed and we are getting it ready.' },
    'Preparing': { title: 'We are preparing your order', message: 'Our team is picking and packing your items fresh from the market.' },
    'Out for Delivery': { title: 'Your order is on its way', message: 'Your order is out for delivery. Please be ready to receive it.' },
    'Delivered': { title: 'Your order was delivered', message: 'Your order has been delivered. Enjoy! You can now leave a review for the items you received.' },
    'Cancelled': { title: 'Your order was cancelled', message: 'Your order has been cancelled. If you already paid, please contact us about your refund.' },
    'Refunded': { title: 'Your order was refunded', message: 'Your order has been refunded.' }
  },

  isConfigured() {
    return typeof EMAILJS_CONFIG !== 'undefined'
      && typeof ORDER_EMAIL_TEMPLATE_ID !== 'undefined'
      && !!EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY'
      && !!EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.serviceId !== 'YOUR_SERVICE_ID'
      && !!ORDER_EMAIL_TEMPLATE_ID && ORDER_EMAIL_TEMPLATE_ID !== 'YOUR_ORDER_TEMPLATE_ID';
  },

  /** Newer orders carry userEmail; for older ones, look it up in the customer's profile. */
  async _recipient(order) {
    if (order.userEmail) return { email: order.userEmail, name: order.userName || 'Customer' };
    try {
      const doc = await FirebaseApp.collections.users().doc(order.userId).get();
      if (doc.exists && doc.data().email) return { email: doc.data().email, name: doc.data().name || order.userName || 'Customer' };
    } catch (err) {
      console.warn('[mailer] could not look up the customer email:', err.message);
    }
    return null;
  },

  _params(order, status, to, note) {
    const text = this.TEXT[status] || { title: 'Your order status changed', message: 'Your order is now: ' + status + '.' };
    const items = order.items || [];
    const parts = [];
    for (let i = 0; i < items.length; i++) parts.push(items[i].quantity + 'x ' + items[i].name);
    const when = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const paid = order.paymentStatus === 'paid' ? 'Paid' : (order.paymentMethod === 'Cash on Delivery' ? 'Pay on delivery' : 'Payment pending');
    return {
      email: to.email,
      user_name: to.name,
      order_id: order.id,
      order_status: status,
      status_title: text.title,
      status_message: text.message,
      note: note || '',
      order_total: CONFIG.currencySymbol + Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item_count: String(items.length),
      items_summary: parts.join(', '),
      delivery_info: [when, order.deliverySlot].filter(Boolean).join(', '),
      payment_info: order.paymentMethod + ' - ' + paid,
      order_link: this.SITE_URL + '/pages/orders.html?id=' + order.id
    };
  },

  /** Returns true when the email was sent. Never throws. */
  async sendOrderStatus(order, status, note) {
    try {
      if (!this.isConfigured()) return false;
      const to = await this._recipient(order);
      if (!to) return false;
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_CONFIG.serviceId,
          template_id: ORDER_EMAIL_TEMPLATE_ID,
          user_id: EMAILJS_CONFIG.publicKey,
          template_params: this._params(order, status, to, note)
        })
      });
      if (!res.ok) console.warn('[mailer] EmailJS said:', await res.text());
      return res.ok;
    } catch (err) {
      console.warn('[mailer] order email failed:', err.message);
      return false;
    }
  }
};
