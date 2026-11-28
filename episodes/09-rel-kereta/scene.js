// Ep. 09 Rel kereta: rel di tanah (amblas) → bantalan → hujan, bantalan geser
// → kerikil balas → panas, rel memuai & melengkung → celah sambungan (jeglek)
// → ujung rel aus → rel dilas + dijepit → Whoosh di pelat beton (x=300).
// Semua fungsi murni dari t.
import * as THREE from 'three';
import { PAL, mat, mesh, rng, clamp, lerp, smooth, easeOut, easeOutBack, cameraAt, makeArrow, makeInstances, buildField, makeRain } from '/engine/kit.js';
import { createBero } from '/engine/bero.js';
import { createTrain } from '/engine/train.js';

const G = 1.0, RW = 0.09, RH = 0.12;     // lebar sepur, lebar & tinggi rel
const X0 = -16, X1 = 16, SEG = 0.25;     // panjang jalur & segmen rel
const SL = 0.12, SP = 0.6;               // tinggi bantalan, jarak bantalan
const GAP = 3.0, GW = 0.05;              // jarak sambungan, setengah lebar celah
const FX = 300;
const BERO_HOME = new THREE.Vector3(-1.6, 0, 2.2);

export function build(kit, T) {
  const { scene, camera, setSky, sun } = kit;
  const { s, e } = T;
  const R = rng(909);
  const dur = (id) => e(id) - s(id);
  const at = (id, f) => s(id) + dur(id) * f;
  const field = buildField(kit, { seed: 91, plot: 0, clear: { x0: -18, x1: 18, z0: -3, z1: 22 } });
  const fieldB = buildField(kit, { seed: 92, plot: 0, at: [FX, 0, 0], trees: 90, clear: { x0: -40, x1: 40, z0: -6, z1: 40 } });
  // tanah jalur (bisa becek)
  const bedM = new THREE.MeshStandardMaterial({ color: '#c9a46b', flatShading: true, roughness: 0.95 });
  const bed = mesh(new THREE.BoxGeometry(X1 - X0 + 4, 0.04, 3.4), bedM); bed.position.y = 0.0; scene.add(bed);
  const mud = new THREE.Color('#6b4a2e'), dry = new THREE.Color('#c9a46b');

  // ---------------- bantalan ----------------
  const NSL = Math.floor((X1 - X0) / SP);
  const sleepers = makeInstances(new THREE.BoxGeometry(0.24, SL, 1.7), mat('#9aa09c'), NSL); sleepers.castShadow = true; scene.add(sleepers);
  const slSeeds = Array.from({ length: NSL }, () => [R() - 0.5, R() - 0.5, R()]);
  const slX = (i) => X0 + (i + 0.5) * SP;
  const clips = makeInstances(new THREE.BoxGeometry(0.14, 0.07, 0.07), mat('#f2c94c'), NSL * 4); scene.add(clips);

  // ---------------- kerikil balas ----------------
  const NB = 1800;
  const ballast = makeInstances(new THREE.IcosahedronGeometry(0.075, 0), mat('#8b8f8c'), NB); ballast.castShadow = false; ballast.receiveShadow = true; scene.add(ballast);
  const BC = ['#8b8f8c', '#7a7f7c', '#9a9d98', '#6e7370'];
  for (let i = 0; i < NB; i++) ballast.setColorAt(i, new THREE.Color(BC[i % 4]));
  const bSeeds = Array.from({ length: NB }, () => [R(), R(), R(), R()]);
  const NW = 60;
  const drops = makeInstances(new THREE.IcosahedronGeometry(0.04, 0), new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#2a9fd6', emissiveIntensity: 0.5 }), NW); scene.add(drops);

  // ---------------- rel (segmen instanced, 2 rel) ----------------
  const NS = Math.round((X1 - X0) / SEG);
  const railM = new THREE.MeshStandardMaterial({ color: '#8d949a', metalness: 0.5, roughness: 0.35, flatShading: true, emissive: '#ff5a1f', emissiveIntensity: 0 });
  const rails = makeInstances(new THREE.BoxGeometry(1, 1, 1), railM, NS * 2); rails.castShadow = true; scene.add(rails);
  const plates = makeInstances(new THREE.BoxGeometry(0.5, 0.08, 0.03), mat('#5d646a'), 40); scene.add(plates);
  const NSP = 80;
  const sparks = makeInstances(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: '#ffb347' }), NSP); scene.add(sparks);
  const spSeeds = Array.from({ length: NSP }, () => [R(), R(), R()]);
  const rain = makeRain(kit, 600, [30, 16, 20], [0, 6, 3]);
  const sunBall = mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), { shadow: false }); scene.add(sunBall);

  // ---------------- kereta ----------------
  const train = createTrain({ gauge: G });
  scene.add(train.root);
  // kereta cepat (x=FX)
  const hs = new THREE.Group(); scene.add(hs);
  {
    const wM = mat('#f2f4f5'), sM = mat('#2f6fb0'), gM = mat('#203040', { emissive: '#18324a', emissiveIntensity: 0.3 });
    for (let k = 0; k < 4; k++) {
      const len = 5.0, c = new THREE.Group(); c.position.x = -k * 5.15; hs.add(c);
      const b = mesh(new THREE.BoxGeometry(len, 1.15, 1.25), wM); b.position.y = 0.85; c.add(b);
      const st = mesh(new THREE.BoxGeometry(len + 0.01, 0.12, 1.27), sM, { shadow: false }); st.position.y = 0.55; c.add(st);
      const wn = mesh(new THREE.BoxGeometry(len - 0.6, 0.25, 1.27), gM, { shadow: false }); wn.position.y = 1.0; c.add(wn);
      if (k === 0) { const nose = mesh(new THREE.ConeGeometry(0.66, 2.4, 4), wM); nose.rotation.set(0, Math.PI / 4, -Math.PI / 2); nose.scale.set(1, 1, 0.75); nose.position.set(len / 2 + 1.15, 0.78, 0); c.add(nose); const ws = mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), gM, { shadow: false }); ws.position.set(len / 2 + 0.3, 1.25, 0); ws.rotation.z = -0.5; c.add(ws); }
    }
  }
  const via = new THREE.Group(); via.position.x = FX; scene.add(via);
  {
    const deck = mesh(new THREE.BoxGeometry(160, 0.6, 3.2), '#b9bcbf'); deck.position.y = 4.7; via.add(deck);
    for (let k = -8; k <= 8; k++) { const p = mesh(new THREE.BoxGeometry(1.0, 4.4, 1.6), '#a9adb0'); p.position.set(k * 10, 2.2, 0); via.add(p); }
    for (let k = -32; k <= 32; k++) { const sl = mesh(new THREE.BoxGeometry(2.4, 0.2, 2.1), '#8f9497', { shadow: false }); sl.position.set(k * 2.5, 5.1, 0); via.add(sl); }
    for (const sz of [-0.72, 0.72]) { const r = mesh(new THREE.BoxGeometry(160, 0.12, 0.09), '#8d949a', { shadow: false }); r.position.set(0, 5.26, sz); via.add(r); }
    for (let k = -16; k <= 16; k++) { const pole = mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), '#6d7880'); pole.position.set(k * 5, 6.3, -1.5); via.add(pole); const arm = mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), '#6d7880'); arm.position.set(k * 5, 7.4, -0.8); via.add(arm); }
    const wire = mesh(new THREE.BoxGeometry(160, 0.03, 0.03), '#2b2f33', { shadow: false }); wire.position.set(0, 7.2, 0); via.add(wire);
  }

  // ---------------- panah ----------------
  const yArr = Array.from({ length: 4 }, () => { const a = makeArrow(); scene.add(a); return a; });
  const rArr = Array.from({ length: 4 }, () => { const a = makeArrow(PAL.red); scene.add(a); return a; });
  const XV = new THREE.Vector3(1, 0, 0);
  function arrow(a, from, dir, L) { a.visible = L > 0.05; a.setLength(Math.max(0.05, L)); a.position.copy(from); a.quaternion.setFromUnitVectors(XV, dir.clone().normalize()); }

  const bero = createBero(); scene.add(bero.root);

  // ---------------- kamera ----------------
  const SIDE = { pos: [2.2, 2.6, 8.4], look: [0.6, 0.4, 0] };
  const camKeys = [
    { t: 0, pos: [6.5, 0.9, 4.5], look: [0, 0.8, 0], fov: 52 },
    { t: s('intro') - 0.01, pos: [5.5, 1.1, 5.2], look: [-1, 0.8, 0], fov: 52, blend: 2.1 },
    { t: s('intro'), cut: true, pos: [0.4, 2.4, 6.4], look: [-0.6, 0.3, 0.6], fov: 50 },
    { t: s('amblas'), ...SIDE, blend: 1.0 },
    { t: s('bantalan'), pos: [2.6, 3.4, 6.6], look: [0.4, 0.1, 0], blend: 1.0 },
    { t: s('geser'), pos: [0.6, 6.6, 6.0], look: [0.3, 0.0, -0.3], blend: 1.2 },
    { t: s('balas'), pos: [2.4, 2.4, 6.8], look: [0.4, 0.2, 0], blend: 1.2 },
    { t: s('muai'), pos: [0.4, 7.4, 6.2], look: [0.4, 0.0, -0.6], blend: 1.2 },
    { t: s('celah'), pos: [1.2, 0.9, 3.4], look: [0.0, 0.3, 0.5], blend: 1.2 },
    { t: s('aus'), pos: [1.6, 1.1, 4.4], look: [0.0, 0.5, 0.3], blend: 1.0 },
    { t: s('las'), pos: [1.0, 1.4, 3.6], look: [0.0, 0.2, 0.5], blend: 1.0 },
    { t: at('las', 0.5), pos: [0.6, 5.0, 6.4], look: [0.3, 0.1, 0], blend: 1.2 },
    { t: s('berdiri'), pos: [4.5, 1.8, 6.6], look: [0, 0.9, 0], blend: 0.8 },
    { t: s('fakta'), cut: true, pos: [FX + 9, 4.2, 14], look: [FX, 5.4, 0], fov: 50 },
    { t: at('fakta', 0.55), pos: [FX + 4, 6.4, 7.5], look: [FX - 1, 5.2, 0], blend: 1.5 },
    { t: s('outro'), cut: true, pos: [0.0, 1.9, 7.0], look: [-1.2, 1.0, 1.6], fov: 50 },
    { t: e('outro'), pos: [2.0, 3.0, 10.0], look: [-0.5, 0.8, 0.8], blend: 3.0 },
  ];

  return {
    update(t) {
      const L = (a, b) => T.in(t, a, b);
      const st = { labels: [], subTop: 0.72 };
      cameraAt(camKeys, t, camera);
      const home = !L('fakta');
      const teaser = t < s('intro');
      field.root.visible = bed.visible = home; fieldB.root.visible = via.visible = hs.visible = !home;
      const cx = home ? 0 : FX;
      sun.position.set(cx - 10, 20, 14); sun.target.position.set(cx, 0, 0);
      scene.fog.near = home ? 40 : 60; scene.fog.far = home ? 140 : 200;
      const fade = (id, d = 0.4) => smooth((t - s(id) - d) / 0.3);

      // ===== tahap =====
      const hasSl = teaser || t >= s('bantalan');
      const slGrow = L('bantalan') ? clamp((t - at('bantalan', 0.2)) / (dur('bantalan') * 0.35)) : hasSl ? 1 : 0;
      const hasBal = teaser || t >= s('balas');
      const balK = L('balas') ? clamp((t - at('balas', 0.1)) / (dur('balas') * 0.4)) : hasBal ? 1 : 0;
      const wetK = L('geser') ? smooth((t - s('geser') - 0.4) / 1.5) : L('balas') ? 1 - smooth((t - at('balas', 0.6)) / 1.5) : 0;
      bedM.color.copy(dry).lerp(mud, wetK);
      const raining = home && (L('geser') || (L('balas') && t < at('balas', 0.95)));
      rain.update(t, raining ? 1 : 0);
      const heat = L('muai') ? smooth((t - s('muai') - 0.3) / 1.0) : L('celah') ? 1 - smooth((t - s('celah')) / 1.0) : 0;
      setSky(raining ? 0.8 : 0);
      sunBall.visible = home && heat > 0.01; sunBall.position.set(-6, 9, -12); sunBall.scale.setScalar(0.6 + 0.4 * heat);
      railM.emissiveIntensity = 0.45 * heat * (0.8 + 0.2 * Math.sin(t * 6));
      // sambungan: 0 tanpa celah (rel di tanah/awal), 1 ada celah, 2 dilas
      const gapsOn = L('celah', 'aus') || (L('las') && t < at('las', 0.45));
      const weld = L('las') ? clamp((t - at('las', 0.05)) / (dur('las') * 0.4)) : 0;
      const wornK = L('aus') ? smooth((t - at('aus', 0.55)) / 0.8) : L('las') ? 1 - smooth((t - at('las', 0.05)) / 1.0) : 0;
      const clipK = L('las') ? clamp((t - at('las', 0.3)) / (dur('las') * 0.25)) : (t >= e('las') || teaser) ? 1 : 0;

      // bantalan bergeser (geser), kembali di balas
      const slShift = L('geser') ? smooth((t - at('geser', 0.4)) / 1.6) : L('balas') ? 1 - smooth((t - at('balas', 0.3)) / 1.2) : 0;
      const slZ = (i) => slSeeds[i][0] * 0.45 * slShift;
      const slRot = (i) => slSeeds[i][1] * 0.35 * slShift;
      const zAtSl = (x) => { const f = (x - X0) / SP - 0.5; const i = clamp(Math.floor(f), 0, NSL - 2); const k = clamp(f - i); return lerp(slZ(i), slZ(i + 1), smooth(k)); };
      // rel melengkung (muai)
      const kink = L('muai') ? smooth((t - at('muai', 0.62)) / 1.4) * 0.55 : L('celah') ? 0.55 * (1 - smooth((t - s('celah') - 0.1) / 0.6)) : 0;
      const zAt = (x) => (hasSl ? zAtSl(x) : 0) + kink * Math.exp(-(((x - 0.4) / 1.6) ** 2)) * Math.sin((x - 0.4) * 1.1 + 1.2);

      // kereta: posisi ujung depan per tahap
      let tx = -40, sinkD = 0;
      if (teaser) tx = lerp(-4, 4, t / s('intro'));
      if (L('amblas')) { const u = clamp((t - at('amblas', 0.1)) / (dur('amblas') * 0.55)); tx = lerp(-8, 2.4, easeOut(u)); sinkD = 0.38 * smooth((t - at('amblas', 0.4)) / 1.4); }
      if (L('bantalan')) tx = lerp(-10, 14, clamp((t - at('bantalan', 0.55)) / (dur('bantalan') * 0.45)));
      if (L('balas')) tx = lerp(-10, 12, clamp((t - at('balas', 0.72)) / (dur('balas') * 0.28)));
      if (L('celah')) tx = lerp(-7, 8, clamp((t - at('celah', 0.4)) / (dur('celah') * 0.6)));
      if (L('aus')) tx = lerp(-6, 10, clamp((t - at('aus', 0.08)) / (dur('aus') * 0.92)));
      if (L('las') && t > at('las', 0.85)) tx = lerp(-12, -2, (t - at('las', 0.85)) / (dur('las') * 0.15));
      if (L('berdiri')) tx = lerp(-2, 12, (t - s('berdiri')) / dur('berdiri'));
      const trainOn = home && tx > -30;
      const tMid = tx - train.length / 2;
      const sink = (x) => -sinkD * Math.exp(-(((x - tMid) / 3.2) ** 2));
      // tinggi puncak rel
      const baseTop = (hasSl ? SL : 0) + RH;
      const gapDip = (x) => { if (wornK <= 0) return 0; const g = Math.round(x / GAP) * GAP, d = Math.abs(x - g); return d < 0.35 ? -0.045 * wornK * (1 - d / 0.35) : 0; };
      const yAt = (x) => baseTop + (hasSl ? 0 : sink(x)) + gapDip(x);

      // ===== rel =====
      rails.visible = home;
      if (home) {
        const grow = L('intro') ? smooth((t - at('intro', 0.3)) / 0.9) : 1;
        for (let r = 0; r < 2; r++) for (let i = 0; i < NS; i++) {
          let a = X0 + i * SEG, b = a + SEG;
          if (gapsOn || (weld > 0 && weld < 1)) {
            const ga = Math.abs(a / GAP - Math.round(a / GAP)) < 1e-6, gb = Math.abs(b / GAP - Math.round(b / GAP)) < 1e-6;
            const closed = weld > 0 && ((Math.round(a / GAP) + 6) / 12 < weld);
            if (ga && !closed && gapsOn) a += GW; if (gb && !closed && gapsOn) b -= GW;
          }
          const xm = (a + b) / 2, zr = (r ? 1 : -1) * G / 2 + zAt(xm);
          const ya = yAt(a), yb = yAt(b), za = zAt(a), zb = zAt(b);
          const y = (ya + yb) / 2 - RH / 2 + (1 - grow) * 1.2;
          rails.set(r * NS + i, xm, y, zr, b - a + 0.002, RH, RW, 0, -Math.atan2(zb - za, b - a), Math.atan2(yb - ya, b - a));
        }
      }
      // pelat sambung
      plates.hideAll();
      if (home && gapsOn) { let n = 0; for (let g = -12; g <= 12; g += GAP) for (const r of [0, 1]) { if (n >= 40) break; const zr = (r ? 1 : -1) * (G / 2 + 0.06) + zAt(g); plates.set(n++, g, yAt(g) - RH / 2, zr, 1); } }
      // bantalan
      sleepers.hideAll(); clips.hideAll();
      if (home && hasSl) for (let i = 0; i < NSL; i++) {
        const x = slX(i), ord = (x - X0) / (X1 - X0);
        const k = clamp((slGrow - ord * 0.7) / 0.3);
        if (k <= 0) continue;
        sleepers.set(i, x, SL / 2 + (1 - k) * 0.6, slZ(i), 1, k, 1, 0, slRot(i), 0);
        const ck = clamp(clipK * 1.4 - ord * 0.4);
        if (ck > 0) for (const r of [0, 1]) for (const sd of [-1, 1]) clips.set(i * 4 + r * 2 + (sd > 0 ? 1 : 0), x, SL + 0.035, (r ? 1 : -1) * G / 2 + sd * 0.09 + slZ(i), ck);
      }
      // kerikil balas
      ballast.hideAll();
      if (home && hasBal) bSeeds.forEach(([a, b, c, d], i) => {
        const x = X0 + a * (X1 - X0), ord = a;
        const k = clamp((balK * 1.3 - ord * 0.3 - d * 0.2) / 0.3);
        if (k <= 0) return;
        const zz = (b - 0.5) * 2.8, edge = Math.abs(zz) > 0.95 ? (Math.abs(zz) - 0.95) / 0.45 : 0;
        const yy = (0.04 + c * 0.06) * (1 - edge * 0.7);
        ballast.set(i, x, yy + (1 - k) * 1.5, zz + zAtSl(x) * 0.3, 0.8 + d * 0.6, 0.7 + c * 0.5, 0.8 + d * 0.4, a * 9, b * 9, c * 9);
      });
      drops.hideAll();
      if (home && L('balas') && t > at('balas', 0.7)) for (let i = 0; i < NW; i++) { const ph = (t * 1.2 + i / NW) % 1; drops.set(i, -2 + (i * 0.37) % 4, 0.5 - ph * 0.8, -0.8 + (i * 0.53) % 1.6, ph < 0.75 ? 1 : 0); }
      // percikan las
      sparks.hideAll();
      if (home && L('las') && weld > 0 && weld < 1) {
        const gx = Math.ceil(weld * 12 - 6) * GAP;
        spSeeds.forEach(([a, b, c], i) => { const ph = (t * 3 + a) % 1; const r = i % 2; sparks.set(i, gx + (b - 0.5) * ph * 1.2, yAt(gx) + 0.05 + ph * 0.5 - ph * ph * 0.9, (r ? 1 : -1) * G / 2 + (c - 0.5) * ph * 0.8, 1 - ph); });
      }

      // ===== kereta =====
      train.root.visible = trainOn;
      if (trainOn) {
        const bob = (i) => {
          if (!L('aus')) return 0;
          return 0.06 * wornK * Math.sin(t * 9 + i * 1.7);
        };
        const roll = (i) => (L('aus') ? 0.04 * wornK * Math.sin(t * 7 + i) : 0);
        train.place(tx, { yAt, zAt, bob, roll });
      }
      // kereta cepat
      if (!home) { const u = t - s('fakta'); hs.position.set(FX - 30 + u * 6.5, 5.32 - 0.12, 0); }

      // ===== panah =====
      yArr.forEach((a) => (a.visible = false)); rArr.forEach((a) => (a.visible = false));
      if (home && L('amblas') && t > at('amblas', 0.45)) { const g = smooth((t - at('amblas', 0.45)) / 0.4); [0, 1].forEach((k) => arrow(rArr[k], new THREE.Vector3(tMid - 1.4 + k * 2.8, 1.0, 1.0), new THREE.Vector3(0, -1, 0), 0.8 * g)); }
      if (home && L('bantalan') && t > at('bantalan', 0.35) && t < at('bantalan', 0.6)) {
        const g = smooth((t - at('bantalan', 0.35)) / 0.4);
        arrow(yArr[0], new THREE.Vector3(0.3, 1.2, 0.5), new THREE.Vector3(0, -1, 0), 0.8 * g);
        arrow(yArr[1], new THREE.Vector3(0.3, 0.06, 0.5), new THREE.Vector3(1, 0, 0.2), 0.7 * g);
        arrow(yArr[2], new THREE.Vector3(0.3, 0.06, 0.5), new THREE.Vector3(-1, 0, 0.2), 0.7 * g);
      }
      if (home && L('muai') && t > at('muai', 0.35)) { const g = smooth((t - at('muai', 0.35)) / 0.4); arrow(rArr[0], new THREE.Vector3(-3.2, 0.5, 0.5), new THREE.Vector3(-1, 0, 0), 0.9 * g); arrow(rArr[1], new THREE.Vector3(4.0, 0.5, 0.5), new THREE.Vector3(1, 0, 0), 0.9 * g); }
      if (home && L('las') && t > at('las', 0.55) && t < at('las', 0.92)) {
        const g = smooth((t - at('las', 0.55)) / 0.4);
        arrow(rArr[0], new THREE.Vector3(-1.2, 0.5, 0.5), new THREE.Vector3(1, 0, 0), 0.8 * g); arrow(rArr[1], new THREE.Vector3(1.8, 0.5, 0.5), new THREE.Vector3(-1, 0, 0), 0.8 * g);
        const h = smooth((t - at('las', 0.68)) / 0.4);
        arrow(yArr[0], new THREE.Vector3(-0.2, 0.5, 0.5), new THREE.Vector3(-1, 0, 0), 0.7 * h); arrow(yArr[1], new THREE.Vector3(0.8, 0.5, 0.5), new THREE.Vector3(1, 0, 0), 0.7 * h);
      }

      // ===== label =====
      if (L('intro')) st.labels.push({ text: 'Pak Bero', pos: [BERO_HOME.x, 1.5, BERO_HOME.z], alpha: fade('intro', 0.2) * (1 - smooth((t - at('intro', 0.7)) / 0.3)), up: 30, tone: 'yellow' });
      if (L('amblas')) st.labels.push({ text: 'Amblas', pos: [tMid, 0.05, 0.55], alpha: smooth((t - at('amblas', 0.56)) / 0.3), up: 90, tone: 'red' });
      if (L('bantalan')) st.labels.push({ text: 'Bantalan', pos: [slX(28), SL, 0.85], alpha: smooth((t - at('bantalan', 0.27)) / 0.3), up: 60, tone: 'yellow' });
      if (L('geser')) st.labels.push({ text: 'Geser', pos: [slX(27), SL, 0.85 + slZ(27)], alpha: smooth((t - at('geser', 0.6)) / 0.3), up: 60, tone: 'red' });
      if (L('balas')) st.labels.push({ text: 'Kerikil balas', pos: [0.9, 0.12, 1.1], alpha: smooth((t - at('balas', 0.19)) / 0.3), up: 70, tone: 'yellow' });
      if (L('muai')) st.labels.push({ text: 'Memuai', pos: [0.4, 0.25, G / 2 + zAt(0.4)], alpha: smooth((t - at('muai', 0.39)) / 0.3), up: 60, tone: 'red' });
      if (L('celah')) st.labels.push({ text: 'Celah sambungan', pos: [0, yAt(0), G / 2], alpha: smooth((t - at('celah', 0.18)) / 0.3), up: 70, tone: 'yellow' });
      if (L('celah') && t > at('celah', 0.66)) { const k = Math.floor((t - at('celah', 0.66)) / 0.45) % 2; st.labels.push({ text: k ? 'Jeglek!' : 'Jeglek!', pos: [0, 0.6, G / 2], alpha: 1, up: 60 + k * 20 }); }
      if (L('aus')) st.labels.push({ text: 'Aus', pos: [3, yAt(3), G / 2], alpha: smooth((t - at('aus', 0.65)) / 0.3), up: 50, tone: 'red' });
      if (L('las')) {
        st.labels.push({ text: 'Dilas', pos: [0, yAt(0), G / 2], alpha: smooth((t - at('las', 0.07)) / 0.3) * (1 - smooth((t - at('las', 0.4)) / 0.3)), up: 60, tone: 'yellow' });
        st.labels.push({ text: 'Dijepit', pos: [slX(27), SL + 0.05, G / 2 + 0.1], alpha: smooth((t - at('las', 0.31)) / 0.3), up: 70, tone: 'yellow' });
        st.labels.push({ text: 'Ditahan', pos: [0.3, 0.5, 0.5], alpha: smooth((t - at('las', 0.69)) / 0.3) * (1 - smooth((t - at('las', 0.9)) / 0.2)), up: 50 });
      }
      if (L('berdiri')) st.labels.push({ text: 'Melaju mulus', pos: [tx - 1.5, 1.8, 0], alpha: fade('berdiri', 0.2), up: 30, tone: 'yellow' });
      if (!home) st.card = t < at('fakta', 0.7)
        ? { title: 'Whoosh · Jakarta–Bandung', body: 'Rel di atas pelat beton, tanpa kerikil', top: 0.08, alpha: fade('fakta', 0.5) }
        : { title: 'Sampai 350 km/jam', body: 'Pelat beton menjaga rel tetap lurus & rata', top: 0.08, alpha: 1 };

      // ===== Pak Bero =====
      let bp = BERO_HOME.clone(), anim = 'idle', yaw = null;
      if (teaser) { bp.set(3.6, 0, -2.0); anim = 'wave'; }
      else if (L('intro')) { bp.set(-1.7, 0, 1.3); anim = t < at('intro', 0.3) ? 'wave' : 'carry'; }
      else if (L('amblas')) anim = t > at('amblas', 0.55) ? 'panic' : 'idle';
      else if (L('bantalan')) anim = t < at('bantalan', 0.5) ? 'slap' : 'happy';
      else if (L('geser')) anim = t > at('geser', 0.6) ? 'panic' : 'sad';
      else if (L('balas')) anim = t < at('balas', 0.6) ? 'slap' : 'happy';
      else if (L('muai')) anim = t > at('muai', 0.75) ? 'panic' : 'sad';
      else if (L('celah')) { bp.set(-1.0, 0, 1.6); anim = 'point'; }
      else if (L('aus')) { bp.set(-1.0, 0, 1.8); anim = t > at('aus', 0.6) ? 'panic' : 'think'; }
      else if (L('las')) { bp.set(-2.3, 0, 1.6); anim = t < at('las', 0.5) ? 'slap' : 'point'; }
      else if (L('berdiri')) { const p = train.top(1); bp.copy(p); anim = 'happy'; }
      else if (!home) { bp.set(FX + 2.5, 0, 6); anim = 'point'; yaw = -0.6; }
      else if (L('outro')) { bp.set(-1.6, 0, 2.0); anim = 'wave'; }
      if (yaw === null) yaw = Math.atan2(camera.position.x - bp.x, camera.position.z - bp.z);
      bero.root.visible = !L('fakta');
      bero.root.position.copy(bp);
      bero.pose(t, anim, { yaw });
      // rel dibawa saat intro
      void easeOutBack;
      return st;
    },
  };
}
