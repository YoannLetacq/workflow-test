// ui pole: lat/lon + city presets, datetime control, FOV readout, UTC+LST HUD.
// mountUI(root, {clock, observer, onChange}) -> {refresh, setFOV, destroy}.
// Mutates observer.lat/lon and clock time in place, then calls onChange() so main re-projects.
import { julianDate, lst } from "./astro.js";

const CITIES = [
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
];

// Date -> "YYYY-MM-DDTHH:mm" in UTC, for <input type="datetime-local"> (read as UTC by us).
function toLocalInput(d) {
  return d.toISOString().slice(0, 16);
}
// HH:MM:SS from degrees of sidereal time (360deg = 24h).
function degToHMS(deg) {
  const h = ((deg / 15) % 24 + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = Math.floor(((h - hh) * 60 - mm) * 60);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}`;
}

export function mountUI(root, { clock, observer, onChange }) {
  const panel = document.createElement("div");
  panel.className = "skysim-ui";
  panel.innerHTML = `
    <label>Lat <input type="number" step="0.0001" min="-90" max="90" data-k="lat"></label>
    <label>Lon <input type="number" step="0.0001" min="-180" max="180" data-k="lon"></label>
    <label>City <select data-k="city">
      <option value="">—</option>
      ${CITIES.map((c, i) => `<option value="${i}">${c.name}</option>`).join("")}
    </select></label>
    <label>UTC <input type="datetime-local" step="1" data-k="dt"></label>
    <div class="skysim-hud">
      <span>UTC: <b data-h="utc"></b></span>
      <span>LST: <b data-h="lst"></b></span>
      <span>FOV: <b data-h="fov">—</b></span>
    </div>`;
  root.appendChild(panel);

  const latEl = panel.querySelector('[data-k="lat"]');
  const lonEl = panel.querySelector('[data-k="lon"]');
  const cityEl = panel.querySelector('[data-k="city"]');
  const dtEl = panel.querySelector('[data-k="dt"]');
  const hUtc = panel.querySelector('[data-h="utc"]');
  const hLst = panel.querySelector('[data-h="lst"]');
  const hFov = panel.querySelector('[data-h="fov"]');

  // Push observer/clock state into the inputs (without firing change loops).
  function syncInputs() {
    latEl.value = observer.lat;
    lonEl.value = observer.lon;
    dtEl.value = toLocalInput(clock.getUTC());
  }

  // Update the read-only HUD from current state. Cheap; safe to call every frame.
  function refresh() {
    const utc = clock.getUTC();
    hUtc.textContent = utc.toISOString().replace("T", " ").slice(0, 19) + "Z";
    hLst.textContent = degToHMS(lst(julianDate(utc), observer.lon));
    if (dtEl !== document.activeElement) dtEl.value = toLocalInput(utc);
  }

  function setFOV(fovDeg) {
    hFov.textContent = `${fovDeg.toFixed(1)}°`;
  }

  const commit = () => { refresh(); onChange && onChange(); };

  latEl.addEventListener("change", () => {
    const v = parseFloat(latEl.value);
    if (Number.isFinite(v)) { observer.lat = Math.max(-90, Math.min(90, v)); commit(); }
  });
  lonEl.addEventListener("change", () => {
    const v = parseFloat(lonEl.value);
    if (Number.isFinite(v)) { observer.lon = Math.max(-180, Math.min(180, v)); commit(); }
  });
  cityEl.addEventListener("change", () => {
    const c = CITIES[cityEl.value];
    if (c) { observer.lat = c.lat; observer.lon = c.lon; syncInputs(); commit(); }
  });
  dtEl.addEventListener("change", () => {
    const d = new Date(dtEl.value + "Z"); // interpret input as UTC
    if (!Number.isNaN(d.getTime())) { clock.setUTC(d); commit(); }
  });

  syncInputs();
  refresh();
  return {
    refresh,
    setFOV,
    destroy: () => panel.remove(),
  };
}
