// tests — node --test. Asserts src/solar.js sunMoonPlanets() matches astropy
// refs-solar.json alt/az within 0.05 deg (az wraparound aware, measured worst
// dAz ≈0.036°), Moon illuminated fraction in [0,1], and constellation line
// GeoJSON loads (>=80 features).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sunMoonPlanets } from '../src/solar.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const refs = JSON.parse(readFileSync(here('./refs-solar.json'), 'utf8'));

// smallest signed angular difference in degrees (handles 359/0 wraparound)
const angDiff = (a, b) => Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);

test('sunMoonPlanets reproduces astropy refs-solar within 0.05 deg', () => {
  assert.ok(refs.length > 0, 'refs-solar.json has entries');
  for (const r of refs) {
    const bodies = sunMoonPlanets(new Date(r.utc), r.lat, r.lon);
    const b = bodies.find((x) => x.name.toLowerCase() === r.body.toLowerCase());
    assert.ok(b, `body ${r.body} present in sunMoonPlanets output`);
    assert.ok(
      angDiff(b.alt, r.alt_expected) <= 0.05,
      `${r.body}@${r.site} ${r.utc} alt ${b.alt.toFixed(4)} vs ${r.alt_expected} (Δ${angDiff(b.alt, r.alt_expected).toFixed(4)})`
    );
    assert.ok(
      angDiff(b.az, r.az_expected) <= 0.05,
      `${r.body}@${r.site} ${r.utc} az ${b.az.toFixed(4)} vs ${r.az_expected} (Δ${angDiff(b.az, r.az_expected).toFixed(4)})`
    );
  }
});

test('Moon illuminated fraction in [0,1]', () => {
  const r = refs.find((x) => x.body.toLowerCase() === 'moon');
  const moon = sunMoonPlanets(new Date(r.utc), r.lat, r.lon)
    .find((x) => x.name.toLowerCase() === 'moon');
  assert.ok(moon, 'moon present');
  // solar-core exports the illuminated fraction as `phase` (0..1)
  const frac = moon.phase;
  assert.ok(typeof frac === 'number' && Number.isFinite(frac), 'moon phase is a number');
  assert.ok(frac >= 0 && frac <= 1, `moon illuminated fraction ${frac} in [0,1]`);
});

test('constellations.lines.json loads (>=80 features)', () => {
  const gj = JSON.parse(readFileSync(here('../data/constellations.lines.json'), 'utf8'));
  const features = Array.isArray(gj) ? gj : gj.features;
  assert.ok(Array.isArray(features), 'features is an array');
  assert.ok(features.length >= 80, `features ${features.length} >= 80`);
});
