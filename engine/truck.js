// Truk bak low-poly (ep. 05; berguna untuk jalan tol, jembatan, tambang).
// Titik asal di tanah, di tengah truk; menghadap +X. Panjang ±3.4, lebar ±1.0.
// setLoad(k): 0 = bak kosong, 1 = penuh normal, 2 = kelebihan muatan (menggunung).
import * as THREE from 'three';
import { mat, mesh } from './kit.js';

export function createTruck(color = '#e8833a') {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const chassis = mesh(new THREE.BoxGeometry(3.3, 0.16, 0.8), '#3a3f44'); chassis.position.y = 0.42; body.add(chassis);
  const cab = mesh(new THREE.BoxGeometry(0.9, 0.85, 0.96), color); cab.position.set(1.15, 0.92, 0); body.add(cab);
  const glass = mat('#bfe6f2', { roughness: 0.2 });
  const ws = mesh(new THREE.BoxGeometry(0.04, 0.34, 0.84), glass, { shadow: false }); ws.position.set(1.61, 1.1, 0); body.add(ws);
  for (const s of [-1, 1]) { const sw = mesh(new THREE.BoxGeometry(0.5, 0.3, 0.02), glass, { shadow: false }); sw.position.set(1.2, 1.1, s * 0.485); body.add(sw); }
  const bed = new THREE.Group(); bed.position.set(-0.55, 0.5, 0); body.add(bed);
  const wallMat = mat('#7a8a5a');
  const floor = mesh(new THREE.BoxGeometry(2.1, 0.08, 1.0), wallMat); floor.position.y = 0.04; bed.add(floor);
  for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(2.1, 0.5, 0.06), wallMat); w.position.set(0, 0.3, s * 0.47); bed.add(w); }
  for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.06, 0.5, 1.0), wallMat); w.position.set(s * 1.02, 0.3, 0); bed.add(w); }
  const fill = mesh(new THREE.BoxGeometry(2.0, 1, 0.9), '#c9a46b'); fill.geometry.translate(0, 0.5, 0); fill.position.y = 0.08; bed.add(fill);
  const heap = mesh(new THREE.ConeGeometry(1, 1, 7), '#c9a46b'); heap.geometry.translate(0, 0.5, 0); heap.scale.set(1.05, 1, 0.5); bed.add(heap);
  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12); wgeo.rotateX(Math.PI / 2);
  const AX = [1.15, -0.75, -1.3];
  for (const x of AX) for (const z of [-0.46, 0.46]) { const w = mesh(wgeo, '#2a2d31'); w.position.set(x, 0.24, z); root.add(w); wheels.push(w); }
  function setLoad(k) {
    fill.visible = k > 0.02; fill.scale.y = Math.max(0.01, Math.min(1, k) * 0.45);
    const over = Math.max(0, k - 1);
    heap.visible = over > 0.02; heap.position.y = 0.08 + 0.45; heap.scale.y = Math.max(0.01, over * 1.1);
  }
  setLoad(1);
  const roll = (d) => wheels.forEach((w) => (w.rotation.z = -d / 0.24));
  return { root, body, wheels, roll, setLoad, AXLES: AX, LEN: 3.4 };
}
