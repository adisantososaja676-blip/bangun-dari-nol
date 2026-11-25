// Mobil kecil low-poly (dipakai ep. 04, berguna untuk episode jalan raya).
// Titik asal di tanah, di tengah mobil; menghadap +X. Panjang ±1.5, lebar ±0.75.
import * as THREE from 'three';
import { mat, mesh } from './kit.js';

export function createCar(color = '#3d8bd9') {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body); // untuk efek guncang
  const lower = mesh(new THREE.BoxGeometry(1.5, 0.32, 0.74), color); lower.position.y = 0.3; body.add(lower);
  const cabin = mesh(new THREE.BoxGeometry(0.8, 0.28, 0.66), color); cabin.position.set(-0.08, 0.6, 0); body.add(cabin);
  const glass = mat('#bfe6f2', { roughness: 0.2 });
  const wf = mesh(new THREE.BoxGeometry(0.04, 0.22, 0.6), glass, { shadow: false }); wf.position.set(0.33, 0.6, 0); wf.rotation.z = -0.35; body.add(wf);
  const wr = mesh(new THREE.BoxGeometry(0.04, 0.2, 0.6), glass, { shadow: false }); wr.position.set(-0.49, 0.6, 0); body.add(wr);
  for (const s of [-1, 1]) {
    const side = mesh(new THREE.BoxGeometry(0.6, 0.18, 0.02), glass, { shadow: false }); side.position.set(-0.08, 0.61, s * 0.335); body.add(side);
    const lamp = mesh(new THREE.BoxGeometry(0.03, 0.08, 0.14), mat('#fff6c8', { emissive: '#fff1a0', emissiveIntensity: 0.6 }), { shadow: false }); lamp.position.set(0.76, 0.34, s * 0.24); body.add(lamp);
  }
  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 10); wgeo.rotateX(Math.PI / 2);
  for (const x of [-0.46, 0.46]) for (const z of [-0.37, 0.37]) {
    const w = mesh(wgeo, '#2a2d31'); w.position.set(x, 0.15, z); root.add(w); wheels.push(w);
  }
  // roll(dist): putar roda sesuai jarak tempuh
  const roll = (d) => wheels.forEach((w) => (w.rotation.z = -d / 0.15));
  return { root, body, wheels, roll, LEN: 1.5 };
}
