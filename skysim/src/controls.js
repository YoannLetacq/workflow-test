// controls — drag to look (azimuth/altitude), wheel to zoom FOV. Pointer + touch.
// Pure ES module; the only three.js coupling is camera.lookAt / camera.fov.
//
// View convention (matches astro-core az from NORTH increasing EASTward):
//   up = +Y, North = -Z, East = +X.
//   az=0 looks North (-Z); az=90 looks East (+X). alt lifts toward +Y.

const DEG = Math.PI / 180;
const ALT_LIMIT = 89;        // avoid gimbal flip at the zenith/nadir
const FOV_MIN = 10, FOV_MAX = 100;
const DRAG_SPEED = 0.15;     // deg of view per px
const ZOOM_STEP = 0.05;      // fraction of FOV per wheel notch

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// az/alt (deg) -> unit look direction. Pure, no three dep so it's testable.
export function azAltToDir(azDeg, altDeg) {
  const az = azDeg * DEG, alt = altDeg * DEG, ca = Math.cos(alt);
  return { x: Math.sin(az) * ca, y: Math.sin(alt), z: -Math.cos(az) * ca };
}

export function bindControls(camera, dom, { az = 0, alt = 20 } = {}) {
  let view = { az, alt };
  const apply = () => {
    const d = azAltToDir(view.az, view.alt);
    camera.up.set(0, 1, 0);
    camera.lookAt(camera.position.x + d.x, camera.position.y + d.y, camera.position.z + d.z);
  };

  const setView = (az, alt) => {
    view.az = ((az % 360) + 360) % 360;
    view.alt = clamp(alt, -ALT_LIMIT, ALT_LIMIT);
    apply();
  };

  // ---- pointer drag ----
  let dragging = false, lastX = 0, lastY = 0;
  const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; dom.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!dragging) return;
    setView(view.az + (e.clientX - lastX) * DRAG_SPEED, view.alt - (e.clientY - lastY) * DRAG_SPEED);
    lastX = e.clientX; lastY = e.clientY;
  };
  const onUp = (e) => { dragging = false; dom.releasePointerCapture?.(e.pointerId); };

  // ---- wheel zoom (FOV) ----
  const onWheel = (e) => {
    e.preventDefault();
    camera.fov = clamp(camera.fov * (1 + Math.sign(e.deltaY) * ZOOM_STEP), FOV_MIN, FOV_MAX);
    camera.updateProjectionMatrix();
  };

  // ---- touch: 1 finger drag, 2 finger pinch-zoom ----
  let pinch = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 1) { dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
    else if (e.touches.length === 2) { dragging = false; pinch = dist(e.touches); }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      const t = e.touches[0];
      setView(view.az + (t.clientX - lastX) * DRAG_SPEED, view.alt - (t.clientY - lastY) * DRAG_SPEED);
      lastX = t.clientX; lastY = t.clientY;
    } else if (e.touches.length === 2 && pinch) {
      const d = dist(e.touches);
      camera.fov = clamp(camera.fov * (pinch / d), FOV_MIN, FOV_MAX);
      camera.updateProjectionMatrix();
      pinch = d;
    }
  };
  const onTouchEnd = () => { dragging = false; pinch = 0; };

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  dom.addEventListener('wheel', onWheel, { passive: false });
  dom.addEventListener('touchstart', onTouchStart, { passive: false });
  dom.addEventListener('touchmove', onTouchMove, { passive: false });
  dom.addEventListener('touchend', onTouchEnd);

  apply();

  return {
    getView: () => ({ ...view }),
    setView,
    dispose() {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
    },
  };
}

// ponytail: self-check runs only under node (`node src/controls.js`), skipped in browser.
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  let d = azAltToDir(0, 0);   assert(near(d.x, 0) && near(d.y, 0) && near(d.z, -1), 'az0 -> North(-Z)');
  d = azAltToDir(90, 0);      assert(near(d.x, 1) && near(d.y, 0) && near(d.z, 0), 'az90 -> East(+X)');
  d = azAltToDir(0, 90);      assert(near(d.y, 1), 'alt90 -> up(+Y)');
  console.log('controls self-check OK');
}
