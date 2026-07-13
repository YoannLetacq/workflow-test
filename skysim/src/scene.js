// scene — three.js scene/camera/renderer + a faint horizon reference ring.
// The opaque ground landscape and N/E/S/W cardinal labels are owned by the ground
// pole (src/ground.js); the sky background/gradient is owned by the atmosphere pole
// (src/atmosphere.js). This module only provides the baseline rig so the app renders
// even before those layers mount.
// Coordinate convention (matches astro-core az): y = up (zenith), az from NORTH
// increasing EASTward: x = cos(alt)*sin(az), y = sin(alt), z = -cos(alt)*cos(az).
// So North = -Z, East = +X, South = +Z, West = -X. All layers project via the same
// mapping (dirFromAltAz) so everything lines up.
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

export function createScene(mount = document.body) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f); // night default until atmosphere mounts

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0);
  camera.lookAt(dirFromAltAz(10, 0, 10)); // slightly above the N horizon

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  // Faint horizon reference ring (baseline; the ground pole draws the real landscape).
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => dirFromAltAz(0, (i / 128) * 360, 500)),
    ),
    new THREE.LineBasicMaterial({ color: 0x2a6f4b, transparent: true, opacity: 0.5 }),
  );
  scene.add(ring);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return { scene, camera, renderer, resize };
}
