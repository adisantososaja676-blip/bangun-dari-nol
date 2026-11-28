// Kereta low-poly: lokomotif + gerbong (datar / boks), berjalan di rel sumbu +x.
// place(xFront, {yAt, zAt, bob}) menaruh tiap gerbong dari tinggi rel di posisi
// bogie (fungsi murni → deterministik). Lebar sepur default 1.0 (rel di z=±0.5).
import * as THREE from 'three';
import { mesh, mat } from './kit.js';

const WR = 0.22; // jari-jari roda

function bogieWheels(g, xs, gauge) {
  const wheels = [];
  const wGeo = new THREE.CylinderGeometry(WR, WR, 0.08, 12); wGeo.rotateX(Math.PI / 2);
  for (const x of xs) for (const sz of [-1, 1]) {
    const w = mesh(wGeo, '#2b2f33'); w.position.set(x, WR, sz * gauge / 2); g.add(w); wheels.push(w);
    const hub = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.09), '#c9a227', { shadow: false }); w.add(hub);
  }
  return wheels;
}

export function createTrain({ gauge = 1.0, cars = ['loco', 'flat', 'box'], body = '#d9583b', stripe = '#f3e7cf', boxColor = '#8a5a3c', flatColor = '#6d7880' } = {}) {
  const root = new THREE.Group();
  const units = [];
  let off = 0;
  for (const kind of cars) {
    const g = new THREE.Group(); root.add(g);
    const len = kind === 'loco' ? 3.4 : kind === 'flat' ? 3.0 : 3.4;
    const axles = [-len / 2 + 0.45, -len / 2 + 0.95, len / 2 - 0.95, len / 2 - 0.45];
    const frame = mesh(new THREE.BoxGeometry(len, 0.14, 1.25), '#3b3f44'); frame.position.y = WR * 2 + 0.05; g.add(frame);
    const wheels = bogieWheels(g, axles, gauge);
    const y0 = WR * 2 + 0.12;
    if (kind === 'loco') {
      const hood = mesh(new THREE.BoxGeometry(len * 0.62, 0.9, 1.05), body); hood.position.set(-len * 0.12, y0 + 0.45, 0); g.add(hood);
      const cab = mesh(new THREE.BoxGeometry(len * 0.3, 1.25, 1.25), body); cab.position.set(len * 0.33, y0 + 0.62, 0); g.add(cab);
      const roof = mesh(new THREE.BoxGeometry(len * 0.32, 0.08, 1.32), '#3b3f44'); roof.position.set(len * 0.33, y0 + 1.28, 0); g.add(roof);
      const st = mesh(new THREE.BoxGeometry(len * 0.98, 0.12, 1.27), stripe, { shadow: false }); st.position.set(0, y0 + 0.35, 0); g.add(st);
      const win = mat('#9fd8e8', { emissive: '#2a6f80', emissiveIntensity: 0.3 });
      for (const sz of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02), win, { shadow: false }); w.position.set(len * 0.33, y0 + 0.92, sz * 0.63); g.add(w); }
      const fw = mesh(new THREE.BoxGeometry(0.02, 0.35, 0.9), win, { shadow: false }); fw.position.set(len * 0.48 + 0.01, y0 + 0.92, 0); g.add(fw);
      const lamp = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), mat('#fff6c2', { emissive: '#ffe680', emissiveIntensity: 0.8 }), { shadow: false }); lamp.rotation.z = Math.PI / 2; lamp.position.set(len / 2 + 0.01, y0 + 0.5, 0); g.add(lamp);
      const horn = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), '#c9ced3'); horn.position.set(-len * 0.2, y0 + 1.0, 0); g.add(horn);
    } else if (kind === 'box') {
      const b = mesh(new THREE.BoxGeometry(len, 1.15, 1.22), boxColor); b.position.y = y0 + 0.58; g.add(b);
      const d = mesh(new THREE.BoxGeometry(0.9, 0.95, 1.25), '#6d4630'); d.position.y = y0 + 0.55; g.add(d);
      const r = mesh(new THREE.BoxGeometry(len + 0.06, 0.06, 1.28), '#5b3a28'); r.position.y = y0 + 1.18; g.add(r);
    } else {
      const deck = mesh(new THREE.BoxGeometry(len, 0.12, 1.25), flatColor); deck.position.y = y0 + 0.02; g.add(deck);
      for (const sz of [-1, 1]) { const rail = mesh(new THREE.BoxGeometry(len, 0.18, 0.06), '#4a5158'); rail.position.set(0, y0 + 0.16, sz * 0.6); g.add(rail); }
    }
    units.push({ g, len, axles, wheels, off: off + len / 2, kind });
    off += len + 0.25;
  }
  const length = off - 0.25;

  /**
   * xFront: posisi ujung depan (x). yAt(x): tinggi PUNCAK rel di x (default 0.24).
   * zAt(x): posisi tengah sepur di z (default 0). bob(i): goyang ekstra (y) per gerbong.
   */
  function place(xFront, { yAt = () => 0.24, zAt = () => 0, bob = () => 0, roll = () => 0 } = {}) {
    units.forEach((u, i) => {
      const cx = xFront - u.off;
      const xa = cx + u.axles[0], xb = cx + u.axles[3];
      const ya = yAt(xa), yb = yAt(xb), za = zAt(xa), zb = zAt(xb);
      u.g.position.set(cx, (ya + yb) / 2 + bob(i), (za + zb) / 2);
      u.g.rotation.set(roll(i), -Math.atan2(zb - za, xb - xa), Math.atan2(yb - ya, xb - xa));
      u.wheels.forEach((w) => (w.rotation.z = -cx / WR));
    });
  }
  /** posisi dunia (lokal root) di atas gerbong ke-i, untuk menaruh Pak Bero dsb. */
  const top = (i) => { const u = units[i]; return new THREE.Vector3(u.g.position.x, u.g.position.y + WR * 2 + 0.2, u.g.position.z); };
  place(0);
  return { root, place, length, units, top };
}
