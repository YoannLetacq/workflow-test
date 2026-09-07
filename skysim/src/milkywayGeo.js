// milkyway-geo — pure ring geometry helpers for milkyway.js. No three, no DOM,
// so milkyway.selfcheck.mjs can exercise the SHIPPED code (milkyway.js itself
// only loads through the browser's `three` import map). Same split as
// solarPhase.js / solarRender.js.

// RFC 7946 range check, applied before unwrapLon ever sees a ring.
//
// unwrapLon's `while (lon - prev > 180) lon -= 360` loop is bounded only by how
// far out of range `lon` is: 1e12 needs ~2.8 billion iterations and Infinity
// (what JSON.parse("1e400") yields) never terminates at all, hanging the tab
// with no recovery. NaN exits immediately but poisons every downstream
// coordinate. Written as comparisons rather than Number.isFinite on purpose —
// this form rejects NaN and both infinities for free AND catches the merely
// out-of-range-but-finite values that a finiteness test would wave through.
//
// The empty/degenerate case is guarded here too: unwrapLon reads ring[0][0]
// unconditionally, and the TypeError that throws is swallowed by main.js's
// tryLayer, silently removing the whole Milky Way layer over one bad ring.
export function isValidRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return false;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) return false;
    const [lon, lat] = pt;
    if (!(lon >= -180 && lon <= 180)) return false;
    if (!(lat >= -90 && lat <= 90)) return false;
  }
  return true;
}

// A ring's raw lon sequence can jump across the (-180,180] fold seam mid-ring
// (grazing crossings, or — for the two ol1 envelope rings — a full wind around
// the whole RA circle). Unwrap so consecutive points never jump by more than
// 180deg, matching constellations.js/messier.js's own reprojection convention.
// Folding each point independently instead (i.e. `lon<0?lon+360:lon` per point,
// with no memory of the previous point) was the bug behind the dark-patch
// artifacts: two geometrically-adjacent points straddling the seam would fold to
// x-values ~2000px apart, drawing a spurious edge that cut across the canvas and
// evenodd-cancelled a chunk of that layer's own fill.
export function unwrapLon(ring) {
  const out = [ring[0][0]];
  for (let i = 1; i < ring.length; i++) {
    let lon = ring[i][0];
    const prev = out[i - 1];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push(lon);
  }
  return out;
}
