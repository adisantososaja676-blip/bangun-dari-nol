// Scene kit: renderer, palet, dunia (lembah sungai), helper animasi.
// Semua animasi harus FUNGSI MURNI dari waktu t (deterministik) supaya
// render frame-per-frame selalu sama.
import * as THREE from 'three';

export const PAL = {
  skyTop: '#6ec6e6', skyMid: '#a9e0ef', skyLow: '#ffe2b8',
  stormTop: '#5f6f7d', stormLow: '#a9b3b8',
  grass: '#8fd16a', grassDark: '#6fb552', cliff: '#b0703f', cliffDark: '#8a5432',
  bed: '#c9a46b', water: '#27b3ac', waterDeep: '#1b8f8f', foam: '#e9fbff',
  hills: '#b7a5dd', hills2: '#cdbfeb',
  trunk: '#7a4b2a', leaf: '#5fbf4a', leaf2: '#7fd35a', leaf3: '#4aa84a',
  rock: '#9c9a93',
  stick: '#8b5a2b', stick2: '#a86d36', mud: '#5d3d26',
  earth: '#c08a52', earthTop: '#93c25d', clay: '#b4532a', sand: '#ecc97a', concrete: '#b9bcbf',
  arrow: '#ffd23f', red: '#ff5a5f',
};

// ---------- util ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeOutBack = (t) => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export function rng(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...opts }));
  return mats.get(key);
}
export function mesh(geo, material, { shadow = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  m.castShadow = shadow; m.receiveShadow = receive; return m;
}

// Kamera: daftar key {t, pos:[x,y,z], look:[x,y,z], fov?}. Transisi halus antar key.
export function cameraAt(keys, t, cam) {
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  let k = 0;
  if (b !== a) {
    const dur = b.cut ? 0 : Math.min(b.blend ?? 1.1, b.t - a.t);
    k = dur <= 0 ? (t >= b.t ? 1 : 0) : smooth((t - (b.t - dur)) / dur);
  }
  const P = (u, v) => new THREE.Vector3(...u).lerp(new THREE.Vector3(...v), k);
  cam.position.copy(P(a.pos, b.pos));
  const look = P(a.look, b.look);
  cam.fov = lerp(a.fov ?? 50, b.fov ?? 50, k); cam.updateProjectionMatrix();
  cam.lookAt(look);
}

// Panah gaya (sumbu +X, panjang diatur lewat setLength)
export function makeArrow(color = PAL.arrow) {
  const g = new THREE.Group();
  // selalu tampil di atas air/benda lain (diagram), jadi depthTest dimatikan
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, flatShading: true, depthTest: false, transparent: true });
  const shaft = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), m, { shadow: false });
  shaft.rotation.z = -Math.PI / 2;
  const head = mesh(new THREE.ConeGeometry(0.2, 0.42, 10), m, { shadow: false });
  head.rotation.z = -Math.PI / 2;
  shaft.renderOrder = head.renderOrder = 10;
  g.add(shaft, head);
  g.setLength = (L) => {
    L = Math.max(0.01, L);
    const s = Math.max(0.001, L - 0.4);
    shaft.scale.set(1, s, 1); shaft.position.x = s / 2; head.position.x = s + 0.2;
  };
  g.setLength(1);
  return g;
}

// Instanced particles: set(i, x,y,z, s, rotY?)
export function makeInstances(geo, material, count) {
  const im = new THREE.InstancedMesh(geo, typeof material === 'string' ? mat(material) : material, count);
  im.castShadow = false; im.receiveShadow = false;
  im.frustumCulled = false;
  const d = new THREE.Object3D();
  im.hideAll = () => { d.position.set(0, -999, 0); d.scale.setScalar(0); d.updateMatrix(); for (let i = 0; i < count; i++) im.setMatrixAt(i, d.matrix); im.instanceMatrix.needsUpdate = true; };
  im.set = (i, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
    d.position.set(x, y, z); d.scale.set(sx, sy, sz); d.rotation.set(rx, ry, rz); d.updateMatrix();
    im.setMatrixAt(i, d.matrix); im.instanceMatrix.needsUpdate = true;
  };
  im.hideAll();
  return im;
}

// ---------- kit ----------
export function createKit(canvas, width, height, pixelRatio = 1) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 600);

  // langit gradasi (tekstur kanvas sebagai background)
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 4; skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(PAL.skyLow, 40, 140);
  const cTop = new THREE.Color(), cMid = new THREE.Color(), cLow = new THREE.Color();
  let lastStorm = -1;
  function setSky(storm = 0) {
    storm = Math.round(clamp(storm) * 50) / 50;
    if (storm === lastStorm) return; lastStorm = storm;
    cTop.set(PAL.skyTop).lerp(new THREE.Color(PAL.stormTop), storm);
    cMid.set(PAL.skyMid).lerp(new THREE.Color(PAL.stormLow), storm);
    cLow.set(PAL.skyLow).lerp(new THREE.Color(PAL.stormLow), storm);
    const g = skyCtx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#' + cTop.getHexString()); g.addColorStop(0.55, '#' + cMid.getHexString()); g.addColorStop(1, '#' + cLow.getHexString());
    skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
    scene.fog.color.copy(cLow);
    sun.intensity = lerp(2.6, 1.1, storm); hemi.intensity = lerp(1.5, 1.1, storm);
  }

  const hemi = new THREE.HemisphereLight('#ffffff', '#8a7a5a', 1.5);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  sun.position.set(-14, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);
  setSky(0);

  return { THREE, renderer, scene, camera, sun, setSky, render: () => renderer.render(scene, camera) };
}

// Lembah sungai: tebing kiri-kanan, dasar, air hulu & hilir, pohon, bukit.
// Sungai mengalir ke +Z. Bendungan di z=0. Lebar alur W, dalam H.
export function buildValley(kit, { W = 8, H = 4, seed = 7 } = {}) {
  const { scene } = kit;
  const R = rng(seed);
  const root = new THREE.Group(); scene.add(root);
  const half = W / 2, L = 140;

  for (const side of [-1, 1]) {
    const bank = new THREE.Group(); root.add(bank);
    const body = mesh(new THREE.BoxGeometry(60, 11.4, L), PAL.cliffDark); body.position.set(side * (half + 30 + 0.6), -6.2, 0); bank.add(body);
    const top = mesh(new THREE.BoxGeometry(60, 0.5, L), PAL.grass); top.position.set(side * (half + 30), -0.25, 0); bank.add(top);
    // muka tebing bergerigi
    const cliffGeo = new THREE.PlaneGeometry(L, H + 0.5, 70, 5);
    const pos = cliffGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const edge = y > (H + 0.5) / 2 - 0.01;
      pos.setZ(i, edge ? 0 : (R() * 0.5 + 0.1));
    }
    cliffGeo.computeVertexNormals();
    const cliff = mesh(cliffGeo, PAL.cliff);
    cliff.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    cliff.position.set(side * half, -(H + 0.5) / 2 + 0.0, 0);
    bank.add(cliff);
  }
  const bed = mesh(new THREE.BoxGeometry(W + 1, 0.4, L), PAL.bed); bed.position.set(0, -H - 0.2, 0); root.add(bed);
  // batu dasar sungai
  for (let i = 0; i < 26; i++) {
    const r = 0.15 + R() * 0.35;
    const rock = mesh(new THREE.DodecahedronGeometry(r, 0), PAL.rock);
    rock.position.set((R() - 0.5) * (W - 1), -H + r * 0.3, (R() - 0.5) * 60 + (R() < 0.5 ? 14 : -14));
    rock.rotation.set(R() * 3, R() * 3, R() * 3); root.add(rock);
  }

  // air (box; tinggi diatur lewat setLevel)
  const waterMat = new THREE.MeshStandardMaterial({ color: PAL.water, flatShading: true, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.92 });
  function waterBox(z0, z1) {
    const m = mesh(new THREE.BoxGeometry(W + 0.6, 1, z1 - z0), waterMat, { shadow: false });
    m.position.z = (z0 + z1) / 2;
    m.setLevel = (y) => { const h = Math.max(0.02, y - (-H)); m.scale.y = h; m.position.y = -H + h / 2; m.visible = h > 0.03; };
    root.add(m); return m;
  }
  const up = waterBox(-L / 2, 0), down = waterBox(0, L / 2);
  up.setLevel(-3); down.setLevel(-3.4);

  // buih mengalir di permukaan hilir
  const foam = makeInstances(new THREE.BoxGeometry(0.04, 0.02, 0.5), mat(PAL.foam, { emissive: '#ffffff', emissiveIntensity: 0.3 }), 60);
  root.add(foam);
  const foamSeeds = Array.from({ length: 60 }, () => [R(), R(), R()]);
  function updateFoam(t, levelDown, speed = 2.5, z0 = 1.5) {
    foamSeeds.forEach(([a, b, c], i) => {
      const z = z0 + ((t * speed * (0.7 + c * 0.6) + a * 40) % 40);
      foam.set(i, (b - 0.5) * (W - 0.8), levelDown + 0.02, z, 1, 1, 0.6 + c);
    });
  }

  // pohon bulat (beda dari pinus referensi)
  const treeGeoT = new THREE.CylinderGeometry(0.12, 0.16, 1, 6);
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 140; i++) {
    const side = R() < 0.5 ? -1 : 1;
    const x = side * (half + 2.5 + R() * 26), z = (R() - 0.5) * 120;
    if (Math.abs(x) < half + 4 && Math.abs(z) < 8) continue; // area kerja Pak Bero
    const s = 0.7 + R() * 0.8;
    const tr = mesh(treeGeoT, PAL.trunk); tr.scale.set(s, s, s); tr.position.set(x, 0.5 * s, z); root.add(tr);
    const lf = mesh(leafGeo, [PAL.leaf, PAL.leaf2, PAL.leaf3][i % 3]);
    lf.scale.set(s * 0.95, s * 1.05, s * 0.95); lf.position.set(x, 1.45 * s, z); lf.rotation.y = R() * 3; root.add(lf);
  }
  // semak
  for (let i = 0; i < 50; i++) {
    const side = R() < 0.5 ? -1 : 1;
    const x = side * (half + 1.2 + R() * 20), z = (R() - 0.5) * 100;
    if (Math.abs(x) < half + 3.5 && Math.abs(z) < 6) continue;
    const b = mesh(leafGeo, PAL.grassDark); b.scale.setScalar(0.35 + R() * 0.3); b.position.set(x, 0.15, z); root.add(b);
  }
  // bukit pastel di kejauhan
  for (let i = 0; i < 16; i++) {
    const h = 10 + R() * 16;
    const hill = mesh(new THREE.ConeGeometry(8 + R() * 8, h, 5), i % 2 ? PAL.hills : PAL.hills2, { shadow: false, receive: false });
    const a = R() * Math.PI * 2;
    hill.position.set(Math.cos(a) * (85 + R() * 20), h / 2 - 2, Math.sin(a) * (85 + R() * 20));
    hill.rotation.y = R() * 3; root.add(hill);
  }
  return { root, up, down, updateFoam, W, H, waterMat };
}

// Hujan (instanced)
export function makeRain(kit, count = 500, area = [30, 16, 34], center = [0, 6, 2]) {
  const m = new THREE.MeshBasicMaterial({ color: '#dbeef7', transparent: true, opacity: 0.45 });
  const rain = makeInstances(new THREE.BoxGeometry(0.018, 0.6, 0.018), m, count);
  kit.scene.add(rain);
  const R = rng(99); const seeds = Array.from({ length: count }, () => [R(), R(), R()]);
  rain.update = (t, amount) => {
    const n = Math.floor(count * clamp(amount));
    seeds.forEach(([a, b, c], i) => {
      if (i >= n) { rain.set(i, 0, -999, 0, 0); return; }
      const y = center[1] + area[1] / 2 - ((t * 14 + c * area[1]) % area[1]);
      rain.set(i, center[0] + (a - 0.5) * area[0], y, center[2] + (b - 0.5) * area[2], 1, 1, 1, 0, 0, 0.12);
    });
  };
  return rain;
}
