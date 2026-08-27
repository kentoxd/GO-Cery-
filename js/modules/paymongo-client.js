/**
 * PayMongo client-side helpers (uses public key only — never the secret key)
 */
const PayMongoClient = {
  _authHeader(publicKey) {
    return 'Basic ' + btoa(publicKey + ':');
  },

  async createPaymentMethod(publicKey, { type, card, billing }) {
    const attributes = { type, billing };
    if (type === 'card' && card) {
      attributes.details = {
        card_number: card.number.replace(/\s/g, ''),
        exp_month: parseInt(card.expMonth, 10),
        exp_year: parseInt(card.expYear, 10),
        cvc: card.cvc
      };
    }

    const res = await fetch('https://api.paymongo.com/v1/payment_methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._authHeader(publicKey)
      },
      body: JSON.stringify({ data: { attributes } })
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.errors?.[0]?.detail || 'Failed to create payment method');
    }
    return body.data;
  },

  async attachPaymentMethod(publicKey, { paymentIntentId, paymentMethodId, clientKey, returnUrl }) {
    const res = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._authHeader(publicKey)
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
            return_url: returnUrl
          }
        }
      })
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.errors?.[0]?.detail || 'Failed to attach payment method');
    }
    return body.data;
  }
};
