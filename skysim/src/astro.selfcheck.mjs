// Self-check for astro-core. Run: node skysim/src/astro.selfcheck.mjs
import assert from 'node:assert/strict';
import { equatorialToHorizontal, gmst, lst, precessFromJ2000 } from './astro.js';

// Polaris (ra 37.95, dec 89.26) at Paris lat 48.86: altitude tracks the pole (≈ latitude, ±~1°).
const date = new Date('2024-03-20T21:00:00Z');
const { alt, az } = equatorialToHorizontal(37.954561, 89.264109, 48.8566, 2.3522, date);

assert.ok(Math.abs(alt - 48.8) < 1.0, `Polaris alt ${alt} should be ≈ 48.8`);
assert.ok(az >= 0 && az < 360, `az ${az} must be in [0,360)`);

// az normalization holds for an arbitrary direction too.
const east = equatorialToHorizontal(101.287155, -16.716116, 48.8566, 2.3522, date);
assert.ok(east.az >= 0 && east.az < 360, `az ${east.az} must be in [0,360)`);

// precession moves the position and stays finite/normalized.
const p = precessFromJ2000(37.954561, 89.264109, 2460390.375);
assert.ok(p.ra >= 0 && p.ra < 360 && Number.isFinite(p.dec), 'precession output sane');

// sidereal time is normalized to a full turn.
assert.ok(gmst(2460390.375) >= 0 && gmst(2460390.375) < 360, 'gmst in [0,360)');
assert.ok(lst(2460390.375, 2.3522) >= 0 && lst(2460390.375, 2.3522) < 360, 'lst in [0,360)');

console.log(`OK astro.selfcheck — Polaris alt=${alt.toFixed(3)} az=${az.toFixed(3)}`);
