// main — wires astro-core + stars + controls + time + ui into the scene and runs
// the animation loop. Mounts on #app. Real sibling interfaces:
//   scene.js    createScene(mount) -> { scene, camera, renderer, resize }
//   stars.js    makeStars(scene, getObserverDate) -> Promise<{ update, ... }>
//   time.js     createClock(utc, speed) -> { getUTC, setUTC, tick(realDtMs), ... }
//   controls.js bindControls(camera, dom, {az,alt}) -> { getView, setView, dispose }  (event-driven)
//   ui.js       mountUI(root, {clock, observer, onChange}) -> { refresh, setFOV, destroy }
import { createScene } from './scene.js';
import { makeStars } from './stars.js';
import { createClock } from './time.js';
import { bindControls } from './controls.js';
import { mountUI } from './ui.js';

async function boot() {
  const mount = document.getElementById('app') || document.body;
  const { scene, camera, renderer } = createScene(mount);

  const observer = { lat: 48.8566, lon: 2.3522 }; // Paris; UI mutates in place
  const clock = createClock(new Date(), 1);

  const stars = await makeStars(scene, () => ({
    lat: observer.lat,
    lon: observer.lon,
    date: clock.getUTC(),
  }));

  bindControls(camera, renderer.domElement, { az: 0, alt: 20 });

  let dirty = false;
  const ui = mountUI(mount, { clock, observer, onChange: () => { dirty = true; } });

  let last = performance.now();
  let lastUTC = clock.getUTC().getTime();
  function frame(now) {
    clock.tick(now - last);
    last = now;

    const utc = clock.getUTC().getTime();
    if (utc !== lastUTC) { dirty = true; lastUTC = utc; }
    if (dirty) { stars.update(); dirty = false; }

    ui.refresh();
    ui.setFOV(camera.fov);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch((e) => console.error('skysim boot failed:', e));
