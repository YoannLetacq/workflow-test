// astro-core — pure ES module, no DOM/three. Scientific horizon coordinates.
// Algorithms: Meeus, "Astronomical Algorithms" (2nd ed.), ch.12 (sidereal), ch.21 (precession).
// az convention: from NORTH increasing EASTward (0=N, 90=E, 180=S, 270=W).

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;

const norm360 = (d) => ((d % 360) + 360) % 360;

// Julian Date (UTC) from a JS Date. getTime() is ms since Unix epoch (UTC), exact.
export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Greenwich Mean Sidereal Time in degrees (Meeus 12.4). UT1≈UTC (|DUT1|<0.9s → <0.004°).
export function gmst(jd) {
  const T = (jd - J2000) / 36525;
  const theta =
    280.46061837 +
    360.98564736629 * (jd - J2000) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return norm360(theta);
}

// Local (mean) sidereal time in degrees. lonEastDeg positive to the East.
export function lst(jd, lonEastDeg) {
  return norm360(gmst(jd) + lonEastDeg);
}

// Equatorial precession J2000 -> date of `jd` (Meeus 21.2/21.3). Starting epoch J2000 => T=0.
export function precessFromJ2000(raDeg, decDeg, jd) {
  const t = (jd - J2000) / 36525;
  // accumulated precession angles in arcseconds
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) / 3600;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) / 3600;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) / 3600;

  const ra0 = raDeg * DEG;
  const dec0 = decDeg * DEG;
  const zr = zeta * DEG;
  const zzr = z * DEG;
  const thr = theta * DEG;

  const A = Math.cos(dec0) * Math.sin(ra0 + zr);
  const B =
    Math.cos(thr) * Math.cos(dec0) * Math.cos(ra0 + zr) -
    Math.sin(thr) * Math.sin(dec0);
  const C =
    Math.sin(thr) * Math.cos(dec0) * Math.cos(ra0 + zr) +
    Math.cos(thr) * Math.sin(dec0);

  const ra = norm360((Math.atan2(A, B) + zzr) * RAD);
  const dec = Math.asin(Math.max(-1, Math.min(1, C))) * RAD;
  return { ra, dec };
}

// Map ICRS/J2000 equatorial (ra,dec) to horizontal {alt, az} for observer + instant.
// Precession is applied first (required for accuracy). ENU transform → unambiguous az.
export function equatorialToHorizontal(raDeg, decDeg, latDeg, lonEastDeg, date) {
  const jd = julianDate(date);
  const { ra, dec } = precessFromJ2000(raDeg, decDeg, jd);

  const H = (lst(jd, lonEastDeg) - ra) * DEG; // hour angle (rad)
  const dr = dec * DEG;
  const phi = latDeg * DEG;

  const sinDec = Math.sin(dr);
  const cosDec = Math.cos(dr);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const cosH = Math.cos(H);

  // Local East-North-Up components of the star direction.
  const xe = -cosDec * Math.sin(H);
  const xn = sinDec * cosPhi - cosDec * cosH * sinPhi;
  const xu = sinDec * sinPhi + cosDec * cosH * cosPhi;

  const alt = Math.asin(Math.max(-1, Math.min(1, xu))) * RAD;
  const az = norm360(Math.atan2(xe, xn) * RAD); // from North, increasing East
  return { alt, az };
}
