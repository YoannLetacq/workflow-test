// solar.js — geocentric positions of the Sun, Moon and naked-eye planets. PURE (no DOM/three).
// Method: Schlyter, "Computing planetary positions" (http://stjarnhimlen.se/comp/ppcomp.html):
// low-precision Keplerian elements + the classic Jupiter/Saturn/Moon perturbation terms.
// Accuracy ~1-2 arcmin — well inside the 0.5 deg tolerance of tests/refs-solar.json.
//
// RA/Dec are computed for the equinox OF DATE (Schlyter's convention) then rotated back to
// J2000, so equatorialToHorizontal() (which precesses J2000 -> date) consumes them exactly
// like the star pipeline. The returned ra/dec are therefore J2000/ICRS-compatible.
import { equatorialToHorizontal, julianDate } from './astro.js';

const DEG = Math.PI / 180, RAD = 180 / Math.PI;
const norm360 = (d) => ((d % 360) + 360) % 360;
const sind = (d) => Math.sin(d * DEG);
const cosd = (d) => Math.cos(d * DEG);
const val = (pair, d) => pair[0] + pair[1] * d; // linear element(d)

// Kepler's equation, all in degrees. First guess + Newton iteration (e here is small-to-moderate).
function eccAnomaly(M, e) {
  M = norm360(M);
  let E = M + e * RAD * sind(M) * (1 + e * cosd(M));
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * RAD * sind(E) - M) / (1 - e * cosd(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

// mean equinox OF DATE (deg) -> J2000, via general precession (Meeus 21.3/21.4, reversed).
function precessToJ2000(raDeg, decDeg, jd) {
  const T = (jd - 2451545.0) / 36525;   // initial epoch = date
  const t = -T;                         // final epoch = J2000
  const zeta = ((2306.2181 + 1.39656 * T - 0.000139 * T * T) * t + (0.30188 - 0.000344 * T) * t * t + 0.017998 * t * t * t) / 3600;
  const z = ((2306.2181 + 1.39656 * T - 0.000139 * T * T) * t + (1.09468 + 0.000066 * T) * t * t + 0.018203 * t * t * t) / 3600;
  const theta = ((2004.3109 - 0.85330 * T - 0.000217 * T * T) * t - (0.42665 + 0.000217 * T) * t * t - 0.041833 * t * t * t) / 3600;
  const A = cosd(decDeg) * sind(raDeg + zeta);
  const B = cosd(theta) * cosd(decDeg) * cosd(raDeg + zeta) - sind(theta) * sind(decDeg);
  const C = sind(theta) * cosd(decDeg) * cosd(raDeg + zeta) + cosd(theta) * sind(decDeg);
  return { ra: norm360(Math.atan2(A, B) * RAD + z), dec: Math.asin(Math.max(-1, Math.min(1, C))) * RAD };
}

// geocentric ecliptic-of-date rectangular coords -> equatorial-of-date RA/Dec + distance.
function eclRectToEqu(x, y, z, ecl) {
  const xe = x;
  const ye = y * cosd(ecl) - z * sind(ecl);
  const ze = y * sind(ecl) + z * cosd(ecl);
  return { ra: norm360(Math.atan2(ye, xe) * RAD), dec: Math.atan2(ze, Math.hypot(xe, ye)) * RAD, dist: Math.hypot(xe, ye, ze) };
}

// Sun: elements give geocentric ecliptic longitude directly (Earth's orbit, reversed).
function sunEcl(d) {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = 356.0470 + 0.9856002585 * d;
  const E = eccAnomaly(M, e);
  const xv = cosd(E) - e, yv = Math.sqrt(1 - e * e) * sind(E);
  const v = Math.atan2(yv, xv) * RAD, r = Math.hypot(xv, yv);
  const lon = norm360(v + w);
  return { lon, r, M, w };
}

// Planet orbital elements [epoch value, per-day rate]. a in AU, angles in deg.
const PLANETS = {
  mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.00e-8], w: [29.1241, 1.01444e-5], a: 0.387098, e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
  venus: { N: [76.6799, 2.46590e-5], i: [3.3946, 2.75e-8], w: [54.8910, 1.38374e-5], a: 0.723330, e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
  mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: 1.523688, e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
  jupiter: { N: [100.4542, 2.76854e-5], i: [1.3030, -1.557e-7], w: [273.8777, 1.64505e-5], a: 5.20256, e: [0.048498, 4.469e-9], M: [19.8950, 0.0830853001] },
  saturn: { N: [113.6634, 2.38980e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: 9.55475, e: [0.055546, -9.499e-9], M: [316.9670, 0.0334442282] },
};

// Jupiter/Saturn need the great-inequality perturbation terms to reach arcmin accuracy.
function giantPerturb(name, d, out) {
  const Mj = val(PLANETS.jupiter.M, d), Ms = val(PLANETS.saturn.M, d);
  if (name === 'jupiter') {
    out.lon += -0.332 * sind(2 * Mj - 5 * Ms - 67.6) - 0.056 * sind(2 * Mj - 2 * Ms + 21)
      + 0.042 * sind(3 * Mj - 5 * Ms + 21) - 0.036 * sind(Mj - 2 * Ms)
      + 0.022 * cosd(Mj - Ms) + 0.023 * sind(2 * Mj - 3 * Ms + 52) - 0.016 * sind(Mj - 5 * Ms - 69);
  } else if (name === 'saturn') {
    out.lon += 0.812 * sind(2 * Mj - 5 * Ms - 67.6) - 0.229 * cosd(2 * Mj - 4 * Ms - 2)
      + 0.119 * sind(Mj - 2 * Ms - 3) + 0.046 * sind(2 * Mj - 6 * Ms - 69) + 0.014 * sind(Mj - 3 * Ms + 32);
    out.lat += -0.020 * cosd(2 * Mj - 4 * Ms - 2) + 0.018 * sind(2 * Mj - 6 * Ms - 49);
  }
}

// heliocentric ecliptic-of-date coords of a planet, then + Sun => geocentric rectangular.
function planetGeo(name, d, sun) {
  const p = PLANETS[name];
  const N = val(p.N, d), i = val(p.i, d), w = val(p.w, d), a = p.a, e = val(p.e, d), M = val(p.M, d);
  const E = eccAnomaly(M, e);
  const xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
  const v = Math.atan2(yv, xv) * RAD, r = Math.hypot(xv, yv);
  const u = v + w;
  const xh = r * (cosd(N) * cosd(u) - sind(N) * sind(u) * cosd(i));
  const yh = r * (sind(N) * cosd(u) + cosd(N) * sind(u) * cosd(i));
  const zh = r * (sind(u) * sind(i));
  const pert = { lon: Math.atan2(yh, xh) * RAD, lat: Math.atan2(zh, Math.hypot(xh, yh)) * RAD };
  giantPerturb(name, d, pert);
  const xhp = r * cosd(pert.lon) * cosd(pert.lat);
  const yhp = r * sind(pert.lon) * cosd(pert.lat);
  const zhp = r * sind(pert.lat);
  return { xg: xhp + sun.xs, yg: yhp + sun.ys, zg: zhp, r };
}

// geocentric ecliptic lon/lat of the Moon (Schlyter, with the 12+5 main perturbation terms).
function moonEcl(d, sun) {
  const N = 125.1228 - 0.0529538083 * d, i = 5.1454, w = 318.0634 + 0.1643573223 * d;
  const a = 60.2666, e = 0.054900, M = 115.3654 + 13.0649929509 * d;
  const E = eccAnomaly(M, e);
  const xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
  const v = Math.atan2(yv, xv) * RAD, r = Math.hypot(xv, yv);
  const u = v + w;
  const xh = r * (cosd(N) * cosd(u) - sind(N) * sind(u) * cosd(i));
  const yh = r * (sind(N) * cosd(u) + cosd(N) * sind(u) * cosd(i));
  const zh = r * (sind(u) * sind(i));
  let lon = Math.atan2(yh, xh) * RAD, lat = Math.atan2(zh, Math.hypot(xh, yh)) * RAD;
  // perturbation arguments (deg)
  const Ms = sun.M, Ls = norm360(Ms + sun.w), Lm = norm360(M + w + N);
  const D = Lm - Ls, F = Lm - N;
  lon += -1.274 * sind(M - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms)
    - 0.059 * sind(2 * M - 2 * D) - 0.057 * sind(M - 2 * D + Ms) + 0.053 * sind(M + 2 * D)
    + 0.046 * sind(2 * D - Ms) + 0.041 * sind(M - Ms) - 0.035 * sind(D)
    - 0.031 * sind(M + Ms) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(M - 4 * D);
  lat += -0.173 * sind(F - 2 * D) - 0.055 * sind(M - F - 2 * D) - 0.046 * sind(M + F - 2 * D)
    + 0.033 * sind(F + 2 * D) + 0.017 * sind(2 * M + F);
  return { lon, lat, r }; // r in Earth radii, for the topocentric parallax correction
}

// apparent magnitude (Schlyter). r=helio dist, R=geo dist (AU), FV=phase angle (deg).
function planetMag(name, r, R, FV) {
  const base = 5 * Math.log10(r * R);
  switch (name) {
    case 'mercury': return -0.36 + base + 0.027 * FV + 2.2e-13 * Math.pow(FV, 6);
    case 'venus': return -4.34 + base + 0.013 * FV + 4.2e-7 * Math.pow(FV, 3);
    case 'mars': return -1.51 + base + 0.016 * FV;
    case 'jupiter': return -9.25 + base + 0.014 * FV;
    case 'saturn': return -9.0 + base + 0.044 * FV; // rings ignored (~0.3 mag)
    default: return NaN;
  }
}

/**
 * Geocentric Sun/Moon/planet positions for an instant and observer.
 * @param {Date} date
 * @param {number} latDeg observer latitude
 * @param {number} lonEast observer longitude, degrees East positive
 * @returns {Array<{name,ra,dec,alt,az,mag,phase?}>} ra/dec in J2000 deg, alt/az in deg
 */
export function sunMoonPlanets(date, latDeg, lonEast) {
  const jd = julianDate(date);
  const d = jd - 2451543.5;       // Schlyter day number
  const ecl = 23.4393 - 3.563e-7 * d;
  const sun = sunEcl(d);
  sun.xs = sun.r * cosd(sun.lon);
  sun.ys = sun.r * sind(sun.lon);

  const out = [];
  const emit = (name, raDate, decDate, mag, phase) => {
    const { ra, dec } = precessToJ2000(raDate, decDate, jd);
    const { alt, az } = equatorialToHorizontal(ra, dec, latDeg, lonEast, date);
    const row = { name, ra, dec, alt, az, mag };
    if (phase != null) row.phase = phase;
    out.push(row);
    return row;
  };

  // Sun (geocentric ecliptic = its longitude, latitude 0), always fully lit.
  const s = eclRectToEqu(sun.xs, sun.ys, 0, ecl);
  emit('sun', s.ra, s.dec, -26.74, 1);

  // Moon: unit direction from ecliptic lon/lat; phase from Sun-Moon elongation.
  const m = moonEcl(d, sun);
  const mq = eclRectToEqu(cosd(m.lon) * cosd(m.lat), sind(m.lon) * cosd(m.lat), sind(m.lat), ecl);
  const cosElong = sind(s.dec) * sind(mq.dec) + cosd(s.dec) * cosd(mq.dec) * cosd(s.ra - mq.ra);
  const moonRow = emit('moon', mq.ra, mq.dec, -12.7, (1 - cosElong) / 2);
  // Topocentric parallax: the nearby Moon is seen ~0.95deg lower than geocentric (Meeus 40).
  // Parallax in altitude only (azimuth shift is <0.01deg here); r is in Earth radii.
  const HP = Math.asin(1 / m.r) * RAD;
  moonRow.alt -= Math.asin(sind(HP) * cosd(moonRow.alt)) * RAD;

  for (const name of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
    const g = planetGeo(name, d, sun);
    const q = eclRectToEqu(g.xg, g.yg, g.zg, ecl);
    // phase angle at the planet: law of cosines on the Sun-planet-Earth triangle.
    const cosFV = (g.r * g.r + q.dist * q.dist - sun.r * sun.r) / (2 * g.r * q.dist);
    const FV = Math.acos(Math.max(-1, Math.min(1, cosFV))) * RAD;
    emit(name, q.ra, q.dec, planetMag(name, g.r, q.dist, FV), (1 + Math.cos(FV * DEG)) / 2);
  }
  return out;
}
