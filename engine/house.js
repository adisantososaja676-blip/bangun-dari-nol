// Rumah sederhana Pak Bero (versi akhir ep. 02: dinding bata, rangka beton, atap seng ringan).
// Titik asal di tengah bawah (lantai = y 0). Dipakai ulang di episode lain.
import * as THREE from 'three';
import { PAL, mat, mesh, lerp, clamp, rng } from './kit.js';

export const HOUSE = { FRONT: 1.4, SIDE: 1.9, WALL_H: 2.6, RING: 0.2, RISE: 1.05 };

export function createHouse({ seed = 5 } = {}) {
  const { FRONT, SIDE, WALL_H, RING, RISE } = HOUSE;
  const root = new THREE.Group();
  const wallMat = mat('#c96a47'), frameMat = mat(PAL.concrete), dark = mat('#3b4a55'), door = mat('#7a4b2a');
  const box = (w, h, d, m, x, y, z) => { const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); root.add(b); return b; };

  // dinding
  box(2 * SIDE, WALL_H, 0.2, wallMat, 0, WALL_H / 2, FRONT);
  box(2 * SIDE, WALL_H, 0.2, wallMat, 0, WALL_H / 2, -FRONT);
  box(0.2, WALL_H, 2 * FRONT, wallMat, -SIDE, WALL_H / 2, 0);
  box(0.2, WALL_H, 2 * FRONT, wallMat, SIDE, WALL_H / 2, 0);
  // garis bata halus (nat) di dinding depan
  const mortar = mat('#d8b9a0');
  for (let r = 1; r < 13; r++) box(2 * SIDE - 0.05, 0.015, 0.01, mortar, 0, r * 0.2, FRONT + 0.105);
  // pintu & jendela
  box(0.9, 1.75, 0.06, door, 0, 0.875, FRONT + 0.11);
  for (const sx of [-1, 1]) {
    box(0.7, 0.7, 0.06, dark, sx * 1.2, 1.55, FRONT + 0.11);
    box(0.8, 0.08, 0.1, frameMat, sx * 1.2, 1.16, FRONT + 0.12);
  }
  // rangka beton: sloof, kolom sudut, ring balok
  box(2 * SIDE + 0.25, 0.2, 0.26, frameMat, 0, 0.1, FRONT + 0.01);
  for (const sx of [-1, 1]) box(0.26, WALL_H + RING, 0.26, frameMat, sx * SIDE, (WALL_H + RING) / 2, FRONT + 0.01);
  box(2 * SIDE + 0.25, RING, 0.26, frameMat, 0, WALL_H + RING / 2, FRONT + 0.01);
  box(2 * SIDE + 0.25, RING, 0.26, frameMat, 0, WALL_H + RING / 2, -FRONT);

  // atap seng ringan (sama dengan ep. 02)
  const top = WALL_H + RING, EAVE = 1.9, DROP = 0.22;
  const roof = new THREE.Group(); roof.position.y = top; root.add(roof);
  const ang = Math.atan2(RISE + DROP, EAVE), L = Math.hypot(EAVE, RISE + DROP) + 0.05;
  for (const sd of [-1, 1]) {
    const slab = new THREE.Group(); roof.add(slab);
    slab.position.set(0, (RISE - DROP) / 2, sd * EAVE / 2); slab.rotation.x = sd * ang;
    const p = mesh(new THREE.BoxGeometry(4.6, 0.05, L), '#a9c3cf'); p.position.y = 0.025; slab.add(p);
    for (let k = 0; k < 15; k++) { const rib = mesh(new THREE.BoxGeometry(0.04, 0.03, L), '#d5e4ea', { shadow: false }); rib.position.set(-2.2 + k * 0.315, 0.065, 0); slab.add(rib); }
  }
  const ridge = mesh(new THREE.BoxGeometry(4.7, 0.12, 0.2), '#8fb0bf'); ridge.position.y = RISE + 0.09; roof.add(ridge);
  const tri = new THREE.Shape(); tri.moveTo(-FRONT, 0); tri.lineTo(FRONT, 0); tri.lineTo(0, RISE * 0.93); tri.closePath();
  for (const sx of [-1, 1]) {
    const gb = new THREE.ExtrudeGeometry(tri, { depth: 0.08, bevelEnabled: false }); gb.rotateY(Math.PI / 2);
    const m = mesh(gb, '#f1e3c6'); m.position.x = sx * SIDE - 0.04; roof.add(m);
  }

  // retak di dinding depan (tumbuh lewat setCrack(0..1))
  const R = rng(seed);
  const crackMat = mat('#3a1c12', { emissive: '#ff5a5f', emissiveIntensity: 0.25 });
  const zig = (x0, y0, x1, y1, n, amp) => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n; const j = i === 0 || i === n ? 0 : (R() - 0.5) * amp;
    return [lerp(x0, x1, u) + j, lerp(y0, y1, u) + j * 0.5];
  });
  const cracks = [zig(0.55, 1.75, 1.65, 2.55, 7, 0.16), zig(-0.95, 1.2, -1.75, 0.25, 7, 0.16), zig(0.5, 0.6, 1.0, 1.15, 4, 0.1)].map((pts) => {
    const g = new THREE.Group(); root.add(g);
    g.segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const m = mesh(new THREE.BoxGeometry(1, 0.05, 0.03), crackMat, { shadow: false });
      m.geometry.translate(0.5, 0, 0); m.position.set(x0, y0, FRONT + 0.12); m.rotation.z = Math.atan2(y1 - y0, x1 - x0); m.L = len;
      g.add(m); g.segs.push(m);
    }
    return g;
  });
  function setCrack(p) {
    cracks.forEach((c, k) => {
      const n = c.segs.length;
      c.segs.forEach((m, i) => { const q = clamp(p * n * 1.15 - i - k * 0.4); m.visible = q > 0; m.scale.x = Math.max(0.01, m.L * q); });
    });
  }
  setCrack(0);
  return { root, setCrack, height: top + RISE };
}
