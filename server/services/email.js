/**
 * server/services/email.js
 * Order status emails for changes the SERVER makes (a PayMongo payment confirming an order).
 * Changes made in the admin panel or the app are emailed from the browser (js/modules/mailer.js).
 * Uses the EmailJS REST API. In your EmailJS account, turn on "Allow EmailJS API for non-browser
 * applications" (Account, Security) and copy the private key. Does nothing until all four values are set.
 */
const { getDb } = require('./firebase-admin');

const TEXT = {
  'Pending': { title: 'We received your order', message: 'Thank you for ordering from Go! Cery. We will confirm your order shortly.' },
  'Confirmed': { title: 'Your order is confirmed', message: 'Your order is confirmed and we are getting it ready.' },
  'Preparing': { title: 'We are preparing your order', message: 'Our team is picking and packing your items fresh from the market.' },
  'Out for Delivery': { title: 'Your order is on its way', message: 'Your order is out for delivery. Please be ready to receive it.' },
  'Delivered': { title: 'Your order was delivered', message: 'Your order has been delivered. Enjoy! You can now leave a review for the items you received.' },
  'Cancelled': { title: 'Your order was cancelled', message: 'Your order has been cancelled. If you already paid, please contact us about your refund.' },
  'Refunded': { title: 'Your order was refunded', message: 'Your order has been refunded.' }
};

function isConfigured() {
  return !!(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_ORDER_TEMPLATE_ID
    && process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY);
}

async function recipientFor(order) {
  if (order.userEmail) return { email: order.userEmail, name: order.userName || 'Customer' };
  const doc = await getDb().collection('users').doc(order.userId).get();
  if (doc.exists && doc.data().email) return { email: doc.data().email, name: doc.data().name || order.userName || 'Customer' };
  return null;
}

function buildParams(order, status, to, note) {
  const text = TEXT[status] || { title: 'Your order status changed', message: 'Your order is now: ' + status + '.' };
  const items = order.items || [];
  const parts = [];
  for (let i = 0; i < items.length; i++) parts.push(items[i].quantity + 'x ' + items[i].name);
  const paid = order.paymentStatus === 'paid' ? 'Paid' : (order.paymentMethod === 'Cash on Delivery' ? 'Pay on delivery' : 'Payment pending');
  const siteUrl = process.env.SITE_URL || 'https://go--cery.web.app';
  return {
    email: to.email,
    user_name: to.name,
    order_id: order.id,
    order_status: status,
    status_title: text.title,
    status_message: text.message,
    note: note || '',
    order_total: 'PHP ' + Number(order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    item_count: String(items.length),
    items_summary: parts.join(', '),
    delivery_info: [order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : '', order.deliverySlot].filter(Boolean).join(', '),
    payment_info: order.paymentMethod + ' - ' + paid,
    order_link: siteUrl + '/pages/orders.html?id=' + order.id
  };
}

/** Returns true when sent. Never throws, so a mail problem can never break a payment. */
async function sendOrderStatus(order, status, note) {
  try {
    if (!isConfigured()) return false;
    const to = await recipientFor(order);
    if (!to) return false;
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_ORDER_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: buildParams(order, status, to, note)
      })
    });
    if (!res.ok) console.error('[email] EmailJS said:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('[email] order email failed:', err.message);
    return false;
  }
}

module.exports = { sendOrderStatus, isConfigured, buildParams };
