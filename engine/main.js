// Entry: /engine/index.html?ep=01-bendungan[&play=1][&t=12.5][&dpr=2]
import { createKit } from './kit.js';
import { createOverlay } from './overlay.js';

const q = new URLSearchParams(location.search);
const ep = q.get('ep') ?? '01-bendungan';
const dpr = Number(q.get('dpr') ?? 1);

const [timing, brand] = await Promise.all([
  fetch(`/episodes/${ep}/timing.json`).then((r) => r.json()),
  fetch('/brand.json').then((r) => r.json()),
]);
const { build } = await import(`/episodes/${ep}/scene.js`);

// T: helper waktu berbasis id baris naskah
const byId = Object.fromEntries(timing.lines.map((l) => [l.id, l]));
const T = {
  duration: timing.duration,
  s: (id) => byId[id].start,
  e: (id) => byId[id].end,
  // progress 0..1 di dalam rentang [start(a), end(b)]
  p: (t, a, b = a, pad = 0) => Math.min(1, Math.max(0, (t - byId[a].start - pad) / (byId[b].end - byId[a].start - pad))),
  in: (t, a, b = a) => t >= byId[a].start && t < byId[b].end,
};

await document.fonts.ready.catch(() => {});
const stage = document.getElementById('stage');
const kit = createKit(document.getElementById('gl'), stage.clientWidth, stage.clientHeight, dpr);
const overlay = createOverlay(document.getElementById('overlay'), timing, brand);
const sceneApi = build(kit, T);

window.DURATION = timing.duration;
window.renderAt = (t) => {
  const state = sceneApi.update(t) ?? {};
  kit.render();
  overlay.update(t, kit.camera, state);
};

if (q.has('play')) {
  document.body.classList.add('play');
  const scrub = document.getElementById('scrub'), tt = document.getElementById('tt');
  let t0 = performance.now() / 1000 - Number(q.get('t') ?? 0), playing = true, cur = 0;
  document.getElementById('pp').onclick = () => { playing = !playing; t0 = performance.now() / 1000 - cur; };
  scrub.oninput = () => { cur = (scrub.value / 1000) * timing.duration; t0 = performance.now() / 1000 - cur; };
  const loop = () => {
    if (playing) cur = (performance.now() / 1000 - t0) % timing.duration;
    window.renderAt(cur);
    scrub.value = (cur / timing.duration) * 1000; tt.textContent = cur.toFixed(1);
    requestAnimationFrame(loop);
  };
  loop();
} else {
  window.renderAt(Number(q.get('t') ?? 0));
}
window.READY = true;
