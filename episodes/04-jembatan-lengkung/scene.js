// Ep. 04 Jembatan lengkung: adegan & animasi, diikat ke id baris di script.json.
// Semua posisi dihitung dari waktu t (deterministik).
// Sungai mengalir ke +Z, jembatan melintang di sumbu X (z=0), kamera dari hilir.
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeIn, easeOutBack, cameraAt, makeArrow, makeInstances, buildValley } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';
import { createCar } from '/engine/car.js';

const W = 9, H = 4, HW = W / 2;
const WATER = -3.2;
const PX = 300, KX = 600;            // lokasi Jembatan Fabricius & Kalikuto
const STEEL = '#e0533d', STONE = ['#a7a29a', '#b9b3a8', '#99938a'];
const ROAD = '#55595e';
const BERO_HOME = new THREE.Vector3(-5.2, 0, 3.4);

// ---------- lengkung parabola: titik-titik dengan jarak sama di sepanjang busur ----------
// kaki di (±a, yF), puncak di (0, yF + rise). Kembalikan N titik {x,y,ang} + panjang busur.
function arcLen(a, rise) {
  let L = 0, px = -a, py = 0;
  for (let i = 1; i <= 64; i++) { const x = -a + (2 * a * i) / 64, y = rise * (1 - (x / a) ** 2); L += Math.hypot(x - px, y - py); px = x; py = y; }
  return L;
}
function arcPoints(a, yF, rise, N) {
  const M = 96, xs = [], ys = [], cum = [0];
  for (let i = 0; i <= M; i++) { const x = -a + (2 * a * i) / M; xs.push(x); ys.push(yF + rise * (1 - (x / a) ** 2)); }
  for (let i = 1; i <= M; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const L = cum[M], out = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = ((k + 0.5) / N) * L;
    while (j < M - 1 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / (cum[j + 1] - cum[j]);
    const x = lerp(xs[j], xs[j + 1], u), y = lerp(ys[j], ys[j + 1], u);
    out.push({ x, y, ang: Math.atan2(-2 * rise * x / (a * a), 1) });
  }
  return { pts: out, L };
}
// tinggi lengkung supaya panjang busur tetap L0 saat bentang 2a berubah
function riseFor(a, L0) {
  if (arcLen(a, 0) >= L0) return 0;
  let lo = 0, hi = 10;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (arcLen(a, m) < L0) lo = m; else hi = m; }
  return lo;
}

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(404);
  const dur = (id) => e(id) - s(id);
  const at = (id, f) => s(id) + dur(id) * f; // waktu pada pecahan f dari baris id

  // ---------------- dunia ----------------
  const V = buildValley(kit, { W, H, seed: 17 });
  V.up.setLevel(WATER); V.down.setLevel(WATER);
  const banks = [V.root.children[0], V.root.children[1]];
  const VR = buildValley(kit, { W: 13, H, seed: 23 }); VR.root.position.x = PX; VR.up.setLevel(WATER); VR.down.setLevel(WATER);
  const VK = buildValley(kit, { W: 16, H: 6, seed: 29 }); VK.root.position.x = KX; VK.up.setLevel(-5.2); VK.down.setLevel(-5.2);

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);

  // ---------------- Tahap 1: lempeng batu (dua bagian, berporos di tepi) ----------------
  const stoneMat = mat('#a9a49b');
  const slabPiv = [-1, 1].map((sd) => {
    const p = new THREE.Group(); p.position.set(sd * HW, 0, 0); scene.add(p);
    const half = mesh(new THREE.BoxGeometry(HW + 0.8, 0.35, 1.4), stoneMat);
    half.position.set(-sd * (HW + 0.8) / 2 + sd * 0.8, 0.175, 0); p.add(half);
    return p;
  });
  const crackMat = new THREE.MeshStandardMaterial({ color: PAL.red, emissive: PAL.red, emissiveIntensity: 0.8, flatShading: true });
  const slabCrack = mesh(new THREE.BoxGeometry(0.06, 1, 1.44), crackMat, { shadow: false });
  slabCrack.geometry.translate(0, 0.5, 0); scene.add(slabCrack);

  // ---------------- Tahap 2–3: lengkung batu baji + pangkal ----------------
  const NB = 13;
  const blockGeo = new THREE.BoxGeometry(1, 0.62, 1.6);
  const blocks = Array.from({ length: NB }, (_, i) => { const m = mesh(blockGeo, STONE[i % 3]); scene.add(m); return m; });
  // urutan pasang: dari kedua kaki naik ke puncak (batu kunci terakhir)
  const placeOrder = blocks.map((_, i) => Math.min(i, NB - 1 - i) * 2 + (i > (NB - 1) / 2 ? 1 : 0));
  const blockSeeds = blocks.map(() => [R(), R(), R()]);
  const A1 = { a: HW, yF: -1.2, rise: 3.0 };        // lengkung pertama (kaki di muka tebing)
  const A2 = { a: HW - 0.7, yF: -0.9, rise: 2.4 };  // lengkung dengan pangkal
  const RISE_FLAT = 1.3;
  const L_FLAT = arcLen(A1.a, RISE_FLAT);

  // pangkal batu: titik asal di sudut atas-dalam, tumbuh ke luar & ke bawah
  const abutMat = mat('#8f8a82');
  const abuts = [-1, 1].map((sd) => {
    const g = new THREE.BoxGeometry(1, 1, 1); g.translate(sd * 0.5, -0.5, 0);
    const m = mesh(g, abutMat); m.position.set(sd * A2.a, 0.25, 0); scene.add(m); return m;
  });
  // tanah lunak di tepi (lapisan lumpur di atas rumput)
  const softMat = new THREE.MeshStandardMaterial({ color: '#7a5a3c', flatShading: true, transparent: true, opacity: 0 });
  const softs = [-1, 1].map((sd) => { const m = mesh(new THREE.BoxGeometry(7, 0.06, 7), softMat, { shadow: false }); m.position.set(sd * (HW + 3.5), 0.03, 0); scene.add(m); return m; });

  // ---------------- Tahap 4–5: lengkung baja terikat ----------------
  const BEAR = 4.9, DECK_END = 5.45, APP = 5.8, DECK_Y = 0.55, DECK_T = 0.3, TOP = DECK_Y + DECK_T;
  const RIB_RISE = 3.4, RIB_Z = 0.95;
  const concMat = mat(PAL.concrete);
  const seats = [-1, 1].map((sd) => {
    const m = mesh(new THREE.BoxGeometry(1.7, 3.0, 3.0), concMat); m.position.set(sd * 4.75, 0.4 - 1.5, 0); scene.add(m); return m;
  });
  const approach = [-1, 1].map((sd) => {
    const g = new THREE.Group(); g.position.set(sd * APP, 0, 0); scene.add(g);
    const base = mesh(new THREE.BoxGeometry(40, TOP, 2.6), mat('#a9a69f')); base.position.set(sd * 20, TOP / 2 - 0.02, 0); g.add(base);
    const asp = mesh(new THREE.BoxGeometry(40, 0.04, 2.2), ROAD); asp.position.set(sd * 20, TOP, 0); g.add(asp);
    for (let k = 0; k < 9; k++) { const d = mesh(new THREE.BoxGeometry(0.7, 0.012, 0.08), '#f4f1e6', { shadow: false }); d.position.set(sd * (0.9 + k * 1.6), TOP + 0.024, 0); g.add(d); }
    return g;
  });
  // grup baja berporos di perletakan kiri → scale.x = pemuaian (ujung kanan bergerak)
  const steelPiv = new THREE.Group(); steelPiv.position.set(-BEAR, 0, 0); scene.add(steelPiv);
  const steel = new THREE.Group(); steel.position.x = BEAR; steelPiv.add(steel);
  const steelMat = mat(STEEL, { emissive: '#000000' });
  const deckMat = mat('#9aa0a6', { emissive: PAL.arrow, emissiveIntensity: 0 });
  const deck = mesh(new THREE.BoxGeometry(2 * DECK_END, DECK_T, 2.2), deckMat); deck.position.y = DECK_Y + DECK_T / 2; steel.add(deck);
  const deckAsp = mesh(new THREE.BoxGeometry(2 * DECK_END, 0.04, 2.0), ROAD); deckAsp.position.y = TOP; steel.add(deckAsp);
  for (let k = 0; k < 6; k++) { const d = mesh(new THREE.BoxGeometry(0.7, 0.012, 0.08), '#f4f1e6', { shadow: false }); d.position.set(-4.3 + k * 1.72, TOP + 0.024, 0); steel.add(d); }
  const beam = (a, b, r, m, parent) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const c = mesh(new THREE.BoxGeometry(r, va.distanceTo(vb) + r * 0.6, r), m);
    c.position.copy(va).add(vb).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    parent.add(c); return c;
  };
  const ribY = (x) => TOP + RIB_RISE * (1 - (x / BEAR) ** 2);
  const NR = 14, ribs = [];
  for (const z of [-RIB_Z, RIB_Z]) for (let k = 0; k < NR; k++) {
    const x0 = -BEAR + (2 * BEAR * k) / NR, x1 = -BEAR + (2 * BEAR * (k + 1)) / NR;
    const b = beam([x0, ribY(x0), z], [x1, ribY(x1), z], 0.28, steelMat, steel); b.order = Math.min(k, NR - 1 - k); ribs.push(b);
  }
  const braces = [-2.4, 0, 2.4].map((x) => beam([x, ribY(x), -RIB_Z], [x, ribY(x), RIB_Z], 0.16, steelMat, steel));
  const hangers = [];
  for (let x = -3.9; x <= 3.91; x += 0.975) for (const z of [-RIB_Z, RIB_Z]) {
    const h = mesh(new THREE.BoxGeometry(0.07, 1, 0.07), steelMat); h.geometry.translate(0, -0.5, 0);
    h.position.set(x, ribY(x), z); h.full = ribY(x) - TOP; steel.add(h); hangers.push(h);
  }
  // siar muai (jari-jari baja) di ujung kanan
  const fingerMat = mat('#c9ced3', { metalness: 0.3, roughness: 0.4 });
  const fingersDeck = [], fingersApp = [];
  for (let k = 0; k < 7; k++) {
    const z = -0.9 + k * 0.3;
    const f1 = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.12), fingerMat, { shadow: false }); f1.position.set(DECK_END + 0.13, TOP + 0.01, z); steel.add(f1); fingersDeck.push(f1);
    const f2 = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.12), fingerMat, { shadow: false }); f2.position.set(-0.13, TOP + 0.01, z + 0.15); approach[1].add(f2); fingersApp.push(f2);
  }
  // perletakan: kiri tetap (blok), kanan blok → rol
  const bearMat = mat('#4a5560');
  const bearings = [-1, 1].map((sd) => { const g = new THREE.Group(); g.position.set(sd * BEAR, 0.4, 0); scene.add(g); return g; });
  bearings.forEach((g) => { for (const z of [-RIB_Z, RIB_Z]) { const b = mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), bearMat); b.position.set(0, 0.075, z); b.isBlock = true; g.add(b); } });
  const rollers = [];
  for (const z of [-RIB_Z, RIB_Z]) for (const dx of [-0.14, 0.14]) {
    const r = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 10), mat('#cfd5da', { metalness: 0.3 })); r.rotation.x = Math.PI / 2; r.position.set(dx, 0.075, z); bearings[1].add(r); rollers.push(r);
  }
  const locks = [-1, 1].map((sd) => { const m = mesh(new THREE.BoxGeometry(0.22, 0.5, 2.4), mat(PAL.red, { emissive: PAL.red, emissiveIntensity: 0.4 })); m.position.set(sd * (BEAR + 0.4), 0.65, 0); scene.add(m); return m; });
  const seatCrack = new THREE.Group(); seatCrack.position.set(3.9, 0, 1.5); scene.add(seatCrack);
  [[0.55, 0.38], [0.75, -0.2], [0.5, -0.7], [0.9, -1.3], [0.7, -1.9]].reduce((p, q) => {
    const a = new THREE.Vector3(p[0], p[1], 0.01), b = new THREE.Vector3(q[0], q[1], 0.01);
    const c = mesh(new THREE.BoxGeometry(0.07, a.distanceTo(b) + 0.03, 0.04), crackMat, { shadow: false });
    c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    seatCrack.add(c); return q;
  });
  // matahari terik (tahap pemuaian)
  const sunBall = mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: '#fff3a8', fog: false }), { shadow: false, receive: false });
  const sunGlow = mesh(new THREE.IcosahedronGeometry(3.6, 1), new THREE.MeshBasicMaterial({ color: '#ffd66b', transparent: true, opacity: 0.35, fog: false }), { shadow: false, receive: false });
  sunBall.add(sunGlow); sunBall.position.set(9, 15, -32); scene.add(sunBall);

  // mobil
  const carColors = ['#3d8bd9', '#f2b134', '#58b368'];
  const cars = carColors.map((c) => { const k = createCar(c); scene.add(k.root); return k; });

  // ---------------- Jembatan Fabricius (Roma) ----------------
  const roma = new THREE.Group(); roma.position.x = PX; scene.add(roma);
  {
    const shape = new THREE.Shape();
    shape.moveTo(-7.6, -4.4); shape.lineTo(7.6, -4.4); shape.lineTo(7.6, 0.6); shape.lineTo(-7.6, 0.6); shape.closePath();
    const AC = 3.35, AR = 2.75, AY = -3.0;
    for (const cx of [-AC, AC]) {
      const hole = new THREE.Path();
      hole.moveTo(cx - AR, -4.6); hole.lineTo(cx - AR, AY); hole.absarc(cx, AY, AR, Math.PI, 0, true); hole.lineTo(cx + AR, -4.6); hole.closePath();
      shape.holes.push(hole);
    }
    const pierHole = new THREE.Path(); pierHole.absarc(0, -1.3, 0.5, 0, Math.PI * 2, false); shape.holes.push(pierHole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 2.8, bevelEnabled: false }); g.translate(0, 0, -1.4);
    roma.add(mesh(g, '#c47b50'));
    for (const cx of [-AC, AC]) {
      const ring = new THREE.Shape();
      ring.moveTo(cx - AR - 0.4, AY); ring.absarc(cx, AY, AR + 0.4, Math.PI, 0, true); ring.lineTo(cx + AR, AY); ring.absarc(cx, AY, AR, 0, Math.PI, false); ring.closePath();
      const rg = new THREE.ExtrudeGeometry(ring, { depth: 2.9, bevelEnabled: false }); rg.translate(0, 0, -1.45);
      roma.add(mesh(rg, '#e6d9bd'));
    }
    for (const z of [-1.3, 1.3]) { const p = mesh(new THREE.BoxGeometry(15.2, 0.45, 0.2), '#d9c7a3'); p.position.set(0, 0.82, z); roma.add(p); }
    // bangunan kota
    const RB = rng(77);
    for (let i = 0; i < 22; i++) {
      const sd = i % 2 ? 1 : -1, x = sd * (9 + RB() * 14), z = -6 - RB() * 26;
      const w = 2 + RB() * 2.5, h = 2 + RB() * 4, d = 2 + RB() * 2;
      const b = mesh(new THREE.BoxGeometry(w, h, d), ['#e8c07a', '#e3a76f', '#f0d9a8', '#d98c5f'][i % 4]); b.position.set(x, h / 2, z); roma.add(b);
      const r = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 1, 4), '#b5533c'); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, d / w); r.position.set(x, h + 0.5, z); roma.add(r);
    }
    const dome = mesh(new THREE.SphereGeometry(3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#d8d2c4'); dome.position.set(-14, 6, -30); roma.add(dome);
    const drum = mesh(new THREE.CylinderGeometry(3, 3, 6, 12), '#efe4cc'); drum.position.set(-14, 3, -30); roma.add(drum);
  }
  const walkers = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group();
    const b = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 7), ['#e05d5d', '#4f7cd6', '#f2b134', '#58b368', '#9b6bd6', '#ef8a3d', '#2fa39a'][i]); b.position.y = 0.3; g.add(b);
    const hd = mesh(new THREE.IcosahedronGeometry(0.14, 1), '#e8b98f'); hd.position.y = 0.75; g.add(hd);
    roma.add(g); return g;
  });

  // ---------------- Jembatan Kalikuto (dua setengah lengkung direbahkan) ----------------
  const kal = new THREE.Group(); kal.position.x = KX; scene.add(kal);
  const KA = 7.4, KY = -1.4, KR = 6.6, KZ = 1.1;
  const kHalves = [-1, 1].map((sd) => {
    const piv = new THREE.Group(); piv.position.set(sd * KA, KY, 0); kal.add(piv);
    const ky = (x) => KR * (1 - (x / KA) ** 2);
    const N = 8;
    for (const z of [-KZ, KZ]) for (let k = 0; k < N; k++) {
      const x0 = sd * KA * (1 - k / N), x1 = sd * KA * (1 - (k + 1) / N);
      beam([x0 - sd * KA, ky(x0), z], [x1 - sd * KA, ky(x1), z], 0.62, mat(STEEL), piv);
    }
    for (const f of [0.3, 0.6, 0.95]) { const x = sd * KA * (1 - f); beam([x - sd * KA, ky(x), -KZ], [x - sd * KA, ky(x), KZ], 0.22, mat(STEEL), piv); }
    const foot = mesh(new THREE.BoxGeometry(2.0, 2.4, 3.4), concMat); foot.position.set(sd * (KA + 0.6), KY - 1.0, 0); kal.add(foot);
    return piv;
  });
  const KUP = Math.PI / 2 - Math.atan2(KR, KA); // sudut supaya tegak

  // ---------------- panah ----------------
  const yArr = Array.from({ length: 8 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const rArr = Array.from({ length: 4 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  function arr(a, x, y, z, ang, L) { a.visible = L > 0.05; a.setLength(Math.max(0.05, L)); a.rotation.set(0, 0, ang); a.position.set(x, y, z); }
  // panah yang UJUNGNYA di (x,y)
  function arrTo(a, x, y, z, ang, L) { arr(a, x - Math.cos(ang) * L, y - Math.sin(ang) * L, z, ang, L); }

  // ---------------- kamera ----------------
  const WIDE = { pos: [-2.4, 2.8, 18], look: [-1.6, 0.3, 0], fov: 50 };
  const BERO_CLOSE = { pos: [-3.9, 1.5, 8.4], look: [-5.2, 0.9, 3.4], fov: 48 };
  const camKeys = [
    { t: 0, pos: [-3.6, 1.5, 9.8], look: [-4.6, 0.8, 2.6], fov: 50 },
    { t: s('hook') + 2.4, ...WIDE, blend: 2.2 },
    { t: s('intro'), cut: true, ...BERO_CLOSE },
    { t: s('lempeng'), ...WIDE, blend: 1.2 },
    { t: s('lemah'), pos: [0, 0.9, 7.6], look: [0, 0.1, 0], fov: 46, blend: 1.0 },
    { t: s('patah'), pos: [-1.6, 2.0, 13.5], look: [-1.6, -0.2, 0], fov: 50, blend: 1.0 },
    { t: s('lengkung'), pos: [0, 1.0, 17.5], look: [0, -0.3, 0], blend: 1.0 },
    { t: s('dorong'), pos: [0, 0.6, 15.5], look: [0, -0.6, 0], blend: 1.0 },
    { t: s('runtuh'), pos: [0, 0.4, 14.5], look: [0, -1.0, 0], blend: 0.8 },
    { t: s('pangkal'), cut: true, pos: [0, 2.4, 23], look: [0, -0.6, 0] },
    { t: at('pangkal', 0.5), pos: [0, 12, 25], look: [0, -1.4, -1], fov: 60, blend: 1.6 },
    { t: s('baja'), cut: true, pos: [-1.0, 2.8, 17.5], look: [0, 1.4, 0], fov: 50 },
    { t: s('ikat'), pos: [0, 1.8, 15.5], look: [0, 1.0, 0], blend: 1.0 },
    { t: s('muai'), pos: [1.6, 3.2, 16.5], look: [0.6, 2.2, 0], blend: 1.0 },
    { t: s('dikunci'), pos: [3.0, 1.6, 8.6], look: [4.6, 0.2, 0], blend: 1.0 },
    { t: s('geser'), pos: [3.4, 1.2, 6.4], look: [4.9, 0.4, 0], blend: 0.9 },
    { t: at('geser', 0.55), pos: [5.6, 3.0, 3.6], look: [5.6, 0.85, 0], blend: 1.1 },
    { t: s('gludak'), pos: [4.0, 1.5, 5.6], look: [5.7, 0.8, 0], blend: 0.8 },
    { t: s('berdiri'), pos: [-2.2, 3.0, 18], look: [-0.8, 1.4, 0], blend: 1.0 },
    { t: s('roma'), cut: true, pos: [PX + 1.5, 2.6, 22], look: [PX, -0.6, 0] },
    { t: e('roma') - 0.5, pos: [PX - 1.0, 0.4, 15], look: [PX, -1.0, 0], blend: e('roma') - s('roma') - 1.2 },
    { t: s('kalikuto'), cut: true, pos: [KX, 5.5, 40], look: [KX, 4.2, 0] },
    { t: e('kalikuto') - 0.3, pos: [KX + 1.0, 3.0, 33], look: [KX, 2.2, 0], blend: e('kalikuto') - s('kalikuto') - 1 },
    { t: s('outro'), cut: true, pos: [-2.6, 1.8, 11.5], look: [-4.0, 1.5, 2.5], fov: 50 },
  ];

  // ---------------- update ----------------
  return {
    update(t) {
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const site = t < s('roma') || t >= s('outro') ? 'home' : t < s('kalikuto') ? 'roma' : 'kal';
      V.root.visible = site === 'home'; VR.root.visible = roma.visible = site === 'roma'; VK.root.visible = kal.visible = site === 'kal';
      const sx = site === 'roma' ? PX : site === 'kal' ? KX : 0;
      setSky(0);
      sun.position.set(sx - 14, 22, 12); sun.target.position.set(sx, -2, 0);
      V.updateFoam(t, WATER, 1.6, -20); VR.updateFoam(t, WATER, 1.6, -20); VK.updateFoam(t, -5.2, 1.6, -20);
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);
      const home = site === 'home';

      // fase: slab | stone | steel
      const phase = t < s('lengkung') ? 'slab' : t < s('baja') ? 'stone' : 'steel';

      // ===== lempeng =====
      const slabOn = home && phase === 'slab' && t >= s('lempeng');
      let sag = 0, brk = 0;
      if (L('lemah')) sag = 0.012 * smooth((t - s('lemah') - 0.3) / 1.0);
      if (L('patah')) sag = 0.012 + 0.03 * smooth((t - at('patah', 0.3)) / 1.0);
      const tBreak = at('patah', 0.64);
      if (t >= tBreak) brk = t - tBreak;
      const drop = t < s('lemah') ? lerp(6, 0, easeOutBack((t - s('lempeng') - 0.2) / 1.6)) : 0;
      slabPiv.forEach((p, i) => {
        const sd = i ? 1 : -1;
        p.visible = slabOn;
        const fall = brk > 0 ? easeIn(clamp(brk / 0.7)) : 0, sink = brk > 0.6 ? easeIn(clamp((brk - 0.6) / 0.6)) : 0;
        p.rotation.z = sd * (sag + fall * 1.15);
        p.position.set(sd * (HW - sink * 0.6), drop - sink * 2.6, 0);
      });
      const ck = L('patah') ? smooth((t - at('patah', 0.32)) / (dur('patah') * 0.3)) : 0;
      slabCrack.visible = slabOn && ck > 0.02 && brk <= 0;
      slabCrack.scale.set(1, 0.36 * ck, 1); slabCrack.position.set(0, -HW * Math.tan(sag) - 0.005, 0);

      // ===== lengkung batu =====
      blocks.forEach((b) => (b.visible = false));
      let shift = 0;
      if (home && phase === 'stone') {
        let a = A1.a, yF = A1.yF, rise = A1.rise, build = 1, fallT = -1;
        if (t < s('dorong')) build = (t - s('lengkung') - 0.1) / (dur('lengkung') * 0.6);
        else if (t < s('runtuh')) rise = lerp(A1.rise, RISE_FLAT, smooth((t - at('dorong', 0.45)) / (dur('dorong') * 0.45)));
        else if (t < s('pangkal')) {
          shift = 0.55 * easeIn(clamp((t - s('runtuh') - 0.1) / 1.1));
          a = A1.a + shift; rise = riseFor(a, L_FLAT);
          fallT = t - (s('runtuh') + 1.05);
        } else { a = A2.a; yF = A2.yF; rise = A2.rise; build = (t - s('pangkal') - 0.5) / 1.4; }
        const { pts, L: len } = arcPoints(a, yF, rise, NB);
        pts.forEach((p, i) => {
          const b = blocks[i];
          const k = clamp(build * (NB + 2) / (NB) - placeOrder[i] / NB * 1.0);
          if (k <= 0) return;
          b.visible = true;
          const dropIn = 1 - easeOut(clamp(k * 3));
          let x = p.x, y = p.y + dropIn * 4, rz = p.ang;
          if (fallT > 0) {
            const [r1, r2] = blockSeeds[i];
            const tt = Math.max(0, fallT - Math.abs(p.x) / a * 0.25 - r1 * 0.1);
            y = Math.max(WATER - 0.35, p.y - 4.9 * tt * tt * 1.4);
            x = p.x + Math.sign(p.x || 1) * tt * 0.6;
            rz = p.ang + (r2 - 0.5) * 3 * tt;
          }
          b.position.set(x, y, 0); b.rotation.set(0, 0, rz);
          b.scale.set(len / NB * 0.97, 1, 1);
        });
      }
      banks[0].position.x = -shift; banks[1].position.x = shift;

      // pangkal batu
      const pangOn = home && t >= s('pangkal') && t < s('baja') + 0.6;
      const pk = pangOn ? easeOutBack((t - s('pangkal') - 0.1) / 0.7) : 0;
      const giant = L('pangkal') ? smooth((t - at('pangkal', 0.6)) / 1.6) : t >= s('baja') ? 1 : 0;
      const gone = t >= s('baja') ? 1 - smooth((t - s('baja')) / 0.5) : 1;
      abuts.forEach((m) => {
        m.visible = pangOn && pk * gone > 0.01;
        m.scale.set(lerp(2.2, 5.0, giant) * gone, Math.max(0.01, pk * lerp(4.0, 4.9, giant)), lerp(2.4, 6.0, giant) * gone);
      });
      const softA = L('pangkal') ? 0.9 * smooth((t - at('pangkal', 0.5)) / 0.6) : 0;
      softMat.opacity = softA; softs.forEach((m) => (m.visible = home && softA > 0.01));

      // ===== baja =====
      const steelOn = home && phase === 'steel';
      steelPiv.visible = steelOn;
      const sk = steelOn ? easeOutBack((t - s('baja') - 0.3) / 0.6) : 0;
      seats.forEach((m) => { m.visible = steelOn; m.scale.set(1, Math.max(0.01, sk), 1); });
      approach.forEach((g) => (g.visible = steelOn));
      bearings.forEach((g) => (g.visible = steelOn));
      const ribK = L('baja') ? clamp((t - s('baja') - 0.5) / (dur('baja') * 0.45)) : 1;
      ribs.forEach((b) => { const k = clamp(ribK * (NR / 2 + 1) - b.order); b.visible = k > 0; b.scale.setScalar(Math.max(0.01, easeOutBack(k))); });
      braces.forEach((b) => (b.visible = ribK >= 1));
      const deckK = L('baja') ? smooth((t - at('baja', 0.5)) / 0.7) : 1;
      deck.visible = deckAsp.visible = deckK > 0.01;
      deck.scale.x = deckAsp.scale.x = Math.max(0.01, deckK);
      const hangK = L('baja') ? smooth((t - at('baja', 0.62)) / 0.9) : 1;
      hangers.forEach((h) => { h.visible = hangK > 0.01; h.scale.y = Math.max(0.01, h.full * hangK); });
      steel.children.forEach((c) => { if (c.geometry && c.geometry.parameters?.width === 0.7) c.visible = deckK >= 1; });
      // pengikat menyala
      const tieGlow = L('ikat') ? 0.55 * smooth((t - at('ikat', 0.3)) / 0.5) * (0.75 + 0.25 * Math.sin(t * 6)) : 0;
      deckMat.emissiveIntensity = tieGlow;
      // pemuaian (dilebih-lebihkan), pivot di perletakan kiri
      let ex = 0;
      if (L('muai')) ex = 0.02 * smooth((t - at('muai', 0.25)) / 2.0);
      if (L('dikunci')) ex = 0.006;
      if (L('geser')) ex = 0.01 + 0.01 * Math.sin((t - s('geser')) * 2.4);
      if (L('gludak', 'outro')) ex = 0.01;
      steelPiv.scale.x = 1 + ex;
      const rightMove = 2 * BEAR * ex;
      // perletakan kanan: blok → rol
      const rollerOn = t >= at('geser', 0.1);
      bearings[1].children.forEach((c) => { if (c.isBlock) c.visible = !rollerOn; else c.visible = rollerOn; });
      bearings[1].position.x = BEAR + rightMove * 0.5;
      rollers.forEach((r) => (r.rotation.y = -rightMove / 0.075 * 0.5));
      // kunci & retak
      const lockOn = steelOn && L('dikunci');
      locks.forEach((m, i) => { m.visible = lockOn; m.position.x = (i ? 1 : -1) * (BEAR + 0.4) + (i ? rightMove : 0); });
      const crackK = L('dikunci') ? smooth((t - at('dikunci', 0.45)) / 0.8) : 0;
      seatCrack.visible = steelOn && crackK > 0.01; seatCrack.scale.set(1, crackK, 1);
      seats[1].position.x = 4.75 + (L('dikunci') ? 0.06 * crackK : 0);
      // matahari
      const sunA = L('muai', 'dikunci') ? smooth((t - s('muai') - 0.2) / 0.6) : 0;
      sunBall.visible = home && sunA > 0.01; sunBall.scale.setScalar(Math.max(0.01, sunA));
      sun.color.set('#fff1d6').lerp(new THREE.Color('#ffb35c'), sunA * 0.6);
      steelMat.emissive.set('#ff5a00'); steelMat.emissiveIntensity = L('muai', 'dikunci') ? 0.25 * sunA * (0.6 + 0.4 * Math.sin(t * 5)) : 0;

      // ===== mobil =====
      cars.forEach((c) => (c.root.visible = false));
      const driveCar = (c, x, z, dir, bump = 0) => {
        c.root.visible = true; c.root.position.set(x, TOP + 0.02, z); c.root.rotation.y = dir > 0 ? 0 : Math.PI;
        c.roll(x * dir); c.body.position.y = bump; c.body.rotation.z = -bump * 0.6 * dir;
      };
      let gludakT = -1;
      if (steelOn && L('gludak')) {
        const tj = at('gludak', 0.42), v = 5.5;            // roda depan melewati siar muai pada tj
        const xc = APP + rightMove * 0 + (t - tj) * v - 0.46 - 0.75 + 0.46;
        const jointX = DECK_END + rightMove + 0.17;
        let bump = 0;
        for (const wx of [0.46, -0.46]) { const d = xc + wx - jointX; if (Math.abs(d) < 0.25) bump = Math.max(bump, 0.07 * Math.cos((d / 0.25) * Math.PI / 2)); }
        driveCar(cars[0], xc, 0.5, 1, bump);
        gludakT = t - tj;
      }
      if (steelOn && L('berdiri', 'outro') && site === 'home') {
        const t0 = t - s('berdiri');
        driveCar(cars[1], -16 + t0 * 4.5, 0.5, 1);
        driveCar(cars[2], 16 - t0 * 4.0, -0.5, -1);
      }

      // ===== panah =====
      yArr.forEach((a) => (a.visible = false)); rArr.forEach((a) => (a.visible = false));
      if (L('lemah')) {
        const g1 = smooth((t - s('lemah') - 0.4) / 0.4), g2 = smooth((t - at('lemah', 0.5)) / 0.4);
        arrTo(yArr[0], -0.25, 0.6, 0.8, 0, 2.0 * g1); arrTo(yArr[1], 0.25, 0.6, 0.8, Math.PI, 2.0 * g1);
        arr(rArr[0], -0.25, -0.22, 0.8, Math.PI, 2.0 * g2); arr(rArr[1], 0.25, -0.22, 0.8, 0, 2.0 * g2);
      }
      if (L('patah') && brk <= 0) {
        const g = smooth((t - at('patah', 0.3)) / 0.4);
        arr(yArr[0], -0.2, -0.3, 0.8, Math.PI, 1.6 * g); arr(yArr[1], 0.2, -0.3, 0.8, 0, 1.6 * g);
      }
      if (home && phase === 'stone' && t < s('runtuh')) {
        const tA = L('lengkung') ? smooth((t - at('lengkung', 0.62)) / 0.4) : 1;
        const rise = L('dorong') ? lerp(A1.rise, RISE_FLAT, smooth((t - at('dorong', 0.45)) / (dur('dorong') * 0.45))) : A1.rise;
        const { pts } = arcPoints(A1.a, A1.yF, rise, 9);
        if (L('lengkung')) [1, 3, 5, 7].forEach((j, k) => {
          const p = pts[j], sd = p.x < 0 ? -1 : 1;
          const ang = sd < 0 ? p.ang + Math.PI : p.ang; // ke arah kaki
          arr(yArr[k], p.x, p.y + 0.45, 0.9, ang, 1.0 * tA);
        });
        if (L('dorong')) {
          const g = smooth((t - s('dorong') - 0.3) / 0.4);
          const big = A1.rise / rise;
          arr(rArr[0], -A1.a - 0.2, A1.yF + 0.2, 0.9, Math.PI, 1.0 * g * big);
          arr(rArr[1], A1.a + 0.2, A1.yF + 0.2, 0.9, 0, 1.0 * g * big);
        }
      }
      if (L('pangkal')) {
        const g = smooth((t - s('pangkal') - 1.2) / 0.4);
        arr(rArr[0], -A2.a + 0.2, A2.yF + 0.3, 1.0, Math.PI, 1.3 * g); arr(rArr[1], A2.a - 0.2, A2.yF + 0.3, 1.0, 0, 1.3 * g);
      }
      if (L('ikat')) {
        const g = smooth((t - s('ikat') - 0.2) / 0.4), off = 1 - smooth((t - at('ikat', 0.45)) / 0.8);
        arr(rArr[0], -BEAR - 0.1, TOP + 0.4, 1.3, Math.PI, 1.3 * g * off); arr(rArr[1], BEAR + 0.1, TOP + 0.4, 1.3, 0, 1.3 * g * off);
        const g2 = smooth((t - at('ikat', 0.35)) / 0.5);
        arrTo(yArr[0], -BEAR + 0.4, TOP + 0.25, 1.3, Math.PI, 1.6 * g2); arrTo(yArr[1], BEAR - 0.4, TOP + 0.25, 1.3, 0, 1.6 * g2);
      }
      if (L('muai')) {
        const g = smooth((t - at('muai', 0.25)) / 0.4);
        arr(yArr[0], DECK_END + rightMove + 0.1, TOP + 0.35, 1.3, 0, 1.0 * g);
      }
      if (L('dikunci')) {
        const g = smooth((t - s('dikunci') - 0.3) / 0.4);
        arrTo(rArr[0], BEAR + 0.3, 0.2, 1.6, 0, 1.2 * g);
      }

      // ===== label =====
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_HOME.x, 1.75, BERO_HOME.z], alpha: fade('intro', 0.3), up: 34, tone: 'yellow' });
      if (L('lemah')) {
        st.labels.push({ text: 'Tekan', pos: [-1.2, 0.6, 0.8], alpha: fade('lemah', 0.6), up: 40, tone: 'yellow' });
        st.labels.push({ text: 'Tarik', pos: [1.3, -0.22, 0.8], alpha: smooth((t - at('lemah', 0.5) - 0.2) / 0.3), up: -60, tone: 'red' });
      }
      if (L('patah')) {
        if (brk <= 0) st.labels.push({ text: 'Gaya tarik', pos: [0.9, -0.3, 0.8], alpha: smooth((t - at('patah', 0.35)) / 0.3), up: 30, tone: 'yellow' });
        if (brk > 0) st.labels.push({ text: 'Patah', pos: [0, 0.2, 0.6], alpha: smooth(brk / 0.2), up: 60, tone: 'red' });
      }
      if (L('lengkung')) {
        st.labels.push({ text: 'Melengkung', pos: [0, A1.yF + A1.rise + 0.4, 0.8], alpha: smooth((t - at('lengkung', 0.4)) / 0.3), up: 30, tone: 'yellow' });
        st.labels.push({ text: 'Tekan', pos: [-3.2, 0.9, 0.9], alpha: smooth((t - at('lengkung', 0.7)) / 0.3), up: 30, tone: 'yellow' });
      }
      if (L('dorong')) st.labels.push({ text: 'Dorongan', pos: [A1.a + 1.0, A1.yF + 0.2, 0.9], alpha: fade('dorong', 0.6), up: 40, tone: 'red' });
      if (L('dorong')) st.labels.push({ text: 'Landai', pos: [0, A1.yF + RISE_FLAT + 0.4, 0.8], alpha: smooth((t - at('dorong', 0.5)) / 0.3), up: 30 });
      if (L('runtuh')) st.labels.push({ text: 'Tepi bergeser', pos: [-A1.a - 1.0, 0, 1.0], alpha: fade('runtuh', 0.3), up: 40 });
      if (L('runtuh')) st.labels.push({ text: 'Runtuh', pos: [0.6, -1.0, 0.8], alpha: smooth((t - s('runtuh') - 1.2) / 0.2), up: 60, tone: 'red' });
      if (L('pangkal')) {
        st.labels.push({ text: 'Pangkal jembatan', pos: [A2.a - 0.4, 0.25, 1.2], alpha: smooth((t - s('pangkal') - 1.0) / 0.3) * (1 - smooth((t - at('pangkal', 0.5)) / 0.3)), up: 50, tone: 'yellow' });
        st.labels.push({ text: 'Tanah lunak', pos: [-HW - 1.2, 0.06, 4.0], alpha: smooth((t - at('pangkal', 0.55)) / 0.3), up: 40 });
        st.labels.push({ text: 'Pangkal raksasa', pos: [A2.a + 0.8, 0.3, 1.5], alpha: smooth((t - at('pangkal', 0.75)) / 0.3), up: 40, tone: 'yellow' });
      }
      if (L('baja')) st.labels.push({ text: 'Baja', pos: [-2.6, ribY(-2.6), RIB_Z], alpha: smooth((t - at('baja', 0.3)) / 0.3), up: 40, tone: 'yellow' });
      if (L('baja')) st.labels.push({ text: 'Jalan digantung', pos: [2.4, TOP, 1.1], alpha: smooth((t - at('baja', 0.72)) / 0.3), up: 40 });
      if (L('ikat')) st.labels.push({ text: 'Batang pengikat', pos: [0, TOP, 1.1], alpha: smooth((t - at('ikat', 0.45)) / 0.3), up: 40, tone: 'yellow' });
      if (L('muai')) st.labels.push({ text: 'Memuai', pos: [0, ribY(0), RIB_Z], alpha: smooth((t - at('muai', 0.2)) / 0.3), up: 30, tone: 'yellow' });
      if (L('muai')) st.labels.push({ text: '+3,6 cm', pos: [DECK_END + rightMove + 0.6, TOP + 0.35, 1.3], alpha: smooth((t - at('muai', 0.75)) / 0.3), up: 40, tone: 'yellow' });
      if (L('dikunci')) st.labels.push({ text: 'Dikunci', pos: [BEAR + 0.4, 0.9, 1.2], alpha: fade('dikunci', 0.2), up: 50 });
      if (L('dikunci')) st.labels.push({ text: 'Retak', pos: [3.9, -0.6, 1.5], alpha: smooth((t - at('dikunci', 0.6)) / 0.3), up: 30, tone: 'red' });
      if (L('geser')) {
        const sw = at('geser', 0.55);
        st.labels.push({ text: 'Perletakan', pos: [BEAR + rightMove * 0.5, 0.5, 1.0], alpha: smooth((t - at('geser', 0.15)) / 0.3) * (1 - smooth((t - sw + 0.3) / 0.3)), up: 40, tone: 'yellow' });
        st.labels.push({ text: 'Siar muai', pos: [DECK_END + rightMove + 0.17, TOP, 0.6], alpha: smooth((t - sw - 0.5) / 0.3), up: 50, tone: 'yellow' });
      }
      if (gludakT > -0.05 && gludakT < 1.6) st.labels.push({ text: 'Gludak!', pos: [DECK_END + 0.4, TOP + 0.2, 0.5], alpha: smooth((gludakT + 0.05) / 0.15) * (1 - smooth((gludakT - 1.2) / 0.3)), up: 70 });
      if (L('berdiri')) st.labels.push({ text: 'Berdiri', pos: [0, ribY(0) + 0.3, 0], alpha: fade('berdiri', 0.4), up: 30, tone: 'yellow' });

      // ===== kartu =====
      if (L('intro')) st.card = { title: 'Request dari komentar', body: 'Bikin jembatan, yuk!', top: 0.1, alpha: fade('intro', 0.2) };
      if (L('muai')) st.card = { title: 'Suhu naik 30°C', body: 'Baja 100 m bertambah ±3,6 cm', top: 0.08, alpha: smooth((t - at('muai', 0.45)) / 0.3) };

      // ===== Roma =====
      if (site === 'roma') {
        st.card = { title: 'Jembatan Fabricius · Roma', body: 'Dibangun 62 SM · masih dilewati pejalan kaki', top: 0.08, alpha: smooth((t - at('roma', 0.22)) / 0.3) };
        walkers.forEach((w, i) => {
          const dir = i % 2 ? 1 : -1, sp = 0.7 + (i % 3) * 0.15;
          const x = dir * (((t * sp + i * 2.3) % 17) - 8.5);
          w.position.set(x, 0.6 + Math.abs(Math.sin(t * 7 + i)) * 0.05, (i % 2 ? 0.5 : -0.5) + (i % 3) * 0.15 - 0.15);
          w.visible = Math.abs(x) < 7.4;
        });
      }
      // ===== Kalikuto =====
      if (site === 'kal') {
        const k = smooth((t - at('kalikuto', 0.5)) / (dur('kalikuto') * 0.42));
        kHalves.forEach((p, i) => (p.rotation.z = (i ? -1 : 1) * KUP * (1 - k)));
        st.card = { title: 'Jembatan Kalikuto', body: 'Tol Batang–Semarang · bentang 100 m', top: 0.08, alpha: smooth((t - s('kalikuto') - 0.6) / 0.3) };
        st.labels.push({ text: 'Dirakit berdiri', pos: [-KA + 1.5, KY + 7, 0], alpha: smooth((t - at('kalikuto', 0.3)) / 0.3) * (1 - smooth((t - at('kalikuto', 0.55)) / 0.3)), up: 20 });
        st.labels.push({ text: 'Direbahkan', pos: [0, KY + KR, 0], alpha: smooth((t - at('kalikuto', 0.85)) / 0.3), up: 40, tone: 'yellow' });
      }

      // ===== Pak Bero =====
      let bp = BERO_HOME.clone(), anim = 'idle';
      if (site === 'roma') bp.set(PX - 8.2, 0, 3.0);
      else if (site === 'kal') bp.set(KX - 10.5, 0, 4.0);
      const camYaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      let yaw = camYaw;
      if (L('hook')) { anim = 'think'; yaw = t < s('hook') + 2.0 ? Math.PI / 2 : camYaw; }
      else if (L('intro')) anim = 'wave';
      else if (L('lempeng')) { anim = 'carry'; yaw = Math.PI / 2; }
      else if (L('lemah')) anim = 'point';
      else if (L('patah')) {
        const t0 = t - s('patah'), walkEnd = 1.5;
        if (t0 < walkEnd) {
          const u = smooth(t0 / walkEnd);
          bp.set(lerp(BERO_HOME.x, -0.9, u), 0, lerp(BERO_HOME.z, 0, u)); anim = 'walk'; yaw = Math.atan2(-0.9 - BERO_HOME.x, -BERO_HOME.z);
        } else if (brk <= 0) { bp.set(-0.9, 0, 0); anim = ck > 0.3 ? 'panic' : 'idle'; }
        else { const u = clamp(brk / 0.7); bp.set(lerp(-0.9, BERO_HOME.x, easeOut(u)), 0, lerp(0, BERO_HOME.z, u)); bp.y = 2.4 * Math.sin(Math.PI * u) * (u < 1 ? 1 : 0); anim = 'panic'; }
        if (bp.x > -HW - 0.6 && brk <= 0) bp.y = 0.35 + (bp.x > -HW ? -Math.sin(sag) * (bp.x + HW) : 0);
      }
      else if (L('lengkung')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('dorong')) anim = 'think';
      else if (L('runtuh')) anim = t > s('runtuh') + 1.0 ? 'panic' : 'idle';
      else if (L('pangkal')) anim = t < at('pangkal', 0.5) ? 'point' : 'think';
      else if (L('baja')) anim = 'happy';
      else if (L('ikat')) anim = 'point';
      else if (L('muai')) anim = 'sad';
      else if (L('dikunci')) anim = 'panic';
      else if (L('geser')) anim = 'point';
      else if (L('gludak')) anim = 'idle';
      else if (L('berdiri')) anim = 'happy';
      else if (site === 'roma') anim = 'point';
      else if (site === 'kal') anim = t > at('kalikuto', 0.5) ? 'point' : 'idle';
      else if (L('outro')) anim = 'wave';
      if (anim === 'point' && home && !L('patah')) yaw = Math.PI / 2 * 0.8;
      if (anim === 'point' && site !== 'home') yaw = Math.PI / 2 * 0.7;
      bero.root.position.copy(bp);
      bero.pose(t, anim, { yaw });

      // ===== guncangan kamera =====
      let shake = 0;
      if (brk > 0 && brk < 0.6) shake = 0.05;
      if (L('runtuh') && t > s('runtuh') + 1.0 && t < s('runtuh') + 2.0) shake = 0.05;
      if (L('dikunci') && crackK > 0.05 && crackK < 0.99) shake = 0.03;
      if (gludakT > 0 && gludakT < 0.35) shake = 0.03;
      if (shake) { camera.position.x += Math.sin(t * 53) * shake; camera.position.y += Math.cos(t * 47) * shake; }
      return st;
    },
  };
}
