/**
 * Formatting utilities – currency, dates, units
 */
const Format = {
  currency(amount) {
    return `${CONFIG.currencySymbol}${Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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
