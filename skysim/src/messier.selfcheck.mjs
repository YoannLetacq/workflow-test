// self-check: equatorialToHorizontal (the exact code path messier.js's update() uses)
// vs the astropy oracle (tests/refs-messier.json). Pure node, no three/DOM.
// Contract gates on alt/az within 0.02 deg (mirrors the proven star gate — see
// messier.test.mjs header comment for the no-refraction rationale).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { equatorialToHorizontal } from './astro.js';

const refs = JSON.parse(readFileSync(fileURLToPath(new URL('../tests/refs-messier.json', import.meta.url))));
const ALT_AZ_TOL = 0.02;
const dAngle = (a, b) => { let x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };

let fail = 0, worstAlt = 0, worstAz = 0;
for (const r of refs) {
  const { alt, az } = equatorialToHorizontal(r.ra_deg, r.dec_deg, r.lat, r.lon, new Date(r.utc));
  const eAlt = dAngle(alt, r.alt_expected);
  const eAz = dAngle(az, r.az_expected);
  worstAlt = Math.max(worstAlt, eAlt); worstAz = Math.max(worstAz, eAz);
  if (eAlt > ALT_AZ_TOL || eAz > ALT_AZ_TOL) {
    fail++;
    console.error(`FAIL ${r.name} @${r.site} ${r.utc}: dAlt=${eAlt.toFixed(3)} dAz=${eAz.toFixed(3)}`);
  }
}
console.log(`messier selfcheck: ${refs.length - fail}/${refs.length} passed (tol ${ALT_AZ_TOL}). worst dAlt=${worstAlt.toFixed(3)} dAz=${worstAz.toFixed(3)}`);
if (fail) process.exit(1);
