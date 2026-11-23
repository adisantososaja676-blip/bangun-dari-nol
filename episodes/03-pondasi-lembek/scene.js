// Ep. 03 Pondasi di tanah lembek: diorama potongan tanah rawa, diikat ke id baris script.json.
// Semua posisi dihitung dari waktu t (deterministik).
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeIn, easeOutBack, cameraAt, makeArrow, makeInstances } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';
import { createHouse, HOUSE } from '/engine/house.js';
import { buildDiorama, SOIL } from '/engine/soil.js';

const CUT = HOUSE.FRONT;             // muka potongan tanah = garis dinding depan
const HARD = -4.6;                   // batas atas tanah keras
const PX = 300, CX = 600;            // lokasi Menara Pisa & menara listrik Ancol
const BERO_POS = new THREE.Vector3(-4.0, 0, 0.4);
const PADS = [-1.9, 1.9];            // pondasi telapak yang terlihat di potongan
const PILES = [-1.9, -0.95, 0, 0.95, 1.9];
const PILE_BOT = -5.4;
const deg = Math.PI / 180;

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(303);

  // ---------------- dunia ----------------
  buildDiorama(kit, { seed: 31, clear: [{ x0: -2.8, x1: 2.8, z0: -2.2, z1: 1.6 }, { x0: -4.8, x1: -3.2, z0: -0.5, z1: 1.6 }] });
  buildDiorama(kit, {
    at: [PX, 0, 0], cut: 0, zBack: -8, seed: 41, top: PAL.grass, swamp: false, x0: -8, x1: 8,
    layers: [{ y0: -0.08, y1: -5.2, color: '#8e8272' }, { y0: -5.2, y1: -12, color: SOIL.sand }],
    clear: [{ x0: -3, x1: 3, z0: -3, z1: 1 }, { x0: -5, x1: -3, z0: -2, z1: 1 }],
  });
  buildDiorama(kit, { at: [CX, 0, 0], cut: 1.0, seed: 51, clear: [{ x0: -3.4, x1: 3.4, z0: -3.2, z1: 1.5 }, { x0: -5, x1: -3.2, z0: -1, z1: 1.5 }] });

  // lapisan diagram di muka potongan (sedikit di depan supaya tidak z-fighting)
  const planeMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
  const wetMat = planeMat('#4d5560'), packMat = planeMat('#5e4a3a');
  const wet = mesh(new THREE.PlaneGeometry(7.1, -HARD - 0.3), wetMat, { shadow: false, receive: false });
  wet.position.set(0.4 + 3.55, (HARD - 0.3) / 2, CUT + 0.02); scene.add(wet);
  const packed = mesh(new THREE.PlaneGeometry(5.0, 2.6), packMat, { shadow: false, receive: false });
  packed.position.set(0, -0.3 - 1.3, CUT + 0.025); scene.add(packed);
  wet.renderOrder = packed.renderOrder = 2;

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);

  // ---------------- rumah + pondasi telapak ----------------
  const house = createHouse();
  const houseG = new THREE.Group(); houseG.add(house.root); scene.add(houseG);
  const concMat = mat(PAL.concrete);
  const pads = PADS.map((x) => {
    const g = new THREE.Group(); g.position.set(x, 0, CUT); house.root.add(g);
    const stem = mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), concMat); stem.position.y = -0.35; g.add(stem);
    const pad = mesh(new THREE.BoxGeometry(1.2, 0.26, 0.9), concMat); pad.position.y = -0.83; g.add(pad);
    return g;
  });
  // tanah menggembung di samping saat amblas
  const heaves = [-1, 1].map((sd) => { const m = mesh(new THREE.IcosahedronGeometry(1, 1), SOIL.swampTop); m.position.set(sd * 2.75, 0, 0.3); scene.add(m); return m; });

  // ---------------- tiang pancang ----------------
  const pileMat = mat('#a9adb0');
  const piles = PILES.map((x) => {
    const h = -0.25 - PILE_BOT;
    const p = mesh(new THREE.BoxGeometry(0.26, h, 0.26), pileMat);
    p.geometry.translate(0, -h / 2, 0); // titik asal di ujung atas
    p.position.set(x, -0.25, CUT); scene.add(p);
    const tip = mesh(new THREE.ConeGeometry(0.18, 0.3, 4), pileMat); tip.rotation.set(Math.PI, Math.PI / 4, 0); tip.position.y = -h - 0.15; p.add(tip);
    return p;
  });
  const cap = mesh(new THREE.BoxGeometry(4.3, 0.3, 0.5), concMat); cap.position.set(0, -0.15, CUT); scene.add(cap);
  const hammer = mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), '#4a5560'); scene.add(hammer);

  // ---------------- air di pori tanah ----------------
  const NW = 110, NEXTRA = 34;
  const drops = makeInstances(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#2a9fd6', emissiveIntensity: 0.5, flatShading: true }), NW);
  scene.add(drops);
  const dropSeeds = Array.from({ length: NW }, (_, i) => {
    const extra = i >= NW - NEXTRA;
    return { x: extra ? 0.6 + R() * 6.6 : -7 + R() * 14, y: -0.55 - R() * 3.8, a: R(), b: R(), extra };
  });

  // ---------------- panah ----------------
  const arrows = Array.from({ length: 12 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const redArrows = Array.from({ length: 2 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  // panah dari ekor (x,y) ke arah sudut ang (rad), panjang L
  function arr(a, x, y, z, ang, L) { a.visible = L > 0.05; a.setLength(L); a.rotation.set(0, 0, ang); a.position.set(x, y, z); }
  const down = (a, x, yTip, z, L) => arr(a, x, yTip + L, z, -Math.PI / 2, L);
  const up = (a, x, yTip, z, L) => arr(a, x, yTip - L, z, Math.PI / 2, L);

  // ---------------- Menara Pisa ----------------
  const pisa = new THREE.Group(); scene.add(pisa);
  const pivot = new THREE.Group(); pivot.position.set(PX - 1.45, -0.45, 0); pisa.add(pivot); // poros di tepi kiri bawah pondasi
  const tower = new THREE.Group(); tower.position.set(1.45, 0, 0); pivot.add(tower);
  const marble = mat('#f2ece0'), marbleD = mat('#d8cfbe'), shade = mat('#b9ae9a');
  const fnd = mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.45, 20), mat('#a39a8b')); fnd.position.y = 0.225; tower.add(fnd);
  const TIER = 0.95, R0 = 1.05;
  let y = 0.45;
  const base = mesh(new THREE.CylinderGeometry(R0, R0, 1.4, 20), marble); base.position.y = y + 0.7; tower.add(base); y += 1.4;
  for (let k = 0; k < 6; k++) {
    const core = mesh(new THREE.CylinderGeometry(R0 - 0.12, R0 - 0.12, TIER, 18), shade); core.position.y = y + TIER / 2; tower.add(core);
    const ledge = mesh(new THREE.CylinderGeometry(R0 + 0.06, R0 + 0.06, 0.1, 20), marbleD); ledge.position.y = y + TIER - 0.05; tower.add(ledge);
    for (let c = 0; c < 14; c++) {
      const a = (c / 14) * Math.PI * 2;
      const col = mesh(new THREE.CylinderGeometry(0.05, 0.05, TIER - 0.1, 5), marble, { shadow: false }); col.position.set(Math.cos(a) * R0, y + (TIER - 0.1) / 2, Math.sin(a) * R0); tower.add(col);
    }
    y += TIER;
  }
  const bell = mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.9, 16), marble); bell.position.y = y + 0.45; tower.add(bell);
  const bellTop = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.08, 16), marbleD); bellTop.position.y = y + 0.94; tower.add(bellTop);
  // pipa penggalian di bawah sisi yang tinggi (kiri)
  const tubes = [[-4.3, 0, -1.2, -1.0], [-4.3, 0, -0.6, -1.35]].map(([x0, y0, x1, y1]) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const t = mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 8), '#5b6670', { shadow: false });
    t.position.set(PX + (x0 + x1) / 2, (y0 + y1) / 2, 0.08); t.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
    t.seg = [x0, y0, x1, y1]; scene.add(t); return t;
  });
  const NS = 24;
  const spoil = makeInstances(new THREE.BoxGeometry(0.09, 0.09, 0.09), mat('#6b5a48'), NS); scene.add(spoil);
  const heap = mesh(new THREE.ConeGeometry(0.5, 0.35, 7), '#6b5a48'); heap.position.set(PX - 4.6, 0.17, 0.3); scene.add(heap);

  // ---------------- Menara listrik + cakar ayam (Ancol) ----------------
  const ancol = new THREE.Group(); ancol.position.x = CX; scene.add(ancol);
  const steel = mat('#8f999f');
  const beam = (a, b, r = 0.05, m = steel) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const c = mesh(new THREE.CylinderGeometry(r, r, len, 5), m, { shadow: true });
    c.position.copy(va).add(vb).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    ancol.add(c); return c;
  };
  const TZ = -0.4, H = 9.5;
  const legAt = (yy) => { const w = lerp(1.15, 0.32, Math.pow(yy / H, 0.8)); return w; };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const P3 = (sx, sz, yy) => [sx * legAt(yy), yy, TZ + sz * legAt(yy)];
  const levels = [0.05, 2.2, 4.2, 6.0, 7.6, H];
  for (const [sx, sz] of corners) for (let i = 0; i < levels.length - 1; i++) beam(P3(sx, sz, levels[i]), P3(sx, sz, levels[i + 1]), 0.07);
  for (let i = 0; i < levels.length - 1; i++) for (let f = 0; f < 4; f++) {
    const [ax, az] = corners[f], [bx, bz] = corners[(f + 1) % 4];
    beam(P3(ax, az, levels[i]), P3(bx, bz, levels[i + 1]), 0.035);
    beam(P3(bx, bz, levels[i]), P3(ax, az, levels[i + 1]), 0.035);
    beam(P3(ax, az, levels[i + 1]), P3(bx, bz, levels[i + 1]), 0.035);
  }
  for (const ya of [6.6, 8.3]) {
    beam([-2.4, ya, TZ], [2.4, ya, TZ], 0.07);
    for (const sx of [-1, 1]) {
      beam([sx * 2.4, ya, TZ], [sx * legAt(ya + 0.7), ya + 0.7, TZ], 0.035);
      const ins = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 6), mat('#e7eef2'), { shadow: false }); ins.position.set(sx * 2.2, ya - 0.35, TZ); ancol.add(ins);
      const wire = mesh(new THREE.CylinderGeometry(0.02, 0.02, 14, 4), mat('#3a3f44'), { shadow: false });
      wire.rotation.z = Math.PI / 2; wire.position.set(sx * (2.2 + 7), ya - 0.7, TZ); ancol.add(wire);
    }
  }
  const slab = mesh(new THREE.BoxGeometry(6.6, 0.16, 4.6), concMat); slab.position.set(0, -0.06, 1.0 - 2.2); ancol.add(slab);
  const claws = [-2.6, -1.3, 0, 1.3, 2.6].map((x) => { const c = mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.8, 12), concMat); c.position.set(x, -0.14 - 0.9, 1.0); ancol.add(c); return c; });

  // ---------------- kamera ----------------
  const WIDE = { pos: [0.2, 1.6, 16.5], look: [0, -1.4, 0], fov: 50 };
  const HOUSE_CAM = { pos: [1.4, 2.4, 11.5], look: [0, 0.2, 0], fov: 50 };
  const BERO_CLOSE = { pos: [-2.9, 1.9, 7.6], look: [-3.4, 0.9, 0.4], fov: 48 };
  const camKeys = [
    { t: 0, pos: [-0.8, 2.6, 12.2], look: [0.1, 0.2, 0], fov: 50 },
    { t: s('intro'), cut: true, ...BERO_CLOSE },
    { t: s('jakarta'), pos: [0.2, 3.0, 16.5], look: [-0.4, 2.2, 0], blend: 1.4 },
    { t: s('taruh'), ...HOUSE_CAM, blend: 1.2 },
    { t: s('dukung'), pos: [0.8, 1.0, 12.5], look: [0, -0.8, 0], blend: 1.0 },
    { t: s('amblas'), pos: [0.4, 1.4, 12.0], look: [0, -0.6, 0], blend: 0.8 },
    { t: s('telapak'), pos: [2.6, 0.9, 10.5], look: [0, -0.6, 0], blend: 1.0 },
    { t: s('sebar'), pos: [0.4, 0.8, 12.0], look: [0, -0.8, 0], blend: 1.0 },
    { t: s('air'), ...WIDE, blend: 1.2 },
    { t: s('konsol'), pos: [0.0, 2.4, 15.5], look: [0, -0.6, 0], blend: 1.0 },
    { t: s('turun'), pos: [0.8, 1.6, 12.0], look: [0, -0.4, 0], blend: 1.2 },
    { t: s('beda'), ...WIDE, pos: [1.2, 1.8, 16.5], blend: 1.2 },
    { t: s('miring'), pos: [0.6, 2.2, 12.0], look: [0.2, 0.4, 0], blend: 0.9 },
    { t: s('tiang'), pos: [0.0, 2.0, 19.5], look: [0, -0.4, 0], blend: 1.2 },
    { t: s('gesek'), pos: [1.4, -1.6, 12.5], look: [0, -3.4, 0], blend: 1.2 },
    { t: s('berdiri'), pos: [-1.4, 2.6, 13.0], look: [-0.4, 0.6, 0], blend: 1.4 },
    { t: s('pisa1'), cut: true, pos: [PX + 1.5, 3.4, 18.5], look: [PX + 0.4, 2.6, 0] },
    { t: s('pisa1') + (e('pisa1') - s('pisa1')) * 0.62, pos: [PX + 1.8, 0.6, 8.5], look: [PX + 0.3, -0.6, 0], blend: 1.4 },
    { t: s('pisa2'), pos: [PX - 1.0, 2.4, 15.5], look: [PX - 0.8, 1.2, 0], blend: 1.4 },
    { t: s('cakar'), cut: true, pos: [CX + 2.0, 4.0, 19.0], look: [CX, 3.8, 0] },
    { t: s('cakar') + (e('cakar') - s('cakar')) * 0.5, pos: [CX + 1.8, 0.4, 9.5], look: [CX, -0.8, 0], blend: 1.6 },
    { t: s('outro'), cut: true, pos: [-2.4, 2.2, 9.6], look: [-2.2, 1.2, 0.4], fov: 50 },
  ];

  // ---------------- keadaan rumah per waktu ----------------
  // y: turun (negatif), tilt: rad (negatif = sisi kanan turun), foot: pondasi telapak tampak
  function houseState(t) {
    const st = { y: 0, tilt: 0, foot: false, crack: 0, x: 0 };
    if (t < s('intro')) return { y: -0.85, tilt: -4 * deg, foot: false, crack: 1, x: 0 };
    if (t < s('taruh')) { st.y = 3.0 + 0.08 * Math.sin(t * 2.2); return st; }
    if (t < s('dukung')) { st.y = lerp(3.0 + 0.08 * Math.sin(s('taruh') * 2.2), 0, easeOutBack((t - s('taruh')) / 1.4) ); return st; }
    if (t < s('amblas')) return st;
    if (t < s('telapak')) { const k = easeIn(clamp((t - s('amblas') - 0.4) / 1.4)); st.y = -0.95 * k; st.tilt = -2.5 * deg * k; return st; }
    if (t < s('air')) {
      const k = smooth((t - s('telapak')) / 1.0);
      st.y = lerp(-0.95, 0, k); st.tilt = lerp(-2.5 * deg, 0, k); st.foot = t >= s('telapak') + 0.6; return st;
    }
    st.foot = true;
    if (t < s('turun')) return st;
    if (t < s('beda')) { st.y = -0.3 * smooth(T.p(t, 'turun')); return st; }
    if (t < s('miring')) { st.y = -0.3; return st; }
    if (t < s('tiang')) {
      const k = smooth((t - s('miring')) / 1.6);
      st.y = lerp(-0.3, -0.6, k); st.tilt = -6 * deg * k; st.crack = smooth((t - s('miring') - 0.5) / 1.2); return st;
    }
    if (t < s('pisa1')) {
      const lift = smooth((t - s('tiang')) / 0.9), drop = smooth((t - e('tiang') + 0.9) / 0.9);
      st.foot = t < s('tiang') + 0.5;
      st.y = lerp(lerp(-0.6, 3.0, lift), 0, drop); st.tilt = lerp(-6 * deg, 0, lift); st.crack = t < s('tiang') + 0.6 ? 1 : 0; return st;
    }
    st.foot = false;
    return st;
  }

  // ---------------- Update per frame ----------------
  return {
    update(t) {
      const P = (a, b, pad) => T.p(t, a, b, pad);
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const site = t < s('pisa1') || t >= s('outro') ? 'home' : t < s('cakar') ? 'pisa' : 'ancol';
      setSky(0);
      const sx = site === 'pisa' ? PX : site === 'ancol' ? CX : 0;
      sun.position.set(sx - 12, 22, 14); sun.target.position.set(sx, -2, 0);

      // --- rumah ---
      const hs = houseState(t);
      houseG.visible = site === 'home';
      // putar di sekitar sudut kiri bawah supaya sisi kanan yang turun
      const px = -HOUSE.SIDE;
      houseG.position.set(px + hs.x, hs.y, 0); house.root.position.set(-px, 0, 0);
      houseG.rotation.z = hs.tilt;
      house.setCrack(hs.crack);
      pads.forEach((p) => {
        p.visible = hs.foot;
        const grow = t >= s('telapak') && t < s('air') ? easeOutBack((t - s('telapak') - 0.6) / 0.6) : 1;
        p.scale.set(Math.max(0.01, grow), 1, Math.max(0.01, grow));
      });
      const hv = t >= s('amblas') && t < s('telapak') + 0.9 ? smooth((t - s('amblas') - 0.6) / 1.2) * (1 - smooth((t - s('telapak')) / 0.8)) : 0;
      heaves.forEach((m) => { m.visible = hv > 0.01; m.scale.set(0.9, 0.35 * hv + 0.01, 0.7); });

      // --- diagram tanah ---
      const wetA = t >= s('beda') && t < s('tiang') + 1 ? 0.5 * smooth((t - s('beda') - 0.3) / 0.8) * (1 - smooth((t - s('tiang')) / 1)) : 0;
      wetMat.opacity = wetA; wet.visible = wetA > 0.01;
      const packA = t >= s('konsol') && t < s('tiang') ? 0.4 * smooth((t - s('konsol') - 1.0) / 3.0) : 0;
      packMat.opacity = packA; packed.visible = packA > 0.01;
      packed.position.y = -0.3 - 1.3 + hs.y * 0.5;

      // --- tiang pancang ---
      const tp0 = s('tiang') + 0.5;
      let hammerShown = false;
      piles.forEach((p, i) => {
        if (site !== 'home' || t < tp0) { p.visible = false; return; }
        p.visible = true;
        const u = clamp((t - tp0 - i * 0.38) / 1.5);
        // turun bertahap (dipukul): tangga + sedikit halus
        const steps = 6, k = Math.floor(u * steps) / steps + easeOut((u * steps) % 1) / steps;
        const yTop = lerp(5.6, -0.25, u >= 1 ? 1 : k);
        p.position.y = yTop;
        if (u > 0 && u < 1 && !hammerShown) {
          hammerShown = true;
          const bounce = 0.35 * Math.abs(Math.sin(((u * steps) % 1) * Math.PI));
          hammer.position.set(PILES[i], yTop + 0.3 + bounce, CUT);
        }
      });
      hammer.visible = hammerShown;
      const capK = site === 'home' && t >= s('tiang') ? easeOutBack((t - (tp0 + 4 * 0.38 + 1.5)) / 0.4) : 0;
      cap.visible = capK > 0.01; cap.scale.set(Math.max(0.01, capK), 1, 1);

      // --- air pori ---
      const showDrops = site === 'home' && t >= s('air') && t < s('tiang');
      dropSeeds.forEach((d, i) => {
        if (!showDrops) { drops.set(i, 0, -999, 0, 0); return; }
        if (d.extra && t < s('beda') + 0.4) { drops.set(i, 0, -999, 0, 0); return; }
        const t0 = d.extra ? s('beda') + 0.4 + d.a * 1.2 : s('air') + d.a * 1.3;
        let sc = easeOutBack((t - t0) / 0.35);
        let x = d.x, y = d.y;
        // konsolidasi: air di bawah rumah keluar ke atas & samping
        if (!d.extra && Math.abs(d.x) < 3.0) {
          const m0 = s('konsol') + 0.4 + d.b * 4.2, u = clamp((t - m0) / 2.0);
          if (u > 0) {
            const sd = d.x === 0 ? 1 : Math.sign(d.x);
            x = d.x + sd * (3.4 - Math.abs(d.x)) * easeIn(u) * 0.9;
            y = lerp(d.y, -0.15, smooth(u));
            sc *= 1 - smooth((u - 0.8) / 0.2);
          }
        }
        const wob = 0.02 * Math.sin(t * 3 + d.a * 20);
        drops.set(i, x, y + wob, CUT + 0.06, Math.max(0, sc));
      });

      // --- panah ---
      arrows.forEach((a) => (a.visible = false)); redArrows.forEach((a) => (a.visible = false));
      if (L('dukung')) {
        const g = smooth((t - s('dukung') - 0.2) / 0.4);
        PADS.forEach((x, i) => down(arrows[i], x, 0.15 + hs.y, CUT + 0.35, 1.5 * g));
        PADS.forEach((x, i) => up(arrows[2 + i], x, -0.05, CUT + 0.35, 0.55 * smooth((t - s('dukung') - 0.9) / 0.4)));
      }
      if (L('amblas')) PADS.forEach((x, i) => down(redArrows[i], x, 0.15 + hs.y, CUT + 0.35, 1.5));
      if (L('sebar')) {
        const g = smooth((t - s('sebar') - 0.2) / 0.5);
        let k = 0;
        for (const x of PADS) for (const dx of [-0.45, 0, 0.45]) down(arrows[k++], x + dx * (0.6 + 0.4 * g), -1.0 - 0.75 * g, CUT + 0.5, 0.7 * g);
      }
      if (L('konsol')) {
        const g = smooth((t - s('konsol') - 0.2) / 0.4);
        [-1.3, 0, 1.3].forEach((x, i) => down(arrows[i], x, HOUSE.WALL_H + 1.2 + 0.3, 0.9, 1.0 * g * (0.85 + 0.15 * Math.sin(t * 5 + i))));
      }
      if (L('gesek')) {
        const g = smooth((t - s('gesek') - 0.2) / 0.4), g2 = smooth((t - s('gesek') - 1.6) / 0.4);
        up(arrows[0], 0, PILE_BOT - 0.42, CUT + 0.3, 1.1 * g);
        let k = 1;
        for (const y0 of [-1.6, -2.6, -3.6]) for (const sd of [-1, 1]) up(arrows[k++], sd * 0.3, y0 + 0.55, CUT + 0.3, 0.55 * g2);
      }

      // --- label istilah ---
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_POS.x, 1.75, BERO_POS.z], alpha: fade('intro', 0.3), up: 34, tone: 'yellow' });
      if (L('intro')) st.labels.push({ text: 'Tanah rawa', pos: [-2.6, 0.05, 1.0], alpha: fade('intro', 1.2), up: 60 });
      if (L('dukung')) st.labels.push({ text: 'Daya dukung', pos: [0, -0.6, CUT + 0.3], alpha: fade('dukung', 1.0), up: 30, tone: 'yellow' });
      if (L('amblas')) st.labels.push({ text: 'Amblas', pos: [0.6, 1.4 + hs.y, CUT + 0.2], alpha: fade('amblas', 0.9), up: 70, tone: 'red' });
      if (L('telapak', 'sebar')) st.labels.push({ text: 'Pondasi telapak', pos: [PADS[1] - 0.5, -0.85 + hs.y, CUT + 0.45], alpha: fade('telapak', 1.2), up: 40, tone: 'yellow' });
      if (L('air')) st.labels.push({ text: 'Air', pos: [dropSeeds[3].x, dropSeeds[3].y, CUT + 0.06], alpha: fade('air', 0.6), up: 50 });
      if (L('konsol')) st.labels.push({ text: 'Konsolidasi', pos: [0, -1.6, CUT + 0.05], alpha: fade('konsol', 3.2), up: 30, tone: 'yellow' });
      if (L('beda')) st.labels.push({ text: 'Lebih lembek', pos: [3.0, -2.6, CUT + 0.05], alpha: fade('beda', 1.0), up: 40, tone: 'red' });
      if (L('beda')) st.labels.push({ text: 'Penurunan tidak seragam', pos: [0, 3.4 + hs.y, 0.6], alpha: fade('beda', 3.3), up: 40, tone: 'yellow' });
      if (L('miring')) st.labels.push({ text: 'Miring', pos: [1.6, 3.6 + hs.y - 0.3, 0.5], alpha: fade('miring', 0.4), up: 40, tone: 'red' });
      if (L('miring')) st.labels.push({ text: 'Retak', pos: [-1.3, 0.8 + hs.y, CUT + 0.12], alpha: fade('miring', 1.2), up: 50, tone: 'red' });
      if (L('tiang')) st.labels.push({ text: 'Tiang pancang', pos: [PILES[3], -2.6, CUT + 0.13], alpha: smooth((t - tp0 - 1.6) / 0.3), up: 40, tone: 'yellow' });
      if (L('tiang')) st.labels.push({ text: 'Tanah keras', pos: [-3.6, HARD - 0.6, CUT], alpha: smooth((t - s('tiang') - 2.8) / 0.3), up: 30, tone: 'yellow' });
      if (L('gesek')) st.labels.push({ text: 'Ujung', pos: [0.2, PILE_BOT - 0.9, CUT + 0.3], alpha: fade('gesek', 0.6), up: 30, tone: 'yellow' });
      if (L('gesek')) st.labels.push({ text: 'Gesekan', pos: [0.35, -2.3, CUT + 0.3], alpha: fade('gesek', 1.9), up: 30, tone: 'yellow' });
      if (L('berdiri')) st.labels.push({ text: 'Berdiri', pos: [0, 4.2, 0.4], alpha: fade('berdiri', 0.6), up: 30, tone: 'yellow' });

      // --- kartu ---
      if (L('jakarta')) st.card = { title: 'Jakarta', body: 'Di beberapa titik tanah turun > 10 cm per tahun', top: 0.1, alpha: fade('jakarta', 1.6) };
      if (L('turun')) {
        const yr = 1 + Math.min(4, Math.floor(P('turun') * 5.5));
        st.card = { title: `Tahun ke-${yr}`, body: 'Rumah turun sedikit demi sedikit', top: 0.1, alpha: fade('turun', 0.3) };
      }

      // --- Pisa ---
      pisa.visible = tubes[0].visible = tubes[1].visible = heap.visible = site === 'pisa';
      spoil.visible = site === 'pisa';
      if (site === 'pisa') {
        const back = t >= s('pisa2') ? smooth((t - s('pisa2') - 1.2) / 4.0) : 0;
        pivot.rotation.z = -(5.5 - 0.5 * back) * deg;
        const tubeA = t >= s('pisa2') ? smooth((t - s('pisa2') - 0.3) / 0.6) : 0;
        tubes.forEach((tb) => { tb.visible = tubeA > 0.01; tb.scale.set(1, Math.max(0.01, tubeA), 1); });
        heap.scale.setScalar(0.01 + back);
        spoil.hideAll();
        if (t >= s('pisa2') + 0.9) for (let i = 0; i < NS; i++) {
          const tb = tubes[i % 2].seg;
          const u = ((t - s('pisa2') - 0.9) * 0.55 + i / NS) % 1;
          spoil.set(i, PX + lerp(tb[2], tb[0], u), lerp(tb[3], tb[1], u) + 0.12, 0.2, 1);
        }
        if (L('pisa1')) {
          st.card = { title: 'Menara Pisa · Italia', body: 'Pondasi cuma ±3 m, di atas tanah lunak', top: 0.08, alpha: fade('pisa1', 0.6) };
          st.labels.push({ text: '3 meter', pos: [PX + 1.4, -0.25, 0.1], alpha: fade('pisa1', 4.0), up: 40, tone: 'yellow' });
          st.labels.push({ text: 'Tanah lunak', pos: [PX - 0.6, -2.0, 0.02], alpha: fade('pisa1', 4.6), up: 30 });
        }
        if (L('pisa2')) {
          st.card = { title: 'Miring berkurang ±0,5°', body: 'Tanah diambil sedikit demi sedikit dari bawah sisi yang tinggi', top: 0.08, alpha: fade('pisa2', 3.2) };
          st.labels.push({ text: 'Tanah diambil', pos: [PX - 2.6, -0.55, 0.1], alpha: fade('pisa2', 1.0), up: 50, tone: 'yellow' });
        }
      }

      // --- Ancol ---
      ancol.visible = site === 'ancol';
      if (site === 'ancol') {
        const half = s('cakar') + (e('cakar') - s('cakar')) * 0.5;
        st.card = { title: 'Pondasi cakar ayam · 1961', body: 'Prof. Sedijatmo · menara listrik di rawa Ancol', top: 0.08, alpha: fade('cakar', 0.8) };
        const gl = t >= half ? 0.35 * (0.5 + 0.5 * Math.sin((t - half) * 4)) : 0;
        concMat.emissive.set(PAL.arrow); concMat.emissiveIntensity = gl;
        st.labels.push({ text: 'Cakar ayam', pos: [CX + 1.3, -1.2, 1.35], alpha: smooth((t - half - 0.2) / 0.3), up: 40, tone: 'yellow' });
        st.labels.push({ text: 'Pelat beton tipis', pos: [CX - 0.7, -0.05, 1.1], alpha: smooth((t - half - 1.4) / 0.3), up: 60 });
      } else { concMat.emissiveIntensity = 0; }

      // --- Pak Bero ---
      const bp = site === 'pisa' ? new THREE.Vector3(PX - 4.4, 0, -1.2) : site === 'ancol' ? new THREE.Vector3(CX - 4.0, 0, 0.2) : BERO_POS;
      bero.root.position.copy(bp);
      const camYaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      let anim = 'idle', yaw = camYaw;
      if (L('hook')) anim = 'think';
      else if (L('intro')) anim = 'wave';
      else if (L('jakarta')) anim = 'think';
      else if (L('taruh')) { anim = 'point'; yaw = Math.PI / 2; }
      else if (L('dukung')) anim = 'think';
      else if (L('amblas')) anim = 'panic';
      else if (L('telapak')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('sebar')) anim = 'happy';
      else if (L('air')) anim = 'think';
      else if (L('konsol')) anim = 'point';
      else if (L('turun')) anim = 'sad';
      else if (L('beda')) anim = 'think';
      else if (L('miring')) anim = 'panic';
      else if (L('tiang')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('gesek')) anim = 'point';
      else if (L('berdiri')) anim = 'happy';
      else if (site === 'pisa') { anim = t >= s('pisa2') ? 'point' : 'idle'; yaw = t >= s('pisa2') ? Math.PI / 2 : camYaw; }
      else if (site === 'ancol') anim = 'idle';
      else if (L('outro')) anim = 'wave';
      bero.pose(t, anim, { yaw });

      // --- guncangan kamera saat amblas / tiang dipukul ---
      let shake = 0;
      if (t >= s('amblas') + 0.4 && t < s('amblas') + 1.6) shake = 0.04;
      if (hammerShown) shake = 0.015;
      if (shake) { camera.position.x += Math.sin(t * 53) * shake; camera.position.y += Math.cos(t * 47) * shake; }
      return st;
    },
  };
}
