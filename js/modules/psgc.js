/**
 * js/modules/psgc.js
 * Wraps the free, public Rootscratch PSGC API (Philippine Standard
 * Geographic Code) — no API key required. Used for authoritative
 * region/province/city/barangay dropdowns, since free-text geocoding
 * search alone is unreliable for PH addresses (many barangays and
 * subdivisions aren't well mapped). Docs: https://psgc.rootscratch.com/
 *
 * IMPORTANT: this API's structure changed at least once already (base
 * path moved from /api/psgc/... to just the root domain, and the id
 * field was renamed from `code` to `psgc_id`). If dropdowns get stuck
 * on "Loading…" again in the future, check https://psgc.rootscratch.com/
 * for the current endpoint shape before assuming it's a bug in this file.
 */
const PSGC = {
  BASE: 'https://rootscratch.com',
  _cache: {},

  async _get(path) {
    if (this._cache[path]) return this._cache[path];
    const res = await fetch(`${this.BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`PSGC request failed (${res.status})`);
    const json = await res.json();
    // Defensive: handle either a raw array or a {data: [...]}-wrapped response,
    // since we've already been burned once by this API's shape changing.
    const items = Array.isArray(json) ? json : (json.data || json.regions || []);
    this._cache[path] = items;
    return items;
  },

  getRegions() {
    return this._get('/region');
  },

  /** regionId: the region's `psgc_id` */
  getProvinces(regionId) {
    return this._get(`/province?id=${regionId}`);
  },

  /** provinceId: the province's `psgc_id`. For regions with no provinces
   *  (e.g. NCR), try the region's id here as a best-effort fallback. */
  getCitiesMunicipalities(parentId) {
    return this._get(`/municipal-city?id=${parentId}`);
  },

  /** cityId: the city/municipality's `psgc_id` */
  getBarangays(cityId) {
    return this._get(`/barangay?id=${cityId}`);
  }
};
