// self-check: milkyway.json structure + RA-folded convention sanity
// (see ../data/SOURCES.md), PLUS a numeric proof that milkyway.js's per-frame
// sphere-rotation approach exactly reproduces the point-based
// equatorialToHorizontal+dirFromAltAz reprojection every other layer uses (the
// "point path kept as numeric reference" even though milkyway.js itself no
// longer renders individual points). Pure Node — no three/DOM.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { equatorialToHorizontal, ROTATION_REF } from './astro.js';
import { isValidRing, unwrapLon } from './milkywayGeo.js';

const data = JSON.parse(readFileSync(fileURLToPath(new URL('../data/milkyway.json', import.meta.url))));

const EXPECTED_LAYERS = 5;
// Raw source-data ring-vertex count (sum of every ring's point count across all
// 5 layers). milkyway.js rasterizes rings directly onto a canvas rather than
// building its own vertex buffer, so this only guards against a truncated or
// wrong copy of the data file, not any internal render buffer size.
const EXPECTED_VERTS = 30676;
// Galactic Center: RA 266.25deg -> folded lon -93.75deg, Dec -28.94deg (REPORT.md §2).
const GC_LON = -93.75, GC_LAT = -28.94, GC_TOL_DEG = 2;

let fail = 0;
if (data.type !== 'FeatureCollection') {
  console.error(`FAIL type: ${data.type}`);
  fail++;
}
if (data.features.length !== EXPECTED_LAYERS) {
  console.error(`FAIL layer count: ${data.features.length} (expected ${EXPECTED_LAYERS})`);
  fail++;
}

let totalVerts = 0;
let nearestDist = Infinity;
for (const feat of data.features) {
  if (feat.geometry?.type !== 'MultiPolygon') {
    console.error(`FAIL geometry type for ${feat.id}: ${feat.geometry?.type}`);
    fail++;
    continue;
  }
  for (const poly of feat.geometry.coordinates) {
    for (const ring of poly) {
      totalVerts += ring.length;
      if (feat.id === 'ol1') {
        for (const [lon, lat] of ring) {
          const d = Math.hypot(lon - GC_LON, lat - GC_LAT);
          if (d < nearestDist) nearestDist = d;
        }
      }
    }
  }
}

if (totalVerts !== EXPECTED_VERTS) {
  console.error(`FAIL vertex count: ${totalVerts} (expected ${EXPECTED_VERTS})`);
  fail++;
}
if (nearestDist > GC_TOL_DEG) {
  console.error(`FAIL GC convention: nearest ol1 vertex ${nearestDist.toFixed(2)}deg from GC (tol ${GC_TOL_DEG})`);
  fail++;
}

console.log(`milkyway selfcheck: ${EXPECTED_LAYERS} layers / ${totalVerts} verts / GC nearest ${nearestDist.toFixed(2)}deg (tol ${GC_TOL_DEG})`);

// ---- rotation-matrix numeric proof ------------------------------------------
// milkyway.js builds its per-frame mesh rotation from ROTATION_REF, the 3
// reference directions whose position on a vanilla THREE.SphereGeometry is
// meant to be exactly the standard basis (1,0,0)/(0,1,0)/(0,0,1). This block
// imports that SHIPPED constant (from astro.js, which milkyway.js also imports
// it from — milkyway.js itself cannot be loaded here, it needs the browser's
// `three` import map) and checks it against a re-derivation kept deliberately
// local below: three's own vertex formula x=-cos(ra)cos(dec), y=sin(dec),
// z=sin(ra)cos(dec) (phi=ra, theta=90-dec), and the per-point
// equatorialToHorizontal+dirFromAltAz path every other layer uses.
//
// Applying the basis built from ROTATION_REF to ANY other (ra,dec)'s
// local-frame position must exactly reproduce the direct point path for that
// point. That is simultaneously the numeric proof that the whole-sphere
// rotation is the same transform and not an approximation, AND the check that
// the shipped ROTATION_REF is the correct set of directions — a wrong entry
// tilts the basis and the two paths diverge.
function dirFromAltAz(altDeg, azDeg) {
  const alt = altDeg * Math.PI / 180, az = azDeg * Math.PI / 180;
  const ca = Math.cos(alt);
  return [ca * Math.sin(az), Math.sin(alt), -ca * Math.cos(az)];
}
function localEquatorialXYZ(raDeg, decDeg) {
  const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
  return [-Math.cos(ra) * Math.cos(dec), Math.sin(dec), Math.sin(ra) * Math.cos(dec)];
}
function matVec([X, Y, Z], v) {
  return [
    X[0] * v[0] + Y[0] * v[1] + Z[0] * v[2],
    X[1] * v[0] + Y[1] * v[1] + Z[1] * v[2],
    X[2] * v[0] + Y[2] * v[1] + Z[2] * v[2],
  ];
}
function dist3(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

const ROTATION_TOL = 1e-6; // pure floating-point precision expected, not an approximation
const ROTATION_CASES = [
  { lat: 48.8566, lon: 2.3522, utc: '2026-07-13T23:00:00Z' }, // Paris, summer night
  { lat: 48.8566, lon: 2.3522, utc: '2026-01-15T22:00:00Z' }, // Paris, winter night
  { lat: -33.87, lon: 151.21, utc: '2026-04-01T03:00:00Z' }, // Sydney, southern hemisphere
];
const ROTATION_TEST_POINTS = [
  { name: 'Cygnus', ra: 305.0, dec: 40.0 },
  { name: 'Galactic Center', ra: 266.25, dec: -28.94 },
];

let worstRotationDelta = 0;
for (const c of ROTATION_CASES) {
  const date = new Date(c.utc);
  const basis = ROTATION_REF.map(({ ra, dec }) => {
    const { alt, az } = equatorialToHorizontal(ra, dec, c.lat, c.lon, date);
    return dirFromAltAz(alt, az);
  });
  for (const p of ROTATION_TEST_POINTS) {
    const { alt, az } = equatorialToHorizontal(p.ra, p.dec, c.lat, c.lon, date);
    const direct = dirFromAltAz(alt, az);
    const viaRotation = matVec(basis, localEquatorialXYZ(p.ra, p.dec));
    const d = dist3(direct, viaRotation);
    worstRotationDelta = Math.max(worstRotationDelta, d);
    if (d > ROTATION_TOL) {
      console.error(`FAIL rotation mismatch ${p.name} @ ${c.utc}: delta=${d.toExponential(3)}`);
      fail++;
    }
  }
}
console.log(`milkyway rotation selfcheck: worst delta ${worstRotationDelta.toExponential(3)} (tol ${ROTATION_TOL})`);

// ---- ring geometry: seam unwrap + parse-boundary range validation -----------
// unwrapLon is a bounded loop ONLY for in-range input, so isValidRing is the
// thing standing between the loader and a hung tab. Both halves are checked
// against the shipped milkywayGeo.js, and the invalid rings are asserted
// rejected BEFORE unwrapLon is ever called on them — a test that proved the
// guard by hanging would be worse than no test.

// A seam-crossing ring must come out with every consecutive delta <= 180.
{
  const seam = [[170, 10], [178, 11], [-179, 12], [-170, 13], [175, 12], [170, 10]];
  if (!isValidRing(seam)) {
    console.error('FAIL isValidRing rejected a legal seam-crossing ring');
    fail++;
  } else {
    const lons = unwrapLon(seam);
    if (lons.length !== seam.length) {
      console.error(`FAIL unwrapLon length: ${lons.length} (expected ${seam.length})`);
      fail++;
    }
    let worstJump = 0;
    for (let i = 1; i < lons.length; i++) worstJump = Math.max(worstJump, Math.abs(lons[i] - lons[i - 1]));
    if (worstJump > 180) {
      console.error(`FAIL unwrapLon left a ${worstJump}deg jump (must be <= 180)`);
      fail++;
    }
    // Every unwrapped lon must still name the same direction it started as.
    for (let i = 0; i < lons.length; i++) {
      const d = Math.abs(((lons[i] - seam[i][0]) % 360 + 360) % 360);
      if (d > 1e-9 && Math.abs(d - 360) > 1e-9) {
        console.error(`FAIL unwrapLon changed direction at ${i}: ${seam[i][0]} -> ${lons[i]}`);
        fail++;
      }
    }
    console.log(`milkyway unwrap selfcheck: worst consecutive delta ${worstJump}deg (tol 180)`);
  }
}

// Anything unwrapLon cannot terminate on (or would poison coordinates with)
// must be rejected at the boundary. 1e400 is what JSON.parse gives for the
// literal in a data file; 1e12 is the finite-but-out-of-range case that a bare
// Number.isFinite check would let through into ~2.8 billion iterations.
{
  const bad = [
    ['empty ring', []],
    ['Infinity lon (JSON 1e400)', [[JSON.parse('1e400'), 10], [20, 10], [20, 20]]],
    ['-Infinity lon', [[JSON.parse('-1e400'), 10], [20, 10], [20, 20]]],
    ['NaN lon', [[NaN, 10], [20, 10], [20, 20]]],
    ['finite out-of-range lon 1e12', [[1e12, 10], [20, 10], [20, 20]]],
    ['out-of-range lat', [[20, 91], [20, 10], [30, 10]]],
    ['short point', [[20], [20, 10], [30, 10]]],
    ['not a ring', [null]],
  ];
  let rejected = 0;
  for (const [name, ring] of bad) {
    if (isValidRing(ring)) {
      console.error(`FAIL isValidRing accepted ${name} (unwrapLon would hang or poison coords)`);
      fail++;
    } else {
      rejected++;
    }
  }
  console.log(`milkyway ring-validation selfcheck: ${rejected}/${bad.length} invalid rings rejected`);
}

if (fail) process.exit(1);
