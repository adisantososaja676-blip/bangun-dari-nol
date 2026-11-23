// Lapisan 2D (DOM): subtitle per kata, label istilah, watermark, kartu info.
import * as THREE from 'three';

const CHUNK = 3; // maksimal kata per potongan subtitle

function chunkLine(words) {
  const chunks = []; let cur = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= CHUNK || /[,.?!:]$/.test(w.w)) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  // hindari potongan 1 kata yang menggantung kalau bisa digabung
  for (let i = chunks.length - 1; i > 0; i--) if (chunks[i].length === 1 && chunks[i - 1].length < CHUNK && !/[,.?!:]$/.test(chunks[i - 1].at(-1).w)) { chunks[i - 1].push(...chunks[i]); chunks.splice(i, 1); }
  return chunks.map((ws) => ({ words: ws, start: ws[0].start, end: ws.at(-1).end }));
}

export function createOverlay(root, timing, brand) {
  root.innerHTML = `
    <div class="wm"><span class="wm-av">${brand.avatar ?? 'B'}</span><span>${brand.handle}</span></div>
    <div class="dim"></div>
    <div class="labels"></div>
    <div class="card"></div>
    <div class="sub"></div>`;
  const $ = (s) => root.querySelector(s);
  const subEl = $('.sub'), labelsEl = $('.labels'), cardEl = $('.card'), dimEl = $('.dim');

  const chunks = timing.lines.flatMap((l) => chunkLine(l.words));
  let lastChunk = -1, lastCard = null;
  const labelPool = [];
  const v = new THREE.Vector3();

  function update(t, camera, state = {}) {
    const W = root.clientWidth, H = root.clientHeight;
    // --- subtitle ---
    let ci = -1;
    for (let i = 0; i < chunks.length; i++) {
      const next = chunks[i + 1];
      if (t >= chunks[i].start - 0.05 && (!next || t < next.start - 0.05) && t < chunks[i].end + 0.9) { ci = i; break; }
    }
    if (ci !== lastChunk) {
      lastChunk = ci;
      subEl.innerHTML = ci < 0 ? '' : chunks[ci].words.map((w) => `<span class="w ${w.color ?? ''}">${w.w.replace(/\*|!/g, '')}</span>`).join(' ');
    }
    if (ci >= 0) {
      const spans = subEl.children;
      chunks[ci].words.forEach((w, i) => {
        const k = Math.min(1, Math.max(0, (t - w.start + 0.04) / 0.12));
        const s = spans[i];
        s.style.opacity = k > 0 ? 1 : 0;
        s.style.transform = `scale(${0.7 + 0.3 * (1 - Math.pow(1 - k, 3)) + (k > 0 && k < 1 ? 0.08 * Math.sin(k * Math.PI) : 0)})`;
      });
    }
    subEl.style.top = (state.subTop ?? 0.62) * 100 + '%';

    // --- label istilah (titik 3D → layar) ---
    const labels = state.labels ?? [];
    while (labelPool.length < labels.length) {
      const el = document.createElement('div'); el.className = 'lbl';
      el.innerHTML = '<div class="lbl-pill"></div><div class="lbl-line"></div><div class="lbl-dot"></div>';
      labelsEl.appendChild(el); labelPool.push(el);
    }
    labelPool.forEach((el, i) => {
      const L = labels[i];
      if (!L || (L.alpha ?? 1) <= 0) { el.style.display = 'none'; return; }
      v.set(...L.pos).project(camera);
      if (v.z > 1) { el.style.display = 'none'; return; }
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const up = L.up ?? 46;
      el.style.display = 'block';
      el.style.opacity = L.alpha ?? 1;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.className = 'lbl ' + (L.tone ?? '');
      const pill = el.children[0];
      if (pill.textContent !== L.text) pill.textContent = L.text;
      pill.style.transform = `translate(-50%, ${-up}px) translate(0,-100%) scale(${0.6 + 0.4 * Math.min(1, (L.alpha ?? 1) * 1.6)})`;
      el.children[1].style.height = up + 'px'; el.children[1].style.top = -up + 'px';
    });

    // --- kartu info & peredup ---
    const card = state.card ?? null;
    const key = card ? card.title + card.body : null;
    if (key !== lastCard) {
      lastCard = key;
      cardEl.innerHTML = card ? `<div class="card-t">${card.title}</div><div class="card-b">${card.body}</div>` : '';
    }
    cardEl.style.opacity = card ? (card.alpha ?? 1) : 0;
    cardEl.style.top = (card?.top ?? 0.2) * 100 + '%';
    dimEl.style.opacity = state.dim ?? 0;
  }
  return { update };
}
