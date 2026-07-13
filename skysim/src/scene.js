// scene — three.js scene/camera/renderer + horizon plane + N/E/S/W cardinal markers.
// Coordinate convention (matches astro-core az): y = up (zenith), az from NORTH
// increasing EASTward. Horizon direction for azimuth `az` (deg) and altitude `alt`
// (deg) is: x = cos(alt)*sin(az), y = sin(alt), z = -cos(alt)*cos(az).
// So North = -Z, East = +X, South = +Z, West = -X. Consumers (stars) MUST use the
// same mapping via dirFromAltAz() so everything lines up.
import * as THREE from 'three';

export function dirFromAltAz(altDeg, azDeg, radius = 1) {
  const alt = (altDeg * Math.PI) / 180;
  const az = (azDeg * Math.PI) / 180;
  const ca = Math.cos(alt);
  return new THREE.Vector3(
    radius * ca * Math.sin(az),
    radius * Math.sin(alt),
    radius * -ca * Math.cos(az),
  );
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
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(6, 6, 1);
  return sprite;
}

export function createScene(mount = document.body) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  // Look toward the northern horizon by default.
  camera.position.set(0, 0, 0);
  camera.lookAt(dirFromAltAz(10, 0, 10)); // slightly above N horizon

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  // Horizon plane: a large disc at the observer's feet.
  const horizon = new THREE.Mesh(
    new THREE.CircleGeometry(500, 64),
    new THREE.MeshBasicMaterial({ color: 0x0b1a12, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  );
  horizon.rotation.x = -Math.PI / 2; // lie flat (normal = +y)
  horizon.position.y = -0.01;
  scene.add(horizon);

  // Horizon ring for a crisp skyline.
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => dirFromAltAz(0, (i / 128) * 360, 500)),
    ),
    new THREE.LineBasicMaterial({ color: 0x2a6f4b }),
  );
  scene.add(ring);

  // Cardinal markers on the horizon.
  const cardinals = [
    ['N', 0, '#7fd0ff'],
    ['E', 90, '#ffffff'],
    ['S', 180, '#ffffff'],
    ['W', 270, '#ffffff'],
  ];
  for (const [label, az, color] of cardinals) {
    const s = labelSprite(label, color);
    s.position.copy(dirFromAltAz(2, az, 300));
    scene.add(s);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return { scene, camera, renderer, resize };
}
