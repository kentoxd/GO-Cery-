/**
 * js/modules/psgc.js
 * Local, offline PSGC (Philippine Standard Geographic Code) lookup —
 * backed by js/data/psgc-data.js (no external API, no network dependency).
 *
 * "psgc_id" values here are synthetic pipe-delimited paths (not official
 * PSGC codes) built purely to identify a node in the local tree — e.g.
 * "NCR|CITY OF MAKATI" or "RIZAL|ANGONO|SAN ROQUE". They only exist to
 * chain the next lookup and are never sent anywhere.
 */
const PSGC = {
  _split(id) {
    return String(id).split('|');
  },

  _regionNode(regionId) {
    return PSGC_DATA[regionId] || null;
  },

  /** Resolves a pipe-delimited path to its node in the local tree. */
  _resolve(pathParts) {
    const [regionId, ...rest] = pathParts;
    const regionNode = this._regionNode(regionId);
    if (!regionNode) return null;
    if (!rest.length) return regionNode;

    if (regionNode.province_list) {
      const [provinceName, ...rest2] = rest;
      const provinceNode = regionNode.province_list[provinceName];
      if (!provinceNode) return null;
      if (!rest2.length) return provinceNode;
      const [cityName] = rest2;
      return provinceNode.municipality_list?.[cityName] || null;
    }

    const [cityName] = rest;
    return regionNode.municipality_list?.[cityName] || null;
  },

  getRegions() {
    return Promise.resolve([
      { psgc_id: 'NCR', name: 'Metro Manila (NCR)' },
      { psgc_id: 'RIZAL', name: 'Rizal Province' }
    ]);
  },

  /** regionId: e.g. "NCR". Returns [] for regions with no province layer
   *  (e.g. Rizal, where municipalities sit directly under the province). */
  getProvinces(regionId) {
    const node = this._regionNode(regionId);
    const list = node?.province_list;
    if (!list) return Promise.resolve([]);
    return Promise.resolve(
      Object.keys(list).map(name => ({ psgc_id: `${regionId}|${name}`, name }))
    );
  },

  /** parentId: a region id (e.g. "RIZAL") or a "region|province" id */
  getCitiesMunicipalities(parentId) {
    const node = this._resolve(this._split(parentId));
    const list = node?.municipality_list;
    if (!list) return Promise.resolve([]);
    return Promise.resolve(
      Object.keys(list).map(name => ({ psgc_id: `${parentId}|${name}`, name }))
    );
  },

  /** cityId: a "region|city" or "region|province|city" id */
  getBarangays(cityId) {
    const node = this._resolve(this._split(cityId));
    const list = node?.barangay_list;
    if (!list) return Promise.resolve([]);
    return Promise.resolve(
      list.map(name => ({ psgc_id: `${cityId}|${name}`, name }))
    );
  }
};
