// Ep. 07 Gedung pencakar langit vs angin: tanah lapang, gedung di tengah.
// Bata (dinding pemikul) → rangka baja → pengaku + inti → pusaran angin
// (tampak atas) → sudut bertangga → topan → peredam massa → Taipei 101.
// Semua posisi dihitung dari waktu t (deterministik).
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeOutBack, makeArrow, makeInstances, buildField, makeRain } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';
import { createTower } from '/engine/tower.js';

const A = 1.2, ROWS = 30, BH = 0.2, HB = ROWS * BH;   // menara bata: setengah lebar, baris, tinggi
const FX = 300, RX = 600;                           // Taipei 101, ruang peredam
const BERO_HOME = new THREE.Vector3(-2.3, 0, 1.9);
const BRICK = ['#c4613f', '#b9583a', '#cf6c47', '#b3523a'];

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(707);
  const dur = (id) => e(id) - s(id);
  const at = (id, f) => s(id) + dur(id) * f;

  const field = buildField(kit, { seed: 71, plot: 3.2, clear: { x0: -8, x1: 8, z0: -6, z1: 26 } });
  const taipeiGround = buildField(kit, { seed: 72, plot: 0, at: [FX, 0, 0], trees: 70, clear: { x0: -14, x1: 14, z0: -14, z1: 90 } });

  // ---------------- menara bata ----------------
  const bricks = [];
  for (let r = 0; r < ROWS; r++) for (let w = 0; w < 4; w++) {
    const segs = r % 2 ? [[-1.2, -1.0], ...[0, 1, 2, 3, 4].map((k) => [-1.0 + k * 0.4, -0.6 + k * 0.4]), [1.0, 1.2]] : [0, 1, 2, 3, 4, 5].map((k) => [-1.2 + k * 0.4, -0.8 + k * 0.4]);
    for (const [u0, u1] of segs) bricks.push({ r, w, u0, u1, c: Math.floor(R() * 4) });
  }
  const brickIM = makeInstances(new THREE.BoxGeometry(1, 1, 1), mat('#ffffff'), bricks.length);
  brickIM.castShadow = true;
  bricks.forEach((b, i) => brickIM.setColorAt(i, new THREE.Color(BRICK[b.c])));
  scene.add(brickIM);
  const thick = (y, k) => 0.2 + k * 0.85 * (1 - y / HB);
  // ruangan (potongan) per lantai bata
  const rooms = Array.from({ length: 6 }, (_, k) => {
    const m = mesh(new THREE.BoxGeometry(1, 0.86, 1), new THREE.MeshStandardMaterial({ color: '#ffe3a3', transparent: true, opacity: 0.55, depthWrite: false }), { shadow: false });
    m.userData.y = k + 0.5; scene.add(m); return m;
  });
  const floorsB = Array.from({ length: 6 }, (_, k) => { const m = mesh(new THREE.BoxGeometry(1, 0.06, 1), '#a8784f', { shadow: false }); m.userData.y = k; scene.add(m); return m; });

  // ---------------- gedung rangka baja ----------------
  const tower = createTower({ N: 28, FH: 0.5 });
  const H = tower.H;
  scene.add(tower.root);
  // peredam massa
  const damper = new THREE.Group(); scene.add(damper);
  const ballM = new THREE.MeshStandardMaterial({ color: '#f2c443', metalness: 0.3, roughness: 0.35, flatShading: true, emissive: '#a87a12', emissiveIntensity: 0.7 });
  const ball = mesh(new THREE.IcosahedronGeometry(0.55, 1), ballM); damper.add(ball);
  const cableM = mat('#2b2f33');
  const cables = Array.from({ length: 4 }, () => { const c = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), cableM, { shadow: false }); damper.add(c); return c; });
  const seg = (m, va, vb) => { m.position.copy(va).add(vb).multiplyScalar(0.5); m.scale.set(1, va.distanceTo(vb), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); };

  // ---------------- angin: garis partikel ----------------
  const NW = 150;
  const wind = makeInstances(new THREE.BoxGeometry(1, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }), NW);
  scene.add(wind);
  const windSeeds = Array.from({ length: NW }, () => [R(), R(), R(), R()]);
  // pusaran (tampak atas)
  const NV = 260;
  const vort = makeInstances(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: '#eaf8ff' }), NV);
  scene.add(vort);
  const rain = makeRain(kit, 600, [34, 20, 24], [0, 9, 3]);
  // bintang pusing
  const stars = Array.from({ length: 3 }, () => { const m = mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), { shadow: false }); scene.add(m); return m; });

  // ---------------- Taipei 101 (x=FX) ----------------
  const tp = new THREE.Group(); tp.position.x = FX; scene.add(tp);
  const tpGlass = mat('#4d8f8c', { roughness: 0.35, metalness: 0.2 });
  const frust = (wBot, wTop, h, y, m = tpGlass) => { const g = mesh(new THREE.CylinderGeometry(wTop / Math.SQRT2, wBot / Math.SQRT2, h, 4), m); g.rotation.y = Math.PI / 4; g.position.y = y + h / 2; tp.add(g); return g; };
  frust(14, 14, 3, 0, mat('#8fa3a8'));                 // podium
  frust(8, 6.2, 9, 3);                                   // dasar meruncing
  const SEG0 = 12, SEGH = 4.4;
  for (let k = 0; k < 8; k++) frust(5.6, 7.0, SEGH - 0.15, SEG0 + k * SEGH);
  const TOP8 = SEG0 + 8 * SEGH;
  frust(4.6, 4.0, 2.2, TOP8); frust(3.2, 2.6, 2.0, TOP8 + 2.2);
  const spire = mesh(new THREE.CylinderGeometry(0.15, 0.5, 9, 6), '#c9ced3'); spire.position.y = TOP8 + 4.2 + 4.5; tp.add(spire);
  const band = mesh(new THREE.CylinderGeometry(7.3 / Math.SQRT2, 6.9 / Math.SQRT2, 1.8, 4), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.0, depthWrite: false }), { shadow: false });
  band.rotation.y = Math.PI / 4; band.position.y = TOP8 - 1.3; tp.add(band);

  // ---------------- ruang peredam (x=RX) ----------------
  const room = new THREE.Group(); room.position.x = RX; scene.add(room);
  {
    const fl = mesh(new THREE.BoxGeometry(18, 0.3, 14), '#8b939a'); fl.position.set(0, -0.15, 0); room.add(fl);
    const bw = mesh(new THREE.BoxGeometry(18, 13, 0.3), '#5f6b75'); bw.position.set(0, 6.5, -6); room.add(bw);
    for (let k = -2; k <= 2; k++) { const w = mesh(new THREE.BoxGeometry(2.4, 3.2, 0.05), new THREE.MeshBasicMaterial({ color: '#9fb4c2' }), { shadow: false }); w.position.set(k * 3.4, 8.5, -5.82); room.add(w); }
    const cl = mesh(new THREE.BoxGeometry(18, 0.4, 14), '#4c565f', { shadow: false }); cl.position.set(0, 12.6, 0); room.add(cl);
    for (const x of [-7, 7]) { const c = mesh(new THREE.BoxGeometry(0.8, 13, 0.8), '#6f7b85'); c.position.set(x, 6.5, -3); room.add(c); }
    const pit = mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.12, 24), '#c9ced3'); pit.position.y = 0.06; room.add(pit);
  }
  const bigBall = mesh(new THREE.IcosahedronGeometry(2.75, 2), ballM); scene.add(bigBall);
  const bigCables = Array.from({ length: 8 }, () => { const c = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), cableM, { shadow: false }); scene.add(c); return c; });
  const pistons = Array.from({ length: 8 }, () => { const c = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 8), '#3d6fb0', { shadow: false }); scene.add(c); return c; });
  const ruler = mesh(new THREE.BoxGeometry(1, 0.06, 0.25), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), { shadow: false }); scene.add(ruler);

  // ---------------- panah ----------------
  const yArr = Array.from({ length: 3 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const rArr = Array.from({ length: 3 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  // panah dengan arah bebas (vektor)
  const X = new THREE.Vector3(1, 0, 0);
  function arrow(a, from, dir, L) { a.visible = L > 0.05; a.setLength(Math.max(0.05, L)); a.position.copy(from); a.quaternion.setFromUnitVectors(X, dir.clone().normalize()); }

  // ---------------- Pak Bero ----------------
  const bero = createBero(); scene.add(bero.root);

  // ---------------- kamera (dengan ikut goyangan) ----------------
  const camKeys = [
    { t: 0, pos: [-4.2, 1.0, 13.5], look: [-0.4, 7.4, 0], fov: 52 },
    { t: s('intro') - 0.01, pos: [-3.2, 1.4, 15.5], look: [-0.4, 7.4, 0], fov: 52, blend: 2.9 },
    { t: s('intro'), cut: true, pos: [2.4, 2.2, 8.4], look: [-0.2, 1.4, 0] },
    { t: e('intro'), pos: [2.6, 4.4, 11.4], look: [0, 3.2, 0], blend: 3.0 },
    { t: s('tebal'), pos: [0, 3.4, 11.6], look: [0, 3.0, 0], blend: 1.0 },
    { t: s('monadnock'), pos: [-1.8, 2.2, 8.6], look: [-0.7, 1.7, 0], blend: 1.2 },
    { t: s('rangka'), pos: [5.0, 4.0, 13], look: [0, 4.0, 0], blend: 1.0 },
    { t: e('rangka'), pos: [5.6, 7.0, 21.5], look: [0, 7.0, 0], blend: 2.6 },
    { t: s('goyang'), pos: [0, 7.5, 21.5], look: [0, 7.2, 0], blend: 1.0 },
    { t: at('goyang', 0.58), pos: [1.6, 15.0, 5.4], look: [0, 14.2, 0], blend: 1.2, follow: 1 },
    { t: s('kaku'), pos: [5.4, 8.0, 19.5], look: [0, 7.0, 0], blend: 1.0 },
    { t: at('kaku', 0.3), pos: [2.8, 6.0, 7.6], look: [0, 6.2, 0], blend: 1.2 },
    { t: at('kaku', 0.66), pos: [5.4, 8.0, 19.5], look: [0, 7.0, 0], blend: 1.0 },
    { t: s('pusaran'), pos: [-6.5, 25, 0.01], look: [3.6, 10.5, 0], blend: 1.4 },
    { t: s('sudut'), pos: [-4.4, 21.5, 0.01], look: [2.2, 12.0, 0], blend: 1.0 },
    { t: at('sudut', 0.38), pos: [-6.5, 25, 0.01], look: [3.6, 10.5, 0], blend: 1.0 },
    { t: s('topan'), pos: [4.2, 5.0, 20.5], look: [0, 7.0, 0], blend: 0.8 },
    { t: s('peredam'), pos: [3.2, 12.4, 7.0], look: [0, 12.6, 0], blend: 1.0, follow: 0.8 },
    { t: s('berdiri'), pos: [2.4, 15.7, 5.4], look: [0, 14.5, 0], blend: 0.9 },
    { t: s('fakta'), cut: true, pos: [FX + 28, 9, 66], look: [FX, 28, 0], fov: 52 },
    { t: at('fakta', 0.28), pos: [FX + 12, 50, 24], look: [FX, TOP8 - 1, 0], blend: 1.6 },
    { t: at('fakta', 0.69), cut: true, pos: [RX + 2.0, 4.6, 21], look: [RX - 1.2, 4.4, 0], fov: 52 },
    { t: s('outro'), cut: true, pos: [-1.0, 2.6, 8.6], look: [-1.4, 2.0, 0], fov: 50 },
    { t: e('outro'), pos: [0.2, 3.6, 12.5], look: [-0.6, 4.0, 0], blend: 3.6 },
  ];
  const V = (a) => new THREE.Vector3(...a);
  function cam(t, top) {
    let i = 0; while (i < camKeys.length - 1 && camKeys[i + 1].t <= t) i++;
    const a = camKeys[i], b = camKeys[Math.min(i + 1, camKeys.length - 1)];
    let k = 0;
    if (b !== a) { const d = b.cut ? 0 : Math.min(b.blend ?? 1.1, b.t - a.t); k = d <= 0 ? (t >= b.t ? 1 : 0) : smooth((t - (b.t - d)) / d); }
    const f = lerp(a.follow ?? 0, b.follow ?? 0, k);
    const sh = new THREE.Vector3(top.x * f, 0, top.z * f);
    camera.position.copy(V(a.pos).lerp(V(b.pos), k)).add(sh);
    camera.fov = lerp(a.fov ?? 50, b.fov ?? 50, k); camera.updateProjectionMatrix();
    camera.lookAt(V(a.look).lerp(V(b.look), k).add(sh));
  }

  // ---------------- update ----------------
  return {
    update(t) {
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      const home = !L('fakta');
      const fakRoom = L('fakta') && t >= at('fakta', 0.69);
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);
      const teaser = t < s('intro');
      const brickStage = L('intro', 'monadnock');

      // ===== goyangan gedung (sx: searah angin, sz: menyamping) =====
      let sx = 0, sz = 0, wAmt = 0, storm = 0;
      const osc = (f, ph = 0) => Math.sin(2 * Math.PI * f * t + ph);
      if (teaser) { sx = 0.04 * osc(0.4); wAmt = 0.8; }
      if (L('goyang')) { const k = smooth((t - at('goyang', 0.12)) / 1.2); sx = k * (0.7 + 0.6 * osc(0.42)); wAmt = k * 1.1; }
      if (L('kaku')) { const k = smooth((t - at('kaku', 0.45)) / 1.4); const amp = lerp(1, 0.2, k); sx = amp * (0.7 + 0.6 * osc(0.42)); wAmt = 1.0; }
      if (L('pusaran')) { const g = lerp(0.12, 1.1, smooth((t - at('pusaran', 0.45)) / (dur('pusaran') * 0.5))); sz = g * osc(0.5); sx = 0.12; wAmt = 0.9; }
      if (L('sudut')) { const g = lerp(1.1, 0.12, smooth((t - at('sudut', 0.3)) / 2.0)); sz = g * osc(0.5); sx = 0.12; wAmt = 0.9; }
      if (L('topan')) { const k = smooth((t - s('topan')) / 0.8); storm = k; sx = k * (0.5 + 0.35 * osc(0.42)); sz = 0.15 * k * osc(0.5); wAmt = 1.4 * k; }
      let ballRel = 0;
      if (L('peredam')) {
        const u = t - s('peredam'), u0 = dur('peredam') * 0.5;
        const decay = u < u0 ? 1 : Math.exp(-(u - u0) * 0.9);
        const b = 0.5 * decay * osc(0.42);
        sx = b + 0.35 * decay; ballRel = -2.2 * b;
        storm = 1 - smooth((t - at('peredam', 0.7)) / 1.6); wAmt = 1.4 * storm + 0.3;
      }
      const top = new THREE.Vector3(sx, 0, sz);
      cam(t, top);
      setSky(storm);
      rain.update(t, home ? storm : 0);
      field.root.visible = home; taipeiGround.root.visible = L('fakta') && !fakRoom;
      tp.visible = L('fakta') && !fakRoom; room.visible = fakRoom;
      const cx = home ? 0 : fakRoom ? RX : FX;
      sun.position.set(cx - 12, 30, 16); sun.target.position.set(cx, 3, 0);
      scene.fog.near = home ? 40 : 90; scene.fog.far = home ? 140 : 320;

      // ===== bata =====
      const buildB = L('intro') ? clamp((t - at('intro', 0.12)) / (dur('intro') * 0.85)) : brickStage ? 1 : L('rangka') ? 1 : 0;
      const kT = L('tebal') ? smooth((t - at('tebal', 0.5)) / (dur('tebal') * 0.35)) : L('monadnock') || L('rangka') ? 1 : 0;
      const frontOff = L('tebal') ? smooth((t - s('tebal') - 0.1) / 0.8) : L('monadnock') || L('rangka') ? 1 : 0;
      const gone = L('rangka') ? smooth((t - s('rangka') - 0.1) / 0.9) : 0;
      brickIM.visible = home && (brickStage || (L('rangka') && gone < 1));
      if (brickIM.visible) bricks.forEach((b, i) => {
        const y = (b.r + 0.5) * BH;
        let sc = clamp((buildB * ROWS - b.r) * 1.5);
        if (b.w === 0) sc *= 1 - clamp(frontOff * 1.6 - (ROWS - b.r) / ROWS * 0.6);
        sc *= 1 - clamp(gone * 1.8 - (ROWS - b.r) / ROWS * 0.8);
        if (sc < 0.01) { brickIM.set(i, 0, -999, 0, 0); return; }
        const th = thick(y, kT);
        const inner = b.w < 2 ? A : A - th; // dinding x (depan/belakang) penuh, z di antaranya
        const u0 = b.w < 2 ? b.u0 : b.u0 * inner / A, u1 = b.w < 2 ? b.u1 : b.u1 * inner / A;
        const len = u1 - u0 - 0.025, m = (u0 + u1) / 2, n = A - th / 2;
        const yy = y - (1 - sc) * 0.1;
        if (b.w === 0) brickIM.set(i, m, yy, n, len, (BH - 0.025) * sc, th - 0.02);
        else if (b.w === 1) brickIM.set(i, m, yy, -n, len, (BH - 0.025) * sc, th - 0.02);
        else brickIM.set(i, b.w === 2 ? n : -n, yy, m, th - 0.02, (BH - 0.025) * sc, len);
      });
      const roomOn = home && (L('tebal') && frontOff > 0.5 || L('monadnock'));
      rooms.forEach((m, k) => {
        m.visible = roomOn; if (!roomOn) return;
        const w = Math.max(0.06, 2 * (A - thick(m.userData.y, kT)) - 0.04);
        m.scale.set(w, 1, w); m.position.set(0, m.userData.y, 0);
      });
      floorsB.forEach((m, k) => {
        m.visible = home && (brickStage || L('rangka') && gone < 0.5) && k > 0 && buildB * ROWS > k * 5;
        const w = 2 * (A - thick(k + 0.03, kT)) + 0.02; m.scale.set(w, 1, w); m.position.set(0, k + 0.03, 0);
      });

      // ===== gedung baja =====
      const towerOn = home && !brickStage && !(L('rangka') && t < s('rangka') + 0.6);
      tower.root.visible = towerOn;
      if (towerOn) {
        const built = L('rangka') ? clamp((t - s('rangka') - 0.6) / (dur('rangka') * 0.72)) : 1;
        const finished = teaser || t >= s('berdiri');
        const braceK = L('kaku') ? clamp((t - at('kaku', 0.17)) / 1.4) : t >= e('kaku') || teaser ? 1 : 0;
        const coreK = L('kaku') ? clamp((t - at('kaku', 0.36)) / 1.2) : t >= e('kaku') || teaser ? 1 : 0;
        let clad = 0, cladMix = 0, cladGrow = 1, op = 0.72;
        if (L('pusaran')) { clad = 1; cladGrow = clamp((t - s('pusaran')) / 1.0); }
        else if (L('sudut')) { clad = 1; cladMix = clamp((t - at('sudut', 0.04)) / 1.4); }
        else if (t >= s('topan') || teaser) clad = 2;
        if (L('peredam')) op = lerp(0.72, 0.12, smooth((t - s('peredam')) / 0.8));
        if (L('berdiri')) op = lerp(0.12, 0.72, smooth((t - s('berdiri')) / 0.8));
        const damperZone = L('peredam') || L('berdiri');
        const shut = clad && cladGrow >= 1 && op > 0.5;
        tower.update({ built, sx, sz, frame: shut ? 0 : 1, brace: shut ? 0 : braceK, core: coreK, clad, cladMix, cladGrow, cladOpacity: op, coreTop: tower.N - 4, braceTop: damperZone ? tower.N - 5 : tower.N });
        void finished;
      }
      // peredam
      const damperOn = home && (L('peredam') || L('berdiri'));
      damper.visible = damperOn;
      if (damperOn) {
        const grow = L('peredam') ? easeOutBack((t - at('peredam', 0.1)) / 0.7) : 1;
        const yb = H - 1.6, yc = H - 0.05;
        const anchorOff = tower.at(yc, sx, sz);
        const bp = new THREE.Vector3(anchorOff.x + ballRel, yb, anchorOff.z);
        ball.position.copy(bp); ball.scale.setScalar(Math.max(0.01, grow));
        [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]].forEach(([x, z], i) => {
          const va = new THREE.Vector3(anchorOff.x + x * 0.7, yc, anchorOff.z + z * 0.7);
          seg(cables[i], va, bp.clone().add(new THREE.Vector3(x * 0.25, 0.25, z * 0.25)));
          cables[i].visible = grow > 0.3;
        });
      }

      // ===== angin =====
      wind.hideAll();
      if (home && wAmt > 0.01) {
        const topView = L('pusaran', 'sudut');
        const n = Math.floor(NW * clamp(wAmt / 1.4) * (topView ? 0.45 : 1));
        for (let i = 0; i < n; i++) {
          const [a, b, c, d] = windSeeds[i];
          const sp = 7 + 5 * d;
          const x = -14 + ((t * sp * (0.6 + 0.4 * clamp(wAmt)) + a * 28) % 28);
          const y = topView ? 9.5 + b * 4.5 : 0.6 + b * 15;
          let z = (c - 0.5) * 9;
          if (Math.abs(z) < 1.6) z = Math.sign(z || 1) * (1.6 + Math.abs(z));
          wind.set(i, x, y, z, 0.6 + d * 0.8, 1, 1);
        }
      }
      // pusaran (vortex street)
      vort.hideAll();
      if (home && L('pusaran', 'sudut')) {
        let idx = 0;
        const messy = L('sudut') ? smooth((t - at('sudut', 0.3)) / 1.2) : 0;
        const f = 1.0; // pelepasan pusaran per detik (bergantian)
        const t0 = s('pusaran') + 0.8;
        const kNow = Math.floor((t - t0) * f * (1 + messy * 2));
        for (let k = Math.max(0, kNow - 7); k <= kNow && idx < NV; k++) {
          const born = t0 + k / (f * (1 + messy * 2)), age = t - born;
          if (age < 0) continue;
          const sideZ = (k % 2 ? 1 : -1) * lerp(0.75, 0.5 + 0.6 * ((k * 0.37) % 1) - 0.3, messy);
          const r0 = lerp(0.55, 0.22, messy);
          const cx0 = 1.5 + age * 1.6, cz0 = sideZ + (L('pusaran') ? 0 : sz * 0.2);
          const spin = (k % 2 ? 1 : -1) * age * 3.2;
          const alpha = clamp(age / 0.4) * (1 - clamp((age - 4) / 1.5));
          const nP = messy > 0.5 ? 6 : 16;
          for (let j = 0; j < nP && idx < NV; j++) {
            const ang = spin + j / nP * Math.PI * 2, rr = r0 * (0.35 + 0.65 * j / nP) * (0.6 + 0.4 * clamp(age));
            for (const yy of [10.5, 12.8]) {
              if (idx >= NV) break;
              vort.set(idx++, cx0 + Math.cos(ang) * rr, yy, cz0 + Math.sin(ang) * rr, alpha * 1.2);
            }
          }
        }
      }
      // bintang pusing
      stars.forEach((m) => (m.visible = false));

      // ===== panah =====
      yArr.forEach((a) => (a.visible = false)); rArr.forEach((a) => (a.visible = false));
      if (home && L('tebal')) {
        const g = smooth((t - at('tebal', 0.3)) / 0.6);
        [-1, 1].forEach((sd, i) => arrow(rArr[i], new THREE.Vector3(sd * (A - thick(1, kT) / 2), 2.4, A + 0.1), new THREE.Vector3(0, -1, 0), 1.6 * g));
        arrow(yArr[0], new THREE.Vector3(0, HB + 1.6, 0), new THREE.Vector3(0, -1, 0), 1.3 * g);
      }
      if (home && L('goyang')) {
        const g = smooth((t - at('goyang', 0.12)) / 0.5);
        [9, 12].forEach((y, i) => { const p = tower.at(y, sx, sz); arrow(yArr[i], new THREE.Vector3(p.x - A - 1.8, y, 1.3), X, 1.5 * g); });
      }
      if (home && L('pusaran', 'sudut')) {
        const y = 11.6, p = tower.at(y, sx, sz);
        const mag = L('pusaran') ? lerp(0.5, 1.6, smooth((t - at('pusaran', 0.45)) / (dur('pusaran') * 0.45))) : lerp(1.6, 0.35, smooth((t - at('sudut', 0.4)) / 1.4));
        const dir = Math.sign(osc(0.5) || 1);
        if (t > at('pusaran', 0.3) || L('sudut')) arrow(rArr[0], new THREE.Vector3(p.x, y + 0.6, p.z + dir * (A + 0.2)), new THREE.Vector3(0, 0, dir), mag * 1.4 * Math.abs(osc(0.5)) + 0.4);
      }
      if (home && L('peredam') && t > at('peredam', 0.5)) {
        const p = tower.at(H - 0.8, sx, sz), d = Math.sign(sx - 0.35 * (t < at('peredam', 0.5) ? 1 : 0) || 1);
        const bdir = Math.sign(osc(0.42) || 1);
        arrow(rArr[0], new THREE.Vector3(p.x + bdir * (A + 0.2), H - 0.8, 0.6), new THREE.Vector3(bdir, 0, 0), 0.9 * Math.abs(osc(0.42)) + 0.2);
        arrow(yArr[0], ball.position.clone().add(new THREE.Vector3(-bdir * 0.55, 0, 0.5)), new THREE.Vector3(-bdir, 0, 0), 0.9 * Math.abs(osc(0.42)) + 0.2);
        void d;
      }

      // ===== Taipei 101 =====
      band.material.opacity = L('fakta') && t > at('fakta', 0.4) ? 0.55 + 0.25 * osc(1.2) : 0;
      // ruang peredam
      bigBall.visible = fakRoom; bigCables.forEach((c) => (c.visible = fakRoom)); pistons.forEach((c) => (c.visible = fakRoom)); ruler.visible = fakRoom;
      if (fakRoom) {
        const u = t - at('fakta', 0.69);
        const amp = lerp(0.25, 1.0, smooth((u - 0.8) / 1.5));
        const bx = RX + amp * Math.sin(2 * Math.PI * 0.35 * u);
        const by = 4.2;
        bigBall.position.set(bx, by, -0.5);
        for (let i = 0; i < 8; i++) {
          const ang = i / 8 * Math.PI * 2;
          seg(bigCables[i], new THREE.Vector3(RX + Math.cos(ang) * 3.4, 12.4, -0.5 + Math.sin(ang) * 3.4), new THREE.Vector3(bx + Math.cos(ang) * 1.4, by + 2.3, -0.5 + Math.sin(ang) * 1.4));
          seg(pistons[i], new THREE.Vector3(RX + Math.cos(ang) * 3.8, 0.4, -0.5 + Math.sin(ang) * 3.8), new THREE.Vector3(bx + Math.cos(ang) * 2.0, by - 1.6, -0.5 + Math.sin(ang) * 2.0));
        }
        ruler.scale.set(1, 1, 1); ruler.position.set(RX + 0.5, 0.16, 3.2);
        st.labels.push({ text: '1 m', pos: [RX + 0.5, 0.2, 3.2], alpha: smooth((u - 1.6) / 0.3), up: 30, tone: 'yellow' });
      }

      // ===== label =====
      const tp3 = (y, x = 0, z = 0) => { const p = tower.at(y, sx, sz, x, z); return [p.x, p.y, p.z]; };
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [-1.95, 1.5, 0.9], alpha: fade('intro', 0.2) * (1 - smooth((t - at('intro', 0.6)) / 0.3)), up: 30, tone: 'yellow' });
      if (L('tebal')) {
        st.labels.push({ text: 'Tebal', pos: [-A + thick(0.6, kT) / 2, 0.6, A], alpha: smooth((t - at('tebal', 0.66)) / 0.3), up: 60, tone: 'red' });
        st.labels.push({ text: 'Ruangan sempit', pos: [0, 0.5, 0.3], alpha: smooth((t - at('tebal', 0.82)) / 0.3), up: 120 });
      }
      if (L('rangka')) st.labels.push({ text: 'Rangka baja', pos: tp3(6, A, A), alpha: smooth((t - at('rangka', 0.22)) / 0.3), up: 50, tone: 'yellow' });
      if (L('goyang')) st.labels.push({ text: 'Bergoyang', pos: tp3(H - 0.5, A, A), alpha: smooth((t - at('goyang', 0.45)) / 0.3) * (1 - smooth((t - at('goyang', 0.56)) / 0.3)), up: 40, tone: 'red' });
      if (L('kaku')) {
        st.labels.push({ text: 'Pengaku silang', pos: tp3(5.25, -0.55, A), alpha: smooth((t - at('kaku', 0.2)) / 0.3), up: 70, tone: 'yellow' });
        st.labels.push({ text: 'Inti beton', pos: tp3(6.6, 0, 0.4), alpha: smooth((t - at('kaku', 0.38)) / 0.3), up: 120, tone: 'yellow' });
      }
      if (L('pusaran')) st.labels.push({ text: 'Pusaran', pos: [4.0, 12.8, -0.75], alpha: smooth((t - at('pusaran', 0.2)) / 0.3), up: 40, tone: 'yellow' });
      if (L('pusaran')) st.labels.push({ text: 'Makin besar', pos: tp3(12.4, 0, 0), alpha: smooth((t - at('pusaran', 0.88)) / 0.3), up: 60, tone: 'red' });
      if (L('sudut')) st.labels.push({ text: 'Sudut bertangga', pos: tp3(H + 0.1, -A + 0.2, A - 0.2), alpha: smooth((t - at('sudut', 0.18)) / 0.3), up: 50, tone: 'yellow' });
      if (L('topan')) st.labels.push({ text: 'Masih goyang', pos: tp3(H - 0.5, A, A), alpha: smooth((t - at('topan', 0.6)) / 0.3), up: 40, tone: 'red' });
      if (L('peredam')) st.labels.push({ text: 'Peredam massa', pos: [ball.position.x, ball.position.y + 0.5, 0.2], alpha: smooth((t - at('peredam', 0.38)) / 0.3), up: 150, tone: 'yellow' });
      if (L('berdiri')) st.labels.push({ text: 'Berdiri tenang', pos: tp3(H - 1.0, 0, A), alpha: fade('berdiri', 0.2), up: 160, tone: 'yellow' });

      // ===== kartu =====
      if (L('monadnock')) st.card = { title: 'Chicago, 1891', body: 'Gedung bata 16 lantai · dinding bawah ±1,8 m', top: 0.1, alpha: fade('monadnock', 0.3) };
      if (L('fakta')) {
        st.card = t < at('fakta', 0.29) ? { title: 'Taipei 101, Taiwan', body: 'Tinggi 508 meter', top: 0.08, alpha: fade('fakta', 0.6) }
          : t < at('fakta', 0.69) ? { title: 'Bola peredam 660 ton', body: 'Digantung di lantai 87–92', top: 0.08, alpha: 1 }
            : { title: 'Topan Soudelor, 2015', body: 'Bolanya berayun sampai 1 meter', top: 0.08, alpha: 1 };
      }

      // ===== Pak Bero =====
      let bp = BERO_HOME.clone(), anim = 'idle', yaw = null;
      const onRoof = () => { const p = tower.at(H + 0.1, sx, sz, -0.35, 0.45); bp.copy(p); };
      if (teaser) anim = 'happy';
      else if (L('intro')) { bp.set(-1.95, 0, 0.9); anim = t < at('intro', 0.12) ? 'wave' : 'slap'; if (anim === 'slap') yaw = Math.PI / 2; }
      else if (L('tebal')) { bp.set(-2.3, 0, 1.9); anim = t > at('tebal', 0.6) ? 'sad' : 'think'; }
      else if (L('monadnock')) { bp.set(-2.0, 0, 1.6); anim = 'point'; yaw = 0.9; }
      else if (L('rangka')) anim = t > at('rangka', 0.45) ? 'happy' : 'slap';
      else if (L('goyang')) { if (t > at('goyang', 0.45)) { onRoof(); anim = 'panic'; } else anim = 'idle'; }
      else if (L('kaku')) anim = 'point';
      else if (L('pusaran')) anim = t > at('pusaran', 0.7) ? 'panic' : 'think';
      else if (L('sudut')) anim = 'happy';
      else if (L('topan')) anim = 'panic';
      else if (L('peredam')) { onRoof(); anim = t > at('peredam', 0.85) ? 'happy' : 'point'; }
      else if (L('berdiri')) { onRoof(); anim = 'happy'; }
      else if (fakRoom) { bp.set(RX - 4.6, 0, 2.2); anim = 'point'; yaw = 0.7; }
      else if (L('fakta')) bp.set(FX - 9, 0, 9);
      else if (L('outro')) { bp.set(-1.9, 0, 2.6); anim = 'wave'; }
      bero.root.visible = !(L('fakta') && !fakRoom);
      if (yaw === null) yaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      bero.root.position.copy(bp);
      bero.pose(t, anim, { yaw });
      if (L('goyang') && t > at('goyang', 0.6)) stars.forEach((m, i) => {
        const ang = t * 4 + i * 2.1; m.visible = true;
        m.position.set(bp.x + Math.cos(ang) * 0.45, bp.y + 1.7 + 0.05 * Math.sin(t * 6 + i), bp.z + Math.sin(ang) * 0.45); m.rotation.y = t * 3;
      });
      return st;
    },
  };
}
