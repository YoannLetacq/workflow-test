// tests — node --test. Asserts equatorialToHorizontal matches astropy refs.json
// within 0.02 deg (measured worst ≈0.0085°), plus Polaris-alt≈latitude sanity
// and star catalog load.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { equatorialToHorizontal } from '../src/astro.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const refs = JSON.parse(readFileSync(here('./refs.json'), 'utf8'));

// smallest signed angular difference in degrees (handles 359/0 wraparound)
const angDiff = (a, b) => {
  let d = ((a - b + 180) % 360 + 360) % 360 - 180;
  return Math.abs(d);
};

test('equatorialToHorizontal reproduces astropy refs within 0.02 deg', () => {
  assert.ok(refs.length > 0, 'refs.json has entries');
  for (const r of refs) {
    const { alt, az } = equatorialToHorizontal(r.ra, r.dec, r.lat, r.lon, new Date(r.utc));
    assert.ok(
      angDiff(alt, r.alt_expected) <= 0.02,
      `${r.star}@${r.site} alt ${alt.toFixed(4)} vs ${r.alt_expected} (Δ${angDiff(alt, r.alt_expected).toFixed(4)})`
    );
    assert.ok(
      angDiff(az, r.az_expected) <= 0.02,
      `${r.star}@${r.site} az ${az.toFixed(4)} vs ${r.az_expected} (Δ${angDiff(az, r.az_expected).toFixed(4)})`
    );
  }
});

test('Polaris altitude ≈ observer latitude', () => {
  // Polaris ~ north celestial pole → alt ≈ lat for any longitude/time.
  const polaris = { ra: 37.954561, dec: 89.264109 };
  for (const lat of [10, 35, 48.8566, 60]) {
    const { alt } = equatorialToHorizontal(polaris.ra, polaris.dec, lat, 0, new Date('2024-03-20T21:00:00Z'));
    assert.ok(Math.abs(alt - lat) < 1.0, `Polaris alt ${alt.toFixed(3)} ≈ lat ${lat}`);
  }
});

test('star catalog loads >4000 entries', () => {
  const stars = JSON.parse(readFileSync(here('../data/stars.json'), 'utf8'));
  assert.ok(Array.isArray(stars), 'stars.json is an array');
  assert.ok(stars.length > 4000, `stars.length ${stars.length} > 4000`);
  const s = stars[0];
  assert.ok('ra' in s && 'dec' in s && 'mag' in s, 'entries have ra/dec/mag');
});
