// Ep. 02 Rumah tahan gempa: adegan & animasi, diikat ke id baris di script.json.
// Semua posisi dihitung dari waktu t (deterministik).
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeOutBack, cameraAt, makeArrow, makeInstances, buildField, quake } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';

const NX = 300;                       // lokasi Omo Hada (Nias)
const FRONT = 1.4, SIDE = 1.9;        // posisi dinding (sumbu dinding)
const ROWS = 11, BH = 0.2, BL = 0.4;  // baris bata, tinggi & panjang bata
const Y0A = 0.25, Y0B = 0.45;         // dasar bata: tanpa rangka / di atas sloof
const TOPA = Y0A + ROWS * BH;         // 2.45
const TOPB = Y0B + ROWS * BH;         // 2.65 (lalu ring balok s.d. 2.85)
const RING = 0.2, TOPR = TOPB + RING;
const DOOR = [-0.45, 0.45], DOOR_ROWS = 8;
const COLS = [[-SIDE, -FRONT], [SIDE, -FRONT], [-SIDE, FRONT], [SIDE, FRONT], [-0.58, FRONT], [0.58, FRONT]];
const BERO_POS = new THREE.Vector3(-2.85, 0, 2.8);

const BRICK = ['#c4613f', '#b9583a', '#cf6c47', '#b3523a'];

// kurangi interval [a,b] dengan daftar lubang → potongan sisa
function subtract([a, b], holes) {
  let segs = [[a, b]];
  for (const [h0, h1] of holes) {
    segs = segs.flatMap(([s0, s1]) => (h1 <= s0 || h0 >= s1) ? [[s0, s1]] : [[s0, Math.min(s1, h0)], [Math.max(s0, h1), s1]].filter(([x, y]) => y - x > 0.001));
  }
  return segs.filter(([x, y]) => y - x > 0.1);
}

// tata letak bata. withCols: sisakan lubang untuk kolom praktis.
function layout(withCols, R) {
  const y0 = withCols ? Y0B : Y0A;
  const walls = [
    { along: 'x', c: FRONT, span: [-2.0, 2.0], n: [0, 1] },
    { along: 'x', c: -FRONT, span: [-2.0, 2.0], n: [0, -1] },
    { along: 'z', c: -SIDE, span: [-FRONT + 0.1, FRONT - 0.1], n: [-1, 0] },
    { along: 'z', c: SIDE, span: [-FRONT + 0.1, FRONT - 0.1], n: [1, 0] },
  ];
  const out = [];
  walls.forEach((w, wi) => {
    for (let r = 0; r < ROWS; r++) {
      const holes = [];
      if (wi === 0 && r < DOOR_ROWS) holes.push(DOOR);
      if (withCols) for (const [cx, cz] of COLS) {
        if (w.along === 'x' && Math.abs(cz - w.c) < 0.01) holes.push([cx - 0.12, cx + 0.12]);
        if (w.along === 'z' && Math.abs(cx - w.c) < 0.01) holes.push([cz - 0.12, cz + 0.12]);
      }
      const off = (r % 2) * BL / 2;
      for (let a = w.span[0] - off; a < w.span[1]; a += BL) {
        for (const [s0, s1] of subtract([Math.max(a, w.span[0]), Math.min(a + BL, w.span[1])], holes)) {
          const m = (s0 + s1) / 2, len = s1 - s0;
          const x = w.along === 'x' ? m : w.c, z = w.along === 'x' ? w.c : m;
          out.push({
            x, y: y0 + BH * (r + 0.5), z, r, wi, len, along: w.along, n: w.n,
            col: Math.floor((m + 2) / 1.1), rr: [R(), R(), R(), R()],
          });
        }
      }
    }
  });
  return out;
}

// lintasan bata yang jatuh (balistik + mendarat + meluncur sedikit)
function fallPose(b, u, k, chunk) {
  const rr = chunk ?? b.rr;
  const hFrac = clamp((b.y - 0.2) / 2.3);
  const out = (0.5 + hFrac * 1.6 + rr[0] * 0.6) * (0.3 + hFrac);
  const tang = (rr[1] - 0.5) * 1.2;
  const vx = b.n[0] * out + (b.along === 'x' ? tang : 0) + k * 0.4;
  const vz = b.n[1] * out + (b.along === 'z' ? tang : 0);
  const vy = 0.3 + rr[2] * 1.2 * hFrac;
  const y0 = b.y, ground = 0.1 + rr[3] * 0.05;
  const ul = (vy + Math.sqrt(vy * vy + 19.6 * Math.max(0, y0 - ground))) / 9.8;
  const spin = (rr[0] - 0.5) * 9 * hFrac;
  if (u < ul) return [b.x + vx * u, y0 + vy * u - 4.9 * u * u, b.z + vz * u, spin * u];
  const sl = 0.25 * (1 - Math.exp(-(u - ul) * 4));
  return [b.x + vx * (ul + sl), ground, b.z + vz * (ul + sl), spin * ul];
}

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s } = T;
  const R = rng(202);
  const field = buildField(kit, { seed: 21 });
  const nias = buildField(kit, { seed: 33, plot: 0, at: [NX, 0, 0], clear: { x0: -7, x1: 9, z0: -5, z1: 16 } });

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);
  const heldBrick = mesh(new THREE.BoxGeometry(0.4, 0.2, 0.2), BRICK[0]);
  heldBrick.position.set(0, -0.05, 0.12); bero.holdSlot.add(heldBrick);

  // ---------------- pondasi batu ----------------
  const found = new THREE.Group(); scene.add(found);
  const fMat = mat('#8f8a80');
  for (const [w, d, x, z] of [[4.3, 0.36, 0, FRONT], [4.3, 0.36, 0, -FRONT], [0.36, 2.5, -SIDE, 0], [0.36, 2.5, SIDE, 0]]) {
    const f = mesh(new THREE.BoxGeometry(w, Y0A, d), fMat); f.position.set(x, Y0A / 2, z); found.add(f);
  }

  // ---------------- bata (2 tata letak) ----------------
  const LA = layout(false, R), LB = layout(true, R);
  const brickGeo = new THREE.BoxGeometry(1, 1, 1);
  const brickMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
  const mkBricks = (L) => {
    const im = makeInstances(brickGeo, brickMat, L.length);
    const c = new THREE.Color();
    L.forEach((b, i) => im.setColorAt(i, c.set(BRICK[Math.floor(b.rr[3] * 4)])));
    im.castShadow = true; scene.add(im); return im;
  };
  const bricksA = mkBricks(LA), bricksB = mkBricks(LB);
  const mortarMat = mat('#d8d2c4');
  const mortarA = makeInstances(brickGeo, mortarMat, LA.length), mortarB = makeInstances(brickGeo, mortarMat, LB.length);
  scene.add(mortarA, mortarB);
  const d3 = new THREE.Object3D();
  const mOff = new THREE.Matrix4();
  function setBrick(im, mo, i, b, x, y, z, rot, show, mortar) {
    if (!show) { im.set(i, 0, -999, 0, 0); mo.set(i, 0, -999, 0, 0); return; }
    const rx = b.along === 'x' ? rot * 0.6 : rot, rz = b.along === 'x' ? rot : rot * 0.4;
    const sx = b.along === 'x' ? b.len - 0.02 : 0.2, sz = b.along === 'x' ? 0.2 : b.len - 0.02;
    im.set(i, x, y, z, sx, BH - 0.03, sz, rx, 0, rz);
    if (!mortar) { mo.set(i, 0, -999, 0, 0); return; }
    d3.position.set(x, y, z); d3.rotation.set(rx, 0, rz); d3.scale.set(1, 1, 1); d3.updateMatrix();
    mOff.makeTranslation(0, -BH / 2 + 0.008, 0).multiply(new THREE.Matrix4().makeScale(b.along === 'x' ? b.len + 0.01 : 0.18, 0.04, b.along === 'x' ? 0.18 : b.len + 0.01));
    mo.setMatrixAt(i, d3.matrix.clone().multiply(mOff)); mo.instanceMatrix.needsUpdate = true;
  }

  // ---------------- rangka beton bertulang ----------------
  const mkConc = () => new THREE.MeshStandardMaterial({ color: PAL.concrete, flatShading: true, roughness: 0.8, transparent: true, opacity: 1 });
  const sloofMat = mkConc(), colMat = mkConc(), ringMat = mkConc();
  const rebarMat = mat('#7c4a2e');
  function element(w, h, d, material, axis) { // grup + beton + 4 tulangan
    const g = new THREE.Group();
    const c = mesh(new THREE.BoxGeometry(w, h, d), material); g.add(c);
    const bars = [];
    for (const a of [-1, 1]) for (const b2 of [-1, 1]) {
      const len = axis === 'x' ? w : axis === 'y' ? h : d;
      const bar = mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 5), rebarMat, { shadow: false });
      if (axis === 'x') { bar.rotation.z = Math.PI / 2; bar.position.set(0, a * 0.06, b2 * 0.06); }
      if (axis === 'z') { bar.rotation.x = Math.PI / 2; bar.position.set(a * 0.06, b2 * 0.06, 0); }
      if (axis === 'y') bar.position.set(a * 0.06, 0, b2 * 0.06);
      g.add(bar); bars.push(bar);
    }
    // sengkang (begel)
    const len = axis === 'x' ? w : axis === 'y' ? h : d;
    for (let k = -len / 2 + 0.15; k < len / 2; k += 0.3) {
      const ring = mesh(new THREE.TorusGeometry(0.085, 0.01, 3, 4), rebarMat, { shadow: false });
      ring.rotation.z = Math.PI / 4;
      if (axis === 'x') { ring.rotation.set(0, Math.PI / 2, Math.PI / 4); ring.position.x = k; }
      if (axis === 'z') ring.position.z = k;
      if (axis === 'y') { ring.rotation.set(Math.PI / 2, 0, Math.PI / 4); ring.position.y = k; }
      g.add(ring); bars.push(ring);
    }
    g.conc = c; g.bars = bars; return g;
  }
  const sloof = new THREE.Group(), ringB = new THREE.Group(); scene.add(sloof, ringB);
  for (const [axis, x, z, L] of [['x', 0, FRONT, 4.1], ['x', 0, -FRONT, 4.1], ['z', -SIDE, 0, 2.6], ['z', SIDE, 0, 2.6]]) {
    const w = axis === 'x' ? L : 0.24, d = axis === 'z' ? L : 0.24;
    const e1 = element(w, Y0B - Y0A, d, sloofMat, axis); e1.position.set(x, (Y0A + Y0B) / 2, z); sloof.add(e1);
    const e2 = element(w, RING, d, ringMat, axis); e2.position.set(x, TOPB + RING / 2, z); ringB.add(e2);
  }
  const cols = COLS.map(([x, z]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, Y0A, z); scene.add(pivot);
    const e = element(0.24, TOPR - Y0A, 0.24, colMat, 'y'); e.position.y = (TOPR - Y0A) / 2; pivot.add(e);
    pivot.el = e; return pivot;
  });
  const frameEls = [...sloof.children, ...ringB.children, ...cols.map((c) => c.el)];

  // ---------------- atap (3 varian) ----------------
  const EAVE = 1.9, RISE = 1.05, DROP = 0.22;
  function roof(kind) {
    const g = new THREE.Group(); scene.add(g);
    const th = kind === 'heavy' ? 0.2 : kind === 'light' ? 0.05 : 0.1;
    const color = kind === 'heavy' ? '#9c4434' : kind === 'light' ? '#a9c3cf' : '#a0643a';
    const ang = Math.atan2(RISE + DROP, EAVE);
    const L = Math.hypot(EAVE, RISE + DROP) + 0.05;
    for (const sd of [-1, 1]) {
      const slab = new THREE.Group(); g.add(slab);
      slab.position.set(0, (RISE - DROP) / 2, sd * EAVE / 2); slab.rotation.x = sd * ang;
      const p = mesh(new THREE.BoxGeometry(4.6, th, L), color); p.position.y = th / 2; slab.add(p);
      if (kind === 'heavy') for (let k = 0; k < 7; k++) { // barisan genteng
        const rib = mesh(new THREE.BoxGeometry(4.6, 0.07, 0.12), '#83382b'); rib.position.set(0, th + 0.03, -L / 2 + 0.2 + k * (L - 0.3) / 6); slab.add(rib);
      }
      if (kind === 'light') for (let k = 0; k < 15; k++) { // gelombang seng
        const rib = mesh(new THREE.BoxGeometry(0.04, 0.03, L), '#d5e4ea', { shadow: false }); rib.position.set(-2.2 + k * 0.315, th + 0.015, 0); slab.add(rib);
      }
    }
    const ridge = mesh(new THREE.BoxGeometry(4.7, 0.12, 0.2), kind === 'heavy' ? '#83382b' : kind === 'light' ? '#8fb0bf' : '#7a4a2a');
    ridge.position.y = RISE + 0.06 + th * 0.6; g.add(ridge);
    const tri = new THREE.Shape(); tri.moveTo(-FRONT, 0); tri.lineTo(FRONT, 0); tri.lineTo(0, RISE * 0.93); tri.closePath();
    for (const sx of [-1, 1]) {
      const gb = new THREE.ExtrudeGeometry(tri, { depth: 0.08, bevelEnabled: false });
      gb.rotateY(Math.PI / 2);
      const m = mesh(gb, '#f1e3c6'); m.position.x = sx * SIDE - 0.04; g.add(m);
    }
    return g;
  }
  const roofWood = roof('wood'), roofHeavy = roof('heavy'), roofLight = roof('light');

  // ---------------- retak ----------------
  const crackMat = mat('#3a1c12', { emissive: '#ff5a5f', emissiveIntensity: 0.25 });
  function crackPath(pts, z) {
    const g = new THREE.Group(); scene.add(g);
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0);
      const m = mesh(new THREE.BoxGeometry(1, 0.05, 0.03), crackMat, { shadow: false });
      m.position.set(x0, y0, z); m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      m.geometry.translate(0.5, 0, 0); m.scale.x = L; m.L = L; g.add(m); segs.push(m);
    }
    g.segs = segs; return g;
  }
  const zig = (x0, y0, x1, y1, n, amp, R2) => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n; const j = i === 0 || i === n ? 0 : (R2() - 0.5) * amp;
    return [lerp(x0, x1, u) + j, lerp(y0, y1, u) + j * 0.5];
  });
  const R3 = rng(9);
  const wallCracks = [
    crackPath(zig(-1.85, 0.4, -0.55, 2.3, 9, 0.18, R3), FRONT + 0.12),
    crackPath(zig(-1.85, 2.3, -0.55, 0.45, 9, 0.18, R3), FRONT + 0.12),
    crackPath(zig(1.85, 0.4, 0.55, 2.3, 9, 0.18, R3), FRONT + 0.12),
    crackPath(zig(1.85, 2.3, 0.55, 0.45, 9, 0.18, R3), FRONT + 0.12),
  ];
  const colCracks = [[-SIDE, FRONT], [SIDE, FRONT], [-0.58, FRONT], [0.58, FRONT]].map(([x]) => crackPath(zig(-0.11, 0, 0.11, -0.25, 4, 0.08, R3), 0.13));
  colCracks.forEach((c, i) => { scene.remove(c); cols[[2, 3, 4, 5][i]].el.add(c); c.position.y = (TOPR - Y0A) / 2 - 0.25; });

  // ---------------- panah ----------------
  const arrows = Array.from({ length: 6 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const hideArrows = () => arrows.forEach((a) => (a.visible = false));
  function arrowAt(i, x, y, z, dir, L, down = false) {
    const a = arrows[i]; a.visible = L > 0.05; a.setLength(L);
    if (down) { a.rotation.set(0, 0, -Math.PI / 2); a.position.set(x, y + L, z); }
    else { a.rotation.set(0, dir > 0 ? 0 : Math.PI, 0); a.position.set(x - dir * L / 2, y, z); }
  }

  // ---------------- debu ----------------
  const DUST = 60;
  const dust = makeInstances(new THREE.IcosahedronGeometry(0.25, 1), new THREE.MeshBasicMaterial({ color: '#f1e6d2', transparent: true, opacity: 0.55, depthWrite: false }), DUST);
  scene.add(dust);
  const dustSeeds = Array.from({ length: DUST }, () => [R(), R(), R()]);
  function puff(t, t0) {
    const u = t - t0;
    dustSeeds.forEach(([a, b, c], i) => {
      const uu = u - c * 0.6;
      if (uu < 0 || uu > 2.2) { dust.set(i, 0, -999, 0, 0); return; }
      const ang = a * Math.PI * 2, r = 1.2 + easeOut(uu / 2.2) * (1.6 + b * 1.5);
      const sc = (0.6 + b) * Math.sin(Math.PI * clamp(uu / 2.2)) * 1.6;
      dust.set(i, Math.cos(ang) * r * 1.2, 0.3 + uu * 0.9 * (0.5 + b), Math.sin(ang) * r * 0.9, sc);
    });
  }

  // ---------------- Omo Hada (Nias) ----------------
  const omo = new THREE.Group(); omo.position.x = NX; scene.add(omo);
  const omoBody = new THREE.Group(); omo.add(omoBody);
  const stones = new THREE.Group(); nias.root.add(stones);
  const wood = '#7a4b2a', woodL = '#9a6a3f';
  const POST_H = 1.6;
  const postXZ = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; postXZ.push([Math.cos(a) * 2.1, Math.sin(a) * 1.4]); }
  postXZ.push([-0.8, 0], [0.8, 0]);
  postXZ.forEach(([x, z], i) => {
    const st = mesh(new THREE.DodecahedronGeometry(0.32, 0), PAL.rock); st.scale.set(1.2, 0.45, 1.2); st.position.set(x, 0.1, z); st.rotation.y = i; stones.add(st);
    const p = mesh(new THREE.CylinderGeometry(0.11, 0.13, POST_H, 7), wood); p.position.set(x, 0.24 + POST_H / 2, z); omoBody.add(p);
  });
  // tiang diagonal (silang)
  for (let i = 0; i < 10; i += 2) {
    const [x0, z0] = postXZ[i], [x1, z1] = postXZ[(i + 3) % 10];
    const len = Math.hypot(x1 - x0, POST_H, z1 - z0);
    const d = mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 6), woodL);
    d.position.set((x0 + x1) / 2, 0.24 + POST_H / 2, (z0 + z1) / 2);
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, POST_H, z1 - z0).normalize());
    omoBody.add(d);
  }
  const floor = mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.2, 18), wood); floor.scale.z = 0.7; floor.position.y = 0.24 + POST_H + 0.1; omoBody.add(floor);
  const wallO = mesh(new THREE.CylinderGeometry(2.3, 2.35, 1.0, 18, 1, true), new THREE.MeshStandardMaterial({ color: woodL, flatShading: true, side: THREE.DoubleSide })); wallO.scale.z = 0.7; wallO.position.y = floor.position.y + 0.6; omoBody.add(wallO);
  const band = mesh(new THREE.CylinderGeometry(2.37, 2.37, 0.14, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#4a2f1d', flatShading: true, side: THREE.DoubleSide })); band.scale.z = 0.7; band.position.y = floor.position.y + 0.9; omoBody.add(band);
  const roofO = mesh(new THREE.ConeGeometry(3.0, 3.4, 18), '#8c6b3e'); roofO.scale.z = 0.72; roofO.position.y = floor.position.y + 1.1 + 1.7; omoBody.add(roofO);
  const groundArrow = [makeArrow(), makeArrow()]; groundArrow.forEach((a) => scene.add(a));

  // ---------------- kamera ----------------
  const BERO_CLOSE = { pos: [-1.9, 1.9, 8.6], look: [-2.2, 1.1, 2.8], fov: 46 };
  const camKeys = [
    { t: 0, ...BERO_CLOSE },
    { t: s('bmkg'), pos: [0.6, 5.5, 13.5], look: [-0.2, 1.0, 0], blend: 1.4 },
    { t: s('tumpuk'), pos: [-0.4, 3.4, 11.2], look: [-0.5, 1.3, 0], blend: 1.0 },
    { t: s('lateral'), pos: [-0.4, 2.3, 10.6], look: [-0.4, 1.0, 0], blend: 1.0 },
    { t: s('semen'), pos: [0.9, 2.9, 10.4], look: [-0.2, 1.3, 0], blend: 1.0 },
    { t: s('kuat'), pos: [0.5, 3.7, 12.2], look: [-0.3, 2.0, 0], blend: 0.9 },
    { t: s('getas'), pos: [0.4, 2.0, 8.2], look: [0.1, 1.3, 1.2], blend: 1.2 },
    { t: s('runtuh'), pos: [0.6, 3.0, 10.6], look: [0, 1.0, 0], blend: 0.8 },
    { t: s('rangka'), pos: [6.2, 5.2, 9.4], look: [0, 1.4, 0], blend: 1.2 },
    { t: s('kolom'), pos: [5.4, 3.8, 9.0], look: [0, 1.5, 0.4], blend: 1.0 },
    { t: s('ringbalk'), pos: [5.2, 6.0, 8.6], look: [0, 2.2, 0.3], blend: 1.0 },
    { t: s('atap'), pos: [0.8, 4.0, 11.8], look: [-0.3, 2.3, 0], blend: 1.2 },
    { t: s('oleng'), pos: [0.2, 3.8, 12.6], look: [-0.4, 2.1, 0], blend: 1.0 },
    { t: s('ringan'), pos: [5.6, 4.8, 10], look: [0, 2.0, 0], blend: 1.2 },
    { t: s('datang'), pos: [-1.6, 4.0, 13.4], look: [-0.6, 1.9, 0], blend: 1.4 },
    { t: s('berdiri'), pos: [-4.6, 3.0, 10.4], look: [-0.6, 1.7, 0], blend: 1.8 },
    { t: s('nias1'), cut: true, pos: [NX + 6.5, 4.0, 10.5], look: [NX, 2.0, 0] },
    { t: s('nias2'), pos: [NX - 4.5, 3.4, 10.5], look: [NX, 2.3, 0], blend: 3.0 },
    { t: s('nias3'), pos: [NX + 3.4, 1.4, 7.0], look: [NX + 1.4, 0.7, 0.8], blend: 1.2 },
    { t: s('nias4'), pos: [NX + 2.2, 1.6, 8.6], look: [NX + 0.6, 1.0, 0], blend: 1.4 },
    { t: s('outro'), cut: true, ...BERO_CLOSE },
  ];

  // ---------------- Update per frame ----------------
  return {
    update(t) {
      const P = (a, b, pad) => T.p(t, a, b, pad);
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const phase =
        t < s('tumpuk') ? 'plot' :
        t < s('semen') ? 'stack' :
        t < s('rangka') ? 'mortar' :
        t < s('atap') ? 'frame' :
        t < s('ringan') ? 'heavy' :
        t < s('nias1') ? 'light' :
        t < s('outro') ? 'nias' : 'outro';

      // --- gempa: amplitudo tanah (A) & goyang atas rumah (S) ---
      const env = (a, b, rise = 0.5) => smooth((t - s(a)) / rise) * (1 - smooth((t - T.e(b) + 0.3) / 0.5));
      let A = 0, S = 0;
      if (L('bmkg')) A = 0.035 * env('bmkg', 'bmkg');
      if (t >= s('goyang') && t < s('semen')) A = 0.13 * smooth((t - s('goyang')) / 0.6) * (1 - smooth((t - s('ambruk') - 1.2) / 0.8));
      if (t >= s('getas') && t < s('rangka')) A = 0.13 * smooth((t - s('getas')) / 0.6) * (1 - smooth((t - s('runtuh') - 1.0) / 0.8));
      if (L('satu')) { A = 0.08 * env('satu', 'satu'); S = 0.025 * A / 0.08; }
      if (t >= s('inersia') && t < s('ringan')) {
        A = 0.14 * smooth((t - s('inersia')) / 0.6) * (1 - smooth((t - s('ringan') + 0.4) / 0.4));
        S = A * (t >= s('oleng') ? 2.1 : 0.9);
      }
      if (t >= s('datang') && t < s('nias1')) {
        A = 0.14 * smooth((t - s('datang')) / 0.5) * (1 - smooth((t - s('berdiri') - 0.6) / 1.0));
        S = A * 0.35;
      }
      if (t >= s('nias3') && t < s('outro')) A = 0.32 * smooth((t - s('nias3')) / 0.6) * (1 - smooth((t - s('outro') + 0.6) / 0.5));
      const gx = quake(t, A), sway = quake(t - 0.07, S);
      field.root.position.x = phase === 'nias' ? 0 : gx;
      nias.root.position.x = NX + (phase === 'nias' ? gx : 0);
      found.position.x = gx;

      // --- langit & matahari ---
      setSky(phase === 'nias' ? 0.1 : 0);
      const sunX = phase === 'nias' ? NX : 0;
      sun.position.set(sunX - 14, 22, 12); sun.target.position.set(sunX, 0, 0);

      // --- bata ---
      const showA = phase === 'stack' || phase === 'mortar';
      const showB = ['frame', 'heavy', 'light', 'outro', 'nias'].includes(phase);
      const mortared = phase === 'mortar';
      // munculnya bata per baris
      const buildA = phase === 'stack' ? P('tumpuk') * 1.25 : smooth(P('semen') * 1.6) * 1.05;
      const tFall1 = s('ambruk') + 0.15, tFall2 = s('runtuh') + 0.05;
      LA.forEach((b, i) => {
        if (!showA) { setBrick(bricksA, mortarA, i, b, 0, 0, 0, 0, false); return; }
        const app = clamp((buildA - b.r / ROWS) * ROWS * 0.6);
        if (app <= 0) { setBrick(bricksA, mortarA, i, b, 0, 0, 0, 0, false); return; }
        let x = b.x + gx, y = b.y + (1 - easeOut(app)) * 1.2, z = b.z, rot = 0;
        if (phase === 'stack') {
          // tanpa perekat: tiap baris tergelincir sendiri
          const lag = (b.r / ROWS) * 0.6;
          x = b.x + quake(t - lag * 0.25, A) * (1 - lag * 0.8) + Math.sin(t * 15 + b.rr[0] * 9) * A * 0.4 * (b.r / ROWS);
          const u = t - tFall1 - (TOPA - b.y) * 0.1 - b.rr[1] * 0.12;
          if (u > 0) [x, y, z, rot] = fallPose(b, u, Math.sign(gx));
        } else {
          x += sway * 0;
          const chunk = LA[i - (i % 5)]?.rr ?? b.rr;
          const u = t - tFall2 - (TOPA - b.y) * 0.08 - chunk[1] * 0.25;
          if (u > 0 && !(b.wi === 1 && b.r < 3)) [x, y, z, rot] = fallPose(b, u, 0, [chunk[0], b.rr[1] * 0.4 + 0.3, chunk[2], b.rr[3]]);
        }
        setBrick(bricksA, mortarA, i, b, x, y, z, rot, true, mortared);
      });
      // tata letak B: rumah dengan rangka (goyang geser)
      const buildB = phase === 'frame' ? smooth(P('rangka') * 2.2) * 1.05 : 1;
      LB.forEach((b, i) => {
        if (!showB) { setBrick(bricksB, mortarB, i, b, 0, 0, 0, 0, false); return; }
        const app = clamp((buildB - b.r / ROWS) * ROWS * 0.6);
        if (app <= 0) { setBrick(bricksB, mortarB, i, b, 0, 0, 0, 0, false); return; }
        const x = b.x + gx + sway * (b.y - Y0B) / (TOPB - Y0B);
        setBrick(bricksB, mortarB, i, b, x, b.y + (1 - easeOut(app)) * 1.2, b.z, 0, true, true);
      });
      if (phase === 'nias') { bricksB.visible = mortarB.visible = false; } else { bricksB.visible = mortarB.visible = true; }

      // --- rangka beton ---
      const showFrame = showB && phase !== 'nias';
      sloof.visible = ringB.visible = showFrame; cols.forEach((c) => (c.visible = showFrame));
      const barP = phase === 'frame' ? smooth(P('rangka') * 1.6) : 1;
      const concOp = (id) => (phase !== 'frame' ? 1 : t < s(id) ? (t >= s('rangka') + 0.3 ? 0.28 : 0.0) : lerp(0.28, 1, smooth((t - s(id) - 0.2) / 0.7)));
      sloofMat.opacity = concOp('sloof'); colMat.opacity = concOp('kolom'); ringMat.opacity = concOp('ringbalk');
      [sloofMat, colMat, ringMat].forEach((m) => { m.transparent = m.opacity < 0.999; m.depthWrite = m.opacity > 0.5; });
      frameEls.forEach((e) => { e.bars.forEach((b) => (b.visible = barP > 0.02)); e.scale.setScalar(1); e.conc.visible = (e.conc.material.opacity > 0.01); });
      frameEls.forEach((e) => e.bars.forEach((b) => b.scale.set(1, Math.max(0.01, barP), 1)));
      // sorotan (highlight) & ikatan
      const glow = (m, a) => { m.emissive.set(PAL.arrow); m.emissiveIntensity = a; };
      const hl = (id) => (L(id) ? 0.35 * Math.sin(Math.PI * clamp((t - s(id)) / (T.e(id) - s(id)))) : 0);
      let gS = hl('sloof'), gC = hl('kolom'), gR = hl('ringbalk');
      if (L('ikat')) { const u = P('ikat'); gS = Math.max(gS, 0.45 * Math.sin(Math.PI * clamp(u * 2.2))); gC = Math.max(gC, 0.45 * Math.sin(Math.PI * clamp(u * 2.2 - 0.5))); gR = Math.max(gR, 0.45 * Math.sin(Math.PI * clamp(u * 2.2 - 1.0))); }
      glow(sloofMat, gS); glow(colMat, gC); glow(ringMat, gR);
      sloof.position.x = gx; ringB.position.x = gx + sway;
      cols.forEach((c) => { c.position.x = COLS[cols.indexOf(c)][0] + gx; c.rotation.z = -Math.atan2(sway, TOPR - Y0A); });

      // --- atap ---
      roofWood.visible = (phase === 'stack' && t < s('goyang') + 99) || phase === 'mortar';
      roofWood.visible = roofWood.visible && ((phase === 'stack' && t >= s('tumpuk') + 1.8) || (phase === 'mortar' && t >= s('kuat') - 0.4));
      if (roofWood.visible) {
        const t0 = phase === 'stack' ? s('tumpuk') + 1.8 : s('kuat') - 0.4;
        const drop = 1 - easeOutBack((t - t0) / 0.6);
        let x = gx, y = TOPA + drop * 1.5, rx = 0, rz = 0;
        const tf = phase === 'stack' ? tFall1 + 0.3 : tFall2 + 0.35;
        const u = t - tf;
        if (u > 0) { const k = easeOut(u / 0.9); y = lerp(TOPA, 0.55, k); rz = 0.22 * k; rx = (phase === 'stack' ? 0.18 : -0.15) * k; x = gx + 0.3 * k; }
        roofWood.position.set(x, y, 0); roofWood.rotation.set(rx, 0, rz);
      }
      const heavyIn = phase === 'heavy' ? 1 - easeOutBack((t - s('atap') - 0.2) / 0.7) : (phase === 'light' ? -smooth((t - s('ringan')) / 0.9) * 0 : 1);
      roofHeavy.visible = phase === 'heavy' || (phase === 'light' && t < s('ringan') + 0.9);
      if (roofHeavy.visible) {
        const lift = phase === 'light' ? easeOut((t - s('ringan')) / 0.9) * 6 : 0;
        roofHeavy.position.set(gx + sway + lift * 0.4, TOPR + Math.max(0, heavyIn) * 3 + lift, 0);
      }
      roofLight.visible = (phase === 'light' && t >= s('ringan') + 0.5) || phase === 'outro';
      if (roofLight.visible) {
        const d = phase === 'light' ? 1 - easeOutBack((t - s('ringan') - 0.5) / 0.6) : 0;
        roofLight.position.set(gx + sway, TOPR + d * 2.5, 0);
      }
      roofHeavy.rotation.z = roofLight.rotation.z = 0;

      // --- retak ---
      const crP = L('retak', 'runtuh') ? smooth((t - s('retak')) / 1.0) : 0;
      wallCracks.forEach((c, k) => {
        c.visible = crP > 0 && t < tFall2 + 0.15; c.position.x = gx;
        const n = c.segs.length; c.segs.forEach((m, i) => { const q = clamp(crP * n * 1.1 - i - k * 0.3); m.visible = q > 0; m.scale.x = Math.max(0.01, m.L * q); });
      });
      const ccP = phase === 'heavy' && t >= s('oleng') ? smooth((t - s('oleng') - 0.4) / 1.0) : 0;
      colCracks.forEach((c) => {
        c.visible = ccP > 0; const n = c.segs.length;
        c.segs.forEach((m, i) => { const q = clamp(ccP * n - i); m.visible = q > 0; m.scale.x = Math.max(0.01, m.L * q); });
      });

      // --- debu runtuh ---
      if (t >= tFall1 && t < tFall1 + 2.8) puff(t, tFall1 + 0.4);
      else if (t >= tFall2 && t < tFall2 + 2.8) puff(t, tFall2 + 0.4);
      else dust.hideAll();

      // --- panah ---
      hideArrows(); groundArrow.forEach((a) => (a.visible = false));
      const dir = Math.sign(quake(t, 1)) || 1;
      if (t >= s('lateral') && t < s('ambruk') + 0.4) { // gaya lateral di tanah
        const g = smooth((t - s('lateral')) / 0.4);
        arrowAt(0, gx + 0.9, 0.35, 2.6, 1, 1.6 * g); arrowAt(1, gx - 0.9, 0.35, 2.6, -1, 1.6 * g);
        st.labels.push({ text: 'Gaya lateral', pos: [gx, 0.35, 2.6], tone: 'yellow', alpha: smooth((t - s('lateral') - 0.4) / 0.3), up: 40 });
      }
      if (L('kuat')) { // beban dari atas
        const g = smooth((t - s('kuat') - 0.4) / 0.4);
        [-1.2, 0, 1.2].forEach((x, i) => arrowAt(i, x, TOPA + RISE * (1 - Math.abs(x) / 2.2) + 0.15, 0.9, 0, 0.9 * g, true));
      }
      if (L('getas')) {
        const g = smooth((t - s('getas') - 0.3) / 0.4);
        arrowAt(0, gx + 1.0, 1.4, 2.0, dir, 1.0 * g + 0.4 * g * Math.abs(quake(t, 1)) / 1.3);
      }
      if (t >= s('inersia') && t < s('ringan')) { // gaya gempa besar di atap berat
        const g = smooth((t - s('inersia')) / 0.4);
        const m = Math.abs(sway) / 0.3;
        const sd = Math.sign(sway) || 1;
        arrowAt(0, gx + sway, TOPR + 0.6, 2.3, sd, (0.6 + 2.2 * m) * g);
        st.labels.push({ text: 'Atap berat', pos: [gx + sway - 1.2, TOPR + 0.8, 0.6], tone: 'red', alpha: smooth((t - s('atap') - 0.9) / 0.3) * (t < s('oleng') ? 1 : 0), up: 50 });
      } else if (L('atap')) {
        st.labels.push({ text: 'Atap berat', pos: [-1.2, TOPR + 0.8, 0.6], tone: 'red', alpha: smooth((t - s('atap') - 0.9) / 0.3), up: 50 });
      }
      if (t >= s('datang') && t < s('berdiri') + 0.8) {
        const g = smooth((t - s('datang')) / 0.4) * (1 - smooth((t - s('berdiri') - 0.3) / 0.4));
        const sd = Math.sign(sway) || 1;
        arrowAt(0, gx + sway, TOPR + 0.6, 2.3, sd, (0.4 + 0.5 * Math.abs(sway) / 0.05) * g);
      }

      // --- label istilah ---
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_POS.x, 1.75, BERO_POS.z], alpha: smooth((t - s('intro') - 0.3) / 0.3), up: 34, tone: 'yellow' });
      if (L('semen')) st.labels.push({ text: 'Semen', pos: [-1.0 + gx, 1.0, FRONT + 0.1], alpha: smooth((t - s('semen') - 0.8) / 0.3), up: 60, tone: 'yellow' });
      if (L('getas')) st.labels.push({ text: 'Getas', pos: [-1.2 + gx, 1.6, FRONT + 0.1], alpha: smooth((t - s('getas') - 0.4) / 0.3), up: 50, tone: 'yellow' });
      if (L('retak')) st.labels.push({ text: 'Retak', pos: [-1.2 + gx, 1.35, FRONT + 0.12], alpha: smooth((t - s('retak') - 0.5) / 0.3), up: 70, tone: 'red' });
      if (L('rangka')) st.labels.push({ text: 'Beton bertulang', pos: [SIDE, 1.6, FRONT], alpha: smooth((t - s('rangka') - 1.0) / 0.3), up: 90 });
      if (L('sloof')) st.labels.push({ text: 'Sloof', pos: [0.9, 0.35, FRONT + 0.1], alpha: smooth((t - s('sloof') - 0.2) / 0.3), up: 50, tone: 'yellow' });
      if (L('kolom')) st.labels.push({ text: 'Kolom praktis', pos: [SIDE, 1.5, FRONT], alpha: smooth((t - s('kolom') - 0.2) / 0.3), up: 70, tone: 'yellow' });
      if (L('ringbalk')) st.labels.push({ text: 'Ring balok', pos: [0.9, TOPB + 0.1, FRONT], alpha: smooth((t - s('ringbalk') - 0.2) / 0.3), up: 60, tone: 'yellow' });
      if (L('oleng')) st.labels.push({ text: 'Retak', pos: [SIDE + gx + sway, TOPR - 0.35, FRONT + 0.13], alpha: smooth((t - s('oleng') - 0.9) / 0.3), up: 60, tone: 'red' });
      if (L('ringan')) st.labels.push({ text: 'Atap ringan', pos: [-0.8, TOPR + 0.9, 0.6], alpha: smooth((t - s('ringan') - 1.0) / 0.3), up: 60, tone: 'yellow' });

      // --- kartu ---
      if (L('bmkg')) st.card = { title: 'BMKG · 2024', body: '± 29.869 gempa tercatat di Indonesia', top: 0.12, alpha: smooth((t - s('bmkg') - 0.6) / 0.4) };

      // --- Nias (tenang, serius) ---
      omo.visible = phase === 'nias';
      if (phase === 'nias') {
        omoBody.position.x = gx * 0.22;            // rumah tertinggal: bergeser di atas batu
        if (L('nias1')) st.card = { title: 'Gempa Nias · 28 Maret 2005', body: 'Magnitudo 8,6 · Sumatera Utara', top: 0.11, alpha: smooth((t - s('nias1') - 0.3) / 0.5) };
        if (L('nias2')) st.card = { title: 'Omo Hada · Nias Utara', body: 'Rumah adat berdenah oval di atas tiang kayu', top: 0.11, alpha: smooth((t - s('nias2') - 0.3) / 0.5) };
        if (t >= s('nias3')) {
          st.labels.push({ text: 'Batu', pos: [NX + postXZ[1][0] + gx, 0.25, postXZ[1][1]], alpha: smooth((t - s('nias3') - 1.0) / 0.3), up: 70, tone: 'yellow' });
          const g = smooth((t - s('nias3') - 0.4) / 0.4);
          const sd = Math.sign(gx) || 1;
          groundArrow.forEach((a) => { a.visible = true; a.setLength((0.4 + 1.4 * Math.abs(gx) / 0.4) * g + 0.01); });
          groundArrow[0].rotation.set(0, sd > 0 ? 0 : Math.PI, 0);
          groundArrow[0].position.set(NX + 1.2 + gx - sd * 0.5, 0.15, 1.9);
          groundArrow[1].visible = false;
        }
      }

      // --- Pak Bero ---
      const home = phase !== 'nias';
      const bp = home ? BERO_POS.clone() : new THREE.Vector3(NX - 3.3, 0, 2.6);
      bero.root.position.set(bp.x + (home ? gx : gx * 0), 0, bp.z);
      const camYaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      let anim = 'idle', yaw = camYaw, hold = false;
      if (L('hook')) { anim = 'carry'; hold = true; yaw = lerp(Math.PI / 2, camYaw, smooth(P('hook') * 2)); }
      else if (L('intro')) anim = 'wave';
      else if (L('bmkg')) anim = 'think';
      else if (L('tumpuk')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('goyang')) anim = 'think';
      else if (L('lateral')) anim = 'point';
      else if (L('ambruk')) anim = 'panic';
      else if (L('semen')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('kuat')) anim = 'happy';
      else if (L('getas')) anim = 'think';
      else if (L('retak', 'runtuh')) anim = 'panic';
      else if (L('rangka', 'ringbalk')) { anim = t < s('sloof') ? 'slap' : 'point'; yaw = t < s('sloof') ? Math.PI / 2 : camYaw; }
      else if (L('satu')) anim = 'happy';
      else if (L('atap')) anim = 'point';
      else if (L('inersia')) anim = 'think';
      else if (L('oleng')) anim = 'panic';
      else if (L('ringan', 'ikat')) { anim = 'slap'; yaw = Math.PI / 2; }
      else if (L('datang')) anim = 'idle';
      else if (L('berdiri')) anim = 'happy';
      else if (phase === 'nias') { anim = t >= s('nias3') ? 'point' : 'idle'; yaw = t >= s('nias3') ? Math.PI / 2 : camYaw; }
      else if (phase === 'outro') anim = 'wave';
      heldBrick.visible = hold;
      bero.pose(t, anim, { yaw });

      // --- guncangan kamera ---
      const shake = Math.min(0.08, A * 0.45) + (t >= tFall1 && t < tFall1 + 0.8 ? 0.06 : 0) + (t >= tFall2 && t < tFall2 + 0.8 ? 0.06 : 0);
      if (shake) { camera.position.x += Math.sin(t * 53) * shake; camera.position.y += Math.cos(t * 47) * shake; }
      return st;
    },
  };
}
