// solar-render — three.js sprites for Sun (disc+glow), Moon (phase terminator),
// and the bright planets, driven by solar-core alt/az. Placement matches the
// scene/stars convention via dirFromAltAz(). Bodies below the horizon are hidden.
import * as THREE from 'three';
import { dirFromAltAz } from './scene.js';
import { sunMoonPlanets } from './solar.js';
import { moonPhaseFrom, phaseGeometry } from './solarPhase.js';

const R = 480; // just inside the star sphere (490) so discs draw in front

// Approximate real tints for the naked-eye planets.
const PLANET_COLOR = {
  mercury: '#b7ad9f',
  venus: '#f6ecc9',
  mars: '#d1603a',
  jupiter: '#d9b48f',
  saturn: '#e6d6a2',
};

// getObserverDate() -> { lat, lon, date } (also accepts { observer:{lat,lon}, date }).
// Same convention as stars.js so every layer reads one clock/site.
function readObserver(getObserverDate) {
  const s = getObserverDate();
  const observer = s.observer || s;
  const date = s.date instanceof Date ? s.date : new Date(s.date ?? Date.now());
  return { lat: observer.lat, lon: observer.lon, date };
}

// ---- texture makers ---------------------------------------------------------

function radialTexture(inner, outer, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function drawMoon(illum, waxing, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const { t, rightLit } = phaseGeometry(illum, waxing);

  g.clearRect(0, 0, size, size);
  // full dark disc (faint earthshine) then the lit region on top
  g.fillStyle = '#2f2f38';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();

  g.fillStyle = '#e9e7d8';
  g.beginPath();
  if (rightLit) {
    g.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);            // right limb
    g.ellipse(cx, cy, r * Math.abs(t), r, 0, Math.PI / 2, -Math.PI / 2, t <= 0);
  } else {
    g.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);            // left limb
    g.ellipse(cx, cy, r * Math.abs(t), r, 0, -Math.PI / 2, Math.PI / 2, t > 0);
  }
  g.closePath();
  g.fill();
  return new THREE.CanvasTexture(c);
}

function makeSprite(texture, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, depthTest: false,
  }));
  s.scale.set(scale, scale, 1);
  s.renderOrder = 3; // over stars/atmosphere
  return s;
}

// brighter (lower mag) planet -> bigger disc, clamped to stay a tidy dot.
function magToScale(mag) {
  const m = Number.isFinite(mag) ? mag : 1;
  return Math.max(5, Math.min(16, 9 * Math.pow(2.512, -0.16 * m)));
}

// ---- main -------------------------------------------------------------------

// makeSolar(scene, getObserverDate) -> { group, bodies, update }.
// `bodies` is the label hook: each { name, object, alt } — the compositor's 2D
// overlay projects object.position and shows `name` when object.visible.
export function makeSolar(scene, getObserverDate) {
  const group = new THREE.Group();
  scene.add(group);

  const sun = makeSprite(radialTexture('rgba(255,250,224,1)', 'rgba(255,200,80,0)'), 30);
  const sunCore = makeSprite(radialTexture('rgba(255,255,240,1)', 'rgba(255,240,180,0)'), 14);
  const moon = makeSprite(drawMoon(0.5, true), 22);
  group.add(sun, sunCore, moon);

  const planetSprites = {};
  for (const [name, col] of Object.entries(PLANET_COLOR)) {
    const sp = makeSprite(radialTexture(col, 'rgba(0,0,0,0)'), 8);
    planetSprites[name] = sp;
    group.add(sp);
  }

  // Label hook: stable list the compositor can iterate every frame.
  const bodies = [
    { name: 'Sun', object: sun, alt: 0 },
    { name: 'Moon', object: moon, alt: 0 },
    ...Object.keys(PLANET_COLOR).map((n) => ({
      name: n[0].toUpperCase() + n.slice(1), object: planetSprites[n], alt: 0,
    })),
  ];
  const byName = new Map(bodies.map((b) => [b.name.toLowerCase(), b]));

  let lastMoonKey = '';

  function place(sprite, alt, az, radius = R) {
    const visible = alt > 0; // below the horizon = not in the sky
    sprite.visible = visible;
    if (visible) sprite.position.copy(dirFromAltAz(alt, az, radius));
    return visible;
  }

  function update() {
    const { lat, lon, date } = readObserver(getObserverDate);
    const list = sunMoonPlanets(date, lat, lon);
    const map = new Map(list.map((b) => [b.name.toLowerCase(), b]));

    const s = map.get('sun');
    const m = map.get('moon');
    if (s) {
      const vis = place(sun, s.alt, s.az);
      sunCore.visible = vis;
      if (vis) sunCore.position.copy(sun.position);
      byName.get('sun').alt = s.alt;
    }
    if (m) {
      place(moon, m.alt, m.az);
      byName.get('moon').alt = m.alt;
      // Redraw the phase only when it meaningfully changes (avoids per-frame canvas work).
      const { illum, waxing } = (s ? moonPhaseFrom(s, m)
        : { illum: Number.isFinite(m.illum) ? m.illum : 0.5, waxing: m.waxing !== false });
      const key = `${illum.toFixed(3)}:${waxing}`;
      if (key !== lastMoonKey) {
        moon.material.map.dispose();
        moon.material.map = drawMoon(illum, waxing);
        moon.material.needsUpdate = true;
        lastMoonKey = key;
      }
    }
    for (const name of Object.keys(PLANET_COLOR)) {
      const p = map.get(name);
      const sp = planetSprites[name];
      if (!p) { sp.visible = false; continue; }
      const vis = place(sp, p.alt, p.az);
      if (vis) sp.scale.setScalar(magToScale(p.mag));
      byName.get(name).alt = p.alt;
    }
  }

  update();
  return { group, bodies, update };
}
