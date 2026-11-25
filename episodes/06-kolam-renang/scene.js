// Ep. 06 Kolam renang: diorama potongan tanah, dipotong di tengah kolam (z=0),
// supaya dinding, lapisan, air kolam & muka air tanah terlihat.
// Semua posisi dihitung dari waktu t (deterministik).
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeIn, easeOutBack, cameraAt, makeArrow, makeInstances } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';
import { buildDiorama, SOIL } from '/engine/soil.js';

const IX = 2.2, WT = 0.25, OX = IX + WT;   // dalam / tebal dinding / luar (x)
const FL = -1.5, FB = FL - WT;              // lantai dalam, dasar pelat
const IZ = -2.0, OZ = IZ - WT;              // dinding belakang dalam/luar (z)
const X0 = -9, X1 = 9, DEEP = -6;
const SOILC = '#a37b52', HARDC = SOIL.hard;
const FX = 300;                             // lokasi kolam Olimpiade
const BERO_HOME = new THREE.Vector3(-1.3, 0, -3.2);
const VALVE = { x: 0.3, z: -0.35 };

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(606);
  const dur = (id) => e(id) - s(id);
  const at = (id, f) => s(id) + dur(id) * f;

  // ---------------- tanah (balok di sekitar lubang) ----------------
  const dio = buildDiorama(kit, {
    x0: X0, x1: X1, zBack: -14, cut: OZ, seed: 66, top: PAL.grass, swamp: false, rocks: false,
    layers: [{ y0: -0.08, y1: -2.6, color: SOILC }, { y0: -2.6, y1: DEEP, color: HARDC }],
    clear: [{ x0: -4, x1: 4, z0: -14, z1: OZ }],
  });
  const ground = new THREE.Group(); scene.add(ground);
  function soilBlock(x0, x1, z0, z1, y1, grass = true) {
    for (const [a, b, c] of [[-0.08, -2.6, SOILC], [-2.6, DEEP, HARDC]]) {
      const top = Math.min(a, y1), bot = b;
      if (top <= bot) continue;
      const m = mesh(new THREE.BoxGeometry(x1 - x0, top - bot, z1 - z0), c); m.position.set((x0 + x1) / 2, (top + bot) / 2, (z0 + z1) / 2); ground.add(m);
    }
    if (grass) { const g = mesh(new THREE.BoxGeometry(x1 - x0, 0.08, z1 - z0), PAL.grass); g.position.set((x0 + x1) / 2, -0.04, (z0 + z1) / 2); ground.add(g); }
  }
  soilBlock(X0, -OX, OZ, 0, 0); soilBlock(OX, X1, OZ, 0, 0); soilBlock(-OX, OX, OZ, 0, FB, false);
  const base = mesh(new THREE.BoxGeometry(X1 - X0, 0.06, -OZ), '#5a4c3e', { shadow: false }); base.position.set(0, DEEP - 0.03, OZ / 2); ground.add(base);
  // tanah pengisi lubang (digali)
  const fill = mesh(new THREE.BoxGeometry(2 * OX, -FB, -OZ), SOILC); fill.geometry.translate(0, FB / 2, 0); fill.position.set(0, 0, OZ / 2); scene.add(fill);
  const fillTop = mesh(new THREE.BoxGeometry(2 * OX, 0.08, -OZ), PAL.grass); fillTop.position.set(0, -0.04, OZ / 2); scene.add(fillTop);
  const dirtPile = mesh(new THREE.ConeGeometry(1.0, 0.8, 7), SOILC); dirtPile.position.set(3.4, 0.4, -1.2); scene.add(dirtPile);

  // noda basah di muka potongan
  const planeMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false });
  const wetMat = planeMat('#4d5560');
  const wets = [[-OX - 1.4, -OX, FB - 1.2, 0], [OX, OX + 1.4, FB - 1.2, 0], [-OX, OX, FB - 1.2, FB]].map(([x0, x1, y0, y1]) => {
    const m = mesh(new THREE.PlaneGeometry(1, 1), wetMat, { shadow: false, receive: false }); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.012); m.scale.set(x1 - x0, y1 - y0, 1); m.renderOrder = 2; scene.add(m); return m;
  });
  // air tanah
  const gwMat = planeMat('#3f8fd6');
  const gwL = mesh(new THREE.PlaneGeometry(1, 1), gwMat, { shadow: false, receive: false }); gwL.renderOrder = 2; scene.add(gwL);
  const gwR = gwL.clone(); scene.add(gwR);
  const gwU = gwL.clone(); scene.add(gwU);
  const gwLine = mesh(new THREE.BoxGeometry(X1 - X0, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: '#7fd0ff', transparent: true, opacity: 0, depthTest: false }), { shadow: false, receive: false }); gwLine.renderOrder = 4; scene.add(gwLine);

  // ---------------- kolam (bergerak bersama saat terangkat) ----------------
  const pool = new THREE.Group(); scene.add(pool);
  const concMat = mat(PAL.concrete);
  const shell = new THREE.Group(); pool.add(shell);
  const slab = mesh(new THREE.BoxGeometry(2 * OX, WT, -OZ), concMat); slab.position.set(0, FB + WT / 2, OZ / 2); shell.add(slab);
  for (const sd of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(WT, -FL + 0.08, -OZ), concMat); w.position.set(sd * (IX + WT / 2), (FL + 0.08) / 2, OZ / 2); shell.add(w); }
  const back = mesh(new THREE.BoxGeometry(2 * OX, -FL + 0.08, WT), concMat); back.position.set(0, (FL + 0.08) / 2, IZ - WT / 2); shell.add(back);
  const coping = new THREE.Group(); pool.add(coping);
  for (const sd of [-1, 1]) { const c = mesh(new THREE.BoxGeometry(0.5, 0.1, -OZ + 0.25), '#e9e4d8'); c.position.set(sd * (IX + 0.2), 0.12, OZ / 2 - 0.12); coping.add(c); }
  const cb = mesh(new THREE.BoxGeometry(2 * OX + 0.5, 0.1, 0.5), '#e9e4d8'); cb.position.set(0, 0.12, IZ - 0.05); coping.add(cb);
  // tulangan
  const rebar = new THREE.Group(); pool.add(rebar);
  const rbMat = mat('#8a4b2a');
  for (let k = 0; k < 9; k++) { const x = -OX + 0.2 + k * (2 * OX - 0.4) / 8; const b = mesh(new THREE.BoxGeometry(0.03, 0.03, -OZ), rbMat, { shadow: false }); b.position.set(x, FB + WT / 2, OZ / 2); rebar.add(b); }
  for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { const y = FB + 0.2 + k * 0.33; const b = mesh(new THREE.BoxGeometry(0.03, 0.03, -OZ), rbMat, { shadow: false }); b.position.set(sd * (IX + WT / 2), y, OZ / 2); rebar.add(b); }
  for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const z = -0.3 - k * 0.6; const b = mesh(new THREE.BoxGeometry(0.03, -FB, 0.03), rbMat, { shadow: false }); b.position.set(sd * (IX + WT / 2), FB / 2, z); rebar.add(b); }
  // retak beton
  const crackMat = mat('#3b3f44');
  const cracks = new THREE.Group(); pool.add(cracks);
  for (const [x, y0, y1] of [[-(IX + WT / 2), -0.3, -1.1], [IX + WT / 2, -0.5, -1.4], [0.8, FB + 0.02, FB + 0.24]]) {
    const c = mesh(new THREE.BoxGeometry(0.05, y0 - y1, 0.02), crackMat, { shadow: false }); c.position.set(x + 0.02, (y0 + y1) / 2, 0.015); c.rotation.z = 0.15; cracks.add(c);
  }
  // lapisan kedap air + keramik
  const memMat = mat('#2b4a8a');
  const tileCanvas = document.createElement('canvas'); tileCanvas.width = tileCanvas.height = 64;
  { const c = tileCanvas.getContext('2d'); c.fillStyle = '#bfe8f2'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#8fc9d8'; c.fillRect(0, 0, 64, 4); c.fillRect(0, 0, 4, 64); }
  const tileTex = new THREE.CanvasTexture(tileCanvas); tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.colorSpace = THREE.SRGBColorSpace;
  const tileMat = (rx, ry) => { const t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }); };
  const mem = new THREE.Group(), tiles = new THREE.Group(); pool.add(mem, tiles);
  const liner = (g, d, m) => {
    const f = mesh(new THREE.BoxGeometry(2 * IX, d, -IZ), m(10, 9)); f.position.set(0, FL + d / 2, IZ / 2); g.add(f);
    for (const sd of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(d, -FL, -IZ), m(9, 7)); w.position.set(sd * (IX - d / 2), FL / 2, IZ / 2); g.add(w); }
    const b = mesh(new THREE.BoxGeometry(2 * IX, -FL, d), m(10, 7)); b.position.set(0, FL / 2, IZ + d / 2); g.add(b);
  };
  liner(mem, 0.05, () => memMat);
  const TT = 0.07;
  { // keramik sedikit di dalam membran
    const f = mesh(new THREE.BoxGeometry(2 * IX - 0.1, TT, -IZ - 0.05), tileMat(10, 9)); f.position.set(0, FL + 0.05 + TT / 2, IZ / 2 + 0.02); tiles.add(f);
    for (const sd of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(TT, -FL - 0.05, -IZ - 0.05), tileMat(9, 7)); w.position.set(sd * (IX - 0.05 - TT / 2), (FL + 0.05) / 2, IZ / 2 + 0.02); tiles.add(w); }
    const b = mesh(new THREE.BoxGeometry(2 * IX - 0.1, -FL - 0.05, TT), tileMat(10, 7)); b.position.set(0, (FL + 0.05) / 2, IZ + 0.05 + TT / 2); tiles.add(b);
  }
  // katup di lantai
  const valve = new THREE.Group(); valve.position.set(VALVE.x, FL + 0.12, VALVE.z); pool.add(valve);
  const vRing = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), '#d9dde0'); valve.add(vRing);
  const vDisk = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), '#6d7880'); vDisk.position.y = 0.03; valve.add(vDisk);
  const vPipe = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10), '#6d7880'); vPipe.position.y = -0.25; valve.add(vPipe);

  // air kolam
  const waterMat = new THREE.MeshStandardMaterial({ color: '#39b6d8', flatShading: true, roughness: 0.15, transparent: true, opacity: 0.78 });
  const water = mesh(new THREE.BoxGeometry(1, 1, 1), waterMat, { shadow: false }); pool.add(water);
  let waterIn = IX; // lebar dalam (berubah saat ada keramik)
  function setWater(level, inner) {
    const h = level - FL; water.visible = h > 0.02;
    water.scale.set(2 * inner - 0.02, Math.max(0.01, h), -IZ - (IX - inner) - 0.02); water.position.set(0, FL + (IX - inner) + h / 2 - (IX - inner), IZ / 2 + (IX - inner) / 2);
  }
  const NG = 70; // lumut/kotoran
  const specks = makeInstances(new THREE.IcosahedronGeometry(0.045, 0), mat('#4f7a2a'), NG); pool.add(specks);
  const speckSeeds = Array.from({ length: NG }, () => [R(), R(), R()]);
  const floater = new THREE.Group(); pool.add(floater);
  { const b = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 10), '#f4f4f0'); floater.add(b); const c = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), '#2f8fd6'); c.position.y = 0.11; floater.add(c); }
  const ring = mesh(new THREE.TorusGeometry(0.32, 0.11, 8, 16), '#ff6b5a'); ring.rotation.x = Math.PI / 2; pool.add(ring);

  // pompa + filter + pipa (di rumput belakang)
  const plant = new THREE.Group(); scene.add(plant);
  const pump = mesh(new THREE.BoxGeometry(0.6, 0.45, 0.5), '#3d6fb0'); pump.position.set(1.4, 0.23, -3.2); plant.add(pump);
  const filt = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 12), '#d9dde0'); filt.position.set(2.2, 0.4, -3.2); plant.add(filt);
  const pipeMat = mat('#e9e4d8');
  const pathOut = [[0.9, -0.8, -1.6], [0.9, 0.25, -1.6], [0.9, 0.25, -3.2], [1.4, 0.25, -3.2]];
  const pathIn = [[2.2, 0.25, -3.2], [2.2, 0.25, -2.7], [1.7, 0.25, -2.7], [1.7, 0.25, -1.6], [1.7, -0.4, -1.6]];
  const pipeSeg = (a, b) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const c = mesh(new THREE.CylinderGeometry(0.05, 0.05, va.distanceTo(vb) + 0.05, 8), pipeMat);
    c.position.copy(va).add(vb).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); plant.add(c);
  };
  [pathOut, pathIn].forEach((p) => p.slice(1).forEach((q, i) => pipeSeg(p[i], q)));
  const NF = 30;
  const flow = makeInstances(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: '#8fe3ff', emissive: '#2a9fd6', emissiveIntensity: 0.7, flatShading: true }), NF); scene.add(flow);
  const loop = [...pathOut, ...pathIn];
  const loopLen = []; let acc = 0; loop.forEach((p, i) => { if (i) acc += new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...loop[i - 1])); loopLen.push(acc); });
  const alongLoop = (u) => {
    const d = u * acc; let i = 1; while (i < loop.length - 1 && loopLen[i] < d) i++;
    const k = (d - loopLen[i - 1]) / Math.max(1e-6, loopLen[i] - loopLen[i - 1]);
    return loop[i - 1].map((v, j) => lerp(v, loop[i][j], clamp(k)));
  };
  // shower
  const shower = new THREE.Group(); shower.position.set(-2.3, 0, -3.3); scene.add(shower);
  { const p = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), '#c9ced3'); p.position.y = 1.0; shower.add(p); const a = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), '#c9ced3'); a.rotation.z = Math.PI / 2; a.position.set(0.25, 2.0, 0); shower.add(a); const h = mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.08, 10), '#c9ced3'); h.position.set(0.5, 1.95, 0); shower.add(h); }
  const ND = 40;
  const sdrops = makeInstances(new THREE.BoxGeometry(0.015, 0.12, 0.015), new THREE.MeshBasicMaterial({ color: '#bfe8ff' }), ND); scene.add(sdrops);
  // tetes rembesan & air tanah masuk
  const NS = 40;
  const seeps = makeInstances(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#2a9fd6', emissiveIntensity: 0.5, flatShading: true }), NS); scene.add(seeps);
  const seepSeeds = Array.from({ length: NS }, () => [R(), R(), R()]);

  // ---------------- kolam Olimpiade ----------------
  const oly = new THREE.Group(); oly.position.x = FX; scene.add(oly);
  {
    const g = mesh(new THREE.BoxGeometry(160, 0.5, 160), '#d9d4c6'); g.position.y = -0.25; oly.add(g);
    const wall = mesh(new THREE.BoxGeometry(52, 0.3, 27), '#e9e4d8'); wall.position.set(0, 0.0, 0); oly.add(wall);
    const w = mesh(new THREE.BoxGeometry(50, 0.2, 25), new THREE.MeshStandardMaterial({ color: '#2fa6d9', flatShading: true, roughness: 0.15 })); w.position.y = 0.06; oly.add(w);
    for (let k = 1; k < 10; k++) { const r = mesh(new THREE.BoxGeometry(50, 0.06, 0.08), k % 2 ? '#f2c94c' : '#e05d5d', { shadow: false }); r.position.set(0, 0.2, -12.5 + k * 2.5); oly.add(r); }
    for (let k = 0; k < 10; k++) { const b = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), '#f4f4f0'); b.position.set(-25.6, 0.35, -11.25 + k * 2.5); oly.add(b); }
    for (let k = 0; k < 4; k++) { const st = mesh(new THREE.BoxGeometry(56, 1.2, 2.2), '#6d8bb0'); st.position.set(0, 0.6 + k * 1.2, -15.5 - k * 2.2); oly.add(st); }
  }
  const NGAL = 300;
  const galGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.48, 10);
  const gal = makeInstances(galGeo, new THREE.MeshStandardMaterial({ color: '#7cc7ef', transparent: true, opacity: 0.85, roughness: 0.2 }), NGAL); scene.add(gal);

  // ---------------- panah ----------------
  const yArr = Array.from({ length: 4 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const rArr = Array.from({ length: 4 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  function arr(a, x, y, z, ang, L) { a.visible = L > 0.05; a.setLength(Math.max(0.05, L)); a.rotation.set(0, 0, ang); a.position.set(x, y, z); }
  const up = (a, x, yTip, z, L) => arr(a, x, yTip - L, z, Math.PI / 2, L);

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);

  // ---------------- kamera ----------------
  const MAIN = { pos: [0, 1.5, 8.6], look: [0, -0.9, -0.9], fov: 50 };
  const HIGH = { pos: [0, 3.6, 7.2], look: [0, -0.6, -1.2], fov: 50 };
  const camKeys = [
    { t: 0, pos: [0.6, 2.6, 6.0], look: [0, -0.2, -1.4], fov: 50 },
    { t: s('intro'), cut: true, ...HIGH },
    { t: s('resap'), ...MAIN, blend: 1.0 },
    { t: s('beton'), ...MAIN },
    { t: s('rembes'), pos: [1.6, 0.4, 5.6], look: [1.4, -0.9, -0.4], blend: 1.0 },
    { t: s('kedap'), pos: [0.8, 0.8, 6.0], look: [0.6, -0.8, -0.8], blend: 1.0 },
    { t: s('hijau'), ...HIGH, blend: 1.0 },
    { t: s('filter'), pos: [0.6, 3.8, 6.8], look: [0.6, -0.4, -1.8], blend: 1.0 },
    { t: s('bilas'), pos: [-1.4, 1.6, 3.4], look: [-1.8, 1.0, -3.2], blend: 1.0 },
    { t: s('kuras'), pos: [0, 0.6, 11.5], look: [0, -1.6, -0.6], blend: 1.2 },
    { t: s('katup'), pos: [0.6, 0.3, 6.0], look: [0.3, -1.2, -0.4], blend: 1.2 },
    { t: at('katup', 0.75), pos: [0, 0.6, 11.0], look: [0, -1.6, -0.6], blend: 1.2 },
    { t: s('berdiri'), ...HIGH, blend: 1.0 },
    { t: s('fakta'), cut: true, pos: [FX - 10, 22, 40], look: [FX, 0, 0], fov: 50 },
    { t: at('fakta', 0.55), pos: [FX - 22, 2.6, 22], look: [FX - 22, 1.0, 13.5], blend: 1.6 },
    { t: s('outro'), cut: true, pos: [-0.6, 1.8, 3.6], look: [-1.2, 0.8, -3.0], fov: 50 },
  ];

  // ---------------- update ----------------
  return {
    update(t) {
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const home = !L('fakta');
      dio.root.visible = ground.visible = home; oly.visible = !home;
      const sx = home ? 0 : FX;
      sun.position.set(sx - 10, 22, 14); sun.target.position.set(sx, -1, -1);
      setSky(0);
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);
      const teaser = t < s('intro');
      const done = teaser || t >= s('berdiri');

      // tahap
      const dug = teaser ? 1 : L('intro') ? smooth((t - at('intro', 0.25)) / (dur('intro') * 0.65)) : 1;
      fill.visible = fillTop.visible = home && dug < 0.999;
      fill.scale.y = Math.max(0.001, 1 - dug); fillTop.position.y = -0.04 + FB * dug;
      dirtPile.visible = home && !teaser; dirtPile.scale.setScalar(0.2 + dug * 0.8);

      const conc = !teaser && t < s('beton') ? 0 : L('beton') ? smooth((t - at('beton', 0.45)) / (dur('beton') * 0.4)) : 1;
      const rebarK = L('beton') ? smooth((t - s('beton') - 0.1) / 1.0) : 0;
      shell.visible = coping.visible = home && conc > 0.01;
      shell.scale.set(1, Math.max(0.01, conc), 1); shell.position.y = FB * (1 - conc);
      coping.visible = home && (t >= s('kedap') || teaser);
      rebar.visible = home && L('beton') && conc < 0.98; rebar.scale.set(1, Math.max(0.01, rebarK), 1);
      const crackK = L('rembes') ? smooth((t - s('rembes') - 0.4) / 1.0) : 0;
      cracks.visible = home && crackK > 0.01; cracks.scale.set(1, crackK, 1);
      const memK = L('kedap') ? smooth((t - s('kedap') - 0.3) / 1.0) : (t >= s('kedap') || teaser) ? 1 : 0;
      const tileK = L('kedap') ? smooth((t - at('kedap', 0.45)) / 1.2) : (t >= s('kedap') || teaser) ? 1 : 0;
      mem.visible = home && memK > 0.01; mem.scale.set(1, Math.max(0.01, memK), 1); mem.position.y = FL * (1 - memK);
      tiles.visible = home && tileK > 0.01; tiles.children.forEach((c) => (c.scale.y = Math.max(0.01, tileK)));
      valve.visible = home && (t >= s('katup') || teaser || t >= s('berdiri'));
      const vOpen = L('katup') ? smooth((t - at('katup', 0.35)) / 0.4) * (1 - smooth((t - at('katup', 0.8)) / 0.4)) : 0;
      vDisk.position.y = 0.03 + 0.16 * vOpen;

      // muka air kolam
      let level = FL, inner = IX;
      if (tileK > 0) inner = IX - 0.05 - TT * tileK;
      if (teaser || done) level = -0.15;
      else if (L('resap')) { const u = (t - s('resap')); level = u < 1.2 ? lerp(FL, -0.3, easeOut(u / 1.2)) : lerp(-0.3, FL + 0.05, easeIn(clamp((u - 1.4) / 2.6))); }
      else if (L('beton')) level = FL;
      else if (L('rembes')) { const u = t - s('rembes'); level = lerp(-0.2, -0.75, clamp((u - 1.0) / 4.0)); if (u < 0.6) level = lerp(FL, -0.2, u / 0.6); }
      else if (L('kedap')) level = t < at('kedap', 0.75) ? FL : lerp(FL, -0.15, smooth((t - at('kedap', 0.75)) / 1.0));
      else if (L('hijau', 'bilas')) level = -0.15;
      else if (L('kuras')) level = lerp(-0.15, FL, smooth((t - s('kuras') - 0.2) / 1.8));
      else if (L('katup')) level = FL + 0.12 * vOpen;
      setWater(level, inner);
      // warna air
      const green = L('hijau') ? smooth((t - s('hijau') - 0.8) / 2.0) : L('filter') ? 1 - smooth((t - at('filter', 0.35)) / 2.5) : 0;
      waterMat.color.set('#39b6d8').lerp(new THREE.Color('#5f8f2e'), green);
      waterMat.opacity = lerp(0.78, 0.92, green);
      if (L('resap') || L('rembes')) waterMat.color.set('#6f8f9a');
      speckSeeds.forEach(([a, b, c], i) => {
        if (!(home && green > 0.05 && level > FL + 0.2)) { specks.set(i, 0, -999, 0, 0); return; }
        let x = -inner + 0.1 + a * (2 * inner - 0.2), z = IZ + 0.1 + b * (-IZ - 0.2), y = FL + 0.1 + c * (level - FL - 0.15);
        if (L('filter')) { const k = smooth((t - at('filter', 0.3) - c * 2) / 1.2); x = lerp(x, 0.9, k); z = lerp(z, -1.6, k); y = lerp(y, -0.8, k); if (k > 0.97) { specks.set(i, 0, -999, 0, 0); return; } }
        specks.set(i, x, y + 0.03 * Math.sin(t * 2 + a * 9), z, green * 1.2 + 0.2);
      });
      const floatOn = home && (L('filter', 'bilas') && t > at('filter', 0.6) || done);
      floater.visible = floatOn; floater.position.set(-1.0 + 0.2 * Math.sin(t * 0.7), level + 0.05 + 0.02 * Math.sin(t * 2), -1.2);
      ring.visible = home && done; ring.position.set(0.9 + 0.15 * Math.sin(t * 0.6), level + 0.03 + 0.02 * Math.sin(t * 2 + 1), -0.9);

      // pompa & aliran
      const plantOn = home && (t >= s('filter') || teaser);
      plant.visible = plantOn;
      const pk = L('filter') ? easeOutBack((t - s('filter') - 0.2) / 0.6) : 1;
      plant.scale.setScalar(Math.max(0.01, pk));
      flow.hideAll();
      if (plantOn && (L('filter', 'bilas') || done)) for (let i = 0; i < NF; i++) { const p = alongLoop(((t * 0.25) + i / NF) % 1); flow.set(i, p[0], p[1], p[2], 1); }

      // rembes / resap / air tanah masuk
      seeps.hideAll();
      if (home && (L('resap') || L('rembes'))) seepSeeds.forEach(([a, b, c], i) => {
        const ph = (t * 0.5 + a) % 1;
        if (L('resap')) {
          const side = i % 3, sd = side === 0 ? -1 : side === 1 ? 1 : 0;
          const x = sd ? sd * (OX + ph * 1.2) : -OX + b * 2 * OX, y = sd ? lerp(-0.4, FB - 0.6, b) - ph * 0.3 : FB - ph * 1.0;
          seeps.set(i, x, y, 0.05, 1);
        } else if (t > s('rembes') + 1.0) {
          const cr = [[-(IX + WT / 2), -0.7, -1], [IX + WT / 2, -0.95, 1], [0.8, FB, 0]][i % 3];
          const x = cr[0] + (cr[2] ? cr[2] * ph * 1.2 : (b - 0.5) * 0.2), y = cr[2] ? cr[1] - ph * 0.4 : cr[1] - ph * 0.9;
          seeps.set(i, x, y, 0.05, 0.9);
        }
      });
      const wetA = L('resap') ? 0.5 * smooth((t - s('resap') - 0.8) / 1.5) : L('rembes') ? 0.3 * smooth((t - s('rembes') - 1.5) / 2.0) : 0;
      wetMat.opacity = wetA; wets.forEach((m) => (m.visible = home && wetA > 0.01));

      // air tanah & terangkat
      const gwA = L('kuras', 'katup') ? 0.42 * smooth((t - s('kuras') - 0.6) / 0.6) : 0;
      const gwY = L('kuras') ? lerp(-3.2, -0.6, smooth((t - s('kuras') - 0.8) / 2.5)) : L('katup') ? -0.6 : -3.2;
      let lift = 0, tilt = 0;
      if (L('kuras')) { const k = smooth((t - at('kuras', 0.55)) / 2.0); lift = 0.7 * k; tilt = 0.04 * k; }
      if (L('katup')) { const k = smooth((t - s('katup') - 0.1) / 1.2); lift = 0.7 * (1 - k); tilt = 0.04 * (1 - k); }
      pool.position.y = lift; pool.rotation.z = tilt;
      gwMat.opacity = gwA; gwLine.material.opacity = gwA * 2;
      [gwL, gwR, gwU].forEach((m) => (m.visible = home && gwA > 0.01));
      gwLine.visible = home && gwA > 0.01; gwLine.position.set(0, gwY, 0.03);
      gwL.scale.set(-OX - X0, gwY - DEEP, 1); gwL.position.set((X0 - OX) / 2, (gwY + DEEP) / 2, 0.012);
      gwR.scale.set(X1 - OX, gwY - DEEP, 1); gwR.position.set((X1 + OX) / 2, (gwY + DEEP) / 2, 0.012);
      const under = Math.min(gwY, FB + lift);
      gwU.scale.set(2 * OX, Math.max(0.01, under - DEEP), 1); gwU.position.set(0, (under + DEEP) / 2, 0.012);
      // air tanah masuk lewat katup
      if (home && vOpen > 0.1) seepSeeds.forEach(([a, b], i) => {
        if (i > 20) return;
        const ph = (t * 1.2 + a) % 1;
        seeps.set(i, VALVE.x + (b - 0.5) * 0.12, FL - 0.4 + ph * 0.9, VALVE.z, 0.8);
      });

      // shower
      sdrops.hideAll();
      if (home && L('bilas')) for (let i = 0; i < ND; i++) { const ph = (t * 2.2 + i / ND) % 1; sdrops.set(i, shower.position.x + 0.5 + Math.sin(i * 7) * 0.12, 1.9 - ph * 1.9, shower.position.z + Math.cos(i * 5) * 0.12, 1); }
      shower.visible = home;

      // galon
      gal.hideAll();
      if (!home && t > at('fakta', 0.55)) {
        const n = Math.floor(NGAL * smooth((t - at('fakta', 0.58)) / 2.5));
        for (let i = 0; i < n; i++) { const c = i % 15, r = Math.floor(i / 15) % 5, l = Math.floor(i / 75); gal.set(i, FX - 25.5 + c * 0.3, 0.24 + l * 0.5, 13.2 + r * 0.3, 1); }
      }

      // ===== panah =====
      yArr.forEach((a) => (a.visible = false)); rArr.forEach((a) => (a.visible = false));
      if (L('kuras')) {
        const g = smooth((t - s('kuras') - 1.6) / 0.5);
        [-1.6, -0.5, 0.6, 1.7].forEach((x, i) => up(rArr[i], x, FB + lift - 0.05, 0.1, 0.9 * g));
      }
      if (L('katup')) {
        const g = 1 - smooth((t - s('katup') - 0.2) / 1.2);
        [-1.6, -0.5, 0.6, 1.7].forEach((x, i) => up(rArr[i], x, FB + lift - 0.05, 0.1, 0.9 * g));
        if (vOpen > 0.1) up(yArr[0], VALVE.x, FL + 0.5, 0.05, 0.6 * vOpen);
      }

      // ===== label =====
      const ly = (y) => y + lift;
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_HOME.x, 1.75, BERO_HOME.z], alpha: fade('intro', 0.3), up: 30, tone: 'yellow' });
      if (L('resap')) st.labels.push({ text: 'Meresap', pos: [-OX - 0.6, -0.9, 0.05], alpha: smooth((t - at('resap', 0.45)) / 0.3), up: 40, tone: 'red' });
      if (L('beton')) st.labels.push({ text: 'Tulangan', pos: [-1.2, FB + WT / 2, 0], alpha: smooth((t - s('beton') - 0.6) / 0.3) * (1 - smooth((t - at('beton', 0.5)) / 0.3)), up: 40 });
      if (L('beton')) st.labels.push({ text: 'Beton', pos: [IX + WT / 2, -0.8, 0.02], alpha: smooth((t - at('beton', 0.65)) / 0.3), up: 50, tone: 'yellow' });
      if (L('rembes')) st.labels.push({ text: 'Merembes', pos: [0.8, FB - 0.5, 0.05], alpha: smooth((t - at('rembes', 0.45)) / 0.3), up: 50, tone: 'red' });
      if (L('rembes')) st.labels.push({ text: 'Retak halus', pos: [IX + WT / 2, -0.6, 0.02], alpha: smooth((t - s('rembes') - 0.9) / 0.3), up: 80 });
      if (L('kedap')) {
        st.labels.push({ text: 'Lapisan kedap air', pos: [-IX + 0.02, -0.9, 0.02], alpha: smooth((t - s('kedap') - 0.8) / 0.3), up: 50, tone: 'yellow' });
        st.labels.push({ text: 'Keramik', pos: [0.4, FL + 0.12, 0.02], alpha: smooth((t - at('kedap', 0.55)) / 0.3), up: 60 });
      }
      if (L('hijau')) st.labels.push({ text: 'Lumut & kuman', pos: [0.2, -0.6, -0.8], alpha: smooth((t - at('hijau', 0.55)) / 0.3), up: 50, tone: 'red' });
      if (L('filter')) {
        st.labels.push({ text: 'Pompa', pos: [1.4, 0.45, -3.2], alpha: smooth((t - s('filter') - 0.9) / 0.3), up: 30, tone: 'yellow' });
        st.labels.push({ text: 'Filter', pos: [2.2, 0.8, -3.2], alpha: smooth((t - at('filter', 0.3)) / 0.3), up: 30, tone: 'yellow' });
        st.labels.push({ text: 'Klorin', pos: [floater.position.x, floater.position.y + 0.2, floater.position.z], alpha: smooth((t - at('filter', 0.72)) / 0.3), up: 40, tone: 'yellow' });
      }
      if (L('kuras')) st.labels.push({ text: 'Air tanah', pos: [-OX - 1.6, gwY, 0.03], alpha: smooth((t - s('kuras') - 1.6) / 0.3), up: 40 });
      if (L('kuras')) st.labels.push({ text: 'Terangkat', pos: [0, ly(0.3), -1.0], alpha: smooth((t - at('kuras', 0.7)) / 0.3), up: 40, tone: 'red' });
      if (L('katup')) st.labels.push({ text: 'Katup pelepas tekanan', pos: [VALVE.x, ly(FL + 0.15), VALVE.z], alpha: smooth((t - at('katup', 0.2)) / 0.3), up: 60, tone: 'yellow' });
      if (L('katup')) st.labels.push({ text: 'Seimbang', pos: [0, -0.6, -0.5], alpha: smooth((t - at('katup', 0.78)) / 0.3), up: 30 });
      if (L('berdiri')) st.labels.push({ text: 'Siap dipakai', pos: [0, 0.3, -1.0], alpha: fade('berdiri', 0.3), up: 40, tone: 'yellow' });

      // ===== kartu =====
      if (L('intro')) st.card = { title: 'Request dari komentar', body: 'Bikin kolam renang, yuk!', top: 0.1, alpha: fade('intro', 0.2) };
      if (L('hijau') && t > at('hijau', 0.28)) {
        const d = 1 + Math.min(2, Math.floor((t - at('hijau', 0.28)) / 0.7));
        st.card = { title: `Hari ke-${d}`, body: 'Air dibiarkan tanpa diputar & tanpa klorin', top: 0.1, alpha: 1 };
      }
      if (L('bilas')) st.card = { title: 'Bilas dulu ±1 menit', body: 'Keringat & minyak di badan menghabiskan klorin', top: 0.1, alpha: fade('bilas', 1.0) };
      if (!home) {
        st.card = t < at('fakta', 0.55)
          ? { title: 'Kolam Olimpiade', body: '50 × 25 m · kalau dalamnya 2 m: 2,5 juta liter', top: 0.08, alpha: fade('fakta', 0.8) }
          : { title: '≈ 131 ribu galon', body: 'Galon air minum 19 liter', top: 0.08, alpha: 1 };
      }

      // ===== Pak Bero =====
      let bp = BERO_HOME.clone(), anim = 'idle';
      if (!home) bp.set(FX - 20.4, 0, 14.0);
      const camYaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      let yaw = camYaw;
      if (teaser) anim = 'happy';
      else if (L('intro')) { anim = t < at('intro', 0.25) ? 'wave' : 'slap'; if (anim === 'slap') yaw = 0; }
      else if (L('resap')) anim = t > at('resap', 0.45) ? 'panic' : 'point';
      else if (L('beton')) { anim = 'slap'; yaw = 0; }
      else if (L('rembes')) anim = 'sad';
      else if (L('kedap')) { anim = 'slap'; yaw = 0; }
      else if (L('hijau')) anim = t > at('hijau', 0.5) ? 'panic' : 'happy';
      else if (L('filter')) anim = 'point';
      else if (L('bilas')) { bp.set(shower.position.x + 0.5, 0, shower.position.z + 0.1); anim = 'happy'; }
      else if (L('kuras')) anim = t > at('kuras', 0.6) ? 'panic' : 'idle';
      else if (L('katup')) anim = 'point';
      else if (L('berdiri')) anim = 'happy';
      else if (!home) anim = t > at('fakta', 0.55) ? 'carry' : 'idle';
      else if (L('outro')) anim = 'wave';
      if (anim === 'point' && home) yaw = 0.3;
      if (home) bp.y += lift * 0;
      bero.root.position.copy(bp);
      bero.pose(t, anim, { yaw });

      // guncangan saat kolam terangkat
      if (L('kuras') && t > at('kuras', 0.55) && t < at('kuras', 0.55) + 1.8) { camera.position.x += Math.sin(t * 53) * 0.03; camera.position.y += Math.cos(t * 47) * 0.03; }
      return st;
    },
  };
}
