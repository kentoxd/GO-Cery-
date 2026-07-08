/**
 * Storage utility – wraps localStorage with JSON serialization
 */
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  getOrInit(key, initializer) {
    let data = this.get(key);
    if (data === null) {
      data = typeof initializer === 'function' ? initializer() : initializer;
      this.set(key, data);
    }
    return data;
  }
};
