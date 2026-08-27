/**
 * js/utils/http.js
 * Minimal fetch wrapper for calling our own backend (server/). Attaches
 * the current Firebase ID token automatically. Requires CONFIG.apiBaseUrl.
 */
const Http = {
  async _request(method, path, body) {
    const url = `${CONFIG.apiBaseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      headers['Authorization'] = `Bearer ${await currentUser.getIdToken()}`;
    }
    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (err) {
      return { success: false, error: 'Could not reach the server. Is it running?' };
    }
    let json = {};
    try { json = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      return { success: false, error: json.error || `Request failed (${res.status})` };
    }
    return json;
  },
  get(path) { return this._request('GET', path); },
  post(path, body) { return this._request('POST', path, body); },
  put(path, body) { return this._request('PUT', path, body); },
  patch(path, body) { return this._request('PATCH', path, body); }
};
