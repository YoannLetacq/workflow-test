// main — compositor: mounts every sky layer (stars, solar system, constellations,
// atmosphere, ground) into one time-driven scene, wires the existing time / controls
// / observer UI, and adds a layer-toggle panel plus a 2D HTML label overlay.
// Sibling layers are loaded defensively: this is a parallel-built app, so a layer
// that isn't present yet is skipped (with a console warning) instead of crashing.
// astro.js is REUSED unchanged; the three CDN import map lives in index.html.
//
// Sibling interfaces consumed here:
//   scene.js         createScene(mount) -> { scene, camera, renderer, resize }
//   time.js          createClock(utc, speed) -> { getUTC, setUTC, tick, ... }
//   controls.js      bindControls(camera, dom, {az,alt}) -> { getView, setView, dispose }
//   ui.js            mountUI(root, {clock, observer, onChange}) -> { refresh, setFOV, destroy }
//   stars.js         makeStars(scene, getObs) -> { update, points, ... }
//   solar.js         sunMoonPlanets(date, lat, lonEast) -> [{name,alt,az,mag,phase?}]  (pure)
//   solarRender.js   makeSolar(scene, getObs) -> { update, ... }
//   constellations.js makeConstellations(scene, getObs) -> { update, setVisible, ... }
//   atmosphere.js    makeAtmosphere(scene, getSun) -> { mesh, update, starVisibility }
//   ground.js        makeGround(scene) -> { ... }
import * as THREE from 'three';
import { createScene } from './scene.js';
import { createClock } from './time.js';
import { bindControls } from './controls.js';
import { mountUI } from './ui.js';
import { mountToggles, mountLabels } from './overlay.js';

const NIGHT_BG = 0x05070f;

async function tryLayer(label, factory) {
  try { return await factory(); }
  catch (e) { console.warn(`[compositor] layer "${label}" unavailable:`, e.message); return null; }
}

// Show/hide a layer regardless of the concrete handle a sibling returns.
function setLayerVisible(h, on) {
  if (!h) return;
  if (typeof h.setVisible === 'function') return h.setVisible(on);
  if (typeof h.setEnabled === 'function') return h.setEnabled(on);
  for (const k of ['group', 'object', 'object3d', 'points', 'mesh', 'line', 'sprite']) {
    if (h[k] && 'visible' in h[k]) { h[k].visible = on; return; }
  }
  if ('visible' in h) h.visible = on;
}

async function boot() {
  const mount = document.getElementById('app') || document.body;
  const { scene, camera, renderer } = createScene(mount);

  const observer = { lat: 48.8566, lon: 2.3522 }; // Paris; UI mutates in place
  const clock = createClock(new Date(), 1);
  const getObs = () => ({ lat: observer.lat, lon: observer.lon, date: clock.getUTC() });

  // Optional solar-core (pure): drives atmosphere's Sun altitude + planet labels.
  let solarCore = null;
  try { solarCore = await import('./solar.js'); }
  catch (e) { console.warn('[compositor] solar.js unavailable:', e.message); }

  let bodyList = []; // [{name,alt,az,...}] for the current instant
  function computeBodies() {
    if (!solarCore) { bodyList = []; return; }
    try { bodyList = solarCore.sunMoonPlanets(clock.getUTC(), observer.lat, observer.lon) || []; }
    catch (e) { console.warn('[compositor] sunMoonPlanets failed:', e.message); bodyList = []; }
  }
  const getSun = () => {
    const sun = bodyList.find((b) => b.name.toLowerCase() === 'sun');
    return sun ? { alt: sun.alt, az: sun.az } : { alt: -90, az: 180 }; // no solar-core -> deep night
  };

  // Sky layers (each optional while poles land in parallel).
  const stars = await tryLayer('stars', async () => (await import('./stars.js')).makeStars(scene, getObs));
  const constellations = await tryLayer('constellations', async () => (await import('./constellations.js')).makeConstellations(scene, getObs));
  const solar = await tryLayer('solar', async () => (await import('./solarRender.js')).makeSolar(scene, getObs));
  const ground = await tryLayer('ground', async () => (await import('./ground.js')).makeGround(scene));
  const atmosphere = await tryLayer('atmosphere', async () => (await import('./atmosphere.js')).makeAtmosphere(scene, getSun));

  // Controls + observer/time UI (existing poles).
  bindControls(camera, renderer.domElement, { az: 0, alt: 20 });
  let dirty = true;
  const ui = mountUI(mount, { clock, observer, onChange: () => { dirty = true; } });

  // 2D label overlay (bright stars + planets + constellations), self-sourced from data/.
  const labels = await mountLabels(mount, camera, getObs, () => bodyList);

  // Layer-toggle panel.
  const state = { stars: true, constellations: true, planets: true, labels: true, ground: true, atmosphere: true };
  const syncLabelState = () => labels.setState({
    labels: state.labels, star: state.stars, planet: state.planets, constellation: state.constellations,
  });
  function onToggle(key, on) {
    state[key] = on;
    if (key === 'stars') setLayerVisible(stars, on);
    else if (key === 'constellations') setLayerVisible(constellations, on);
    else if (key === 'planets') setLayerVisible(solar, on);
    else if (key === 'ground') setLayerVisible(ground, on);
    else if (key === 'atmosphere') {
      if (atmosphere) atmosphere.mesh.visible = on;
      if (!on) scene.background = new THREE.Color(NIGHT_BG);
    }
    syncLabelState();
    dirty = true; // re-run updates (e.g. atmosphere back on) on the next frame
  }
  mountToggles(mount, [
    { key: 'stars', label: 'Stars', on: true },
    { key: 'constellations', label: 'Constellations', on: true },
    { key: 'planets', label: 'Planets', on: true },
    { key: 'labels', label: 'Labels', on: true },
    { key: 'ground', label: 'Ground', on: true },
    { key: 'atmosphere', label: 'Atmosphere', on: true },
  ], onToggle);
  syncLabelState();

  let last = performance.now();
  let lastUTC = clock.getUTC().getTime();
  function frame(now) {
    clock.tick(now - last);
    last = now;
    const utc = clock.getUTC().getTime();
    if (utc !== lastUTC) { dirty = true; lastUTC = utc; }

    if (dirty) {
      computeBodies();
      stars?.update?.();
      constellations?.update?.();
      solar?.update?.();
      if (atmosphere && state.atmosphere) {
        atmosphere.update?.();
        if (stars) stars.material.uniforms.uVisibility.value = atmosphere.starVisibility();
      }
      labels.recompute();
      dirty = false;
    }

    ui.refresh();
    ui.setFOV(camera.fov);
    renderer.render(scene, camera);
    labels.project(); // screen-space, so it follows camera every frame
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch((e) => console.error('skysim boot failed:', e));
