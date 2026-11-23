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
let source;

if (fs.existsSync(wordsFile)) {
  source = 'audio';
  const stamps = JSON.parse(fs.readFileSync(wordsFile, 'utf8'))
    .map((s) => ({ ...s, n: norm(s.word ?? s.text ?? '') })).filter((s) => s.n);
  let j = 0;
  for (const line of lines) for (const w of line.words) {
    const n = norm(w.w);
    // cari kata yang sama dalam 4 stamp ke depan, kalau tidak ketemu pakai stamp berikutnya
    let k = -1;
    for (let d = 0; d < 4 && j + d < stamps.length; d++) if (stamps[j + d].n === n) { k = j + d; break; }
    if (k < 0) k = Math.min(j, stamps.length - 1);
    w.start = stamps[k].start; w.end = stamps[k].end; j = k + 1;
  }
} else {
  source = 'estimate';
  let t = LEAD;
  for (const line of lines) {
    for (const w of line.words) {
      const len = norm(w.w).length;
      const dur = 0.08 + 0.047 * len;
      w.start = +t.toFixed(3); t += dur; w.end = +t.toFixed(3);
      if (/[,:]$/.test(w.w)) t += 0.18;
      if (/[.?!]$/.test(w.w)) t += 0.32;
    }
  }
}

for (const line of lines) {
  line.start = line.words[0].start;
  line.end = line.words[line.words.length - 1].end;
}
// akhir baris = awal baris berikut (supaya visual tidak "kosong" di jeda)
for (let i = 0; i < lines.length - 1; i++) lines[i].end = lines[i + 1].start;
const duration = +(lines[lines.length - 1].end + TAIL).toFixed(2);
lines[lines.length - 1].end = duration;

const out = { id: script.id, source, duration, lines };
fs.writeFileSync(path.join(epDir, 'timing.json'), JSON.stringify(out, null, 1));
console.log(`timing.json: ${lines.length} baris, ${duration}s (${source})`);
