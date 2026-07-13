// constellations-render: subtle three.js stick-figures driven by astro-core alt/az.
// Data PROVIDED (never invented): data/constellations.lines.json (GeoJSON
// MultiLineString of [raDeg,decDeg], J2000) + data/constellations.json (names).
import * as THREE from 'three';
import { equatorialToHorizontal } from './astro.js';

const R = 485; // just inside the star sphere (490) so lines sit behind the points

// alt/az (deg) -> unit vector on three.js Y-up sphere. Same convention as stars.js:
// az from N (0) increasing E (90). N -> -Z, E -> +X, up -> +Y.
function altAzToVec(altDeg, azDeg) {
  const alt = altDeg * Math.PI / 180;
  const az = azDeg * Math.PI / 180;
  const ca = Math.cos(alt);
  return [ca * Math.sin(az), Math.sin(alt), -ca * Math.cos(az)];
}

// getObserverDate() -> { lat, lon, date } (also accepts { observer:{lat,lon}, date }).
function readObserver(getObserverDate) {
  const s = getObserverDate();
  const observer = s.observer || s;
  const lat = observer.lat, lon = observer.lon;
  const date = s.date instanceof Date ? s.date : new Date(s.date ?? Date.now());
  return { lat, lon, date };
}

export async function makeConstellations(scene, getObserverDate) {
  const base = import.meta.url;
  const [linesRes, namesRes] = await Promise.all([
    fetch(new URL('../data/constellations.lines.json', base)),
    fetch(new URL('../data/constellations.json', base)),
  ]);
  if (!linesRes.ok) throw new Error(`constellations.lines.json load failed: ${linesRes.status}`);
  if (!namesRes.ok) throw new Error(`constellations.json load failed: ${namesRes.status}`);
  const lineData = await linesRes.json();
  const nameData = await namesRes.json();

  // Flatten every MultiLineString into gl_LINES segment endpoints. For a polyline
  // of k points we emit k-1 segments = 2*(k-1) vertices. Keep each vertex's ra/dec
  // so update() can reproject in place.
  const raDec = []; // [ra, dec] per vertex, index-aligned with the position buffer
  for (const feat of lineData.features) {
    const geom = feat.geometry;
    if (!geom || geom.type !== 'MultiLineString') continue;
    for (const poly of geom.coordinates) {
      for (let i = 0; i + 1 < poly.length; i++) {
        raDec.push(poly[i], poly[i + 1]);
      }
    }
  }

  const n = raDec.length;
  const positions = new Float32Array(n * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x3a5a8c,   // subtle cool blue
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  scene.add(lines);

  // Label anchors from the names file (Point geometry = [raDeg,decDeg]). position is
  // mutated in place each update(); alt lets the 2D overlay cull below-horizon labels.
  const labels = nameData.features
    .filter((f) => f.geometry && f.geometry.type === 'Point')
    .map((f) => ({
      name: f.properties?.name ?? f.id,
      ra: f.geometry.coordinates[0],
      dec: f.geometry.coordinates[1],
      alt: -90,
      position: new THREE.Vector3(),
    }));

  function update() {
    const { lat, lon, date } = readObserver(getObserverDate);
    const posAttr = geometry.getAttribute('position');
    for (let i = 0; i < n; i++) {
      const [ra, dec] = raDec[i];
      const { alt, az } = equatorialToHorizontal(ra, dec, lat, lon, date);
      const [x, y, z] = altAzToVec(alt, az);
      posAttr.array[i * 3] = x * R;
      posAttr.array[i * 3 + 1] = y * R;
      posAttr.array[i * 3 + 2] = z * R;
    }
    posAttr.needsUpdate = true;

    for (const lb of labels) {
      const { alt, az } = equatorialToHorizontal(lb.ra, lb.dec, lat, lon, date);
      const [x, y, z] = altAzToVec(alt, az);
      lb.alt = alt;
      lb.position.set(x * R, y * R, z * R);
    }
  }

  function setVisible(v) {
    lines.visible = !!v;
  }

  update(); // initial projection
  return { lines, geometry, material, labels, update, setVisible, get visible() { return lines.visible; } };
}
