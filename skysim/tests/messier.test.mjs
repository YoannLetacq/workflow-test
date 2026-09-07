// tests — node --test. Asserts src/messier.json data loads (110 objects) and that
// the shared equatorialToHorizontal core (astro.js) reproduces the astropy
// refs-messier.json oracle within 0.02 deg (az wraparound aware).
//
// Tolerance rationale: Messier objects are fixed celestial points projected through
// the *identical* equatorialToHorizontal path already validated against astropy in
// astro.test.mjs to worst-case ~0.0085deg (gated 0.02deg). The oracle uses J2000 ICRS
// ra/dec (same as the star catalog) and pressure=0 (no refraction) -- and
// equatorialToHorizontal likewise applies no refraction -- so both sides share the
// identical physical model; there is no refraction mismatch even for the near-horizon
// rows. 0.02deg therefore mirrors the proven star gate, not a loosened one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { equatorialToHorizontal } from '../src/astro.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const refs = JSON.parse(readFileSync(here('./refs-messier.json'), 'utf8'));

// smallest signed angular difference in degrees (handles 359/0 wraparound)
const angDiff = (a, b) => Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);

test('messier.json loads 110 objects with ra_deg/dec_deg/mag', () => {
  const cat = JSON.parse(readFileSync(here('../data/messier.json'), 'utf8'));
  assert.ok(Array.isArray(cat), 'messier.json is an array');
  assert.equal(cat.length, 110, 'messier catalog has 110 entries');
  for (const o of cat) {
    assert.ok('ra_deg' in o && 'dec_deg' in o && 'mag' in o, `${o.id} has ra_deg/dec_deg/mag`);
  }
});

test('equatorialToHorizontal reproduces astropy refs-messier within 0.02 deg', () => {
  assert.ok(refs.length > 0, 'refs-messier.json has entries');
  for (const r of refs) {
    const { alt, az } = equatorialToHorizontal(r.ra_deg, r.dec_deg, r.lat, r.lon, new Date(r.utc));
    assert.ok(
      angDiff(alt, r.alt_expected) <= 0.02,
      `${r.name}@${r.site} ${r.utc} alt ${alt.toFixed(4)} vs ${r.alt_expected} (Δ${angDiff(alt, r.alt_expected).toFixed(4)})`
    );
    assert.ok(
      angDiff(az, r.az_expected) <= 0.02,
      `${r.name}@${r.site} ${r.utc} az ${az.toFixed(4)} vs ${r.az_expected} (Δ${angDiff(az, r.az_expected).toFixed(4)})`
    );
  }
});
