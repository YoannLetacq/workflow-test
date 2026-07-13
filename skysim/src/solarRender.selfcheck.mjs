// Self-check for solarRender pure helpers (no DOM/three needed).
// Run: node skysim/src/solarRender.selfcheck.mjs
import assert from 'node:assert/strict';
import { moonPhaseFrom, phaseGeometry } from './solarPhase.js';

// phaseGeometry: t maps full/new to ±1, quarter to 0; rightLit follows waxing.
assert.equal(phaseGeometry(1, true).t, 1);      // full
assert.equal(phaseGeometry(0, true).t, -1);     // new
assert.equal(phaseGeometry(0.5, true).t, 0);    // quarter
assert.equal(phaseGeometry(0.5, true).rightLit, true);
assert.equal(phaseGeometry(0.5, false).rightLit, false);

// moonPhaseFrom: Sun & Moon at the same point -> new (illum≈0, elongation 0).
{
  const { illum } = moonPhaseFrom({ ra: 10, dec: 5 }, { ra: 10, dec: 5 });
  assert.ok(illum < 1e-9, `expected ~0, got ${illum}`);
}
// Opposite points (180° apart) -> full (illum≈1).
{
  const { illum } = moonPhaseFrom({ ra: 0, dec: 0 }, { ra: 180, dec: 0 });
  assert.ok(Math.abs(illum - 1) < 1e-9, `expected ~1, got ${illum}`);
}
// 90° elongation -> half lit.
{
  const { illum } = moonPhaseFrom({ ra: 0, dec: 0 }, { ra: 90, dec: 0 });
  assert.ok(Math.abs(illum - 0.5) < 1e-9, `expected 0.5, got ${illum}`);
}
// Waxing when Moon leads Sun by <180°, waning otherwise.
assert.equal(moonPhaseFrom({ ra: 0, dec: 0 }, { ra: 45, dec: 0 }).waxing, true);
assert.equal(moonPhaseFrom({ ra: 0, dec: 0 }, { ra: 200, dec: 0 }).waxing, false);

console.log('solarRender selfcheck OK');
