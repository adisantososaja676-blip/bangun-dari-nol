// Ep. 08 Candi tanpa semen: dinding uji → sambungan kunci (ekor burung, takikan)
// → pintu: ambang patah → lengkung semu → candi 3 teras: hujan menggenang →
// jaladwara → air meresap, dinding miring (potongan) → pemugaran → Borobudur.
// Candi rekaan sederhana (bukan replika). Semua fungsi murni dari t.
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeIn, easeOutBack, cameraAt, makeArrow, makeInstances, buildField, makeRain, quake } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';

const STONE = ['#7d8580', '#6f7772', '#878f89', '#737a74', '#80887f'];
const FX = 300;
const WZ = 5.5;                        // dinding uji / gapura (z)
const BW = 0.5, BHt = 0.25, BD = 0.4;  // ukuran batu dinding uji
const TER = [{ h: 3.0 }, { h: 2.2 }, { h: 1.4 }]; // setengah lebar teras, tinggi 1 tiap teras
const TH = 1.0, WT = 0.3;              // tinggi teras, tebal dinding
const BERO_HOME = new THREE.Vector3(-2.4, 0, 7.0);
const DEMO = new THREE.Vector3(2.7, 0, 7.6);

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(808);
  const dur = (id) => e(id) - s(id);
  const at = (id, f) => s(id) + dur(id) * f;
  const field = buildField(kit, { seed: 81, plot: 4.6, clear: { x0: -8, x1: 8, z0: -6, z1: 20 } });
  const fieldB = buildField(kit, { seed: 82, plot: 0, at: [FX, 0, 0], trees: 80, clear: { x0: -18, x1: 18, z0: -18, z1: 60 } });
  const stoneIM = (n, geo = new THREE.BoxGeometry(1, 1, 1)) => {
    const im = makeInstances(geo, mat('#ffffff'), n); im.castShadow = true; im.receiveShadow = true;
    for (let i = 0; i < n; i++) im.setColorAt(i, new THREE.Color(STONE[Math.floor(R() * STONE.length)]));
    scene.add(im); return im;
  };

  // ---------------- dinding uji / gapura ----------------
  // layout: daftar batu {x (tengah), r (baris), len}
  const wallPlain = [], wallDoor = [], wallCorbel = [];
  for (let r = 0; r < 8; r++) {
    const off = r % 2 ? BW / 2 : 0;
    for (let x = -1.5 - off; x < 1.5; x += BW) {
      const a = Math.max(x, -1.5), b = Math.min(x + BW, 1.5); if (b - a < 0.1) continue;
      wallPlain.push({ x: (a + b) / 2, r, len: b - a });
    }
  }
  const OPEN = 0.5; // setengah lebar lubang pintu
  wallPlain.forEach((b) => { if (b.r > 4) return; const a = b.x - b.len / 2, c = b.x + b.len / 2; if (c <= -OPEN || a >= OPEN) wallDoor.push(b); else { if (a < -OPEN) wallDoor.push({ x: (a - OPEN) / 2, r: b.r, len: -OPEN - a }); if (c > OPEN) wallDoor.push({ x: (c + OPEN) / 2, r: b.r, len: c - OPEN }); } });
  wallDoor.forEach((b) => wallCorbel.push(b));
  // ambang (lintel) baris 5 + di atasnya bata biasa (baris 5..7 untuk versi pintu)
  const wallDoorTop = wallPlain.filter((b) => b.r >= 6);
  for (const sd of [-1, 1]) wallDoorTop.push({ x: sd * 1.175, r: 5, len: 0.65 });
  // lengkung semu: baris 5..8 menjorok 0.17 tiap baris dari kiri & kanan
  for (let r = 5; r < 9; r++) {
    const inner = Math.max(0, OPEN - (r - 4) * 0.17);
    for (const sd of [-1, 1]) {
      const a = inner, c = 1.5; const n = Math.ceil((c - a) / BW - 0.01);
      for (let k = 0; k < n; k++) { const x0 = a + k * (c - a) / n, x1 = a + (k + 1) * (c - a) / n; wallCorbel.push({ x: sd * (x0 + x1) / 2, r, len: x1 - x0, cor: r - 4 }); }
    }
    if (inner === 0 && r === 8) break;
  }
  wallCorbel.push({ x: 0, r: 9, len: 1.2, cap: true });
  const wIM = { plain: stoneIM(wallPlain.length), door: stoneIM(wallDoor.length + wallDoorTop.length), corbel: stoneIM(wallCorbel.length) };
  const doorList = [...wallDoor, ...wallDoorTop];
  const lintel = [0, 1].map(() => { const m = mesh(new THREE.BoxGeometry(0.85, BHt - 0.02, BD - 0.02), '#7a827c'); scene.add(m); return m; });
  const lintelCrack = mesh(new THREE.BoxGeometry(0.03, BHt, BD + 0.02), '#2e3330', { shadow: false }); scene.add(lintelCrack);
  const fallers = new Set([wallPlain.length - 2, wallPlain.length - 4, wallPlain.length - 8, wallPlain.length - 11, wallPlain.length - 13]);
  const fallSeeds = wallPlain.map(() => [R(), R(), R()]);

  // ---------------- demo sambungan ----------------
  const prism = (pts, h) => { const sh = new THREE.Shape(); sh.moveTo(...pts[0]); pts.slice(1).forEach((p) => sh.lineTo(...p)); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; };
  const demoM = mat('#8a928c'), demoM2 = mat('#a7ada5');
  const dvA = mesh(prism([[-0.8, -0.3], [0, -0.3], [0, -0.08], [0.18, -0.15], [0.18, 0.15], [0, 0.08], [0, 0.3], [-0.8, 0.3]], 0.45), demoM2);
  const dvB = mesh(prism([[0.005, -0.3], [0.8, -0.3], [0.8, 0.3], [0.005, 0.3], [0.005, 0.08], [0.185, 0.15], [0.185, -0.15], [0.005, -0.08]], 0.45), demoM);
  const dv = new THREE.Group(); dv.add(dvA, dvB); dv.scale.setScalar(0.85); scene.add(dv);
  const tkD = new THREE.Group(), tkC = new THREE.Group();
  { const a = mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), demoM); a.position.set(0, 0.15, 0); const b = mesh(new THREE.BoxGeometry(0.45, 0.2, 0.6), demoM); b.position.set(-0.225, 0.4, 0); tkD.add(a, b); }
  { const a = mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), demoM2); a.position.set(0, 0.65, 0); const b = mesh(new THREE.BoxGeometry(0.45, 0.2, 0.6), demoM2); b.position.set(0.225, 0.4, 0); tkC.add(a, b); }
  const tk = new THREE.Group(); tk.add(tkD, tkC); tk.scale.setScalar(0.85); scene.add(tk);

  // ---------------- candi 3 teras ----------------
  const temple = new THREE.Group(); scene.add(temple);
  const coreM = new THREE.MeshStandardMaterial({ color: '#9b6b43', flatShading: true, roughness: 0.9 });
  const floorM = mat('#9aa19b');
  const cores = TER.map((t, k) => {
    const c = mesh(new THREE.BoxGeometry(2 * (t.h - WT), TH, 2 * (t.h - WT)), coreM); c.position.y = k * TH + TH / 2; temple.add(c);
    const f = mesh(new THREE.BoxGeometry(2 * t.h, 0.06, 2 * t.h), floorM); f.position.y = (k + 1) * TH + 0.03; temple.add(f);
    return { c, f };
  });
  // batu dinding teras (instanced): {k, side, u, r, len}; side: 0 depan(+z) 1 belakang 2 kanan(+x) 3 kiri
  const tb = [];
  TER.forEach((t, k) => {
    for (let r = 0; r < 4; r++) for (let sd = 0; sd < 4; sd++) {
      const L = sd < 2 ? t.h : t.h - WT; const off = (r + sd) % 2 ? 0.3 : 0;
      for (let u = -L - off; u < L; u += 0.6) { const a = Math.max(u, -L), b = Math.min(u + 0.6, L); if (b - a < 0.12) continue; tb.push({ k, sd, u: (a + b) / 2, r, len: b - a, h: 0.25, y0: k * TH + r * 0.25 }); }
    }
    // pagar langkan (balustrade) di tepi atas
    for (let sd = 0; sd < 4; sd++) { const L = sd < 2 ? t.h : t.h - 0.2; for (let u = -L; u < L - 0.05; u += 0.5) { const b = Math.min(u + 0.5, L); tb.push({ k, sd, u: (u + b) / 2, r: 4, len: b - u - 0.06, h: 0.22, y0: (k + 1) * TH + 0.06, bal: true }); } }
  });
  const tIM = stoneIM(tb.length);
  // stupa puncak (bentuk lonceng sederhana)
  const stupa = new THREE.Group(); temple.add(stupa);
  { const b = mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.25, 12), '#8a928c'); b.position.y = 0.12; const bell = mesh(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#8a928c'); bell.position.y = 0.25; bell.scale.y = 1.15; const c = mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), '#8a928c'); c.position.y = 1.15; const sp = mesh(new THREE.ConeGeometry(0.1, 0.6, 8), '#8a928c'); sp.position.y = 1.55; stupa.add(b, bell, c, sp); stupa.position.y = 3 * TH + 0.06; }
  // tangga depan
  const stairs = new THREE.Group(); temple.add(stairs);
  for (let k = 0; k < 3; k++) for (let st = 0; st < 4; st++) { const m = mesh(new THREE.BoxGeometry(0.9, 0.25, 0.3), '#858d87'); m.position.set(0, k * TH + st * 0.25 + 0.125, TER[k].h + 0.15 * 4 - (st + 0.5) * 0.3 * 0.5 - 0.3); stairs.add(m); }
  // genangan air
  const puddleM = new THREE.MeshStandardMaterial({ color: '#4fa8d8', transparent: true, opacity: 0.75, roughness: 0.1, flatShading: true });
  const puddles = [];
  TER.forEach((t, k) => {
    const inner = TER[k + 1]?.h ?? 0.9, w = t.h - 0.2 - inner;
    for (let sd = 0; sd < 4; sd++) {
      const m = mesh(new THREE.BoxGeometry(sd < 2 ? 2 * (t.h - 0.2) : w, 1, sd < 2 ? w : 2 * inner), puddleM, { shadow: false });
      const c = inner + w / 2; m.userData = { k };
      m.position.set(sd === 2 ? c : sd === 3 ? -c : 0, 0, sd === 0 ? c : sd === 1 ? -c : 0); temple.add(m); puddles.push(m);
    }
  });
  // jaladwara di sudut tiap teras
  const spouts = [];
  TER.forEach((t, k) => { for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const g = new THREE.Group(); const head = mesh(new THREE.BoxGeometry(0.22, 0.2, 0.36), '#6f7772'); head.position.z = 0.1; const jaw = mesh(new THREE.BoxGeometry(0.18, 0.06, 0.2), '#5d655f'); jaw.position.set(0, -0.08, 0.3);
    g.add(head, jaw); g.position.set(sx * (t.h + 0.05), (k + 1) * TH - 0.05, sz * (t.h + 0.05)); g.rotation.y = Math.atan2(sx, sz); temple.add(g); spouts.push({ g, sx, sz, k, p: g.position.clone() });
  } });
  const NJ = 12 * 14;
  const jet = makeInstances(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: '#8fe3ff', emissive: '#2a9fd6', emissiveIntensity: 0.5, flatShading: true }), NJ); scene.add(jet);
  // potongan: lapisan kedap & pipa
  const fix = new THREE.Group(); temple.add(fix);
  const memM = mat('#2b5fb0');
  TER.forEach((t, k) => { const m = mesh(new THREE.BoxGeometry(2 * (t.h - WT) + 0.06, 0.09, 2 * (t.h - WT) + 0.06), memM, { shadow: false }); m.position.y = (k + 1) * TH - 0.06; fix.add(m); });
  const pipeM = mat('#f2f2ee');
  TER.forEach((t, k) => { const p = mesh(new THREE.CylinderGeometry(0.07, 0.07, 2 * (t.h - WT) - 0.1, 8), pipeM, { shadow: false }); p.rotation.z = Math.PI / 2; p.position.set(0, (k + 1) * TH - 0.25, t.h - WT + 0.1); fix.add(p); const d = mesh(new THREE.CylinderGeometry(0.07, 0.07, (k + 1) * TH - 0.2, 8), pipeM, { shadow: false }); d.position.set(t.h - WT - 0.2, ((k + 1) * TH - 0.2) / 2, t.h - WT + 0.1); fix.add(d); });
  const NS = 60;
  const seep = makeInstances(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#2a9fd6', emissiveIntensity: 0.5, flatShading: true }), NS); scene.add(seep);
  const seepSeeds = Array.from({ length: NS }, () => [R(), R(), R()]);
  const rain = makeRain(kit, 600, [26, 16, 22], [0, 7, 3]);

  // ---------------- Borobudur (x=FX) ----------------
  const bo = new THREE.Group(); bo.position.x = FX; scene.add(bo);
  const boM = mat('#7b827c'), boM2 = mat('#8a918b');
  [12, 11, 10, 9, 8, 7].forEach((h, i) => { const m = mesh(new THREE.BoxGeometry(2 * h, 0.8, 2 * h), i % 2 ? boM : boM2); m.position.y = i * 0.8 + 0.4; bo.add(m); const p = mesh(new THREE.BoxGeometry(2 * h + 0.2, 0.18, 2 * h + 0.2), boM); p.position.y = (i + 1) * 0.8; bo.add(p); });
  const RINGS = [[5.6, 32], [4.6, 24], [3.6, 16]];
  RINGS.forEach(([r, n], i) => {
    const y0 = 4.8 + i * 0.5; const c = mesh(new THREE.CylinderGeometry(r + 0.4, r + 0.5, 0.5, 32), i % 2 ? boM : boM2); c.position.y = y0 + 0.25; bo.add(c);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const b = mesh(new THREE.SphereGeometry(0.32, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), boM2, { shadow: false }); b.scale.y = 1.4; b.position.set(Math.cos(a) * (r - 0.1), y0 + 0.5, Math.sin(a) * (r - 0.1)); bo.add(b); }
  });
  { const m = mesh(new THREE.SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), boM2); m.scale.y = 1.2; m.position.y = 6.3; bo.add(m); const sp = mesh(new THREE.ConeGeometry(0.25, 1.6, 8), boM); sp.position.y = 8.6; bo.add(sp); }
  const NB = 220;
  const flyIM = stoneIM(NB);
  const flySeeds = Array.from({ length: NB }, (_, i) => { const lvl = Math.floor(R() * 6), h = 12 - lvl, side = Math.floor(R() * 2); return { from: [side ? (R() - 0.5) * 2 * h : h + 0.1, lvl * 0.8 + 0.4, side ? h + 0.1 : (R() - 0.5) * 2 * h], to: [-12 + (i % 22) * 1.15, 0.2, 15.5 + Math.floor(i / 22) * 0.9], d: R() }; });

  // ---------------- panah ----------------
  const yArr = Array.from({ length: 4 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const rArr = Array.from({ length: 4 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  const X = new THREE.Vector3(1, 0, 0);
  function arrow(a, from, dir, L) { a.visible = L > 0.05; a.setLength(Math.max(0.05, L)); a.position.copy(from); a.quaternion.setFromUnitVectors(X, dir.clone().normalize()); }

  const bero = createBero(); scene.add(bero.root);

  // ---------------- kamera ----------------
  const WALL = { pos: [-0.3, 2.1, 12.4], look: [-0.3, 1.0, WZ] };
  const FULL = { pos: [6.5, 6.4, 14.5], look: [0, 1.6, 1.0] };
  const camKeys = [
    { t: 0, pos: [7.5, 4.0, 15.5], look: [0, 1.7, 1.5], fov: 50 },
    { t: s('intro') - 0.01, ...FULL, blend: 3.2 },
    { t: s('intro'), cut: true, ...WALL },
    { t: s('geser'), pos: [0.2, 1.9, 11.6], look: [0, 1.0, WZ], blend: 1.0 },
    { t: s('kunci'), pos: [2.55, 5.0, 11.6], look: [2.55, 0.2, DEMO.z], blend: 1.0 },
    { t: at('kunci', 0.8), ...WALL, blend: 1.0 },
    { t: s('pintu'), pos: [0.3, 1.6, 9.0], look: [0, 1.3, WZ], blend: 1.0 },
    { t: s('semu'), pos: [0.6, 2.0, 9.4], look: [0, 1.6, WZ], blend: 1.0 },
    { t: s('hujan'), ...FULL, blend: 1.4 },
    { t: s('jaladwara'), pos: [5.2, 4.2, 9.0], look: [0, 1.6, 0.8], blend: 1.0 },
    { t: s('resap'), pos: [0, 4.2, 12.5], look: [0, 1.5, 0], blend: 1.0 },
    { t: s('pugar'), pos: [0, 4.4, 12.8], look: [0, 1.6, 0], blend: 0.6 },
    { t: s('berdiri'), ...FULL, blend: 1.2 },
    { t: s('fakta'), cut: true, pos: [FX + 22, 15, 34], look: [FX, 3.0, 0], fov: 50 },
    { t: at('fakta', 0.4), pos: [FX + 6, 7, 30], look: [FX - 2, 1.5, 12], blend: 1.4 },
    { t: at('fakta', 0.72), pos: [FX + 20, 13, 32], look: [FX, 3.5, 2], blend: 1.4 },
    { t: s('outro'), cut: true, pos: [-1.4, 1.9, 11.2], look: [-1.4, 1.6, 4.0], fov: 50 },
    { t: e('outro'), pos: [2.5, 3.6, 15], look: [-0.5, 2.0, 1.5], blend: 3.0 },
  ];

  return {
    update(t) {
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const home = !L('fakta');
      field.root.visible = home; fieldB.root.visible = !home; bo.visible = !home; flyIM.visible = !home;
      const cx = home ? 0 : FX;
      sun.position.set(cx - 12, 22, 16); sun.target.position.set(cx, 0, 0);
      scene.fog.near = home ? 40 : 70; scene.fog.far = home ? 140 : 240;
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);
      const teaser = t < s('intro');
      const done = teaser || t >= s('berdiri');

      // gempa
      let gq = 0;
      if (L('geser') && t > at('geser', 0.38)) gq = quake(t, 0.07 * (1 - smooth((t - at('geser', 0.92)) / 0.4)));
      if (L('kunci') && t > at('kunci', 0.86)) gq = quake(t, 0.07);
      field.root.position.x = gq;

      // ===== dinding uji / gapura =====
      const wallStage = L('intro', 'kunci') ? 'plain' : L('pintu') ? 'door' : (L('semu', 'outro') || teaser) ? 'corbel' : 'none';
      const showWall = home && !L('resap', 'pugar');
      wIM.plain.visible = showWall && wallStage === 'plain';
      wIM.door.visible = showWall && wallStage === 'door';
      wIM.corbel.visible = showWall && wallStage === 'corbel';
      const rowY = (r) => (r + 0.5) * BHt;
      if (wIM.plain.visible) {
        const grow = L('intro') ? clamp((t - at('intro', 0.15)) / (dur('intro') * 0.8)) : 1;
        wallPlain.forEach((b, i) => {
          let sc = clamp((grow * 8 - b.r) * 1.3);
          if (sc < 0.01) { wIM.plain.set(i, 0, -999, 0, 0); return; }
          let x = b.x + gq, y = rowY(b.r) + (1 - sc) * 0.3, z = WZ, rz = 0;
          if (L('geser') && t > at('geser', 0.38)) {
            const u = t - at('geser', 0.38);
            const [p, q, w] = fallSeeds[i];
            if (fallers.has(i)) {
              const tf = 0.9 + p * 0.6, dir = q > 0.5 ? 1 : -1;
              const slide = Math.min(u, tf) * 0.35 * dir;
              x = b.x + slide; z = WZ + (w - 0.5) * 0.3 * Math.min(u, tf);
              if (u > tf) { const v = u - tf, h0 = rowY(b.r); const fall = Math.min(v, Math.sqrt(2 * (h0 - 0.12) / 9.8)); y = Math.max(0.12, h0 - 4.9 * fall * fall); z = WZ + 0.3 + v * 0.8 * (w + 0.5) * (y > 0.13 ? 1 : 0) + (y <= 0.13 ? Math.sqrt(2 * (h0 - 0.12) / 9.8) * 0.8 * (w + 0.5) : 0); rz = dir * Math.min(v, 0.6) * 2.4; x += dir * Math.min(v, 0.6) * 0.5; }
            } else x = b.x + gq * (1 - b.r / 10) + quake(t + p, 0.012 * b.r);
          }
          if (L('kunci') && fallers.has(i)) { // dipasang ulang
            const k = smooth((t - at('kunci', 0.78)) / 0.4);
            if (k < 1) { x = lerp(b.x + 1.4, b.x, k); y = lerp(0.12, rowY(b.r), k); z = lerp(WZ + 1.2, WZ, k); if (k <= 0) { wIM.plain.set(i, 0, -999, 0, 0); return; } }
          }
          wIM.plain.set(i, x, y, z, b.len - 0.02, (BHt - 0.02) * sc, BD - 0.02, 0, 0, rz);
        });
      }
      if (wIM.door.visible) {
        doorList.forEach((b, i) => {
          const gone = b.r >= 6 && t > at('pintu', 0.8) ? 1 : 0; // batu di atas ambang ikut jatuh? tetap ditopang sisi
          const yy = b.r >= 6 ? rowY(b.r) - (b.x > -OPEN && b.x < OPEN && t > at('pintu', 0.82) ? 9 : 0) : rowY(b.r);
          void gone;
          wIM.door.set(i, b.x, yy, WZ, b.len - 0.02, BHt - 0.02, BD - 0.02);
        });
      }
      // ambang batu
      const lintelOn = showWall && L('pintu');
      lintel.forEach((m) => (m.visible = lintelOn)); lintelCrack.visible = false;
      if (lintelOn) {
        const sag = smooth((t - at('pintu', 0.45)) / 0.8) * 0.06;
        const brk = t > at('pintu', 0.8) ? t - at('pintu', 0.8) : 0;
        lintel.forEach((m, i) => {
          const sd = i ? 1 : -1;
          const ang = -sd * (sag + (brk > 0 ? Math.min(brk * 1.8, 1.1) : 0));
          const piv = new THREE.Vector3(sd * 0.8, rowY(5), WZ);
          const off = new THREE.Vector3(-sd * 0.4, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), ang);
          m.position.copy(piv).add(off); m.rotation.set(0, 0, ang);
          if (brk > 0.55) { const v = brk - 0.55; m.position.y = Math.max(0.12, m.position.y - 4.9 * v * v); m.position.x += -sd * v * 0.2; }
        });
        lintelCrack.visible = t > at('pintu', 0.7) && brk === 0; lintelCrack.position.set(0, rowY(5) - 0.04, WZ);
        lintelCrack.scale.y = smooth((t - at('pintu', 0.7)) / 0.25);
      }
      if (wIM.corbel.visible) {
        wallCorbel.forEach((b, i) => {
          let sc = 1;
          if (L('semu') && (b.cor || b.cap)) { const order = b.cap ? 5 : b.cor; sc = easeOutBack((t - at('semu', 0.12) - order * 0.16 * dur('semu') * 0.3) / 0.4); }
          if (sc < 0.01) { wIM.corbel.set(i, 0, -999, 0, 0); return; }
          wIM.corbel.set(i, b.x * (b.cor ? lerp(1.15, 1, sc) : 1), rowY(b.r) + (1 - Math.min(1, sc)) * 0.4, WZ, b.len - 0.02, BHt - 0.02, BD - 0.02);
        });
      }

      // ===== demo sambungan =====
      const demoOn = home && L('kunci') && t < at('kunci', 0.82);
      dv.visible = tk.visible = demoOn;
      if (demoOn) {
        dv.position.set(DEMO.x - 0.65, 0, DEMO.z); tk.position.set(DEMO.x + 0.6, 0, DEMO.z);
        const kA = smooth((t - at('kunci', 0.32)) / 0.6);
        dvA.position.set(0, lerp(1.0, 0, kA), 0);
        if (kA >= 1) dvA.position.x = -0.04 * Math.abs(Math.sin((t - at('kunci', 0.44)) * 7)) * (t < at('kunci', 0.6) ? 1 : 0);
        const kC = smooth((t - at('kunci', 0.56)) / 0.6);
        tkC.position.set(0, lerp(0.9, 0, kC), 0);
        tk.scale.setScalar(1.0 * easeOutBack((t - at('kunci', 0.5)) / 0.3) || 0.001);
        dv.scale.setScalar(1.0 * Math.max(0.001, easeOutBack((t - s('kunci') - 0.2) / 0.4)));
      }

      // ===== candi =====
      const templeOn = home && (teaser || t >= s('hujan'));
      temple.visible = templeOn;
      const rise = L('hujan') ? easeOut((t - s('hujan')) / 0.9) : 1;
      temple.scale.y = Math.max(0.01, rise);
      const cut = L('resap', 'pugar') ? 1 : 0;
      let tilt = 0;
      if (L('resap')) tilt = 0.2 * smooth((t - at('resap', 0.6)) / 1.4);
      let lift = 0;
      if (L('pugar')) { const u0 = at('pugar', 0.08), u1 = at('pugar', 0.66); lift = smooth((t - u0) / 0.6) * (1 - smooth((t - u1) / 0.7)); tilt = 0.2 * (1 - smooth((t - u0) / 0.6)); }
      const wet = L('resap') ? smooth((t - at('resap', 0.4)) / 1.4) : L('pugar') ? 1 - smooth((t - at('pugar', 0.45)) / 1.0) : 0;
      coreM.color.set('#9b6b43').lerp(new THREE.Color('#4a3424'), wet);
      if (templeOn) tb.forEach((b, i) => {
        const t0 = TER[b.k];
        if (cut && b.sd === 0) { tIM.set(i, 0, -999, 0, 0); return; }
        const outward = t0.h - WT / 2;
        let along = b.u, out = b.bal ? t0.h - 0.08 : outward, y = b.y0 + b.h / 2, rz = 0, w = b.bal ? 0.16 : WT - 0.02;
        // miring: dinding samping berputar keluar di kaki dinding
        let ox = 0, oy = 0, ang = 0;
        if ((b.sd === 2 || b.sd === 3) && tilt > 0 && !b.bal) { const hy = y - b.k * TH; ang = tilt; ox = hy * Math.sin(ang); oy = hy * (Math.cos(ang) - 1); }
        if ((b.sd === 2 || b.sd === 3) && b.bal && tilt > 0) { ox = TH * Math.sin(tilt); oy = TH * (Math.cos(tilt) - 1); ang = tilt; }
        const ly = lift * (1.2 + b.k * 0.3 + (b.r % 2) * 0.1);
        if (b.sd === 0) tIM.set(i, along, y, out, b.len - 0.03, b.h - 0.02, w);
        else if (b.sd === 1) tIM.set(i, along, y, -out, b.len - 0.03, b.h - 0.02, w);
        else { const sg = b.sd === 2 ? 1 : -1; rz = -sg * ang; tIM.set(i, sg * (out + ox + lift * 0.9), y + oy + ly, along, w, b.h - 0.02, b.len - 0.03, 0, 0, rz); }
      });
      tIM.visible = templeOn;
      cores.forEach(({ c, f }) => { f.visible = true; c.visible = true; });
      stairs.visible = !cut; stupa.visible = true;
      // genangan
      let pud = 0;
      if (L('hujan')) pud = smooth((t - at('hujan', 0.45)) / 1.6);
      if (L('jaladwara')) pud = 1 - smooth((t - at('jaladwara', 0.3)) / 1.6);
      puddles.forEach((m) => { m.visible = templeOn && pud > 0.02 && !cut; m.scale.y = 0.14 * pud; m.position.y = (m.userData.k + 1) * TH + 0.06 + 0.07 * pud; });
      const spOn = templeOn && (t >= s('jaladwara') || teaser);
      spouts.forEach(({ g }) => (g.visible = spOn));
      jet.hideAll();
      const jetOn = templeOn && L('jaladwara', 'resap') && !(L('resap') && t > at('resap', 0.3));
      if (jetOn) spouts.forEach(({ sx, sz, p }, j) => {
        for (let q = 0; q < 14; q++) {
          const tau = ((t * 1.3 + q / 14 + j * 0.07) % 1) * 0.6, d = new THREE.Vector3(sx, 0, sz).normalize();
          const sk = L('jaladwara') ? smooth((t - at('jaladwara', 0.15) - j * 0.03) / 0.4) : 1;
          jet.set(j * 14 + q, p.x + d.x * (0.35 + 1.4 * tau), p.y - 4.9 * tau * tau, p.z + d.z * (0.35 + 1.4 * tau), sk);
        }
      });
      fix.visible = templeOn && L('pugar') && t > at('pugar', 0.28);
      if (fix.visible) fix.children.forEach((m, i) => { m.scale.setScalar(Math.max(0.01, smooth((t - at('pugar', 0.3) - i * 0.06) / 0.4))); });
      seep.hideAll();
      if (templeOn && L('resap') && t > at('resap', 0.05)) seepSeeds.forEach(([a, b, c], i) => {
        const k = i % 3, t0 = TER[k], ph = (t * 0.6 + a) % 1;
        seep.set(i, (b - 0.5) * 2 * (t0.h - WT - 0.2), (k + 1) * TH - ph * 0.9, t0.h - WT + 0.03, 0.9);
      });
      rain.update(t, home && L('hujan', 'jaladwara') ? 1 : L('resap') ? 0.5 * (1 - smooth((t - at('resap', 0.5)) / 1)) : 0);
      setSky(L('hujan', 'jaladwara') ? 0.85 : L('resap') ? 0.85 * (1 - smooth((t - at('resap', 0.5)) / 1)) : 0);

      // ===== Borobudur & batu terbang =====
      flyIM.hideAll();
      if (!home) {
        const outK = (d) => smooth((t - at('fakta', 0.42) - d * 0.8) / 0.8), backK = (d) => smooth((t - at('fakta', 0.74) - d * 0.8) / 0.8);
        flySeeds.forEach((f, i) => {
          const k = outK(f.d) * (1 - backK(f.d)); if (k < 0.01) return;
          const p = f.from.map((v, j) => lerp(v, f.to[j], k)); p[1] += Math.sin(k * Math.PI) * 3;
          flyIM.set(i, FX + p[0], p[1], p[2], 0.7, 0.35, 0.45, 0, k * 2, 0);
        });
      }

      // ===== panah =====
      yArr.forEach((a) => (a.visible = false)); rArr.forEach((a) => (a.visible = false));
      if (home && L('semu') && t > at('semu', 0.62)) {
        const g = smooth((t - at('semu', 0.62)) / 0.4);
        arrow(yArr[0], new THREE.Vector3(0, 2.9, WZ + 0.3), new THREE.Vector3(0, -1, 0), 0.6 * g);
        arrow(yArr[1], new THREE.Vector3(-0.35, 1.8, WZ + 0.3), new THREE.Vector3(-0.6, -1, 0), 0.9 * g);
        arrow(yArr[2], new THREE.Vector3(0.35, 1.8, WZ + 0.3), new THREE.Vector3(0.6, -1, 0), 0.9 * g);
      }
      if (home && L('pintu') && t > at('pintu', 0.3) && t < at('pintu', 0.8)) arrow(rArr[0], new THREE.Vector3(0, 2.3, WZ + 0.3), new THREE.Vector3(0, -1, 0), 0.8 * smooth((t - at('pintu', 0.3)) / 0.4));
      if (home && L('resap') && tilt > 0.01) [-1, 1].forEach((sd, i) => arrow(rArr[i], new THREE.Vector3(sd * (TER[0].h + 0.4), 0.7, 1.0), new THREE.Vector3(sd, 0, 0), 0.9 * tilt / 0.2));

      // ===== label =====
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_HOME.x + 0.6, 1.5, WZ + 0.9], alpha: fade('intro', 0.2) * (1 - smooth((t - at('intro', 0.75)) / 0.3)), up: 30, tone: 'yellow' });
      if (L('geser')) st.labels.push({ text: 'Bergeser', pos: [0.6, 1.9, WZ], alpha: smooth((t - at('geser', 0.7)) / 0.3), up: 60, tone: 'red' });
      if (demoOn) {
        st.labels.push({ text: 'Ekor burung', pos: [DEMO.x - 0.65, 0.4, DEMO.z], alpha: smooth((t - at('kunci', 0.48)) / 0.3), up: 70, tone: 'yellow' });
        st.labels.push({ text: 'Takikan', pos: [DEMO.x + 0.6, 0.6, DEMO.z], alpha: smooth((t - at('kunci', 0.64)) / 0.3), up: 110, tone: 'yellow' });
      }
      if (L('pintu')) st.labels.push({ text: 'Patah', pos: [0, rowY(5), WZ + 0.2], alpha: smooth((t - at('pintu', 0.8)) / 0.3), up: 90, tone: 'red' });
      if (L('semu')) st.labels.push({ text: 'Lengkung semu', pos: [0, 2.0, WZ + 0.2], alpha: smooth((t - at('semu', 0.8)) / 0.3), up: 70, tone: 'yellow' });
      if (L('hujan')) st.labels.push({ text: 'Menggenang', pos: [1.6, 1.15, 2.6], alpha: smooth((t - at('hujan', 0.6)) / 0.3), up: 50, tone: 'red' });
      if (L('jaladwara')) st.labels.push({ text: 'Jaladwara', pos: [TER[0].h + 0.1, TH, TER[0].h + 0.1], alpha: smooth((t - at('jaladwara', 0.2)) / 0.3), up: 60, tone: 'yellow' });
      if (L('resap')) {
        st.labels.push({ text: 'Bukit tanah basah', pos: [0, 1.3, TER[0].h - WT], alpha: smooth((t - at('resap', 0.5)) / 0.3), up: 150 });
        st.labels.push({ text: 'Miring', pos: [-(TER[0].h + 0.1), 0.9, 1.5], alpha: smooth((t - at('resap', 0.86)) / 0.3), up: 50, tone: 'red' });
      }
      if (L('pugar')) {
        st.labels.push({ text: 'Saluran air', pos: [-0.8, 2.8, TER[0].h - WT - 0.1 - 0.6], alpha: smooth((t - at('pugar', 0.35)) / 0.3), up: 120, tone: 'yellow' });
        st.labels.push({ text: 'Lapisan kedap air', pos: [0.6, 0.95, TER[0].h - WT], alpha: smooth((t - at('pugar', 0.5)) / 0.3), up: 40, tone: 'yellow' });
      }
      if (L('berdiri')) st.labels.push({ text: 'Berdiri kokoh', pos: [0, 3.8, 0], alpha: fade('berdiri', 0.2), up: 40, tone: 'yellow' });
      if (!home) st.card = { title: 'Pemugaran Borobudur 1973–1983', body: '±1 juta batu dibongkar, dibersihkan, dipasang lagi', top: 0.08, alpha: fade('fakta', 0.5) };

      // ===== Pak Bero =====
      let bp = BERO_HOME.clone(), anim = 'idle', yaw = null;
      if (teaser) { bp.set(-1.6, 0, 8.2); anim = 'happy'; }
      else if (L('intro')) { bp.set(-1.5, 0, WZ + 0.75); anim = t < at('intro', 0.15) ? 'wave' : 'slap'; if (anim === 'slap') yaw = Math.PI; }
      else if (L('geser')) anim = t > at('geser', 0.7) ? 'panic' : 'idle';
      else if (L('kunci')) { bp.set(0.9, 0, DEMO.z - 0.6); anim = t > at('kunci', 0.86) ? 'happy' : 'point'; if (anim === 'point') yaw = 1.2; }
      else if (L('pintu')) anim = t > at('pintu', 0.8) ? 'panic' : 'point';
      else if (L('semu')) anim = t > at('semu', 0.75) ? 'happy' : 'slap';
      else if (L('hujan')) { bp.set(-3.6, 0, 6.0); anim = 'sad'; }
      else if (L('jaladwara')) { bp.set(-3.6, 0, 6.0); anim = 'happy'; }
      else if (L('resap')) { bp.set(-4.2, 0, 3.8); anim = t > at('resap', 0.8) ? 'panic' : 'think'; }
      else if (L('pugar')) { bp.set(-4.2, 0, 3.8); anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('berdiri')) { bp.set(-3.4, 0, 6.2); anim = 'happy'; }
      else if (!home) { bp.set(FX - 3.5, 0, 17.5); anim = 'carry'; }
      else if (L('outro')) { bp.set(-1.4, 0, 7.0); anim = 'wave'; }
      bp.x += gq;
      if (yaw === null) yaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      bero.root.position.copy(bp);
      bero.pose(t, anim, { yaw });
      if (gq) { camera.position.x += gq * 0.3; }
      void done; void easeIn;
      return st;
    },
  };
}
