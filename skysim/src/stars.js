// stars-render: three.js Points cloud driven by astro-core alt/az.
// Data (skysim/data/stars.json) is PROVIDED — loaded, never regenerated.
import * as THREE from 'three';
import { equatorialToHorizontal } from './astro.js';

const R = 490; // celestial-sphere radius (inside camera far plane, outside near clutter)

// B-V color index -> approx RGB via Ballesteros T(B-V) + blackbody->sRGB (Tanner Helland approx).
// Gives hot blue-white for Sirius/Vega (ci~0) and warm orange for cool stars (ci>1.3).
function bvToColor(ci) {
  const bv = (ci == null || Number.isNaN(ci)) ? 0.0 : Math.max(-0.4, Math.min(2.0, ci));
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)); // Kelvin
  const k = t / 100;
  let r, g, b;
  if (k <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(k) - 161.1195681661;
  } else {
    r = 329.698727446 * Math.pow(k - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(k - 60, -0.0755148492);
  }
  if (k >= 66) b = 255;
  else if (k <= 19) b = 0;
  else b = 138.5177312231 * Math.log(k - 10) - 305.0447927307;
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  return [c(r), c(g), c(b)];
}

// alt/az (deg) -> unit vector on three.js Y-up sphere. az from N (0) increasing E (90).
// N -> -Z, E -> +X, up -> +Y.
function altAzToVec(altDeg, azDeg) {
  const alt = altDeg * Math.PI / 180;
  const az = azDeg * Math.PI / 180;
  const ca = Math.cos(alt);
  return [ca * Math.sin(az), Math.sin(alt), -ca * Math.cos(az)];
}

// Magnitude -> point size (px @ unit distance). Bright stars (low mag) are clearly larger;
// faint stars floor at a visible dot. Base ~mag+1.44 so Sirius (the brightest) sets the top.
// ponytail: single power-law tuned by eye; bump the 9.0/0.28 knobs if stars read too flat/spiky.
function magToSize(mag) {
  return 2.2 + 9.0 * Math.pow(2.512, -0.28 * (mag + 1.44));
}

// Magnitude -> brightness (0..1) modulating glow intensity, normalised over the catalog range.
// Bright stars glow near-white and strong; faint stars stay dim but present.
function magToBright(mag, magMin, magMax) {
  const f = (magMax - mag) / (magMax - magMin || 1);
  return 0.4 + 0.6 * Math.max(0, Math.min(1, f));
}

const vertexShader = `
  attribute float size;
  attribute float bright;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vColor = color;
    vBright = bright;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;

// Soft glow: sharp bright core + wide dim halo, scaled by per-star brightness.
// Additive blending on the dark sky makes overlapping glows stack the way real stars do.
const fragmentShader = `
  uniform float uVisibility;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0; // 0 center .. 1 edge
    if (d > 1.0) discard;
    float core = smoothstep(0.35, 0.0, d);
    float halo = smoothstep(1.0, 0.0, d) * 0.45;
    float a = (core + halo) * vBright * uVisibility;
    vec3 col = vColor * (0.65 + 0.35 * core); // core whitens toward the centre
    gl_FragColor = vec4(col, a);
  }`;

// getObserverDate() -> { lat, lon, date } (also accepts { observer:{lat,lon}, date }).
function readObserver(getObserverDate) {
  const s = getObserverDate();
  const observer = s.observer || s;
  const lat = observer.lat, lon = observer.lon;
  const date = s.date instanceof Date ? s.date : new Date(s.date ?? Date.now());
  return { lat, lon, date };
}

export async function makeStars(scene, getObserverDate) {
  const res = await fetch(new URL('../data/stars.json', import.meta.url));
  if (!res.ok) throw new Error(`stars.json load failed: ${res.status}`);
  const catalog = await res.json();
  const n = catalog.length;

  let magMin = Infinity, magMax = -Infinity;
  for (const s of catalog) {
    if (s.mag < magMin) magMin = s.mag;
    if (s.mag > magMax) magMax = s.mag;
  }

  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const brights = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [cr, cg, cb] = bvToColor(catalog[i].ci);
    colors[i * 3] = cr; colors[i * 3 + 1] = cg; colors[i * 3 + 2] = cb;
    sizes[i] = magToSize(catalog[i].mag);
    brights[i] = magToBright(catalog[i].mag, magMin, magMax);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('bright', new THREE.BufferAttribute(brights, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uVisibility: { value: 1 } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  function update() {
    const { lat, lon, date } = readObserver(getObserverDate);
    const posAttr = geometry.getAttribute('position');
    for (let i = 0; i < n; i++) {
      const s = catalog[i];
      const { alt, az } = equatorialToHorizontal(s.ra, s.dec, lat, lon, date);
      const [x, y, z] = altAzToVec(alt, az);
      posAttr.array[i * 3] = x * R;
      posAttr.array[i * 3 + 1] = y * R;
      posAttr.array[i * 3 + 2] = z * R;
    }
    posAttr.needsUpdate = true;
  }

  update(); // initial projection
  return { points, geometry, material, update, catalog };
}
