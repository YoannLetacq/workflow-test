// ground — opaque horizon landscape below alt=0 that occludes sub-horizon objects.
// Coordinate convention matches scene.js / stars.js: az from NORTH increasing EAST,
// dir = [cos(alt)*sin(az), sin(alt), -cos(alt)*cos(az)]. N=-Z, E=+X, up=+Y.
// Occlusion works because stars render with depthWrite:false at R=490; this ground
// is opaque and writes depth at R<490, so any star below the horizon sits behind it.
import * as THREE from 'three';

const R = 480; // inside the star sphere (490) and camera far plane (2000)

function dir(altDeg, azDeg, radius = 1) {
  const alt = (altDeg * Math.PI) / 180;
  const az = (azDeg * Math.PI) / 180;
  const ca = Math.cos(alt);
  return new THREE.Vector3(radius * ca * Math.sin(az), radius * Math.sin(alt), radius * -ca * Math.cos(az));
}

// Deterministic rolling-hills silhouette height (deg) for a given azimuth (deg).
function ridgeHeight(azDeg) {
  const a = (azDeg * Math.PI) / 180;
  const h = 3.0 + 2.0 * Math.sin(3 * a) + 1.3 * Math.sin(7 * a + 1.0) + 0.7 * Math.sin(13 * a + 2.5);
  return Math.max(0.5, h); // never dip below the true horizon
}

function labelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.font = 'bold 88px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(6, 6, 1);
  return sprite;
}

export function makeGround(scene) {
  const group = new THREE.Group();

  // Lower hemisphere bowl: guarantees full occlusion of everything below alt=0.
  // Camera sits at origin inside the sphere -> render the inner (Back) faces.
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x0a120c, side: THREE.BackSide }),
  );
  group.add(bowl);

  // Landscape silhouette skirt: opaque band from a touch below the horizon up to the
  // ridge line, so the skyline reads as distant hills rather than a flat rim.
  const STEPS = 256;
  const verts = [];
  for (let i = 0; i < STEPS; i++) {
    const az0 = (i / STEPS) * 360;
    const az1 = ((i + 1) / STEPS) * 360;
    const b0 = dir(-3, az0, R);
    const b1 = dir(-3, az1, R);
    const t0 = dir(ridgeHeight(az0), az0, R);
    const t1 = dir(ridgeHeight(az1), az1, R);
    // two triangles per segment (quad b0-b1-t1-t0)
    verts.push(b0.x, b0.y, b0.z, b1.x, b1.y, b1.z, t1.x, t1.y, t1.z);
    verts.push(b0.x, b0.y, b0.z, t1.x, t1.y, t1.z, t0.x, t0.y, t0.z);
  }
  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  const skirt = new THREE.Mesh(
    skirtGeo,
    new THREE.MeshBasicMaterial({ color: 0x060b07, side: THREE.DoubleSide }),
  );
  group.add(skirt);

  // Cardinal labels, nudged just above the horizon so they sit against the sky.
  const cardinals = [
    ['N', 0, '#7fd0ff'],
    ['E', 90, '#ffffff'],
    ['S', 180, '#ffffff'],
    ['W', 270, '#ffffff'],
  ];
  for (const [label, az, color] of cardinals) {
    const s = labelSprite(label, color);
    s.position.copy(dir(2, az, R - 100));
    group.add(s);
  }

  scene.add(group);
  return { group, ridgeHeight };
}
