// overlay — compositor-owned DOM layers drawn on top of the WebGL canvas:
//   mountToggles: a checkbox panel to show/hide sky layers.
//   mountLabels:  a 2D HTML overlay projecting bright-star, planet and constellation
//                 names into screen space each frame.
// Label positions are computed here from the PROVIDED data files
// (data/stars.json, data/constellations.json) via astro.js, so the overlay does not
// couple to any sibling module's internal object shapes.
import { dirFromAltAz } from './scene.js';
import { equatorialToHorizontal } from './astro.js';

const R = 480;                // label anchor radius (just inside the star sphere)
const STAR_LABEL_MAG = 1.6;   // only the brightest named stars get labels

export function mountToggles(root, layers, onToggle) {
  const panel = document.createElement('div');
  panel.className = 'skysim-toggles';
  panel.innerHTML = layers
    .map((l) => `<label><input type="checkbox" data-k="${l.key}"${l.on ? ' checked' : ''}> ${l.label}</label>`)
    .join('');
  root.appendChild(panel);
  panel.addEventListener('change', (e) => {
    const k = e.target.getAttribute && e.target.getAttribute('data-k');
    if (k) onToggle(k, e.target.checked);
  });
  return { destroy: () => panel.remove() };
}

// mountLabels(root, camera, getObserverDate, getBodies)
//   getObserverDate() -> { lat, lon, date }
//   getBodies()       -> [{ name, alt, az }] for Sun/Moon/planets (may be empty)
// Returns { recompute, project, setState, destroy }.
//   recompute(): rebuild horizon-space anchors — call when time/observer changed.
//   project():   place labels in screen space — call every frame, after render.
export async function mountLabels(root, camera, getObserverDate, getBodies) {
  const layer = document.createElement('div');
  layer.className = 'skysim-labels';
  root.appendChild(layer);

  // Load label sources from provided data (best-effort; overlay still runs if a fetch fails).
  let starSrc = [];
  let constSrc = [];
  try {
    const stars = await (await fetch(new URL('../data/stars.json', import.meta.url))).json();
    starSrc = stars
      .filter((s) => s.name && s.mag <= STAR_LABEL_MAG)
      .map((s) => ({ name: s.name, ra: s.ra, dec: s.dec }));
  } catch (e) { console.warn('[labels] stars.json unavailable:', e.message); }
  try {
    const fc = await (await fetch(new URL('../data/constellations.json', import.meta.url))).json();
    constSrc = (fc.features || []).map((f) => ({
      name: (f.properties && (f.properties.name || f.properties.en)) || f.id,
      ra: f.geometry.coordinates[0],
      dec: f.geometry.coordinates[1],
    }));
  } catch (e) { console.warn('[labels] constellations.json unavailable:', e.message); }

  const els = new Map(); // name -> element (reused across recompute)
  let anchors = [];      // [{ el, cat, vec }]
  const state = { labels: true, star: true, planet: true, constellation: true };

  function elFor(name, cat) {
    let el = els.get(name);
    if (!el) {
      el = document.createElement('div');
      el.className = `lbl ${cat}`;
      el.textContent = name;
      layer.appendChild(el);
      els.set(name, el);
    }
    return el;
  }

  function pushAbove(list, cat) {
    const { lat, lon, date } = getObserverDate();
    for (const it of list) {
      const { alt, az } = equatorialToHorizontal(it.ra, it.dec, lat, lon, date);
      if (alt < 0) continue; // below the horizon
      anchors.push({ el: elFor(it.name, cat), cat, vec: dirFromAltAz(alt, az, R) });
    }
  }

  function recompute() {
    anchors = [];
    pushAbove(starSrc, 'star');
    pushAbove(constSrc, 'constellation');
    for (const b of (getBodies ? getBodies() : [])) {
      if (b.alt < 0) continue;
      anchors.push({ el: elFor(b.name, 'planet'), cat: 'planet', vec: dirFromAltAz(b.alt, b.az, R) });
    }
    // Hide any element that dropped below the horizon this pass.
    const live = new Set(anchors.map((a) => a.el));
    for (const el of els.values()) if (!live.has(el)) el.style.display = 'none';
  }

  const catVisible = (cat) => state.labels && state[cat];

  function project() {
    const w = window.innerWidth, h = window.innerHeight;
    for (const a of anchors) {
      if (!catVisible(a.cat)) { a.el.style.display = 'none'; continue; }
      const ndc = a.vec.clone().project(camera);
      if (ndc.z > 1 || ndc.x < -1 || ndc.x > 1 || ndc.y < -1 || ndc.y > 1) {
        a.el.style.display = 'none';
        continue;
      }
      a.el.style.display = '';
      a.el.style.left = ((ndc.x * 0.5 + 0.5) * w).toFixed(1) + 'px';
      a.el.style.top = ((-ndc.y * 0.5 + 0.5) * h).toFixed(1) + 'px';
    }
  }

  return {
    recompute,
    project,
    setState: (next) => Object.assign(state, next),
    destroy: () => layer.remove(),
  };
}
