/**
 * js/modules/address-map.js
 * Mapbox address picker: type-ahead search + draggable pin, with
 * reverse geocoding to confirm the final address text.
 * Requires CONFIG.mapboxToken and mapbox-gl (loaded via CDN in the HTML).
 */
const AddressMap = {
  init(containerId, options = {}) {
    if (!window.mapboxgl) {
      console.error('AddressMap: mapbox-gl.js not loaded.');
      return null;
    }
    if (!CONFIG.mapboxToken || CONFIG.mapboxToken.includes('YOUR_')) {
      console.error('AddressMap: CONFIG.mapboxToken is not set. Add your Mapbox public token to js/config.js.');
      return null;
    }
    mapboxgl.accessToken = CONFIG.mapboxToken;

    const GEOCODE_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
    const defaultCenter = options.defaultCenter || [121.0437, 14.6507]; // Metro Manila
    let selection = null;
    let debounceTimer = null;

    const map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 11
    });
    map.on('load', () => map.resize());

    const marker = new mapboxgl.Marker({ draggable: true });

    // Show a pin immediately, at the default center, so there's always
    // something visible and draggable — don't wait for a search result
    // that might never come back (PH geocoding coverage is inconsistent).
    marker.setLngLat(defaultCenter).addTo(map);

    // Click anywhere on the map to drop the pin there directly — the
    // guaranteed fallback that doesn't depend on search/geocoding at all.
    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      const placeName = await reverseGeocode(lng, lat);
      placeMarker(lng, lat, placeName);
    });

    function notify() {
      if (options.onLocationSelected && selection) options.onLocationSelected(selection);
    }

    marker.on('dragend', async () => {
      const { lng, lat } = marker.getLngLat();
      const placeName = await reverseGeocode(lng, lat);
      selection = { lat, lng, placeName };
      notify();
    });

    function placeMarker(lng, lat, placeName) {
      marker.setLngLat([lng, lat]).addTo(map);
      map.flyTo({ center: [lng, lat], zoom: 16 });
      selection = { lat, lng, placeName };
      notify();
    }

    async function reverseGeocode(lng, lat) {
      try {
        const res = await fetch(`${GEOCODE_API}/${lng},${lat}.json?access_token=${CONFIG.mapboxToken}&limit=1`);
        const data = await res.json();
        return data.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    }

    function search(query, onResults) {
      clearTimeout(debounceTimer);
      if (!query || query.trim().length < 3) { onResults([]); return; }
      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(
            `${GEOCODE_API}/${encodeURIComponent(query)}.json?access_token=${CONFIG.mapboxToken}` +
            `&country=PH&proximity=${defaultCenter[0]},${defaultCenter[1]}&limit=5`
          );
          const data = await res.json();
          onResults(data.features || []);
        } catch (err) {
          console.error('AddressMap: geocode search failed:', err);
          onResults([]);
        }
      }, 400);
    }

    function getSelection() { return selection; }

    return { search, placeMarker, getSelection, map };
  }
};
