// self-check: sunMoonPlanets vs the astropy oracle (tests/refs-solar.json).
// Contract gates on alt/az within 0.05 deg (the tightened CI gate). alt/az is
// authoritative and is what the app consumes; the oracle no longer emits
// expected RA/Dec columns, so this check does not track them.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sunMoonPlanets } from './solar.js';

const refs = JSON.parse(readFileSync(fileURLToPath(new URL('../tests/refs-solar.json', import.meta.url))));
const ALT_AZ_TOL = 0.05;
const dAngle = (a, b) => { let x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };

let fail = 0, worstAlt = 0, worstAz = 0;
for (const r of refs) {
  const rows = sunMoonPlanets(new Date(r.utc), r.lat, r.lon);
  const row = rows.find((x) => x.name === r.body);
  if (!row) { console.error(`MISSING ${r.body}`); fail++; continue; }
  const eAlt = Math.abs(row.alt - r.alt_expected);
  const eAz = dAngle(row.az, r.az_expected);
  worstAlt = Math.max(worstAlt, eAlt); worstAz = Math.max(worstAz, eAz);
  if (eAlt > ALT_AZ_TOL || eAz > ALT_AZ_TOL) {
    fail++;
    console.error(`FAIL ${r.body} @${r.site} ${r.utc}: dAlt=${eAlt.toFixed(3)} dAz=${eAz.toFixed(3)}`);
  }
}
console.log(`solar selfcheck: ${refs.length - fail}/${refs.length} passed alt/az (tol ${ALT_AZ_TOL}). worst dAlt=${worstAlt.toFixed(3)} dAz=${worstAz.toFixed(3)}`);
if (fail) process.exit(1);
