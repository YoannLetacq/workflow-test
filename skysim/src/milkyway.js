// milkyway-render: diffuse Milky Way band as a texture-mapped celestial sphere,
// driven by astro-core alt/az. Data PROVIDED (never invented): data/milkyway.json
// (GeoJSON FeatureCollection, 5 MultiPolygon layers ol1..ol5, [lon,lat] =
// RA-folded(-180,180]/Dec — same convention as messier.json, see
// .omc/prep-r2/REPORT.md §2).
//
// Rendering approach: the 5 layers are rasterized once, at load, onto an
// equirectangular (RA x Dec) canvas — full-winding polygons (the outer halo
// layer's envelope curves wind the entire RA circle) fill correctly under a
// canvas path-fill rule with no special-casing, unlike flat-plane triangulation.
// That canvas becomes a THREE.CanvasTexture on an inward-facing SphereGeometry
// built in a fixed "equatorial" local frame; update() then rotates the WHOLE
// mesh per frame to match the current equatorial->horizontal transform, instead
// of reprojecting tens of thousands of vertices individually (see rotation
// derivation below — mathematically identical to the per-point stars.js/
// constellations.js reproject pattern, just applied once as a rigid rotation).
import * as THREE from 'three';
import { equatorialToHorizontal } from './astro.js';
import { dirFromAltAz } from './scene.js';

const R = 483; // > ground's 480 so the ground's depth test properly occludes it (see makeGround comment); still behind stars (490) and constellations (485)

// Outline layers run broadest/faintest (ol1) to narrowest/brightest (ol5) per
// d3-celestial's naming convention (prep-r2/REPORT.md §2). Target: a SUBTLE haze
// behind the stars, not a foreground glow — peak combined alpha where all 5
// layers nest (the galactic core) sums to ~0.12 (additive 'lighter' compositing
// of same-hue fills is exactly alpha-additive below saturation, verified in the
// report), outermost ol1 alone ~0.02 (barely perceptible).
const LAYER_WEIGHT = { ol1: 0.02, ol2: 0.022, ol3: 0.024, ol4: 0.026, ol5: 0.028 };
const BASE_COLOR = new THREE.Color(0xbfd4ff); // pale cool-white band
const BASE_RGB = [Math.round(BASE_COLOR.r * 255), Math.round(BASE_COLOR.g * 255), Math.round(BASE_COLOR.b * 255)];

const TEX_W = 2048, TEX_H = 1024; // equirectangular: x = RA [0,360), y = Dec [+90,-90]

// getObserverDate() -> { lat, lon, date } (also accepts { observer:{lat,lon}, date }).
function readObserver(getObserverDate) {
  const s = getObserverDate();
  const observer = s.observer || s;
  const lat = observer.lat, lon = observer.lon;
  const date = s.date instanceof Date ? s.date : new Date(s.date ?? Date.now());
  return { lat, lon, date };
}

// A ring's raw lon sequence can jump across the (-180,180] fold seam mid-ring
// (grazing crossings, or — for the two ol1 envelope rings — a full wind around
// the whole RA circle). Unwrap so consecutive points never jump by more than
// 180deg, matching constellations.js/messier.js's own reprojection convention.
// Folding each point independently instead (i.e. `lon<0?lon+360:lon` per point,
// with no memory of the previous point) was the bug behind the dark-patch
// artifacts: two geometrically-adjacent points straddling the seam would fold to
// x-values ~2000px apart, drawing a spurious edge that cut across the canvas and
// evenodd-cancelled a chunk of that layer's own fill.
function unwrapLon(ring) {
  const out = [ring[0][0]];
  for (let i = 1; i < ring.length; i++) {
    let lon = ring[i][0];
    const prev = out[i - 1];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push(lon);
  }
  return out;
}

// Rasterize all 5 layers onto one equirectangular canvas: one Path2D per layer
// (all its rings as subpaths, filled 'evenodd' so nested holes subtract
// naturally — no manual hole/exterior classification needed), composited with
// 'lighter' so brighter/narrower inner layers add on top of the faint halo.
// Each ring's continuously-unwrapped path is drawn 3x (shifted -W/0/+W in pixel
// space, i.e. -360/0/+360deg) so any polygon crossing the canvas's RA=0/360 seam
// wraps cleanly — including the two ol1 rings that wind the entire RA circle
// (two of the three shifted copies each contribute a complementary visible
// slice; a flat triangulator chokes on those, a 2D scanline fill rule doesn't).
// ponytail: single global canvas blur softens hard polygon edges into a glow —
// good enough without a manual downscale/upscale blur pass.
function rasterize(data) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(4px)';

  for (const feat of data.features) {
    const geom = feat.geometry;
    if (!geom || geom.type !== 'MultiPolygon') continue;
    const alpha = LAYER_WEIGHT[feat.id] ?? 0.03;
    ctx.fillStyle = `rgba(${BASE_RGB[0]},${BASE_RGB[1]},${BASE_RGB[2]},${alpha})`;
    const path = new Path2D();
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        const lons = unwrapLon(ring);
        for (const shift of [-TEX_W, 0, TEX_W]) {
          lons.forEach((lon, i) => {
            const x = (lon / 360) * TEX_W + shift;
            const y = ((90 - ring[i][1]) / 180) * TEX_H;
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
          path.closePath();
        }
      }
    }
    ctx.fill(path, 'evenodd');
  }
  return { canvas, ctx };
}

// Three reference equatorial directions (ra,dec) whose local-frame position on
// a vanilla THREE.SphereGeometry(radius, widthSegments, heightSegments) is
// exactly the standard basis (1,0,0)/(0,1,0)/(0,0,1) — derived from three's own
// vertex formula (phi=ra, theta=90-dec): x=-cos(ra)cos(dec), y=sin(dec),
// z=sin(ra)cos(dec). Mapping each through equatorialToHorizontal+dirFromAltAz
// gives that same basis's image in the alt-az world frame; the 3x3 matrix with
// those images as columns IS the mesh's per-frame rotation — mathematically the
// same transform stars.js/constellations.js apply per vertex, applied once as a
// rigid rotation instead of tens of thousands of times. Verified numerically
// against the point-based path in milkyway.selfcheck.mjs.
const ROTATION_REF = [
  { ra: 180, dec: 0 }, // -> local X
  { ra: 0, dec: 90 },  // -> local Y
  { ra: 90, dec: 0 },  // -> local Z
];

export async function makeMilkyway(scene, getObserverDate) {
  const res = await fetch(new URL('../data/milkyway.json', import.meta.url));
  if (!res.ok) throw new Error(`milkyway.json load failed: ${res.status}`);
  const data = await res.json();

  const { canvas } = rasterize(data);
  const texture = new THREE.CanvasTexture(canvas);

  const geometry = new THREE.SphereGeometry(R, 64, 32);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide, // camera sits inside the sphere looking out
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  function update() {
    const { lat, lon, date } = readObserver(getObserverDate);
    const basis = ROTATION_REF.map(({ ra, dec }) => {
      const { alt, az } = equatorialToHorizontal(ra, dec, lat, lon, date);
      return dirFromAltAz(alt, az, 1);
    });
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...basis));
  }

  update(); // initial orientation
  return {
    mesh,
    points: mesh, // alias for main.js's `.points`/`.mesh` duck-typing (§0 contract)
    geometry,
    material,
    texture,
    update,
    setVisible(v) { mesh.visible = !!v; },
    get visible() { return mesh.visible; },
  };
}
