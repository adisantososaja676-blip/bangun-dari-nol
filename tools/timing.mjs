// Bikin timing.json (waktu per baris & per kata) untuk satu episode.
//
//   node tools/timing.mjs episodes/01-bendungan
//
// Kalau ada episodes/<ep>/words.json (timestamp per kata dari TTS/Whisper,
// format: [{ "word": "Nahan", "start": 0.12, "end": 0.40 }, ...]),
// waktunya diselaraskan ke naskah. Kalau tidak ada, waktunya DIESTIMASI
// dari panjang kata (untuk preview sebelum audio ada).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const epDir = process.argv[2];
if (!epDir) { console.error('pakai: node tools/timing.mjs episodes/<ep>'); process.exit(1); }
const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf8'));

// Pecah teks jadi kata + warna. *x* = kuning, !x! = merah.
export function tokenize(text) {
  const out = [];
  const re = /\*([^*]+)\*|!([^!]+)!|(\S+)/g;
  let m;
  while ((m = re.exec(text))) {
    const chunk = m[1] ?? m[2] ?? m[3];
    const color = m[1] ? 'y' : m[2] ? 'r' : null;
    // tanda baca yang nempel setelah penanda (mis. "*lumpur*.")
    const words = chunk.split(/\s+/);
    words.forEach((w) => out.push({ w, color }));
  }
  // gabungkan tanda baca yatim (".", ",") ke kata sebelumnya
  const merged = [];
  for (const t of out) {
    if (/^[.,!?:;]+$/.test(t.w) && merged.length) merged[merged.length - 1].w += t.w;
    else merged.push(t);
  }
  return merged;
}
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

const lines = script.lines.map((l) => ({ id: l.id, words: tokenize(l.text.replace(/([*!])([.,?:;])/g, '$1 $2')) }));

const wordsFile = path.join(epDir, 'words.json');
const LEAD = 0.3, TAIL = 1.6;
let source, audioDuration = 0;

// 1) selalu mulai dari estimasi (panjang kata + jeda tanda baca)
function estimate() {
  let t = LEAD;
  for (const line of lines) {
    for (const w of line.words) {
      const n = norm(w.w);
      const len = n.length + (n.match(/[0-9]/g)?.length ?? 0) * 2; // angka dibaca lebih panjang
      const dur = 0.08 + 0.047 * len;
      w.start = +t.toFixed(3); t += dur; w.end = +t.toFixed(3);
      if (/[,:]$/.test(w.w)) t += 0.18;
      if (/[.?!]$/.test(w.w)) t += 0.32;
    }
  }
}
estimate();
const allWords = lines.flatMap((l) => l.words);
const audioFile = ['mp3', 'wav', 'm4a'].map((x) => path.join(epDir, `audio.${x}`)).find((f) => fs.existsSync(f));

if (fs.existsSync(wordsFile)) {
  // 2a) timestamp per kata tersedia (Whisper / ekspor TTS)
  source = 'words.json';
  const stamps = JSON.parse(fs.readFileSync(wordsFile, 'utf8'))
    .map((s) => ({ ...s, n: norm(s.word ?? s.text ?? '') })).filter((s) => s.n);
  let j = 0;
  for (const w of allWords) {
    const n = norm(w.w);
    // cari kata yang sama dalam 4 stamp ke depan, kalau tidak ketemu pakai stamp berikutnya
    let k = -1;
    for (let d = 0; d < 4 && j + d < stamps.length; d++) if (stamps[j + d].n === n) { k = j + d; break; }
    if (k < 0) k = Math.min(j, stamps.length - 1);
    w.start = stamps[k].start; w.end = stamps[k].end; j = k + 1;
  }
} else if (audioFile) {
  // 2b) hanya ada audio: cocokkan jeda (silence) di audio ke tanda baca di naskah
  source = 'audio-silence';
  // ffmpeg menulis hasil silencedetect ke stderr
  const err = spawnSync('ffmpeg', ['-hide_banner', '-i', audioFile, '-af', 'silencedetect=noise=-35dB:d=0.09', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const dur = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(err).slice(1).reduce((a, x, i) => a + Number(x) * [3600, 60, 1][i], 0));
  const sil = [];
  for (const m of err.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) sil.push([Number(m[1]), Number(m[2])]);
  const speechStart = sil.length && sil[0][0] < 0.05 ? sil[0][1] : 0;
  const speechEnd = sil.length && sil.at(-1)[1] > dur - 0.05 ? sil.at(-1)[0] : dur;
  const inner = sil.filter(([a, b]) => a > speechStart + 0.05 && b < speechEnd - 0.05);
  // skala estimasi ke rentang bicara
  const e0 = allWords[0].start, e1 = allWords.at(-1).end;
  const sc = (x) => speechStart + ((x - e0) / (e1 - e0)) * (speechEnd - speechStart);
  // titik jeda di naskah: setelah kata bertanda baca
  const pauses = [];
  allWords.forEach((w, i) => { if (i < allWords.length - 1 && /[,.?!:]$/.test(w.w)) pauses.push({ i, t: sc((w.end + allWords[i + 1].start) / 2), strong: /[.?!]$/.test(w.w) }); });
  // pencocokan monoton (DP): pasangkan jeda naskah ↔ jeda audio sehingga kecepatan bicara
  // tiap potongan konsisten; jeda audio panjang yang dilewati & titik kalimat yang tak terpasang kena penalti.
  const P = pauses.length, S = inner.length;
  const G = (speechEnd - speechStart) / (e1 - e0);
  const wStart = (pi) => (pi < 0 ? allWords[0].start : allWords[pauses[pi].i + 1].start);
  const wEnd = (pi) => (pi >= P ? allWords.at(-1).end : allWords[pauses[pi].i].end);
  const sEnd = (sb) => (sb < 0 ? speechStart : inner[sb][1]);
  const sStart = (sb) => (sb >= S ? speechEnd : inner[sb][0]);
  const skipPauseCost = (from, to) => { let c = 0; for (let k = from + 1; k < to; k++) c += pauses[k].strong ? 1.2 : 0.35; return c; };
  const skipSilCost = (from, to) => { let c = 0; for (let k = from + 1; k < to; k++) c += Math.max(0, inner[k][1] - inner[k][0] - 0.08) * 5; return c; };
  const segCost = (pa, sb, pa2, sb2) => {
    const exp = wEnd(pa2) - wStart(pa); const act = sStart(sb2) - sEnd(sb);
    if (act <= 0.05 || exp <= 0) return Infinity;
    const r = Math.log(act / (exp * G));
    return r * r * 6;
  };
  // dp[a][b]: biaya minimum dengan jeda naskah a dipasangkan ke jeda audio b
  const key = (a, b) => (a + 1) * (S + 2) + (b + 1);
  const dp = new Map([[key(-1, -1), { c: 0, prev: null }]]);
  for (let a = 0; a <= P; a++) for (let b = 0; b <= S; b++) {
    if ((a === P) !== (b === S)) continue; // titik akhir hanya berpasangan dengan akhir bicara
    let best = null;
    for (let a2 = -1; a2 < a; a2++) for (let b2 = -1; b2 < b; b2++) {
      const pr = dp.get(key(a2, b2)); if (!pr) continue;
      const c = pr.c + segCost(a2, b2, a, b) + skipPauseCost(a2, a) + skipSilCost(b2, b);
      if (!best || c < best.c) best = { c, prev: [a2, b2] };
    }
    if (best && isFinite(best.c)) dp.set(key(a, b), best);
  }
  const pairs = [];
  for (let cur = [P, S]; cur; ) {
    const node = dp.get(key(...cur)); if (!node) break;
    if (cur[0] < P && cur[0] >= 0) pairs.unshift(cur);
    cur = node.prev && node.prev[0] >= 0 ? node.prev : null;
  }
  // jangkar: [indeks batas kata, waktu akhir kata kiri, waktu mulai kata kanan]
  const anchors = [{ i: -1, endL: speechStart, startR: speechStart }];
  for (const [pa, sb] of pairs) anchors.push({ i: pauses[pa].i, endL: inner[sb][0], startR: inner[sb][1] });
  anchors.push({ i: allWords.length - 1, endL: speechEnd, startR: speechEnd });
  // petakan ulang kata di antara dua jangkar secara linier
  for (let k = 0; k < anchors.length - 1; k++) {
    const A = anchors[k], B = anchors[k + 1];
    const ws = allWords.slice(A.i + 1, B.i + 1);
    if (!ws.length) continue;
    const a0 = ws[0].start, a1 = ws.at(-1).end;
    const map = (x) => A.startR + ((x - a0) / (a1 - a0 || 1)) * (B.endL - A.startR);
    for (const w of ws) { w.start = +map(w.start).toFixed(3); w.end = +map(w.end).toFixed(3); }
  }
  console.log(`jeda terdeteksi: ${inner.length}, jeda naskah: ${P}, cocok: ${pairs.length}`);
  audioDuration = dur;
} else {
  source = 'estimate';
}

for (const line of lines) {
  line.start = line.words[0].start;
  line.end = line.words[line.words.length - 1].end;
}
// akhir baris = awal baris berikut (supaya visual tidak "kosong" di jeda)
for (let i = 0; i < lines.length - 1; i++) lines[i].end = lines[i + 1].start;
const duration = +Math.max(lines[lines.length - 1].end + TAIL, audioDuration + 0.3).toFixed(2);
lines[lines.length - 1].end = duration;

const out = { id: script.id, source, duration, lines };
fs.writeFileSync(path.join(epDir, 'timing.json'), JSON.stringify(out, null, 1));
console.log(`timing.json: ${lines.length} baris, ${duration}s (${source})`);
