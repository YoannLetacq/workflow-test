// self-check: sunMoonPlanets vs the astropy oracle (tests/refs-solar.json).
// Contract gates on alt/az within 0.5 deg (the requirement in the mission file).
// NOTE: the oracle's ra_expected/dec_expected columns are internally inconsistent with their
// OWN alt_expected/az_expected (prep_solar.py bug: e.g. the Sun on the 2024-03-20 equinox is
// listed as RA 203deg, which cannot produce the listed alt/az). alt/az is authoritative and is
// what the app consumes, so ra/dec drift is reported for information only, not gated on.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sunMoonPlanets } from './solar.js';

const refs = JSON.parse(readFileSync(fileURLToPath(new URL('../tests/refs-solar.json', import.meta.url))));
const ALT_AZ_TOL = 0.5;
const dAngle = (a, b) => { let x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };

let fail = 0, worstAlt = 0, worstAz = 0, worstRa = 0, worstDec = 0;
for (const r of refs) {
  const rows = sunMoonPlanets(new Date(r.utc), r.lat, r.lon);
  const row = rows.find((x) => x.name === r.body);
  if (!row) { console.error(`MISSING ${r.body}`); fail++; continue; }
  const eAlt = Math.abs(row.alt - r.alt_expected);
  const eAz = dAngle(row.az, r.az_expected);
  worstAlt = Math.max(worstAlt, eAlt); worstAz = Math.max(worstAz, eAz);
  worstRa = Math.max(worstRa, dAngle(row.ra, r.ra_expected));
  worstDec = Math.max(worstDec, Math.abs(row.dec - r.dec_expected));
  if (eAlt > ALT_AZ_TOL || eAz > ALT_AZ_TOL) {
    fail++;
    console.error(`FAIL ${r.body} @${r.site} ${r.utc}: dAlt=${eAlt.toFixed(3)} dAz=${eAz.toFixed(3)}`);
  }
}
console.log(`solar selfcheck: ${refs.length - fail}/${refs.length} passed alt/az (tol ${ALT_AZ_TOL}). worst dAlt=${worstAlt.toFixed(3)} dAz=${worstAz.toFixed(3)}`);
console.log(`(info) oracle ra/dec column is buggy — drift worst dRa=${worstRa.toFixed(1)} dDec=${worstDec.toFixed(1)}, not gated`);
if (fail) process.exit(1);
