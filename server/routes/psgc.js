/**
 * server/routes/psgc.js
 * Serves address data for the ONLY two areas Go! Cery actually delivers
 * to — Metro Manila and Rizal Province — from a local bundled dataset
 * (server/data/psgc/*.json). No external API call at request time.
 *
 * Source: trimmed down from the public "philippine-addresses" 2019v2
 * dataset to just these two regions, since bundling the full national
 * dataset made no sense for a business that only serves these areas.
 *
 * Structure notes:
 * - "Metro Manila" has 5 real sub-areas (its legislative districts, e.g.
 *   "National Capital Region - Manila") — returned as real "provinces"
 *   so the existing 4-level Region → Province → City → Barangay
 *   dropdown UI needs no frontend changes.
 * - "Rizal Province" has no sub-provinces, so /provinces intentionally
 *   returns empty for it — this triggers the EXISTING frontend fallback
 *   already written in checkout.js ("if no provinces, fetch cities
 *   using the region id directly"). Internally, Rizal's region id is
 *   mapped to a dedicated virtual province id below.
 *
 * IMPORTANT — ID scheme: every id in this dataset (regions, provinces,
 * cities, barangays) is drawn from ONE global counter, so no number
 * ever means two different things depending on which endpoint receives
 * it. Two earlier versions of this file used separate per-type counters
 * and got bitten by real collisions during testing (e.g. Rizal's
 * region_id numerically equaling a real NCR district's province_id) —
 * if you regenerate data/psgc/*.json, keep using one shared counter
 * across every entity type, or this bug WILL come back.
 */
const express = require('express');
const router = express.Router();

const regions = require('../data/psgc/region.json');
const provinces = require('../data/psgc/province.json');
const muncities = require('../data/psgc/muncity.json');
const barangays = require('../data/psgc/barangay.json');

// Must match data/psgc's generation script output exactly.
const RIZAL_REGION_ID = 1746;
const RIZAL_VIRTUAL_PROVINCE_ID = 1747;

function toOption(id, name) {
  return { psgc_id: id, name };
}

router.get('/regions', (_req, res) => {
  res.json({ success: true, data: regions.map(r => toOption(r.region_id, r.name)) });
});

router.get('/provinces', (req, res) => {
  const regionId = parseInt(req.query.id, 10);
  if (regionId === RIZAL_REGION_ID) {
    return res.json({ success: true, data: [] }); // intentional — see file header
  }
  const list = provinces.filter(p => p.region_id === regionId);
  res.json({ success: true, data: list.map(p => toOption(p.province_id, p.name)) });
});

router.get('/municipal-cities', (req, res) => {
  // parentId is normally a real province_id. For Rizal, the frontend
  // passes the region_id instead (since getProvinces returned empty) —
  // explicitly remap that to Rizal's virtual province_id.
  let parentId = parseInt(req.query.id, 10);
  if (parentId === RIZAL_REGION_ID) parentId = RIZAL_VIRTUAL_PROVINCE_ID;
  const list = muncities.filter(m => m.province_id === parentId);
  res.json({ success: true, data: list.map(m => toOption(m.muncity_id, m.name)) });
});

router.get('/barangays', (req, res) => {
  const muncityId = parseInt(req.query.id, 10);
  const list = barangays.filter(b => b.muncity_id === muncityId);
  res.json({ success: true, data: list.map(b => toOption(b.barangay_id, b.name)) });
});

module.exports = router;
