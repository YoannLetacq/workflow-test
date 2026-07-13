// Pure Moon-phase math (no DOM/three) — separated so it runs under plain node.
const DEG = Math.PI / 180;
const norm360 = (d) => ((d % 360) + 360) % 360;

// Illuminated fraction + waxing flag from Sun & Moon equatorial coords.
// illum = (1 - cos(elongation))/2; waxing when the Moon leads the Sun (dλ<180).
// Distance-independent approximation — plenty for a rendered disc.
export function moonPhaseFrom(sun, moon) {
  const d1 = sun.dec * DEG, d2 = moon.dec * DEG;
  const cosE = Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos((sun.ra - moon.ra) * DEG);
  const illum = (1 - Math.max(-1, Math.min(1, cosE))) / 2;
  const waxing = norm360(moon.ra - sun.ra) < 180;
  return { illum, waxing };
}

// Terminator geometry for the disc drawer: t is the signed terminator
// semi-width / radius (t=±1 full/new, 0 at quarter); rightLit picks the lit limb.
export function phaseGeometry(illum, waxing) {
  return { t: 2 * illum - 1, rightLit: waxing };
}
