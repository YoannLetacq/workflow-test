// atmosphere — sky background that shifts with the Sun's altitude: night (<-18),
// twilight bands (-18..0), day blue (>0), plus a warm horizon glow toward the Sun's
// azimuth, and a star-visibility factor that fades stars out in daylight.
//
// Owns ONLY this file (see CONTRACT-R1.md). Reuses scene.dirFromAltAz for the
// az/alt->vector convention so the glow lines up with stars/sun. astro.js unchanged.
import * as THREE from 'three';
import { dirFromAltAz } from './scene.js';

const DOME_R = 1000; // behind stars (R=490), inside camera far (2000)

// Palette stops keyed by Sun altitude (deg). Each: zenith/horizon sky colors, a warm
// glow color + strength near the Sun, and starVis (0 day .. 1 full night). Values are
// tuned by eye — this is the calibration knob; nudge here, not in the shader.
// ponytail: 5 hand-tuned stops, add more only if a band looks wrong.
const STOPS = [
  { alt: 10, zenith: 0x2b6bd6, horizon: 0x9fc4f0, glow: 0xfff4d6, glowStrength: 0.45, starVis: 0.0 },
  { alt: 0, zenith: 0x2a3a6b, horizon: 0xff9d5c, glow: 0xff7a3c, glowStrength: 1.0, starVis: 0.12 },
  { alt: -6, zenith: 0x14203f, horizon: 0xc65a5a, glow: 0xb84a4a, glowStrength: 0.6, starVis: 0.55 },
  { alt: -12, zenith: 0x0a1024, horizon: 0x2a2038, glow: 0x4a3550, glowStrength: 0.25, starVis: 0.9 },
  { alt: -18, zenith: 0x05070f, horizon: 0x080a14, glow: 0x0a0c16, glowStrength: 0.0, starVis: 1.0 },
];

function lerp(a, b, t) { return a + (b - a) * t; }

// Interpolate palette for a given Sun altitude, clamped to the stop range.
function paletteForSunAlt(altDeg) {
  if (altDeg >= STOPS[0].alt) return STOPS[0];
  if (altDeg <= STOPS[STOPS.length - 1].alt) return STOPS[STOPS.length - 1];
  let hi = 0;
  while (STOPS[hi + 1].alt > altDeg) hi++;
  const a = STOPS[hi];
  const b = STOPS[hi + 1];
  const t = (a.alt - altDeg) / (a.alt - b.alt); // 0 at a .. 1 at b
  const c = new THREE.Color();
  const mix = (ka, kb) => c.clone().set(ka).lerp(new THREE.Color(kb), t).getHex();
  return {
    zenith: mix(a.zenith, b.zenith),
    horizon: mix(a.horizon, b.horizon),
    glow: mix(a.glow, b.glow),
    glowStrength: lerp(a.glowStrength, b.glowStrength, t),
    starVis: lerp(a.starVis, b.starVis, t),
  };
}

const vertexShader = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position; // dome centered at origin, no transform -> object == world dir
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  precision mediump float;
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uSunDir;
  uniform float uGlowStrength;
  void main() {
    vec3 dir = normalize(vDir);
    // vertical gradient: horizon (y=0) -> zenith (y=1); below horizon stays near horizon.
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.6, h));
    // warm glow toward the Sun, hugging the horizon, falling off with angular distance.
    float toSun = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonHug = 1.0 - smoothstep(0.0, 0.5, abs(dir.y));
    float glow = pow(toSun, 3.0) * uGlowStrength * (0.4 + 0.6 * horizonHug);
    vec3 col = sky + uGlow * glow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * makeAtmosphere(scene, getSun) -> { mesh, update, starVisibility }
 *   getSun: () => number altDeg, OR () => { alt, az } (deg). Azimuth drives the
 *           horizon glow direction; if omitted it defaults to due south (180).
 *   starVisibility(): last computed factor in [0,1] — 0 in daylight, 1 at deep night.
 *           Consumers (compositor) multiply this into star brightness/opacity, since
 *           this pole does not own src/stars.js.
 */
export function makeAtmosphere(scene, getSun) {
  const uniforms = {
    uZenith: { value: new THREE.Color(0x05070f) },
    uHorizon: { value: new THREE.Color(0x080a14) },
    uGlow: { value: new THREE.Color(0x000000) },
    uSunDir: { value: new THREE.Vector3(0, -1, 0) },
    uGlowStrength: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1; // draw before stars/sun/ground
  scene.add(mesh);

  let starVis = 1;

  function update() {
    const s = getSun();
    const alt = typeof s === 'number' ? s : s.alt;
    const az = typeof s === 'number' ? 180 : (s.az ?? 180);
    const p = paletteForSunAlt(alt);
    uniforms.uZenith.value.set(p.zenith);
    uniforms.uHorizon.value.set(p.horizon);
    uniforms.uGlow.value.set(p.glow);
    uniforms.uGlowStrength.value = p.glowStrength;
    uniforms.uSunDir.value.copy(dirFromAltAz(alt, az, 1));
    starVis = p.starVis;
  }

  update(); // initial paint
  return { mesh, material, update, starVisibility: () => starVis };
}
