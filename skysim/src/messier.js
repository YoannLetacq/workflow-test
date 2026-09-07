// messier-render: three.js Points cloud of the 110 Messier deep-sky objects,
// reprojected each update() via astro-core alt/az (same contract as stars.js).
// Data (skysim/data/messier.json) is PROVIDED — loaded, never regenerated.
import * as THREE from 'three';
import { equatorialToHorizontal } from './astro.js';
import { dirFromAltAz } from './scene.js';

const R = 482; // > ground's 480 so the ground's depth test properly occludes it
               // (see makeGround comment); still behind stars (490),
               // constellations (485) and the Milky Way band (483).

// Magnitude -> point size (px @ unit distance). Same shape as stars.js magToSize,
// tuned for the Messier mag range (~1.6 (M45) .. ~10).
function magToSize(mag) {
  return 2.2 + 7.0 * Math.pow(2.512, -0.28 * (mag + 1.6));
}

// getObserverDate() -> { lat, lon, date } (also accepts { observer:{lat,lon}, date }).
function readObserver(getObserverDate) {
  const s = getObserverDate();
  const observer = s.observer || s;
  const lat = observer.lat, lon = observer.lon;
  const date = s.date instanceof Date ? s.date : new Date(s.date ?? Date.now());
  return { lat, lon, date };
}

const vertexShader = `
  attribute float size;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;

// Soft round sprite, single pale-cyan colour, faint so it does not compete with stars.
const fragmentShader = `
  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0; // 0 center .. 1 edge
    if (d > 1.0) discard;
    float a = smoothstep(1.0, 0.0, d) * 0.55;
    gl_FragColor = vec4(0.62, 0.88, 0.85, a); // pale cyan #9fe0d8-ish
  }`;

export async function makeMessier(scene, getObserverDate) {
  const res = await fetch(new URL('../data/messier.json', import.meta.url));
  if (!res.ok) throw new Error(`messier.json load failed: ${res.status}`);
  const raw = await res.json();
  const n = raw.length;
  const catalog = raw;

  const positions = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    sizes[i] = magToSize(catalog[i].mag);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
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
      const o = catalog[i];
      const { alt, az } = equatorialToHorizontal(o.ra_deg, o.dec_deg, lat, lon, date);
      const v = dirFromAltAz(alt, az, R);
      posAttr.array[i * 3] = v.x;
      posAttr.array[i * 3 + 1] = v.y;
      posAttr.array[i * 3 + 2] = v.z;
    }
    posAttr.needsUpdate = true;
  }

  update(); // initial projection
  return {
    points,
    geometry,
    material,
    update,
    catalog,
    setVisible(v) { points.visible = !!v; },
    get visible() { return points.visible; },
  };
}
