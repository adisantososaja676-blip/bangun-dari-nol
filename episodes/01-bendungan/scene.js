// Ep. 01 Bendungan: adegan & animasi, diikat ke id baris di script.json.
// Semua posisi dihitung dari waktu t (deterministik).
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeOutBack, cameraAt, makeArrow, makeInstances, buildValley, makeRain } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';

const W = 8, H = 4;
const CREST = -0.3;                 // puncak bendungan tanah
const BASE_HALF = 4, TOP_HALF = 0.75;
const SPILL_CREST = -0.9;           // puncak pelimpah
const STICK_TOP = -1.55;
const CX = 300, SX = -300;          // lokasi diagram potongan & peta satelit

// titik di lereng hulu/hilir (koordinat z) pada ketinggian y
const slopeZ = (y, side) => side * (BASE_HALF - (y + H) * ((BASE_HALF - TOP_HALF) / (CREST + H)));

function trapShape(bHalf, tHalf, h, base = 0) {
  const s = new THREE.Shape();
  s.moveTo(-bHalf, base); s.lineTo(bHalf, base); s.lineTo(tHalf, base + h); s.lineTo(-tHalf, base + h); s.closePath();
  return s;
}
// trapesium melintang alur (profil di bidang z-y, memanjang di sumbu x)
function damSliceGeo(width, bHalf = BASE_HALF, tHalf = TOP_HALF, h = CREST + H) {
  const g = new THREE.ExtrudeGeometry(trapShape(bHalf, tHalf, h), { depth: width, bevelEnabled: false });
  g.rotateY(Math.PI / 2); g.translate(-width / 2, 0, 0);
  return g;
}
// lembaran tipis di lereng hilir (untuk air melimpas)
function slopeSheet(x0, x1, zTop, yTop, zBot, yBot, material) {
  const len = Math.hypot(zBot - zTop, yBot - yTop);
  const m = mesh(new THREE.BoxGeometry(x1 - x0, 0.06, len), material, { shadow: false });
  m.rotation.x = Math.atan2(yTop - yBot, zBot - zTop);
  const n = new THREE.Vector2(yTop - yBot, zBot - zTop).normalize(); // normal keluar (z,y)
  m.position.set((x0 + x1) / 2, (yTop + yBot) / 2 + n.y * 0.06, (zTop + zBot) / 2 + n.x * 0.06);
  return m;
}
const fade = (t, t0, t1, d = 0.3) => clamp((t - t0) / d) * clamp((t1 - t) / d);

export function build(kit, T) {
  const { scene, camera, setSky } = kit;
  const V = buildValley(kit, { W, H });
  const R = rng(42);
  const rain = makeRain(kit, 520);

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);
  const BERO_POS = new THREE.Vector3(-5.3, 0, 2.2);
  bero.root.position.copy(BERO_POS);
  const held = mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6), PAL.stick);
  held.rotation.z = Math.PI / 2; held.position.set(-0.35, 0, 0.1); bero.holdSlot.add(held);

  // ---------------- Tahap 1: ranting ----------------
  const sticks = [];
  const stickGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  for (let y = -H + 0.14; y < STICK_TOP; y += 0.26) {
    let x = -W / 2 - 0.3 + R() * 0.6;
    while (x < W / 2 + 0.2) {
      const len = 1.5 + R() * 2.2, r = 0.1 + R() * 0.06;
      const m = mesh(stickGeo, R() < 0.5 ? PAL.stick : PAL.stick2);
      m.scale.set(r, len, r);
      const base = { x: Math.min(x + len / 2, W / 2 - 0.1), y, z: (R() - 0.5) * 0.8, rz: Math.PI / 2 + (R() - 0.5) * 0.3, ry: (R() - 0.5) * 0.5 };
      m.position.set(base.x, base.y, base.z); m.rotation.set(0, base.ry, base.rz);
      scene.add(m); sticks.push({ m, base, spin: (R() - 0.5) * 6, drift: 4 + R() * 4 });
      x += len * (0.6 + R() * 0.3);
    }
  }
  for (let i = 0; i < 9; i++) { // tiang tegak
    const m = mesh(stickGeo, PAL.stick); const len = 2.0 + R() * 0.45;
    m.scale.set(0.09, len, 0.09);
    const base = { x: -W / 2 + 0.6 + i * ((W - 1.2) / 8), y: -H + len / 2 - 0.1, z: (i % 2 ? 0.45 : -0.45), rz: (R() - 0.5) * 0.2, ry: 0 };
    m.position.set(base.x, base.y, base.z); m.rotation.z = base.rz;
    scene.add(m); sticks.push({ m, base, spin: (R() - 0.5) * 6, drift: 4 + R() * 4, stake: true });
  }
  const order = sticks.map((s, i) => [s.stake ? 99 : s.base.y + R() * 0.2, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  order.forEach((i, k) => { sticks[i].appear = k / order.length; });

  // lumpur (3 bagian: kiri, tengah, kanan)
  const mudParts = [[-W / 2 - 0.2, -2.6], [-2.6, 2.6], [2.6, W / 2 + 0.2]].map(([x0, x1], k) => {
    const g = new THREE.BoxGeometry(x1 - x0, STICK_TOP + H + 0.15, 0.5, 8, 6, 1);
    g.translate(0, (STICK_TOP + H + 0.15) / 2, 0);
    const p = g.attributes.position; const r2 = rng(5 + k);
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + (r2() - 0.5) * 0.18);
    g.computeVertexNormals();
    const m = mesh(g, PAL.mud); m.position.set((x0 + x1) / 2, -H, -0.62); scene.add(m);
    return m;
  });

  // tetesan rembes
  const EMIT = 16, PER = 6;
  const drops = makeInstances(new THREE.IcosahedronGeometry(0.07, 0), mat('#bdf3f5', { emissive: '#bdf3f5', emissiveIntensity: 0.4 }), EMIT * PER);
  scene.add(drops);
  const emitters = Array.from({ length: EMIT }, () => [(R() - 0.5) * (W - 1), -H + 0.3 + R() * 1.9, R()]);

  // panah tekanan
  const arrows = Array.from({ length: 4 }, () => { const a = makeArrow(); scene.add(a); return a; });

  // ---------------- Tahap 3: bendungan urugan tanah ----------------
  const NS = 10, SW = 1.0;
  const slices = [];
  for (let i = 0; i < NS; i++) {
    const g = damSliceGeo(SW + 0.02);
    const m = mesh(g, PAL.earth);
    const cx = -5 + (i + 0.5) * SW;
    m.position.set(cx, -H, 0);
    const crest = mesh(new THREE.BoxGeometry(SW + 0.02, 0.12, TOP_HALF * 2 + 0.1), PAL.earthTop);
    crest.position.y = CREST + H + 0.03; m.add(crest);
    scene.add(m); slices.push({ m, cx });
  }
  // garis ukur lebar/sempit di muka potongan
  const dimMat = mat(PAL.arrow, { emissive: PAL.arrow, emissiveIntensity: 0.5 });
  const dimBottom = mesh(new THREE.BoxGeometry(0.06, 0.08, BASE_HALF * 2 - 0.3), dimMat, { shadow: false });
  const dimTop = mesh(new THREE.BoxGeometry(0.06, 0.08, TOP_HALF * 2), dimMat, { shadow: false });
  scene.add(dimBottom, dimTop);

  const overflowMat = new THREE.MeshStandardMaterial({ color: '#7fd8d2', transparent: true, opacity: 0, flatShading: true, roughness: 0.2 });
  const overflow = slopeSheet(-W / 2, W / 2, TOP_HALF, CREST, BASE_HALF, -H, overflowMat); scene.add(overflow);
  const crestWater = mesh(new THREE.BoxGeometry(W, 0.12, TOP_HALF * 2), overflowMat, { shadow: false }); crestWater.position.set(0, CREST + 0.06, 0); scene.add(crestWater);
  const streaks = makeInstances(new THREE.BoxGeometry(0.05, 0.04, 0.6), mat('#f2feff', { emissive: '#ffffff', emissiveIntensity: 0.5 }), 70);
  scene.add(streaks);
  const streakSeeds = Array.from({ length: 70 }, () => [R(), R()]);

  // ---------------- Tahap 4: pelimpah ----------------
  const SP0 = 1.0, SP1 = 3.0; // rentang x pelimpah (menggantikan slice 6 & 7)
  const spillMat = new THREE.MeshStandardMaterial({ color: PAL.earth, flatShading: true, roughness: 0.8 });
  const spillH = SPILL_CREST + H;
  const spillTopHalf = BASE_HALF - spillH * ((BASE_HALF - TOP_HALF) / (CREST + H));
  const spill = mesh(damSliceGeo(SP1 - SP0, BASE_HALF + 0.02, spillTopHalf, spillH + 0.01), spillMat);
  spill.position.set((SP0 + SP1) / 2, -H, 0); scene.add(spill);
  const walls = [SP0, SP1].map((x) => { const w = mesh(damSliceGeo(0.16, BASE_HALF + 0.03, TOP_HALF + 0.03, CREST + H + 0.25), spillMat); w.position.set(x, -H, 0); scene.add(w); return w; });
  const spillWaterMat = new THREE.MeshStandardMaterial({ color: '#8fe3de', transparent: true, opacity: 0.85, flatShading: true, roughness: 0.15 });
  const spillSheet = slopeSheet(SP0 + 0.08, SP1 - 0.08, spillTopHalf, SPILL_CREST, BASE_HALF, -H, spillWaterMat); scene.add(spillSheet);
  const spillCrestW = mesh(new THREE.BoxGeometry(SP1 - SP0 - 0.16, 0.14, spillTopHalf * 2), spillWaterMat, { shadow: false });
  spillCrestW.position.set((SP0 + SP1) / 2, SPILL_CREST + 0.07, 0); scene.add(spillCrestW);
  const earthCol = new THREE.Color(PAL.earth), concCol = new THREE.Color(PAL.concrete);

  // ---------------- Diagram potongan (piping, inti, filter) ----------------
  const cut = new THREE.Group(); cut.position.x = CX; scene.add(cut);
  const ground = mesh(new THREE.BoxGeometry(44, 12, 2), PAL.cliffDark); ground.position.set(0, -H - 6, 0); cut.add(ground);
  const groundTop = mesh(new THREE.BoxGeometry(44, 0.3, 2.02), PAL.bed); groundTop.position.set(0, -H - 0.15, 0); cut.add(groundTop);
  const extrude = (shape, depth, color, z = 0) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2 + z); return mesh(g, color); };
  const cutDam = extrude(trapShape(BASE_HALF, TOP_HALF, CREST + H, -H), 2, PAL.earth); cut.add(cutDam);
  const cutCrest = mesh(new THREE.BoxGeometry(TOP_HALF * 2 + 0.1, 0.14, 2.02), PAL.earthTop); cutCrest.position.y = CREST + 0.05; cut.add(cutCrest);
  const LV = -0.8;
  const ws = new THREE.Shape(); ws.moveTo(-26, -H); ws.lineTo(-BASE_HALF, -H); ws.lineTo(slopeZ(LV, -1), LV); ws.lineTo(-26, LV); ws.closePath();
  const cutWater = extrude(ws, 1.9, new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.9, flatShading: true }), 0); cut.add(cutWater);
  // terowongan piping (gelap, di muka depan)
  const tunnel = mesh(new THREE.BoxGeometry(1, 0.42, 0.03), '#3a2415', { shadow: false }); tunnel.position.set(0, -H + 0.3, 1.02); cut.add(tunnel);
  // inti kedap & filter (di muka depan)
  const coreShape = trapShape(1.2, 0.4, CREST + H - 0.2 + 0.6, 0);
  const core = extrude(coreShape, 0.04, PAL.clay, 1.02); core.position.y = -H - 0.6; cut.add(core);
  const fs = new THREE.Shape(); fs.moveTo(1.12, 0); fs.lineTo(1.95, 0); fs.lineTo(0.95, 3.25); fs.lineTo(0.5, 3.25); fs.closePath();
  const filter = extrude(fs, 0.04, PAL.sand, 1.03); filter.position.y = -H; cut.add(filter);
  const seep = makeInstances(new THREE.IcosahedronGeometry(0.075, 0), mat('#c9f6ff', { emissive: '#9fe9ff', emissiveIntensity: 0.6 }), 46);
  cut.add(seep);
  const grains = makeInstances(new THREE.IcosahedronGeometry(0.06, 0), mat('#7a4a25'), 24);
  cut.add(grains);
  const seepSeeds = Array.from({ length: 46 }, () => [R(), R()]);
  const seepPath = (s, off) => { // bezier kuadrat hulu-bawah → kaki hilir
    const p0 = [-3.7, -H + 0.35], p1 = [0, -H + 0.9], p2 = [4.3, -H + 0.12];
    const u = 1 - s;
    return [u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1] + off * Math.sin(Math.PI * s)];
  };

  // ---------------- Peta satelit (fakta) ----------------
  const sat = new THREE.Group(); sat.position.x = SX; scene.add(sat);
  const land = mesh(new THREE.BoxGeometry(220, 1, 220), PAL.grass); land.position.y = -0.5; sat.add(land);
  for (let i = 0; i < 40; i++) { const p = mesh(new THREE.CylinderGeometry(3 + R() * 7, 3 + R() * 7, 0.1, 7), i % 2 ? PAL.grassDark : PAL.leaf3); p.position.set((R() - 0.5) * 150, 0.02, (R() - 0.5) * 150); sat.add(p); }
  const lake = mesh(new THREE.CircleGeometry(16, 14), new THREE.MeshStandardMaterial({ color: PAL.waterDeep, flatShading: true })); lake.rotation.x = -Math.PI / 2; lake.scale.set(1.35, 1, 1); lake.position.set(0, 0.08, -8); sat.add(lake);
  const damCurve = new THREE.CatmullRomCurve3([[-17, 0.4, -3], [-9, 0.4, 5], [0, 0.4, 7.5], [9, 0.4, 5], [17, 0.4, -3]].map((p) => new THREE.Vector3(...p)));
  const satDam = mesh(new THREE.TubeGeometry(damCurve, 60, 0.75, 6), PAL.stick); sat.add(satDam);
  const stream = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, 8], [3, 0, 18], [-2, 0, 30], [4, 0, 50]].map((p) => new THREE.Vector3(...p))), 40, 0.5, 5), PAL.water); sat.add(stream);
  for (let i = 0; i < 160; i++) { const tr = mesh(new THREE.IcosahedronGeometry(1, 0), [PAL.leaf, PAL.leaf3, PAL.grassDark][i % 3]); const a = R() * Math.PI * 2, d = 26 + R() * 50; tr.position.set(Math.cos(a) * d, 0.6, Math.sin(a) * d * 0.9); tr.scale.setScalar(0.9 + R()); sat.add(tr); }
  const ruler = mesh(new THREE.BoxGeometry(34, 0.2, 0.35), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), { shadow: false }); ruler.position.set(0, 1.2, 12); sat.add(ruler);
  for (const s of [-1, 1]) { const tick = mesh(new THREE.BoxGeometry(0.35, 0.2, 2.2), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), { shadow: false }); tick.position.set(s * 17, 1.2, 12); sat.add(tick); }

  // ---------------- Kamera ----------------
  const s = T.s;
  const BERO_CLOSE = { pos: [-3.5, 1.15, 6.4], look: [-5.0, 0.85, 2.1] };
  const camKeys = [
    { t: 0, pos: [-3.0, 1.0, 7.4], look: [-4.9, 0.8, 2.1] },
    { t: s('hook') + 1.6, pos: [0.5, 2.5, 11], look: [-2.5, -1.0, 1.5], blend: 1.4 },
    { t: s('intro'), cut: true, ...BERO_CLOSE },
    { t: s('tumpuk'), cut: true, pos: [2.5, 2.8, 12.5], look: [0, -2.4, 0] },
    { t: s('celah'), pos: [2.8, -1.2, 8.4], look: [0, -2.9, 0], blend: 0.9 },
    { t: s('lumpur'), cut: true, pos: [-1.8, 1.2, -9.5], look: [0, -2.6, 0] },
    { t: s('naik'), pos: [-2.5, 3, -13], look: [0, -2.2, -1], blend: 1.4 },
    { t: s('tekanan'), cut: true, pos: [-3.4, 3.6, -3.4], look: [0, -2.6, -1.4] },
    { t: s('jebol'), cut: true, pos: [2.2, 0.6, 12.5], look: [0, -2.5, 0] },
    { t: s('urugan'), cut: true, pos: [2.5, 2.8, 12], look: [0, -2.2, 0] },
    { t: s('trapesium'), pos: [3.1, 0.7, 7.8], look: [0.6, -2.4, 0], blend: 1.0 },
    { t: s('tubuh'), cut: true, pos: [2.0, 2.6, 12.5], look: [0, -1.8, 0] },
    { t: s('tebal'), cut: true, pos: [CX - 1.6, -0.9, 16], look: [CX - 1.6, -2.3, 0] },
    { t: s('hujan'), cut: true, pos: [2.5, 3.5, 15], look: [0, -1.8, 0] },
    { t: s('meluap'), pos: [2.6, 0.4, 10.5], look: [0, -1.6, 0.5], blend: 1.2 },
    { t: s('gintung1'), cut: true, pos: [3, 6, 19], look: [0, -2, 0] },
    { t: s('gintung3') + 1.0, pos: [4, 8, 24], look: [0, -2.2, 0], blend: 3.5 },
    { t: s('jalur'), cut: true, pos: [3, 2.8, 12], look: [1.5, -2, 0] },
    { t: s('pelimpah'), pos: [3.0, 0.4, 8.5], look: [2.0, -1.9, 1.2], blend: 1.1 },
    { t: s('rembes2'), cut: true, pos: [CX + 1.5, -0.6, 21], look: [CX + 0.3, -2.4, 0] },
    { t: s('piping'), pos: [CX + 3.2, -1.6, 14], look: [CX + 2.4, -3.2, 0], blend: 0.9 },
    { t: s('inti'), cut: true, pos: [CX + 0.5, -0.8, 17], look: [CX + 0.3, -2.4, 0] },
    { t: s('deras'), cut: true, pos: [9.5, 3.6, 14], look: [0.5, -1.8, 0] },
    { t: s('berdiri'), pos: [-6, 3.4, 14], look: [0, -1.6, 0], blend: 2.2 },
    { t: s('fakta1'), cut: true, pos: [SX, 150, 0.01], look: [SX, 0, 0] },
    { t: s('fakta2'), pos: [SX, 82, 0.01], look: [SX, 0, 0], blend: 2.2 },
    { t: s('outro'), cut: true, ...BERO_CLOSE },
  ];

  // ---------------- Update per frame ----------------
  return {
    update(t) {
      const P = (a, b, pad) => T.p(t, a, b, pad);
      const st = { labels: [], subTop: 0.62 };
      cameraAt(camKeys, t, camera);
      const phase =
        t < s('lumpur') ? 'sticks' :
        t < s('urugan') ? 'mud' :
        t < s('gintung1') ? 'earth' :
        t < s('jalur') ? 'gintung' :
        t < s('rembes2') ? 'spill' :
        t < s('deras') ? 'cut' :
        t < s('fakta1') ? 'final' :
        t < s('outro') ? 'sat' : 'outro';

      // --- langit, hujan, kabut ---
      let storm = 0, rainAmt = 0;
      if (t >= s('hujan') && t < s('gintung1')) { storm = smooth(P('hujan') * 2) * 0.85; rainAmt = smooth(P('hujan') * 2); }
      if (phase === 'gintung') { storm = 0.55; }
      if (phase === 'spill') storm = 0.55 * (1 - smooth(P('jalur') * 2));
      if (phase === 'final') { storm = 0.75 * (1 - smooth(P('berdiri') * 1.5)); rainAmt = 1 - smooth(P('berdiri') * 1.5); }
      if (t >= s('hujan') && t < s('runtuh')) rainAmt = Math.max(rainAmt, 0.9);
      if (phase === 'spill') rainAmt = 0.35 * (1 - smooth(P('beton')));
      setSky(storm);
      rain.update(t, rainAmt);
      scene.fog.near = phase === 'sat' ? 200 : 40; scene.fog.far = phase === 'sat' ? 400 : 140;

      // --- muka air ---
      let up = -3.0, down = -3.4, foamSpeed = 2.4;
      const jb = t - s('jebol');
      if (phase === 'mud') {
        up = lerp(-3.0, -1.72, smooth(P('naik', 'bawah')));
        if (jb > 0) { up = lerp(-1.72, -3.35, smooth(jb / 1.4)); down = -3.4 + 1.1 * Math.sin(Math.PI * clamp(jb / 2.6)) * (1 - clamp(jb / 4)); foamSpeed = 7; }
        else down = lerp(-3.4, -3.75, smooth(P('naik', 'bawah')));
      }
      let notch = 0;
      if (phase === 'earth') {
        up = -3.2;
        if (t >= s('tebal')) up = lerp(-3.2, -1.5, smooth(P('tebal')));
        if (t >= s('hujan')) up = lerp(-1.5, -0.6, smooth(P('hujan')));
        if (t >= s('meluap')) up = lerp(-0.6, CREST + 0.16, smooth(P('meluap') * 1.5));
        notch = smooth(P('runtuh', 'overtop') * 1.6);
        if (t >= s('runtuh')) { up = lerp(CREST + 0.16, -2.5, smooth(P('runtuh', 'overtop'))); }
        down = t >= s('meluap') ? lerp(-3.4, -2.7, smooth(P('meluap', 'runtuh'))) : -3.6;
        if (t >= s('runtuh')) { down = -2.7 + 0.5 * Math.sin(Math.PI * clamp(P('runtuh', 'overtop') * 1.4)); foamSpeed = 7; }
      }
      if (phase === 'gintung') { up = -2.5; down = -3.1; notch = 1; foamSpeed = 3.5; }
      if (phase === 'spill' || phase === 'final' || phase === 'outro' || phase === 'sat' || phase === 'cut') {
        up = phase === 'spill' ? lerp(-2.0, SPILL_CREST + 0.15, smooth(P('jalur', 'beton'))) : SPILL_CREST + 0.15;
        if (phase === 'final') up = SPILL_CREST + 0.15 + 0.1 * (1 - smooth(P('berdiri')));
        down = -3.15; foamSpeed = 4;
      }
      V.up.setLevel(up); V.down.setLevel(down);
      V.updateFoam(t, down, foamSpeed, phase === 'spill' || phase === 'final' || phase === 'outro' ? 4.2 : 1.2);

      // --- ranting ---
      const showSticks = t >= s('tumpuk') && t < s('urugan');
      const pt = clamp((t - s('tumpuk')) / (s('celah') - s('tumpuk') + 0.6));
      for (const k of sticks) {
        const { m, base } = k;
        const local = clamp((pt - k.appear * 0.88) / 0.1);
        m.visible = showSticks && local > 0;
        if (!m.visible) continue;
        let x = base.x, y = base.y + (1 - easeOut(local)) * 3.2, z = base.z, rz = base.rz, ry = base.ry;
        if (jb > 0 && Math.abs(base.x) < 2.7) {
          const u = jb - (base.y + H) * 0.09 - (k.stake ? 0.1 : 0);
          if (u > 0) {
            z += u * k.drift + u * u * 1.5; y = Math.max(down - 0.05, y + u * 2.2 - 4.9 * u * u * 0.6) + Math.sin(u * 4 + base.x) * 0.05;
            x += Math.sin(u * 2 + base.y) * 0.4; rz += u * k.spin; ry += u * k.spin * 0.5;
          }
        }
        m.position.set(x, y, z); m.rotation.set(0, ry, rz);
      }
      // lumpur
      mudParts.forEach((m, i) => {
        const p = smooth((P('lumpur') - i * 0.15) / 0.55);
        m.visible = phase === 'mud' && p > 0;
        m.scale.y = Math.max(0.001, p);
        m.position.set(m.position.x, -H, -0.62);
        if (i === 1 && jb > 0) { m.position.z = -0.62 + jb * 7; m.position.y = -H - jb * 1.2; m.visible = jb < 1.2; }
      });
      // rembes
      const leak = (phase === 'sticks' && t >= s('celah')) ? smooth((t - s('celah')) / 0.4) : (phase === 'mud' ? 1 - smooth(P('lumpur') * 1.4) : 0);
      for (let e = 0; e < EMIT; e++) for (let k = 0; k < PER; k++) {
        const i = e * PER + k;
        const [ex, ey, ph] = emitters[e];
        if (e / EMIT >= leak) { drops.set(i, 0, -999, 0, 0); continue; }
        const tau = ((t * 1.5 + k / PER + ph) % 1) * 0.75;
        const y = ey + 0.4 * tau - 4.9 * tau * tau;
        if (y < -H + 0.6) { drops.set(i, 0, -999, 0, 0); continue; }
        drops.set(i, ex, y, 0.45 + tau * 2.4, 1, 1.4, 1);
      }
      // panah tekanan
      const showP1 = t >= s('tekanan') && t < s('jebol');
      const showP2 = t >= s('tebal') && t < s('hujan');
      arrows.forEach((a, i) => {
        a.visible = showP1 || showP2;
        if (!a.visible) return;
        const lv = up;
        const frac = (i + 0.6) / 4;
        const y = lerp(lv - 0.2, -H + 0.35, frac);
        const depth = lv - y;
        const grow = showP1 ? smooth(P('tekanan') * 2.2 - i * 0.25) : smooth(P('tebal') * 2 - i * 0.25);
        const L = (0.3 + depth * 1.05) * grow + 0.01;
        a.setLength(L);
        if (showP1) {
          a.rotation.set(0, -Math.PI / 2, 0);
          a.position.set(-1.5 + i * 1.0, y, -0.9 - L);
        } else {
          // di diagram potongan: panah tegak lurus lereng hulu
          const ang = Math.atan2(-(BASE_HALF - TOP_HALF), CREST + H);
          const y2 = lerp(LV - 0.2, -H + 0.35, frac), L2 = (0.3 + (LV - y2) * 0.8) * grow + 0.01;
          a.setLength(L2);
          a.rotation.set(0, 0, ang);
          const xf = slopeZ(y2, -1);
          a.position.set(CX + xf - Math.cos(ang) * (L2 + 0.08), y2 - Math.sin(ang) * (L2 + 0.08), 1.15);
          const pulse = 1 + 0.04 * Math.sin(t * 6 + i);
          a.scale.setScalar(pulse);
        }
      });
      if (showP2) st.subTop = 0.3;
      if (showP1) st.labels.push({ text: 'Tekanan air', pos: [-1.5 + 3, -H + 0.6, -1.6], tone: 'yellow', alpha: smooth((t - s('tekanan') - 0.6) / 0.3), up: 30 });

      // --- bendungan tanah ---
      const showEarth = t >= s('urugan') && phase !== 'mud' && phase !== 'sticks';
      const b = 6 * smooth(P('urugan', 'trapesium') * 1.15) + 4 * smooth(P('tubuh') * 1.3);
      const rebuilt = phase !== 'earth' && phase !== 'gintung';
      slices.forEach(({ m, cx }, i) => {
        let h = phase === 'earth' && t < s('tebal') ? easeOut(clamp(b - i)) : 1;
        if (notch > 0 && !rebuilt) { const f = clamp(1 - Math.abs(cx - 0.2) / 2.8); h *= 1 - 0.72 * f * notch; }
        if (rebuilt && phase === 'spill') { // bangun ulang + turunkan slice pelimpah
          const f = clamp(1 - Math.abs(cx - 0.2) / 2.8);
          h = 1 - 0.72 * f * (1 - smooth(P('jalur') * 3));
        }
        const isSpill = cx > SP0 && cx < SP1;
        const spillP = phase === 'spill' ? smooth(P('jalur') * 2.2 - 0.7) : (rebuilt ? 1 : 0);
        if (isSpill && rebuilt) h *= 1 - spillP;
        m.visible = showEarth && h > 0.01;
        m.scale.y = Math.max(0.001, h);
      });
      // garis ukur
      const dimA = t >= s('trapesium') && t < s('tubuh') ? smooth((t - s('trapesium') - 0.3) / 0.3) : 0;
      dimBottom.visible = dimTop.visible = dimA > 0;
      dimBottom.position.set(1.04, -H + 0.1, 0); dimTop.position.set(1.04, CREST - 0.12, 0);
      dimBottom.scale.z = dimTop.scale.z = Math.max(0.01, dimA);
      if (dimA > 0) {
        st.labels.push({ text: 'Lebar', pos: [1.05, -H + 0.12, 2.6], alpha: dimA, up: 26, tone: 'yellow' });
        st.labels.push({ text: 'Sempit', pos: [1.05, CREST - 0.1, 0], alpha: smooth((t - s('trapesium') - 0.9) / 0.3), up: 34, tone: 'yellow' });
      }
      if (t >= s('tubuh') && t < s('tebal')) st.labels.push({ text: 'Tubuh bendungan', pos: [-1.2, CREST, 0], alpha: smooth((t - s('tubuh') - 0.5) / 0.3), up: 60 });

      // air melimpas
      let ov = 0;
      if (phase === 'earth' && t >= s('meluap')) ov = smooth((t - s('meluap') - 0.6) / 0.8) * (1 - smooth(P('runtuh') * 1.6 - 0.3));
      overflowMat.opacity = 0.8 * ov; overflow.visible = crestWater.visible = ov > 0.01;
      const spillOn = (phase === 'spill' && t >= s('beton')) || phase === 'final' || phase === 'outro' || phase === 'sat' || phase === 'cut';
      for (let i = 0; i < 70; i++) {
        const [a, c] = streakSeeds[i];
        const sp = (t * 0.9 + a) % 1;
        const onMain = ov > 0.2 && i < 46, onSpill = spillOn && i >= 30;
        if (!onMain && !onSpill) { streaks.set(i, 0, -999, 0, 0); continue; }
        const zt = onMain && i < 30 ? TOP_HALF : spillTopHalf, yt = onMain && i < 30 ? CREST : SPILL_CREST;
        const x = onMain && i < 30 ? (c - 0.5) * (W - 0.6) : lerp(SP0 + 0.2, SP1 - 0.2, c);
        const z = lerp(zt, BASE_HALF, sp), y = lerp(yt, -H, sp) + 0.12;
        streaks.set(i, x, y, z, 1, 1, 1, Math.atan2(yt + H, BASE_HALF - zt), 0, 0);
      }
      if (t >= s('overtop') && t < s('gintung1')) st.labels.push({ text: 'Overtopping', pos: [0.2, -1.6, 2.2], tone: 'red', alpha: smooth((t - s('overtop')) / 0.3), up: 70 });

      // pelimpah
      const spP = phase === 'spill' ? smooth(P('jalur') * 2.2 - 0.7) : (['final', 'outro', 'sat', 'cut'].includes(phase) ? 1 : 0);
      spill.visible = walls[0].visible = walls[1].visible = spP > 0.01;
      spill.scale.y = Math.max(0.001, spP); walls.forEach((w) => (w.scale.y = Math.max(0.001, spP)));
      const conc = phase === 'spill' ? smooth((t - s('beton')) / 0.8) : (spP > 0 ? 1 : 0);
      spillMat.color.copy(earthCol).lerp(concCol, conc);
      spillSheet.visible = spillCrestW.visible = spillOn;
      if (t >= s('pelimpah') && t < s('rembes2')) st.labels.push({ text: 'Pelimpah', pos: [2, SPILL_CREST, 0.2], alpha: smooth((t - s('pelimpah')) / 0.3), up: 70 });
      if (t >= s('beton') && t < s('pelimpah')) st.labels.push({ text: 'Beton', pos: [2, -2.4, 2.6], alpha: smooth((t - s('beton') - 0.4) / 0.3), up: 40, tone: 'yellow' });

      // --- diagram potongan ---
      const inCut = phase === 'cut';
      const coreP = t >= s('inti') ? smooth((t - s('inti') - 0.2) / 1.0) : 0;
      const filtP = t >= s('filter') ? smooth((t - s('filter')) / 0.8) : 0;
      core.visible = coreP > 0.01; core.scale.y = Math.max(0.001, coreP);
      filter.visible = filtP > 0.01; filter.scale.y = Math.max(0.001, filtP);
      const tunLen = t >= s('butiran') && t < s('inti') ? 6.0 * smooth(P('butiran', 'lorong') * 1.1) : 0;
      tunnel.visible = tunLen > 0.05; tunnel.scale.x = Math.max(0.01, tunLen); tunnel.position.x = 4.3 - tunLen / 2;
      seepSeeds.forEach(([a, c], i) => {
        if (!inCut) { seep.set(i, 0, -999, 0, 0); return; }
        const sp = (t * (tunLen > 1 ? 0.32 : 0.16) + a) % 1;
        let [x, y] = seepPath(sp, (c - 0.5) * 1.6);
        if (tunLen > 0.5 && c > 0.4) { y = lerp(y, -H + 0.3, smooth(clamp((x - (4.3 - tunLen)) / 0.6))); }
        if (coreP > 0.6) {
          const coreFace = -1.2 + (y + H + 0.6) * (0.8 / (CREST + H + 0.4));
          if (x > coreFace - 0.1) { seep.set(i, 0, -999, 0, 0); return; }
        }
        seep.set(i, x, y, 1.08, 1);
      });
      for (let i = 0; i < 24; i++) {
        if (!inCut || tunLen < 0.3) { grains.set(i, 0, -999, 0, 0); continue; }
        const u = (t * 0.5 + i / 24) % 1;
        const x = lerp(4.3 - tunLen, 4.3, u) + (u > 0.9 ? (u - 0.9) * 6 : 0);
        const y = -H + 0.25 + Math.sin(i * 7.1) * 0.08 - (u > 0.9 ? (u - 0.9) * 3 : 0);
        grains.set(i, x, y, 1.1, 1);
      }
      if (inCut) {
        st.subTop = 0.3;
        if (t >= s('piping') && t < s('inti')) st.labels.push({ text: 'Piping', pos: [CX + 4.3 - tunLen * 0.6, -H + 0.5, 1.05], tone: 'red', alpha: smooth((t - s('piping')) / 0.3), up: 60 });
        if (t >= s('inti')) st.labels.push({ text: 'Inti kedap', pos: [CX - 0.3, -2.2, 1.05], alpha: smooth((t - s('inti') - 0.8) / 0.3), up: 120 });
        if (t >= s('filter')) st.labels.push({ text: 'Filter', pos: [CX + 1.3, -2.6, 1.05], alpha: smooth((t - s('filter') - 0.4) / 0.3), up: 70, tone: 'yellow' });
      }

      // --- peta satelit ---
      if (phase === 'sat') {
        st.card = { title: 'Wood Buffalo National Park', body: 'Kanada · ditemukan lewat citra satelit (2007)', top: 0.1, alpha: smooth((t - s('fakta1') - 0.6) / 0.4) };
        if (t >= s('fakta2')) st.labels.push({ text: '± 800 m', pos: [SX, 1.2, 12], alpha: smooth((t - s('fakta2')) / 0.3), up: 30, tone: 'yellow' });
        st.subTop = 0.72;
      }

      // --- Situ Gintung (tenang, serius) ---
      if (phase === 'gintung') {
        st.dim = 0.38 * smooth((t - s('gintung1')) / 0.8);
        st.card = { title: 'Situ Gintung · 27 Maret 2009', body: 'Tangerang Selatan · tanggul tanah dari tahun 1932', top: 0.14, alpha: smooth((t - s('gintung1') - 0.3) / 0.6) };
      }

      // --- Pak Bero ---
      const camYaw = Math.atan2(camera.position.x - BERO_POS.x, camera.position.z - BERO_POS.z);
      let anim = 'idle', yaw = camYaw, hold = false;
      const L = (a, b) => T.in(t, a, b);
      if (L('hook')) { anim = 'carry'; hold = true; yaw = lerp(Math.PI / 2, camYaw, smooth(P('hook') * 2)); }
      else if (L('intro')) anim = 'wave';
      else if (L('tumpuk')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('celah')) anim = 'think';
      else if (L('rembes')) anim = 'panic';
      else if (L('lumpur')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('naik')) anim = 'point';
      else if (L('tekanan', 'bawah')) anim = 'think';
      else if (L('jebol')) anim = 'panic';
      else if (L('urugan', 'trapesium')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('tubuh')) anim = 'point';
      else if (L('hujan')) anim = 'think';
      else if (L('meluap', 'runtuh')) anim = 'panic';
      else if (L('overtop')) anim = 'sad';
      else if (phase === 'gintung') { anim = 'sad'; yaw = Math.PI / 2; }
      else if (L('jalur', 'beton')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('pelimpah')) anim = 'point';
      else if (phase === 'final') anim = 'happy';
      else if (phase === 'outro') anim = 'wave';
      held.visible = hold;
      bero.pose(t, anim, { yaw });

      // --- guncangan kamera (posisi kamera dihitung di awal update) ---
      let shake = 0;
      if (jb > 0 && jb < 1.6) shake = 0.12 * (1 - jb / 1.6);
      if (t >= s('runtuh') && t < s('overtop')) shake = 0.08 * (1 - P('runtuh'));
      if (shake) { camera.position.x += Math.sin(t * 53) * shake; camera.position.y += Math.cos(t * 47) * shake; }

      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_POS.x, 1.75, BERO_POS.z], alpha: smooth((t - s('intro') - 0.3) / 0.3), up: 34, tone: 'yellow' });
      if (L('celah', 'rembes')) st.labels.push({ text: 'Celah', pos: [0.6, -2.6, 0.5], tone: 'red', alpha: smooth((t - s('celah') - 0.5) / 0.3), up: 60 });
      return st;
    },
  };
}
