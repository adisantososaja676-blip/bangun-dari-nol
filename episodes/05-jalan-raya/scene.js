// Ep. 05 Jalan raya: diorama potongan jalan, diikat ke id baris di script.json.
// Semua posisi dihitung dari waktu t (deterministik).
// Jalan memanjang di sumbu X. Diorama dipotong di z=0 (garis tengah jalan),
// jadi lapisan jalan terlihat di muka depan; ujung kanan (x=X1) = potongan melintang.
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeIn, easeOutBack, cameraAt, makeArrow, makeInstances, makeRain } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';
import { createCar } from '/engine/car.js';
import { createTruck } from '/engine/truck.js';
import { buildDiorama, SOIL } from '/engine/soil.js';

const X0 = -9, X1 = 9;
const ZE = -1.6;                    // tepi jalan (lajur yang terlihat: z ∈ [ZE, 0])
const LANE = -0.8;                  // garis tengah lajur
const WHEELZ = [LANE - 0.37, LANE + 0.37];
const Y_BIG = 0.34, Y_SMALL = 0.5, Y_ASP = 0.62; // puncak lapisan batu besar, batu kecil, aspal
const DITCH = [-2.45, -1.75];       // selokan (z)
const BX = 300;                     // lokasi Pulau Buton
const HOLE = { x: 0.5, z: WHEELZ[1] };
const BERO_HOME = new THREE.Vector3(-1.0, 0, -3.1);

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(505);
  const dur = (id) => e(id) - s(id);
  const at = (id, f) => s(id) + dur(id) * f;

  // ---------------- dunia ----------------
  const dio = buildDiorama(kit, {
    x0: X0, x1: X1, zBack: -9, cut: 0, seed: 55, top: PAL.grass, swamp: false,
    layers: [{ y0: -0.08, y1: -2.6, color: '#a37b52' }, { y0: -2.6, y1: -6, color: SOIL.hard }],
    clear: [{ x0: X0, x1: X1, z0: -4.2, z1: 0 }],
  });
  const rain = makeRain(kit, 420, [14, 10, 10], [0, 4.5, -2]);

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);

  // ---------------- tahap 1: tanah dipadatkan / lumpur ----------------
  const dirtMat = mat('#a6825a', { roughness: 0.9 });
  const dirt = mesh(new THREE.BoxGeometry(X1 - X0, 0.06, -ZE), dirtMat); dirt.position.set(0, 0.0, ZE / 2); scene.add(dirt);
  const NM = 60;
  const mounds = makeInstances(new THREE.DodecahedronGeometry(0.22, 0), mat('#a6825a'), NM); scene.add(mounds);
  const moundSeeds = Array.from({ length: NM }, () => [X0 + 1 + R() * (X1 - X0 - 2), ZE + 0.2 + R() * (-ZE - 0.4), 0.6 + R() * 0.8, R()]);
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#6a5a48', flatShading: true, roughness: 0.15, transparent: true, opacity: 0 });
  const puddles = Array.from({ length: 9 }, (_, i) => {
    const p = mesh(new THREE.CylinderGeometry(1, 1, 0.02, 10), puddleMat, { shadow: false });
    p.scale.set(0.5 + R() * 0.6, 1, 0.25 + R() * 0.2); p.position.set(-5 + i * 1.3 + R() * 0.4, 0.035, ZE / 2 + (R() - 0.5) * 0.6); scene.add(p); return p;
  });
  const NS = 40; // cipratan lumpur
  const splash = makeInstances(new THREE.IcosahedronGeometry(0.05, 0), mat('#4d3826'), NS); scene.add(splash);

  // ---------------- tahap 2: kerikil bulat ----------------
  const NP = 240;
  const pebbles = makeInstances(new THREE.IcosahedronGeometry(0.07, 1), mat('#c4c0b6'), NP); scene.add(pebbles);
  const pebSeeds = Array.from({ length: NP }, () => [-5 + R() * 10, ZE + 0.08 + R() * (-ZE - 0.16), R(), 0.8 + R() * 0.5]);

  // ---------------- tahap 3: batu pecah berlapis ----------------
  const bigBox = mesh(new THREE.BoxGeometry(X1 - X0, Y_BIG, -ZE), '#8c877f'); bigBox.position.set(0, Y_BIG / 2, ZE / 2); scene.add(bigBox);
  const smallBox = mesh(new THREE.BoxGeometry(X1 - X0, Y_SMALL - Y_BIG, -ZE), '#aaa59c'); smallBox.position.set(0, (Y_BIG + Y_SMALL) / 2, ZE / 2); scene.add(smallBox);
  const NB = 70, NSm = 160;
  const bigStones = makeInstances(new THREE.DodecahedronGeometry(0.15, 0), mat('#7f7a72'), NB); scene.add(bigStones);
  const smallStones = makeInstances(new THREE.TetrahedronGeometry(0.075, 0), mat('#b5b0a6'), NSm); scene.add(smallStones);
  const bigSeeds = Array.from({ length: NB }, (_, i) => [-5.2 + (i / NB) * 10.4 + R() * 0.1, 0.03, 0.1 + R() * (Y_BIG - 0.2), R() * 6, R() * 6]);
  const smallSeeds = Array.from({ length: NSm }, (_, i) => [-5.2 + R() * 10.4, R() < 0.5 ? 0.02 : ZE * R(), Y_BIG + 0.04 + R() * 0.1, R() * 6, R() * 6, R()]);
  // segitiga penyebaran beban di muka potongan
  const fanMat = new THREE.MeshBasicMaterial({ color: PAL.arrow, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const fanGeo = new THREE.BufferGeometry(); fanGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, -1, 0, 1, -1, 0], 3));
  const fan = new THREE.Mesh(fanGeo, fanMat); fan.renderOrder = 3; scene.add(fan);
  // debu & batu terlempar
  const ND = 36, NF = 30;
  const dust = makeInstances(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: '#d9c7a3', flatShading: true, transparent: true, opacity: 0.7 }), ND); scene.add(dust);
  const flying = makeInstances(new THREE.TetrahedronGeometry(0.06, 0), mat('#b5b0a6'), NF); scene.add(flying);

  // ---------------- tahap 4: aspal (bisa cembung) ----------------
  const aspGeo = new THREE.BoxGeometry(X1 - X0, Y_ASP - Y_SMALL, -ZE, 1, 1, 10);
  const aspBase = Float32Array.from(aspGeo.attributes.position.array);
  const aspMat = mat('#34373b', { roughness: 0.7 });
  const asp = mesh(aspGeo, aspMat); asp.position.set(0, (Y_SMALL + Y_ASP) / 2, ZE / 2); scene.add(asp);
  const crownY = (z, C) => C * (1 - (z / ZE) ** 2); // z global ∈ [ZE,0], puncak di tengah jalan (z=0)
  function setCrown(C) {
    const p = aspGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y0 = aspBase[i * 3 + 1], z = aspBase[i * 3 + 2] + ZE / 2;
      p.setY(i, y0 + (y0 > 0 ? crownY(z, C) : 0));
    }
    p.needsUpdate = true; aspGeo.computeVertexNormals();
  }
  let lastCrown = -1;
  const marks = [];
  for (let k = 0; k < 10; k++) { const m = mesh(new THREE.BoxGeometry(0.9, 0.012, 0.09), '#f4f1e6', { shadow: false }); m.position.set(X0 + 0.9 + k * 1.8, Y_ASP + 0.008, -0.06); scene.add(m); marks.push(m); }
  const edgeLine = mesh(new THREE.BoxGeometry(X1 - X0, 0.012, 0.07), '#f4f1e6', { shadow: false }); edgeLine.position.set(0, Y_ASP + 0.006, ZE + 0.12); scene.add(edgeLine);
  // retak
  const crackMat = mat('#141516');
  const crack = new THREE.Group(); crack.position.set(HOLE.x, Y_ASP + 0.006, HOLE.z); scene.add(crack);
  const crackPts = [[-0.9, 0.05], [-0.55, -0.08], [-0.25, 0.06], [0.05, -0.05], [0.35, 0.07], [0.7, -0.04], [1.0, 0.04]];
  crackPts.slice(1).forEach((q, i) => {
    const p = crackPts[i], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const c = mesh(new THREE.BoxGeometry(len + 0.02, 0.012, 0.035), crackMat, { shadow: false });
    c.position.set((p[0] + q[0]) / 2, 0, (p[1] + q[1]) / 2); c.rotation.y = -Math.atan2(q[1] - p[1], q[0] - p[0]); c.k = i / (crackPts.length - 1); crack.add(c);
  });
  for (const [bx, bz, a] of [[-0.25, 0.06, 0.9], [0.35, 0.07, -0.8], [0.05, -0.05, 2.3]]) {
    const c = mesh(new THREE.BoxGeometry(0.28, 0.012, 0.03), crackMat, { shadow: false }); c.position.set(bx + Math.cos(a) * 0.13, 0, bz - Math.sin(a) * 0.13); c.rotation.y = a; c.k = 0.6; crack.add(c);
  }
  const patch = mesh(new THREE.BoxGeometry(2.1, 0.014, 0.32), '#1d1f22', { shadow: false }); patch.position.set(HOLE.x + 0.05, Y_ASP + 0.004, HOLE.z); scene.add(patch);
  // air meresap: noda basah di muka potongan
  const wetMat = new THREE.MeshBasicMaterial({ color: '#2f5f8a', transparent: true, opacity: 0, depthWrite: false });
  const wet = mesh(new THREE.PlaneGeometry(1, 1), wetMat, { shadow: false, receive: false }); wet.renderOrder = 2; scene.add(wet);
  const NW = 26;
  const drops = makeInstances(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#2a9fd6', emissiveIntensity: 0.5, flatShading: true }), NW); scene.add(drops);
  const dropSeeds = Array.from({ length: NW }, () => [R(), R(), R()]);
  // lubang
  const holeG = new THREE.Group(); holeG.position.set(HOLE.x, Y_ASP, HOLE.z); scene.add(holeG);
  const holeIn = mesh(new THREE.CylinderGeometry(1, 0.8, 0.14, 9), mat('#6d6152'), { shadow: false }); holeIn.position.y = -0.065; holeG.add(holeIn);
  const holeRim = mesh(new THREE.TorusGeometry(1, 0.08, 4, 9), mat('#202225'), { shadow: false }); holeRim.rotation.x = Math.PI / 2; holeRim.position.y = 0.0; holeG.add(holeRim);
  const NC = 18;
  const chunks = makeInstances(new THREE.BoxGeometry(0.08, 0.05, 0.07), mat('#2b2d30'), NC); scene.add(chunks);
  const chunkSeeds = Array.from({ length: NC }, () => [R(), R(), R()]);

  // ---------------- tahap 5: selokan + aliran air ----------------
  const ditch = new THREE.Group(); scene.add(ditch);
  const conc = mat(PAL.concrete);
  const dw = DITCH[1] - DITCH[0];
  for (const z of DITCH) { const w = mesh(new THREE.BoxGeometry(X1 - X0, 0.42, 0.1), conc); w.position.set(0, 0.13, z); ditch.add(w); }
  const dfloor = mesh(new THREE.BoxGeometry(X1 - X0, 0.06, dw), conc); dfloor.position.set(0, -0.04, (DITCH[0] + DITCH[1]) / 2); ditch.add(dfloor);
  const dwater = mesh(new THREE.BoxGeometry(X1 - X0, 0.12, dw - 0.1), new THREE.MeshStandardMaterial({ color: PAL.water, flatShading: true, roughness: 0.2, transparent: true, opacity: 0.9 }), { shadow: false });
  dwater.position.set(0, 0.06, (DITCH[0] + DITCH[1]) / 2); ditch.add(dwater);
  const shoulder = mesh(new THREE.BoxGeometry(X1 - X0, Y_ASP - 0.05, DITCH[1] + 0.05 - ZE), '#9c8f78'); shoulder.position.set(0, (Y_ASP - 0.05) / 2, (ZE + DITCH[1] + 0.05) / 2); ditch.add(shoulder);
  const NR = 60;
  const runoff = makeInstances(new THREE.BoxGeometry(0.16, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: '#8fd8f5', emissive: '#2a9fd6', emissiveIntensity: 0.4, flatShading: true }), NR); scene.add(runoff);
  const runSeeds = Array.from({ length: NR }, () => [R(), R(), R()]);

  // ---------------- kendaraan ----------------
  const car = createCar('#3d8bd9'); scene.add(car.root);
  const car2 = createCar('#f2b134'); scene.add(car2.root);
  const truck = createTruck('#e8833a'); scene.add(truck.root);
  const glowMat = new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, opacity: 0, depthWrite: false });
  const glow = mesh(new THREE.CircleGeometry(1, 16), glowMat, { shadow: false, receive: false }); glow.rotation.x = -Math.PI / 2; glow.renderOrder = 3; scene.add(glow);

  // ---------------- Pulau Buton ----------------
  const buton = new THREE.Group(); buton.position.x = BX; scene.add(buton);
  {
    const sea = mesh(new THREE.CylinderGeometry(160, 160, 0.4, 32), new THREE.MeshStandardMaterial({ color: '#2aa7c9', flatShading: true, roughness: 0.3 }), { shadow: false }); sea.position.y = -0.6; buton.add(sea);
    const sand = mesh(new THREE.CylinderGeometry(16, 18, 0.8, 14), PAL.sand); sand.position.set(0, -0.3, -6); buton.add(sand);
    const hill = mesh(new THREE.CylinderGeometry(5, 10, 6, 12), PAL.grass); hill.position.set(0, 2.6, -14); buton.add(hill);
    const RB = rng(88);
    // tebing tambang aspal (bertingkat, batuan gelap)
    for (let k = 0; k < 4; k++) {
      const step = mesh(new THREE.BoxGeometry(11 - k * 0.5, 1.0, 2.4), k % 2 ? '#2c2a27' : '#3a3530'); step.position.set((k % 2 ? 0.4 : -0.3), 0.4 + k * 1.0, -2.0 - k * 1.5); step.rotation.y = (k % 2 ? 0.04 : -0.03); buton.add(step);
    }
    for (let i = 0; i < 26; i++) {
      const r = 0.25 + RB() * 0.4;
      const rk = mesh(new THREE.DodecahedronGeometry(r, 0), RB() < 0.5 ? '#26231f' : '#3b352e'); rk.position.set(-4 + RB() * 8, 0.1 + r * 0.4, 0.4 + RB() * 2.4); rk.rotation.set(RB() * 3, RB() * 3, 0); buton.add(rk);
    }
    for (let i = 0; i < 22; i++) {
      const a = RB() * Math.PI * 2, d = 8 + RB() * 7;
      const x = Math.cos(a) * d, z = -8 + Math.sin(a) * d * 0.7;
      if (z > -2) continue;
      const s2 = 0.9 + RB() * 0.8;
      const tr = mesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 6), PAL.trunk); tr.scale.setScalar(s2); tr.position.set(x, 6.5 + 0.5 * s2 - Math.max(0, d - 9) * 0.8, z); buton.add(tr);
      const lf = mesh(new THREE.IcosahedronGeometry(1, 0), [PAL.leaf, PAL.leaf2, PAL.leaf3][i % 3]); lf.scale.setScalar(s2); lf.position.set(x, tr.position.y + 0.95 * s2, z); buton.add(lf);
    }
  }
  const btruck = createTruck('#d94f3d'); btruck.root.position.set(BX + 3.0, 0.1, 1.6); btruck.root.rotation.y = 0.5; btruck.setLoad(1); scene.add(btruck.root);
  btruck.body.children.forEach((c) => c.children?.forEach?.((cc) => { if (cc.material?.color?.getHexString?.() === 'c9a46b') cc.material = mat('#2a2622'); }));

  // ---------------- panah ----------------
  const yArr = Array.from({ length: 7 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const rArr = Array.from({ length: 2 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  function arr(a, x, y, z, ang, L) { a.visible = L > 0.05; a.setLength(Math.max(0.05, L)); a.rotation.set(0, 0, ang); a.position.set(x, y, z); }
  const down = (a, x, yTip, z, L) => arr(a, x, yTip + L, z, -Math.PI / 2, L);

  // ---------------- kamera ----------------
  const ROAD = { pos: [1.0, 3.0, 4.6], look: [0.3, 0.1, -1.0], fov: 50 };
  const WIDE = { pos: [0.6, 4.4, 8.0], look: [0, 0.0, -1.4], fov: 50 };
  const CUTCAM = { pos: [0.3, 1.0, 3.4], look: [0.2, 0.15, -0.3], fov: 50 };
  const camKeys = [
    { t: 0, pos: [1.6, 2.4, 3.8], look: [0.4, 0.4, -0.7], fov: 50 },
    { t: s('intro'), cut: true, pos: [-1.0, 1.6, 4.6], look: [-2.2, 0.6, -2.4], fov: 50 },
    { t: at('intro', 0.55), ...ROAD, blend: 1.2 },
    { t: s('lumpur'), pos: [0.6, 2.2, 3.8], look: [-0.2, 0.1, -0.9], blend: 1.0 },
    { t: s('kerikil'), ...ROAD, blend: 1.0 },
    { t: s('batu'), ...CUTCAM, blend: 1.2 },
    { t: s('sebar'), pos: [0.3, 0.7, 3.6], look: [0.3, -0.05, -0.2], blend: 1.0 },
    { t: s('debu'), ...ROAD, blend: 1.0 },
    { t: s('aspal'), pos: [-0.4, 2.8, 4.8], look: [0.2, 0.2, -1.0], blend: 1.0 },
    { t: s('retak'), pos: [1.0, 2.2, 2.8], look: [0.5, 0.4, -0.7], blend: 1.0 },
    { t: s('lubang'), pos: [1.2, 2.2, 3.0], look: [0.5, 0.4, -0.7], blend: 0.8 },
    { t: s('cembung'), cut: true, pos: [12.2, 1.5, 2.4], look: [9.0, 0.1, -1.3], fov: 50 },
    { t: at('cembung', 0.7), pos: [2.4, 3.4, 5.0], look: [0.8, 0.2, -1.4], blend: 1.4 },
    { t: s('truk'), ...WIDE, blend: 1.2 },
    { t: s('berdiri'), pos: [-0.6, 3.6, 6.4], look: [-0.8, 0.2, -1.8], blend: 1.0 },
    { t: s('buton'), cut: true, pos: [BX + 2, 5, 20], look: [BX, 1.5, -3] },
    { t: e('buton') - 0.3, pos: [BX + 1, 3.2, 14], look: [BX, 1.2, -2], blend: e('buton') - s('buton') - 1 },
    { t: s('outro'), cut: true, pos: [-1.0, 1.7, 4.8], look: [-2.2, 0.8, -2.6], fov: 50 },
  ];

  // ---------------- update ----------------
  return {
    update(t) {
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const site = L('buton') ? 'buton' : 'home';
      const home = site === 'home';
      dio.root.visible = home; buton.visible = btruck.root.visible = !home;
      const sx = home ? 0 : BX;
      sun.position.set(sx - 10, 22, 14); sun.target.position.set(sx, -1, -1);
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);

      // tahap jalan: 0 tanah, 1 kerikil, 2 batu, 3 aspal (hook & outro = aspal)
      const stage = t < s('intro') ? 3 : t < s('kerikil') ? 0 : t < s('batu') ? 1 : t < s('aspal') ? 2 : 3;
      const teaser = t < s('intro');
      const final = t >= s('cembung');

      // langit & hujan
      const rainAmt = L('lumpur') ? smooth((t - s('lumpur') - 0.2) / 0.6)
        : L('retak') ? smooth((t - at('retak', 0.35)) / 0.5)
        : L('cembung') ? smooth((t - at('cembung', 0.2)) / 0.5) * (1 - smooth((t - at('cembung', 0.75)) / 0.4))
        : L('berdiri') ? 1 : 0;
      setSky(home ? rainAmt * 0.7 : 0);
      rain.visible = home; rain.update(t, home ? rainAmt : 0);

      // ===== tanah =====
      dirt.visible = home;
      const wetK = L('lumpur') ? smooth((t - s('lumpur') - 0.4) / 1.2) : 0;
      dirtMat.color.set('#a6825a').lerp(new THREE.Color('#5b4330'), wetK);
      dirtMat.roughness = lerp(0.9, 0.25, wetK);
      puddleMat.opacity = 0.85 * wetK; puddles.forEach((p) => (p.visible = home && stage === 0 && wetK > 0.02));
      const flat = L('intro') ? smooth((t - s('intro') - 0.4) / (dur('intro') * 0.5)) : 1;
      moundSeeds.forEach(([x, z, sc, r], i) => {
        if (!(home && stage === 0 && flat < 1)) { mounds.set(i, 0, -999, 0, 0); return; }
        const k = clamp(flat * 1.4 - r * 0.4);
        mounds.set(i, x, 0.02, z, sc, sc * 0.5 * (1 - k) + 0.01, sc, 0, r * 6, 0);
      });

      // ===== kerikil =====
      let carX = null, carZ = LANE, carSink = 0, carRoll = 0, carBump = 0;
      if (L('intro')) { carX = lerp(-9, 9, smooth((t - at('intro', 0.55)) / (dur('intro') * 0.45))); }
      if (L('lumpur')) {
        const u = clamp((t - s('lumpur') - 0.2) / 1.6);
        carX = lerp(-6, -0.4, easeOut(u)); carSink = -0.16 * smooth((t - s('lumpur') - 1.4) / 0.8);
        carRoll = t * 18; // roda berputar di tempat
      }
      if (L('kerikil')) carX = lerp(-8, 8, clamp((t - at('kerikil', 0.3)) / (dur('kerikil') * 0.6)));
      pebSeeds.forEach(([x, z, r, sc], i) => {
        if (!(home && stage === 1)) { pebbles.set(i, 0, -999, 0, 0); return; }
        const drop = clamp((t - s('kerikil') - r * 1.2) / 0.4);
        let px = x, pz = z, py = 0.06 + (1 - easeOut(drop)) * 1.5, roll = 0;
        if (carX !== null && L('kerikil')) {
          for (const wz of WHEELZ) {
            const dz = pz - wz;
            if (Math.abs(dz) < 0.22) {
              const k = smooth((carX + 0.46 - x) / 0.35);
              pz = z + Math.sign(dz || 1) * (0.25 - Math.abs(dz)) * 1.6 * k; px = x + 0.25 * k; roll = 6 * k;
            }
          }
        }
        if (drop <= 0) { pebbles.set(i, 0, -999, 0, 0); return; }
        pebbles.set(i, px, py, pz, sc, sc, sc, roll, 0, roll * 0.5);
      });

      // ===== batu pecah berlapis =====
      const showStones = home && stage >= 2;
      const bigK = L('batu') ? clamp((t - s('batu') - 0.3) / (dur('batu') * 0.45)) : 1;
      const smallK = L('batu') ? clamp((t - at('batu', 0.62)) / (dur('batu') * 0.3)) : 1;
      bigBox.visible = showStones && bigK > 0.05; bigBox.scale.y = Math.max(0.01, smooth(bigK)); bigBox.position.y = Y_BIG / 2 * smooth(bigK);
      smallBox.visible = showStones && smallK > 0.05; smallBox.scale.y = Math.max(0.01, smooth(smallK)); smallBox.position.y = Y_BIG + (Y_SMALL - Y_BIG) / 2 * smooth(smallK);
      bigSeeds.forEach(([x, z, y, r1, r2], i) => {
        if (!showStones || stage === 3) { bigStones.set(i, 0, -999, 0, 0); return; }
        const k = clamp(bigK * 1.3 - i / NB * 0.3); if (k <= 0) { bigStones.set(i, 0, -999, 0, 0); return; }
        bigStones.set(i, x, y + (1 - easeOut(k)) * 2, z, 1, 1, 1, r1, r2, 0);
      });
      // permukaan batu kecil yang terlepas saat debu
      const looseK = L('debu') ? smooth((t - at('debu', 0.3)) / (dur('debu') * 0.6)) : 0;
      smallSeeds.forEach(([x, z, y, r1, r2, rr], i) => {
        if (!showStones || (stage === 3 && !L('aspal'))) { smallStones.set(i, 0, -999, 0, 0); return; }
        const k = clamp(smallK * 1.3 - rr * 0.3); if (k <= 0) { smallStones.set(i, 0, -999, 0, 0); return; }
        if (stage === 3 && t > s('aspal') + 1.2) { smallStones.set(i, 0, -999, 0, 0); return; }
        if (z < -0.03 && rr < looseK * 0.7) { smallStones.set(i, 0, -999, 0, 0); return; } // lepas
        smallStones.set(i, x, y + (1 - easeOut(k)) * 2, z, 1, 1, 1, r1, r2, 0);
      });

      // ===== aspal =====
      const aspK = L('aspal') ? smooth((t - s('aspal') - 0.3) / (dur('aspal') * 0.5)) : stage === 3 ? 1 : 0;
      asp.visible = home && aspK > 0.01;
      asp.scale.x = Math.max(0.01, aspK); asp.position.x = X0 + (X1 - X0) / 2 * aspK;
      const C = final ? 0.2 * smooth((t - s('cembung') - 0.3) / 1.2) : 0;
      if (C !== lastCrown) { setCrown(C); lastCrown = C; }
      const markOn = home && stage === 3 && aspK >= 1;
      marks.forEach((m) => { m.visible = markOn; m.position.y = Y_ASP + 0.008 + C; });
      edgeLine.visible = markOn; edgeLine.position.y = Y_ASP + 0.006 + crownY(ZE + 0.12, C);

      // retak, air, lubang
      const crackK = teaser ? 1 : L('retak') ? smooth((t - s('retak') - 0.3) / 1.4) : (t >= s('lubang') && !final) ? 1 : 0;
      crack.visible = home && crackK > 0.01 && !final;
      crack.children.forEach((c) => (c.visible = c.k <= crackK));
      crack.position.y = Y_ASP + 0.006;
      const patchK = L('cembung') ? smooth((t - at('cembung', 0.78)) / 0.4) : t >= s('truk') ? 1 : 0;
      patch.visible = home && patchK > 0.01; patch.scale.set(Math.max(0.01, patchK), 1, 1); patch.position.y = Y_ASP + 0.004 + crownY(HOLE.z, C);
      const wetA = L('retak') ? 0.55 * smooth((t - at('retak', 0.55)) / 1.2) : L('lubang') ? 0.55 : 0;
      wetMat.opacity = wetA; wet.visible = home && wetA > 0.01;
      const wk = L('retak') ? smooth((t - at('retak', 0.55)) / 1.4) : 1;
      wet.scale.set(0.6 + 1.6 * wk, (Y_SMALL - 0.04) * (0.5 + 0.5 * wk), 1); wet.position.set(HOLE.x, Y_SMALL - 0.02 - wet.scale.y / 2, 0.012);
      dropSeeds.forEach(([a, b, c], i) => {
        if (!(home && L('retak') && t > at('retak', 0.4))) { drops.set(i, 0, -999, 0, 0); return; }
        const ph = ((t - at('retak', 0.4)) * 0.9 + a) % 1;
        const x = HOLE.x - 0.8 + b * 1.7;
        const y = ph < 0.4 ? lerp(1.6, Y_ASP, ph / 0.4) : lerp(Y_ASP, 0.1, (ph - 0.4) / 0.6);
        drops.set(i, x, y, ph < 0.4 ? HOLE.z : lerp(HOLE.z, 0.02, (ph - 0.4) / 0.6), 1);
      });
      // lubang tumbuh tiap mobil lewat
      let holeR = 0;
      if (teaser) holeR = 0.38;
      if (L('lubang')) {
        const passes = (t - s('lubang')) * 9 / 16;
        holeR = 0.38 * smooth(passes / 1.6);
      }
      holeG.visible = home && holeR > 0.02 && !final;
      holeG.scale.set(holeR, 1, holeR * 0.8);
      holeIn.scale.y = 1;
      chunkSeeds.forEach(([a, b, c], i) => {
        if (!(home && L('lubang'))) { chunks.set(i, 0, -999, 0, 0); return; }
        const passT = ((((t - s('lubang')) * 9 - (HOLE.x + 8)) % 16) + 16) % 16 / 9; // waktu sejak roda lewat lubang
        const tt = passT - a * 0.1;
        if (tt < 0 || tt > 0.6) { chunks.set(i, 0, -999, 0, 0); return; }
        const ang = b * Math.PI * 2;
        chunks.set(i, HOLE.x + Math.cos(ang) * (0.2 + tt * 1.2), Y_ASP + tt * 2.4 - 6 * tt * tt, HOLE.z + Math.sin(ang) * (0.15 + tt * 0.8), 1, 1, 1, tt * 8, c * 6, 0);
      });

      // ===== selokan & aliran air =====
      const ditchK = final ? easeOutBack((t - s('cembung') - 0.9) / 0.6) : 0;
      ditch.visible = home && ditchK > 0.01; ditch.scale.set(1, Math.max(0.01, ditchK), 1);
      const flowOn = home && final && (rainAmt > 0.05);
      dwater.visible = flowOn;
      runSeeds.forEach(([a, b, c], i) => {
        if (!flowOn) { runoff.set(i, 0, -999, 0, 0); return; }
        const ph = (t * 0.7 + a) % 1;
        const x = X0 + 1 + b * (X1 - X0 - 2);
        if (i < NR * 0.6) {
          const z = lerp(-0.05, ZE, ph);
          runoff.set(i, x, Y_ASP + crownY(z, C) + 0.012, z, 1, 1, 1, 0, Math.PI / 2, 0);
        } else {
          const xx = X0 + ((t * 2.2 + b * 18) % 18);
          runoff.set(i, xx, 0.13, (DITCH[0] + DITCH[1]) / 2 + (c - 0.5) * 0.4, 1.4, 1, 1);
        }
      });

      // ===== kendaraan =====
      car.root.visible = false; car2.root.visible = false; truck.root.visible = false; glowMat.opacity = 0;
      const surf = stage === 3 ? Y_ASP : stage === 2 ? Y_SMALL : stage === 1 ? 0.06 : 0.03;
      const placeCar = (c, x, z, dir, y = 0, bump = 0, roll = x * dir) => {
        c.root.visible = true; c.root.position.set(x, surf + crownY(z, C) + y, z); c.root.rotation.y = dir > 0 ? 0 : Math.PI;
        c.roll(roll); c.body.position.y = bump; c.body.rotation.z = -bump * 0.8;
      };
      if (teaser) {
        const x = lerp(-6, 6, t / s('intro'));
        let bump = 0; for (const wx of [0.46, -0.46]) { const d = x + wx - HOLE.x; if (Math.abs(d) < 0.3) bump = Math.min(bump, -0.1 * Math.cos(d / 0.3 * Math.PI / 2)); }
        placeCar(car, x, LANE, 1, 0, bump);
      }
      if (L('intro') && carX !== null && t > at('intro', 0.5)) placeCar(car, carX, LANE, 1);
      if (L('lumpur') && carX !== null) placeCar(car, carX, LANE, 1, carSink, 0, carRoll);
      if (L('kerikil') && t > at('kerikil', 0.25)) placeCar(car, carX, LANE, 1, 0, 0.015 * Math.sin(t * 40));
      if (L('sebar')) placeCar(car, 0, LANE, 1);
      if (L('debu')) { const x = -10 + ((t - s('debu')) * 11) % 22; placeCar(car, x, LANE, 1, 0, 0.01 * Math.sin(t * 50)); carX = x; }
      if (L('lubang')) {
        const x = -8 + ((t - s('lubang')) * 9) % 16;
        let bump = 0; for (const wx of [0.46, -0.46]) { const d = x + wx - HOLE.x; if (Math.abs(d) < 0.3) bump = Math.min(bump, -0.09 * holeR / 0.38 * Math.cos(d / 0.3 * Math.PI / 2)); }
        placeCar(car, x, LANE, 1, 0, bump);
      }
      if (L('truk')) {
        const x = lerp(-9, 9, (t - s('truk')) / dur('truk'));
        const load = 1 + smooth((t - s('truk') - 0.2) / 1.0);
        truck.root.visible = true; truck.root.position.set(x, Y_ASP + C, LANE); truck.setLoad(load); truck.roll(x);
        truck.body.position.y = -0.04 * (load - 1);
        glowMat.opacity = 0.45 * smooth((t - at('truk', 0.3)) / 0.5) * (0.7 + 0.3 * Math.sin(t * 8));
        glow.position.set(x - 1.0, Y_ASP + C + 0.02, LANE); glow.scale.set(0.9, 0.6, 1);
      }
      if (L('berdiri') && home) {
        const t0 = t - s('berdiri');
        placeCar(car, -8 + (t0 * 3.2) % 16, LANE, 1);
        placeCar(car2, 9 - (t0 * 2.6) % 18, -0.3, -1);
        car2.root.position.z = -0.35; car2.root.scale.setScalar(0.92);
      }

      // lumpur: cipratan dari roda
      splash.hideAll();
      if (home && L('lumpur') && t > s('lumpur') + 1.6) {
        for (let i = 0; i < NS; i++) {
          const ph = (t * 1.6 + i / NS) % 1, ang = (i * 2.4) % (Math.PI * 2);
          splash.set(i, (carX ?? 0) - 0.5 - ph * 0.8, 0.1 + ph * 1.2 - ph * ph * 1.6, WHEELZ[i % 2] + Math.cos(ang) * ph * 0.4, 1);
        }
      }
      // debu
      dust.hideAll(); flying.hideAll();
      if (home && L('debu') && carX !== null) {
        for (let i = 0; i < ND; i++) {
          const age = (i / ND) * 1.4;
          const x = carX - 0.9 - age * 3.0;
          const sc = Math.max(0, 0.6 + age * 1.4) * (1 - smooth((age - 1.0) / 0.4));
          if (x < X0 || x > X1) continue;
          dust.set(i, x, 0.6 + age * 0.6 + (i % 3) * 0.12, LANE + ((i % 5) - 2) * 0.18 + age * 0.3, sc);
        }
        for (let i = 0; i < NF; i++) {
          const age = ((i * 0.37) % 1) * 0.6;
          const x = carX - 0.5 - age * 2;
          dust && flying.set(i, x, Y_SMALL + age * 2.2 - 5 * age * age, WHEELZ[i % 2] + ((i % 7) - 3) * 0.05 * age * 6, 1, 1, 1, age * 9, i, 0);
        }
      }

      // ===== panah =====
      yArr.forEach((a) => (a.visible = false)); rArr.forEach((a) => (a.visible = false));
      fanMat.opacity = 0; fan.visible = false;
      if (L('sebar')) {
        const g = smooth((t - s('sebar') - 0.2) / 0.4), g2 = smooth((t - at('sebar', 0.35)) / 0.6);
        down(yArr[0], 0.46, Y_SMALL + 0.05, 0.05, 1.0 * g);
        fan.visible = true; fanMat.opacity = 0.5 * g2;
        fan.position.set(0.46, Y_SMALL, 0.02); fan.scale.set(0.2 + 1.3 * g2, Y_SMALL + 0.02, 1);
        [-1, -0.5, 0, 0.5, 1].forEach((k, j) => down(yArr[1 + j], 0.46 + k * 1.3, -0.5, 0.05, 0.45 * g2));
      }
      if (L('truk')) {
        const x = lerp(-9, 9, (t - s('truk')) / dur('truk'));
        const g = smooth((t - at('truk', 0.3)) / 0.4);
        arr(rArr[0], x - 1.0, Y_ASP + 2.6, LANE + 0.6, -Math.PI / 2, 1.4 * g);
      }

      // ===== label =====
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_HOME.x, 1.75, BERO_HOME.z], alpha: fade('intro', 0.3), up: 34, tone: 'yellow' });
      if (L('intro')) st.labels.push({ text: 'Tanah dipadatkan', pos: [0.6, 0.05, ZE / 2], alpha: smooth((t - at('intro', 0.4)) / 0.3), up: 40 });
      if (L('lumpur')) st.labels.push({ text: 'Lumpur', pos: [0.5, 0.05, -0.3], alpha: fade('lumpur', 1.0), up: 30 });
      if (L('lumpur')) st.labels.push({ text: 'Terjebak', pos: [(carX ?? 0), 1.0, LANE], alpha: smooth((t - s('lumpur') - 2.4) / 0.3), up: 40, tone: 'red' });
      if (L('kerikil')) st.labels.push({ text: 'Kerikil bulat', pos: [0.7, 0.08, -0.25], alpha: fade('kerikil', 0.9), up: 40 });
      if (L('kerikil')) st.labels.push({ text: 'Menggelinding', pos: [(carX ?? 0) - 1.2, 0.1, WHEELZ[1]], alpha: smooth((t - at('kerikil', 0.55)) / 0.3), up: 60, tone: 'red' });
      if (L('batu')) {
        st.labels.push({ text: 'Batu pecah', pos: [-0.9, Y_BIG / 2, 0.05], alpha: smooth((t - at('batu', 0.2)) / 0.3), up: 60, tone: 'yellow' });
        st.labels.push({ text: 'Saling ngunci', pos: [0.4, Y_BIG / 2, 0.05], alpha: smooth((t - at('batu', 0.4)) / 0.3), up: 90, tone: 'yellow' });
        st.labels.push({ text: 'Besar', pos: [-1.8, Y_BIG / 2, 0.05], alpha: smooth((t - at('batu', 0.62)) / 0.3), up: -40 });
        st.labels.push({ text: 'Kecil', pos: [1.9, (Y_BIG + Y_SMALL) / 2, 0.05], alpha: smooth((t - at('batu', 0.8)) / 0.3), up: 50 });
      }
      if (L('sebar')) st.labels.push({ text: 'Nyebarin beban', pos: [0.46, -0.1, 0.05], alpha: smooth((t - at('sebar', 0.35)) / 0.3), up: -60, tone: 'yellow' });
      if (L('sebar')) st.labels.push({ text: 'Tanah', pos: [-1.6, -0.9, 0.02], alpha: smooth((t - at('sebar', 0.6)) / 0.3), up: 20 });
      if (L('debu')) st.labels.push({ text: 'Debu', pos: [(carX ?? 0) - 2.2, 1.2, LANE], alpha: fade('debu', 0.8), up: 30 });
      if (L('debu')) st.labels.push({ text: 'Batu lepas', pos: [0.8, Y_SMALL, -0.1], alpha: smooth((t - at('debu', 0.7)) / 0.3), up: 50, tone: 'red' });
      if (L('aspal')) st.labels.push({ text: 'Aspal', pos: [-0.4, Y_ASP, -0.1], alpha: smooth((t - at('aspal', 0.35)) / 0.3), up: 50, tone: 'yellow' });
      if (L('retak')) st.labels.push({ text: 'Retak', pos: [HOLE.x + 0.6, Y_ASP, HOLE.z], alpha: fade('retak', 0.8), up: 50, tone: 'red' });
      if (L('retak')) st.labels.push({ text: 'Air masuk', pos: [HOLE.x - 0.5, 0.25, 0.02], alpha: smooth((t - at('retak', 0.6)) / 0.3), up: -50 });
      if (L('lubang')) st.labels.push({ text: 'Lubang', pos: [HOLE.x, Y_ASP, HOLE.z], alpha: smooth((t - s('lubang') - 1.2) / 0.3), up: 70, tone: 'red' });
      if (L('cembung')) {
        st.labels.push({ text: 'Cembung', pos: [X1, Y_ASP + C, -0.3], alpha: smooth((t - s('cembung') - 0.9) / 0.3) * (1 - smooth((t - at('cembung', 0.68)) / 0.2)), up: 60, tone: 'yellow' });
        st.labels.push({ text: '±2%', pos: [X1, Y_ASP + crownY(-1.2, C), -1.2], alpha: smooth((t - at('cembung', 0.25)) / 0.3) * (1 - smooth((t - at('cembung', 0.68)) / 0.2)), up: 30 });
        st.labels.push({ text: 'Selokan', pos: [X1, 0.15, (DITCH[0] + DITCH[1]) / 2], alpha: smooth((t - at('cembung', 0.45)) / 0.3) * (1 - smooth((t - at('cembung', 0.68)) / 0.2)), up: -40, tone: 'yellow' });
        st.labels.push({ text: 'Retak ditutup', pos: [HOLE.x, Y_ASP + C, HOLE.z], alpha: smooth((t - at('cembung', 0.82)) / 0.3), up: 50 });
      }
      if (L('truk')) {
        const x = lerp(-9, 9, (t - s('truk')) / dur('truk'));
        st.labels.push({ text: 'Kelebihan muatan', pos: [x - 0.5, Y_ASP + 2.2, LANE], alpha: smooth((t - at('truk', 0.1)) / 0.3) * (1 - smooth((t - at('truk', 0.38)) / 0.3)), up: 40, tone: 'red' });
      }
      if (L('berdiri')) st.labels.push({ text: 'Awet', pos: [0, Y_ASP + 0.8, LANE], alpha: fade('berdiri', 0.3), up: 40, tone: 'yellow' });

      // ===== kartu =====
      if (L('truk')) st.card = { title: 'Uji jalan AASHO · Amerika', body: 'Beban satu sumbu 2× → kerusakan jalan bisa sampai 16×', top: 0.08, alpha: smooth((t - at('truk', 0.42)) / 0.3) };
      if (L('buton')) {
        const second = t >= at('buton', 0.58);
        st.card = second
          ? { title: 'Tapi…', body: 'Sebagian besar aspal jalan kita masih impor', top: 0.08, alpha: 1 }
          : { title: 'Aspal alam Pulau Buton', body: 'Sulawesi Tenggara · salah satu yang terbesar di dunia', top: 0.08, alpha: smooth((t - s('buton') - 0.6) / 0.3) };
        st.labels.push({ text: 'Batuan aspal', pos: [BX - 1.5, 1.4, -1.8], alpha: smooth((t - at('buton', 0.3)) / 0.3), up: 40, tone: 'yellow' });
      }

      // ===== Pak Bero =====
      let bp = BERO_HOME.clone(), anim = 'idle';
      if (!home) bp.set(BX - 4.5, 0.1, 2.4);
      const camYaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      let yaw = camYaw;
      if (teaser) anim = 'sad';
      else if (L('intro')) {
        if (t < at('intro', 0.5)) { const u = (t - s('intro')) / (dur('intro') * 0.5); bp.set(lerp(-3.4, -1.0, u), 0, LANE + 0.3 * Math.sin(u * 9)); anim = 'happy'; }
        else anim = 'point';
      }
      else if (L('lumpur')) anim = t > s('lumpur') + 2.0 ? 'panic' : 'idle';
      else if (L('kerikil')) anim = t > at('kerikil', 0.55) ? 'sad' : 'carry';
      else if (L('batu')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('sebar')) anim = 'point';
      else if (L('debu')) anim = 'panic';
      else if (L('aspal')) anim = 'happy';
      else if (L('retak')) anim = 'think';
      else if (L('lubang')) anim = 'sad';
      else if (L('cembung')) anim = t > at('cembung', 0.75) ? 'slap' : 'point';
      else if (L('truk')) anim = 'panic';
      else if (L('berdiri')) anim = 'happy';
      else if (!home) anim = 'point';
      else if (L('outro')) anim = 'wave';
      if (anim === 'point' && home) yaw = Math.PI * 0.6;
      bero.root.position.copy(bp);
      bero.pose(t, anim, { yaw });

      // ===== guncangan =====
      let shake = 0;
      if (L('lubang') && chunks.visible) {
        const passT = ((((t - s('lubang')) * 9 - (HOLE.x + 8)) % 16) + 16) % 16 / 9;
        if (passT > 0 && passT < 0.25 && holeR > 0.1) shake = 0.025;
      }
      if (shake) { camera.position.x += Math.sin(t * 53) * shake; camera.position.y += Math.cos(t * 47) * shake; }
      return st;
    },
  };
}
