// Pak Bero: berang-berang insinyur low-poly.
// Ciri khas: kacamata pelindung toska di dahi, sabuk alat hijau, gigi depan besar,
// ekor pipih. (Sengaja BUKAN helm kuning / rompi oranye.)
import * as THREE from 'three';
import { mat, mesh, clamp, lerp } from './kit.js';

export const BERO_PAL = {
  fur: '#8d5a33', furDark: '#6b4024', belly: '#dcae7c', muzzle: '#e8c194',
  nose: '#2b1a12', tail: '#4a2f1d', teeth: '#fffaf0', eye: '#ffffff', pupil: '#1d1d1d',
  goggleStrap: '#1f5f63', goggleRim: '#3a3f44', lens: '#6fe0dc', belt: '#2f8f4e', pouch: '#1f6b39', brow: '#4a2f1d',
};

export function createBero() {
  const P = BERO_PAL;
  const root = new THREE.Group();          // posisi di dunia
  root.name = 'bero';
  const bodyPivot = new THREE.Group();     // untuk lompat/goyang
  root.add(bodyPivot);
  const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);

  const body = mesh(ico(0.5), P.fur); body.scale.set(1, 1.15, 0.9); body.position.y = 0.62; bodyPivot.add(body);
  const belly = mesh(ico(0.38), P.belly); belly.scale.set(0.9, 1.05, 0.5); belly.position.set(0, 0.58, 0.3); bodyPivot.add(belly);

  // sabuk alat
  const belt = mesh(new THREE.TorusGeometry(0.47, 0.06, 6, 18), P.belt); belt.rotation.x = Math.PI / 2; belt.position.y = 0.42; belt.scale.set(1, 0.9, 1); bodyPivot.add(belt);
  const pouch = mesh(new THREE.BoxGeometry(0.18, 0.2, 0.12), P.pouch); pouch.position.set(0.38, 0.36, 0.22); pouch.rotation.y = 0.6; bodyPivot.add(pouch);
  const buckle = mesh(new THREE.BoxGeometry(0.12, 0.1, 0.04), '#e6e1d3'); buckle.position.set(0, 0.42, 0.45); bodyPivot.add(buckle);

  // ekor pipih
  const tail = mesh(ico(0.5, 0), P.tail); tail.scale.set(0.38, 0.08, 0.62); tail.position.set(0, 0.18, -0.62); tail.rotation.x = -0.25; bodyPivot.add(tail);

  // kepala
  const head = new THREE.Group(); head.position.y = 1.2; bodyPivot.add(head);
  const skull = mesh(ico(0.37), P.fur); skull.scale.set(1.05, 0.95, 1); head.add(skull);
  const muzzle = mesh(ico(0.2), P.muzzle); muzzle.scale.set(1.25, 0.85, 0.9); muzzle.position.set(0, -0.09, 0.27); head.add(muzzle);
  const nose = mesh(ico(0.07, 0), P.nose); nose.scale.set(1.3, 0.8, 0.9); nose.position.set(0, 0.0, 0.45); head.add(nose);
  for (const s of [-1, 1]) {
    const tooth = mesh(new THREE.BoxGeometry(0.06, 0.11, 0.03), P.teeth); tooth.position.set(s * 0.034, -0.22, 0.39); head.add(tooth);
    const ear = mesh(ico(0.09, 0), P.furDark); ear.position.set(s * 0.28, 0.24, -0.02); head.add(ear);
  }
  const eyes = [], pupils = [], brows = [];
  for (const s of [-1, 1]) {
    const e = mesh(ico(0.085), P.eye, { shadow: false }); e.position.set(s * 0.15, 0.08, 0.29); head.add(e); eyes.push(e);
    const p = mesh(ico(0.05), P.pupil, { shadow: false }); p.position.set(s * 0.15, 0.08, 0.36); head.add(p); pupils.push(p);
    const b = mesh(new THREE.BoxGeometry(0.13, 0.03, 0.03), P.brow, { shadow: false }); b.position.set(s * 0.15, 0.2, 0.33); head.add(b); brows.push(b);
  }
  // kacamata pelindung di dahi
  const strap = mesh(new THREE.TorusGeometry(0.375, 0.03, 5, 22), P.goggleStrap); strap.rotation.x = Math.PI / 2 - 0.35; strap.position.y = 0.19; head.add(strap);
  for (const s of [-1, 1]) {
    const rim = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), P.goggleRim); rim.rotation.x = Math.PI / 2 - 0.5; rim.position.set(s * 0.12, 0.3, 0.28); head.add(rim);
    const lens = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.075, 10), mat(P.lens, { emissive: P.lens, emissiveIntensity: 0.25, roughness: 0.2 }), { shadow: false });
    lens.rotation.x = Math.PI / 2 - 0.5; lens.position.set(s * 0.12, 0.305, 0.29); head.add(lens);
  }

  // lengan & kaki (pivot di bahu/pinggul)
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.43, 0.93, 0.08); bodyPivot.add(sh);
    const arm = mesh(new THREE.CapsuleGeometry(0.085, 0.3, 3, 6), P.fur); arm.position.y = -0.2; sh.add(arm);
    const hand = mesh(ico(0.09, 0), P.furDark); hand.position.y = -0.42; sh.add(hand);
    sh.hand = hand; arms.push(sh);
    const hip = new THREE.Group(); hip.position.set(s * 0.22, 0.26, 0.02); bodyPivot.add(hip);
    const leg = mesh(new THREE.CapsuleGeometry(0.1, 0.1, 3, 6), P.fur); leg.position.y = -0.08; hip.add(leg);
    const foot = mesh(ico(0.12, 0), P.furDark); foot.scale.set(1, 0.45, 1.5); foot.position.set(0, -0.2, 0.08); hip.add(foot);
    legs.push(hip);
  }
  const [armL, armR] = arms; // armR = kanan Pak Bero (sisi +x lokal)

  // benda yang dipegang (opsional) menempel di tangan kanan
  const holdSlot = new THREE.Group(); holdSlot.position.y = -0.42; armR.add(holdSlot);

  /**
   * pose(t, anim, opts)
   * anim: idle | wave | panic | happy | walk | point | slap | think | sad | carry
   */
  function pose(t, anim = 'idle', { yaw = 0 } = {}) {
    root.rotation.y = yaw;
    // reset
    bodyPivot.position.set(0, 0, 0); bodyPivot.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);
    armL.rotation.set(0, 0, 0.12); armR.rotation.set(0, 0, -0.12);
    legs.forEach((l) => l.rotation.set(0, 0, 0));
    let eyeS = 1, browY = 0.2, browRot = 0;
    const breathe = Math.sin(t * 2.2) * 0.02;
    bodyPivot.position.y = breathe;
    tail.rotation.x = -0.25 + Math.sin(t * 1.7) * 0.05;

    switch (anim) {
      case 'wave': {
        armR.rotation.z = -2.6 + Math.sin(t * 9) * 0.35;
        head.rotation.z = Math.sin(t * 3) * 0.06;
        break;
      }
      case 'panic': {
        const sh = Math.sin(t * 38) * 0.05;
        bodyPivot.position.x = sh; bodyPivot.position.y = Math.abs(Math.sin(t * 10)) * 0.12;
        armL.rotation.z = 2.5 + Math.sin(t * 20) * 0.3; armR.rotation.z = -2.5 - Math.sin(t * 20 + 1) * 0.3;
        eyeS = 1.35; browY = 0.25; browRot = 0.35;
        head.rotation.x = -0.1;
        break;
      }
      case 'happy': {
        const j = Math.abs(Math.sin(t * 6));
        bodyPivot.position.y = j * 0.35;
        armL.rotation.z = 2.4 + j * 0.3; armR.rotation.z = -2.4 - j * 0.3;
        legs[0].rotation.x = -j * 0.4; legs[1].rotation.x = -j * 0.4;
        tail.rotation.x = -0.25 - j * 0.35;
        eyeS = 0.9; browY = 0.24;
        break;
      }
      case 'walk': {
        const w = Math.sin(t * 9);
        legs[0].rotation.x = w * 0.6; legs[1].rotation.x = -w * 0.6;
        armL.rotation.x = -w * 0.5; armR.rotation.x = w * 0.5;
        bodyPivot.position.y = Math.abs(w) * 0.06;
        bodyPivot.rotation.z = w * 0.04;
        break;
      }
      case 'point': {
        armR.rotation.x = -1.5; armR.rotation.z = -0.3 + Math.sin(t * 4) * 0.05;
        head.rotation.y = -0.2;
        break;
      }
      case 'slap': { // menepuk/menambal
        const s = Math.max(0, Math.sin(t * 8));
        armR.rotation.x = -1.2 - s * 0.9; armL.rotation.x = -1.2 - Math.max(0, Math.sin(t * 8 + Math.PI)) * 0.9;
        bodyPivot.rotation.x = 0.15;
        break;
      }
      case 'think': {
        armR.rotation.x = -2.2; armR.rotation.z = 0.55;
        head.rotation.z = 0.12 + Math.sin(t * 1.5) * 0.04; head.rotation.x = -0.05;
        browRot = 0.2;
        break;
      }
      case 'sad': {
        head.rotation.x = 0.3; armL.rotation.z = 0.05; armR.rotation.z = -0.05;
        browRot = 0.3; browY = 0.19; eyeS = 0.9;
        break;
      }
      case 'carry': { // memanggul ranting
        armR.rotation.x = -0.6; armR.rotation.z = -0.25;
        armL.rotation.x = -0.6; armL.rotation.z = 0.25;
        break;
      }
      default: { // idle
        armL.rotation.z = 0.15 + Math.sin(t * 2.2) * 0.04; armR.rotation.z = -0.15 - Math.sin(t * 2.2) * 0.04;
        head.rotation.y = Math.sin(t * 0.8) * 0.1;
      }
    }
    // nilai z di atas ditulis "positif = ke atas/keluar untuk kiri"; balik ke konvensi three.js
    armL.rotation.z *= -1; armR.rotation.z *= -1;
    // kedip
    const blink = (t % 3.7) < 0.12 ? 0.15 : 1;
    eyes.forEach((e) => e.scale.set(eyeS, eyeS * blink, eyeS));
    pupils.forEach((p) => p.scale.set(eyeS, eyeS * blink, eyeS));
    brows.forEach((b, i) => { b.position.y = browY; b.rotation.z = (i === 0 ? -1 : 1) * browRot; });
  }

  pose(0);
  return { root, pose, holdSlot, head };
}
