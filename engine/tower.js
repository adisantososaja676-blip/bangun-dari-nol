// Gedung tinggi rangka baja, per lantai (story), bisa bergoyang (geser/shear)
// tanpa state: setiap frame panggil tower.update({...}) dengan nilai dari t.
// Bagian: rangka (kolom + balok + pelat), pengaku silang (X), inti beton,
// selubung kaca kotak & kaca bersudut bertangga (+ pita lantai).
import * as THREE from 'three';
import { mesh, mat, clamp } from './kit.js';

export function notchedShape(a, n) {
  // denah kotak setengah-lebar a, tiap sudut dipotong 2 anak tangga ukuran n
  const s = new THREE.Shape();
  const q = [[a - 2 * n, a], [a - 2 * n, a - n], [a - n, a - n], [a - n, a - 2 * n], [a, a - 2 * n]];
  const pts = [];
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) { // keliling berlawanan jarum jam
    const c = q.map(([x, y]) => [x * sx, y * sy]);
    pts.push(...(sx * sy > 0 ? c.reverse() : c));
  }
  s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => s.lineTo(x, y)); s.closePath();
  return s;
}
export function squareShape(a) {
  const s = new THREE.Shape(); s.moveTo(a, a); s.lineTo(a, -a); s.lineTo(-a, -a); s.lineTo(-a, a); s.closePath(); return s;
}
const prism = (shape, h) => { const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; };

export function createTower({ N = 28, FH = 0.5, a = 1.15, notch = 0.22, steel = '#4f6475', glass = '#86c8e8' } = {}) {
  const H = N * FH;
  const root = new THREE.Group();
  const steelM = mat(steel), braceM = mat('#d6453d'), coreM = mat('#b9bcbf'), slabM = mat('#d9d6cf');
  const glassM = new THREE.MeshStandardMaterial({ color: glass, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
  const glass2 = glassM.clone(); glass2.color.set('#6fb3d9');
  const bandM = mat('#eef0f2');
  const colGeo = new THREE.BoxGeometry(0.1, FH, 0.1); colGeo.translate(0, FH / 2, 0);
  const beamX = new THREE.BoxGeometry(2 * a, 0.08, 0.08), beamZ = new THREE.BoxGeometry(0.08, 0.08, 2 * a);
  const slabGeo = new THREE.BoxGeometry(2 * a + 0.04, 0.05, 2 * a + 0.04);
  const dl = Math.hypot(2 * a, FH), da = Math.atan2(FH, 2 * a);
  const braceGeo = new THREE.BoxGeometry(dl, 0.05, 0.05);
  const coreGeo = new THREE.BoxGeometry(0.8, FH, 0.8); coreGeo.translate(0, FH / 2, 0);
  const sqGeo = prism(squareShape(a + 0.03), FH * 0.9), ntGeo = prism(notchedShape(a + 0.03, notch), FH * 0.9);
  const sqBand = prism(squareShape(a + 0.05), FH * 0.1), ntBand = prism(notchedShape(a + 0.05, notch), FH * 0.1);
  sqGeo.translate(0, FH * 0.1, 0); ntGeo.translate(0, FH * 0.1, 0);

  const stories = [];
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g);
    const frame = new THREE.Group(); g.add(frame);
    for (const x of [-a, 0, a]) for (const z of [-a, 0, a]) { if (!x && !z) continue; const c = mesh(colGeo, steelM, { shadow: true }); c.position.set(x, 0, z); frame.add(c); }
    for (const z of [-a, a]) { const b = mesh(beamX, steelM, { shadow: false }); b.position.set(0, FH, z); frame.add(b); }
    for (const x of [-a, a]) { const b = mesh(beamZ, steelM, { shadow: false }); b.position.set(x, FH, 0); frame.add(b); }
    const slab = mesh(slabGeo, slabM, { shadow: false }); slab.position.y = FH; frame.add(slab);
    const brace = new THREE.Group(); g.add(brace);
    for (const [px, pz, ry] of [[0, a, 0], [0, -a, 0], [a, 0, Math.PI / 2], [-a, 0, Math.PI / 2]]) for (const sg of [1, -1]) {
      const b = mesh(braceGeo, braceM, { shadow: false }); b.position.set(px, FH / 2, pz); b.rotation.set(0, ry, sg * da, 'YXZ'); brace.add(b);
    }
    const core = mesh(coreGeo, coreM); g.add(core);
    const gm = i % 2 ? glass2 : glassM;
    const sq = new THREE.Group(), nt = new THREE.Group(); g.add(sq, nt);
    sq.add(mesh(sqGeo, gm, { shadow: true, receive: false }), mesh(sqBand, bandM, { shadow: false }));
    nt.add(mesh(ntGeo, gm, { shadow: true, receive: false }), mesh(ntBand, bandM, { shadow: false }));
    stories.push({ g, frame, brace, core, sq, nt, y: i * FH });
  }
  const roof = new THREE.Group(); root.add(roof); roof.matrixAutoUpdate = false;
  const roofSq = mesh(prism(squareShape(a + 0.05), 0.12), bandM), roofNt = mesh(prism(notchedShape(a + 0.05, notch), 0.12), bandM);
  roof.add(roofSq, roofNt);

  const off = (top, y) => top * (y / H) ** 2;
  const shearM = (m, y0, sY, tx, tz) => {
    const y1 = y0 + FH * sY;
    const kx = (off(tx, y1) - off(tx, y0)) / Math.max(1e-6, FH), kz = (off(tz, y1) - off(tz, y0)) / Math.max(1e-6, FH);
    m.set(1, kx * sY, 0, off(tx, y0), 0, sY, 0, y0, 0, kz * sY, 1, off(tz, y0), 0, 0, 0, 1);
  };

  /**
   * opts: built 0..1 (lantai tumbuh dari bawah), sx/sz goyangan puncak (m),
   * frame/brace/core 0..1 (skala tumbuh), clad: 0 none, 1 kotak, 2 bertangga,
   * cladMix (0..1: kotak→bertangga, berjalan dari atas), cladOpacity, cladGrow 0..1,
   * coreTop: inti hanya sampai lantai ke-n (ruang untuk peredam di puncak)
   */
  function update({ built = 1, sx = 0, sz = 0, frame = 1, brace = 0, core = 0, clad = 0, cladMix = 0, cladGrow = 1, cladOpacity = 0.72, coreTop = N, braceTop = N } = {}) {
    glassM.opacity = cladOpacity; glass2.opacity = cladOpacity * 0.95;
    const nb = built * N;
    stories.forEach((st, i) => {
      const sY = clamp(nb - i);
      st.g.visible = sY > 0.001;
      if (!st.g.visible) return;
      shearM(st.g.matrix, st.y, sY, sx, sz); st.g.matrixWorldNeedsUpdate = true;
      st.frame.visible = frame > 0.01;
      st.brace.visible = brace > clamp((i / N) * 0.6 + 0.001) && i < braceTop;
      st.core.visible = core > 0.01 && i < coreTop; st.core.scale.y = Math.max(0.01, clamp(core * 1.6 - (i / N) * 0.6));
      const g = clamp(cladGrow * 1.5 - (i / N) * 0.5);
      const mix = cladMix > 1 - i / N - 0.001 ? 1 : 0; // dari atas ke bawah
      st.sq.visible = clad > 0 && g > 0.01 && (clad === 1 && !mix);
      st.nt.visible = clad > 0 && g > 0.01 && (clad === 2 || mix === 1);
      st.sq.scale.setScalar(Math.max(0.01, g)); st.nt.scale.setScalar(Math.max(0.01, g));
    });
    roof.visible = built >= 0.999 && clad > 0;
    shearM(roof.matrix, H, 1, sx, sz); roof.matrixWorldNeedsUpdate = true;
    roofNt.visible = clad === 2 || cladMix >= 0.999; roofSq.visible = !roofNt.visible;
  }
  /** posisi dunia (lokal root) titik di ketinggian y, ikut goyangan */
  const at = (y, sx = 0, sz = 0, x = 0, z = 0) => new THREE.Vector3(x + off(sx, y), y, z + off(sz, y));
  update();
  return { root, update, at, H, FH, N, a, notch, glassM };
}
