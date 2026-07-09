/**
 * Formatting utilities – currency, dates, units
 */
const Format = {
  currency(amount) {
    const pesos = CONFIG.pricesInCentavos ? Number(amount) / 100 : Number(amount);
    return `${CONFIG.currencySymbol}${pesos.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  },

  /** CONFIG fees/thresholds are stored in pesos; convert when pricesInCentavos is enabled */
  configCurrency(pesosAmount) {
    const amount = CONFIG.pricesInCentavos
      ? this.toCentavos(pesosAmount)
      : Number(pesosAmount);
    return this.currency(amount);
  },

  freeDeliveryThresholdCentavos() {
    return CONFIG.pricesInCentavos
      ? this.toCentavos(CONFIG.freeDeliveryThreshold)
      : CONFIG.freeDeliveryThreshold;
  },

  toCentavos(pesos) {
    return Math.round(Number(pesos) * 100);
  },

  /** Normalize a variant price to integer centavos for storage */
  normalizePrice(price) {
    const n = Math.round(Number(price));
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('Invalid price');
    }
    return n;
  },

  fromCentavos(centavos) {
    return CONFIG.pricesInCentavos ? Number(centavos) / 100 : Number(centavos);
  },

  unitLabel(unit) {
    const labels = {
      kg: 'per kg',
      '500g': 'per 500g',
      pc: 'per piece',
      pack: 'per pack',
      bunch: 'per bunch',
      dozen: 'per dozen'
    };
    return labels[unit] || `per ${unit}`;
  },

  date(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  dateTime(dateStr) {
    return new Date(dateStr).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  },

  truncate(text, max = 80) {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
};
