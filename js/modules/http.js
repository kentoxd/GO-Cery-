/**
 * HTTP client for Go! Cery backend API
 */
const Http = {
  baseUrl() {
    return CONFIG.apiBaseUrl || '';
  },

  async _headers() {
    const headers = { 'Content-Type': 'application/json' };
    const user = FirebaseApp.auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  },

  async request(method, path, body) {
    const url = `${this.baseUrl()}${path}`;
    const options = {
      method,
      headers: await this._headers()
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || res.statusText || 'Request failed' };
    }
    return data.success !== undefined ? data : { success: true, data };
  },

  get(path) {
    return this.request('GET', path);
  },

  post(path, body) {
    return this.request('POST', path, body);
  },

  patch(path, body) {
    return this.request('PATCH', path, body);
  }
};
