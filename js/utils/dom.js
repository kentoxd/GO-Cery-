/**
 * DOM utility helpers
 */
const DOM = {
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'className') el.className = val;
      else if (key === 'textContent') el.textContent = val;
      else if (key === 'innerHTML') el.innerHTML = val;
      else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
      else el.setAttribute(key, val);
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    });
    return el;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  getQueryParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  },

  setQueryParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    window.history.replaceState({}, '', url);
  }
};
