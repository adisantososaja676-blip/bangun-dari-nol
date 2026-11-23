// Diorama potongan tanah: balok tanah melayang dengan muka depan terpotong (z = cut)
// supaya lapisan tanah, air, & pondasi kelihatan. Dipakai ulang untuk episode
// pondasi, jalan raya, terowongan, dll.
import * as THREE from 'three';
import { PAL, mat, mesh, rng } from './kit.js';

export const SOIL = {
  swampTop: '#6f8a45', grassTop: PAL.grass, soft: '#8b7a68', softWet: '#5f6670', hard: '#9a8466', hardRock: '#7d7266', sand: '#c9ad7a',
};

// layers: [{y0, y1, color}] dari atas ke bawah. top: warna lapisan paling atas (tipis).
export function buildDiorama(kit, {
  at = [0, 0, 0], x0 = -7.5, x1 = 7.5, zBack = -7, cut = 1.4, seed = 3,
  top = SOIL.swampTop, topH = 0.08,
  layers = [{ y0: -0.08, y1: -4.6, color: SOIL.soft }, { y0: -4.6, y1: -12, color: SOIL.hard }],
  swamp = true, clear = [], rocks = true, hills = true,
} = {}) {
  const R = rng(seed);
  const root = new THREE.Group(); root.position.set(...at); kit.scene.add(root);
  const W = x1 - x0, D = cut - zBack, cx = (x0 + x1) / 2, cz = (zBack + cut) / 2;
  const topBox = mesh(new THREE.BoxGeometry(W, topH, D), top); topBox.position.set(cx, -topH / 2, cz); root.add(topBox);
  for (const L of layers) {
    const h = L.y0 - L.y1;
    const b = mesh(new THREE.BoxGeometry(W, h, D), L.color); b.position.set(cx, (L.y0 + L.y1) / 2, cz); root.add(b);
  }
  const bottom = layers.at(-1).y1;
  // batu di lapisan paling bawah (tanah keras)
  if (rocks) {
    const hardL = layers.at(-1);
    for (let i = 0; i < 26; i++) {
      const r = 0.12 + R() * 0.22;
      const rock = mesh(new THREE.DodecahedronGeometry(r, 0), SOIL.hardRock, { shadow: false });
      rock.position.set(x0 + 0.4 + R() * (W - 0.8), hardL.y0 - 0.3 - R() * Math.min(3.2, hardL.y0 - hardL.y1 - 0.6), cut - r * 0.3);
      rock.rotation.set(R() * 3, R() * 3, R() * 3); root.add(rock);
    }
  }
  const inClear = (x, z, pad = 0) => clear.some((c) => x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad);
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  if (swamp) {
    // genangan air
    const pMat = new THREE.MeshStandardMaterial({ color: PAL.water, flatShading: true, roughness: 0.2, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 14; i++) {
      const x = x0 + 0.8 + R() * (W - 1.6), z = zBack + 0.8 + R() * (D - 1.4);
      if (inClear(x, z, 0.6)) continue;
      const p = mesh(new THREE.CylinderGeometry(1, 1, 0.02, 9), pMat, { shadow: false });
      p.scale.set(0.4 + R() * 0.7, 1, 0.3 + R() * 0.5); p.position.set(x, 0.012, Math.min(z, cut - 0.5)); p.rotation.y = R() * 3; root.add(p);
    }
    // rumput rawa (alang-alang)
    const reedGeo = new THREE.ConeGeometry(0.04, 1, 4);
    for (let i = 0; i < 70; i++) {
      const x = x0 + 0.3 + R() * (W - 0.6), z = zBack + 0.3 + R() * (D - 0.6);
      if (inClear(x, z, 0.3)) continue;
      for (let k = 0; k < 3; k++) {
        const h = 0.35 + R() * 0.45;
        const reed = mesh(reedGeo, k % 2 ? PAL.grassDark : '#7fa34a', { shadow: false });
        reed.scale.set(1, h, 1); reed.position.set(x + (R() - 0.5) * 0.2, h / 2, z + (R() - 0.5) * 0.2);
        reed.rotation.set((R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4); root.add(reed);
      }
    }
  }
  // pohon bulat di belakang
  const treeGeoT = new THREE.CylinderGeometry(0.12, 0.16, 1, 6);
  for (let i = 0; i < 14; i++) {
    const x = x0 + 0.6 + R() * (W - 1.2), z = zBack + 0.6 + R() * 2.4;
    if (inClear(x, z, 0.8)) continue;
    const s = 0.8 + R() * 0.7;
    const tr = mesh(treeGeoT, PAL.trunk); tr.scale.set(s, s, s); tr.position.set(x, 0.5 * s, z); root.add(tr);
    const lf = mesh(leafGeo, [PAL.leaf, PAL.leaf2, PAL.leaf3][i % 3]); lf.scale.set(s * 0.95, s * 1.05, s * 0.95); lf.position.set(x, 1.45 * s, z); lf.rotation.y = R() * 3; root.add(lf);
  }
  // dasar balok sedikit lebih gelap (bayangan bawah)
  const base = mesh(new THREE.BoxGeometry(W + 0.02, 0.06, D + 0.02), '#5a4c3e', { shadow: false }); base.position.set(cx, bottom - 0.03, cz); root.add(base);
  if (hills) for (let i = 0; i < 16; i++) {
    const h = 14 + R() * 16;
    const hill = mesh(new THREE.ConeGeometry(9 + R() * 8, h, 5), i % 2 ? PAL.hills : PAL.hills2, { shadow: false, receive: false });
    const a = Math.PI * (1.05 + R() * 0.9);
    hill.position.set(Math.cos(a) * (80 + R() * 25), h / 2 - 14, Math.sin(a) * (70 + R() * 25));
    hill.rotation.y = R() * 3; root.add(hill);
  }
  return { root, cut, x0, x1, bottom };
}
