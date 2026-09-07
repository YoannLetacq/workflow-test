// tests — node --test. Asserts data/messier.json loads (110 objects), that its
// per-object ra/dec agree with the astropy refs-messier.json oracle, and that
// feeding those SHIPPED catalog coordinates through the shared
// equatorialToHorizontal core (astro.js) reproduces the oracle's alt/az within
// 0.02 deg (az wraparound aware). The catalog cross-check matters: without it
// the alt/az test reads ra/dec out of the oracle file and never touches the
// catalog the renderer actually loads.
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
const catalog = JSON.parse(readFileSync(here('../data/messier.json'), 'utf8'));
const byId = new Map(catalog.map((o) => [o.id, o]));

// Both files are generated from the same normalized source, so their coordinates
// must agree bit-for-bit; this is an equality gate, not an accuracy tolerance.
const COORD_TOL = 1e-9;

// smallest signed angular difference in degrees (handles 359/0 wraparound)
const angDiff = (a, b) => Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);

test('messier.json loads 110 objects with ra_deg/dec_deg/mag', () => {
  assert.ok(Array.isArray(catalog), 'messier.json is an array');
  assert.equal(catalog.length, 110, 'messier catalog has 110 entries');
  for (const o of catalog) {
    assert.ok('ra_deg' in o && 'dec_deg' in o && 'mag' in o, `${o.id} has ra_deg/dec_deg/mag`);
  }
});

test('data/messier.json coordinates match the astropy oracle rows', () => {
  assert.ok(refs.length > 0, 'refs-messier.json has entries');
  for (const r of refs) {
    const o = byId.get(r.id);
    assert.ok(o, `${r.id} present in data/messier.json`);
    assert.ok(
      Math.abs(o.ra_deg - r.ra_deg) <= COORD_TOL,
      `${r.id} catalog ra_deg ${o.ra_deg} vs oracle ${r.ra_deg} (Δ${Math.abs(o.ra_deg - r.ra_deg)})`
    );
    assert.ok(
      Math.abs(o.dec_deg - r.dec_deg) <= COORD_TOL,
      `${r.id} catalog dec_deg ${o.dec_deg} vs oracle ${r.dec_deg} (Δ${Math.abs(o.dec_deg - r.dec_deg)})`
    );
  }
});

test('equatorialToHorizontal reproduces astropy refs-messier within 0.02 deg', () => {
  assert.ok(refs.length > 0, 'refs-messier.json has entries');
  for (const r of refs) {
    // Fed from the SHIPPED catalog (the file the renderer reads), not from the
    // oracle row's own ra/dec — otherwise this asserts the oracle against itself.
    const o = byId.get(r.id);
    assert.ok(o, `${r.id} present in data/messier.json`);
    const { alt, az } = equatorialToHorizontal(o.ra_deg, o.dec_deg, r.lat, r.lon, new Date(r.utc));
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
