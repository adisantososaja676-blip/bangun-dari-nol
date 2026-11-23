// Generate narasi TTS via KIE (ElevenLabs) dari script.json → episodes/<ep>/audio.mp3,
// lalu otomatis menjalankan tools/timing.mjs (sinkronisasi dari jeda audio).
//
//   KIE_API_KEY=xxxx NODE_USE_ENV_PROXY=1 node tools/tts.mjs episodes/01-bendungan
//
// API key JANGAN di-commit. Ambil dari https://kie.ai/api-key.
// Pengaturan suara dibaca dari "tts" di script.json (fallback: brand.json → "tts").
// Host yang perlu diizinkan jaringan: api.kie.ai, tempfile.aiquickdraw.com
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const epDir = process.argv[2];
const key = (process.env.KIE_API_KEY || '').trim();
if (!epDir || !key) { console.error('pakai: KIE_API_KEY=... node tools/tts.mjs episodes/<ep>'); process.exit(1); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf8'));
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.json'), 'utf8'));
const cfg = { ...brand.tts, ...script.tts };

// hapus penanda warna *x* dan !x!
const clean = (t) => t.replace(/[*!](?=[\p{L}\p{N}])|(?<=[\p{L}\p{N}.])[*!]/gu, '');
const text = script.lines.map((l) => clean(l.text)).join(' ').replace(/\s+/g, ' ').trim();
console.log(`${text.length} karakter, suara ${cfg.voiceName ?? cfg.voice}, speed ${cfg.speed}`);

const api = 'https://api.kie.ai/api/v1/jobs';
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const res = await fetch(`${api}/createTask`, {
  method: 'POST', headers,
  body: JSON.stringify({ model: cfg.model, input: { text, voice: cfg.voice, speed: cfg.speed, stability: cfg.stability, similarity_boost: cfg.similarity_boost, style: cfg.style } }),
}).then((r) => r.json());
if (res.code !== 200) { console.error(res); process.exit(1); }
const taskId = res.data.taskId;
console.log('task', taskId);

let url;
for (let i = 0; i < 90 && !url; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const d = (await fetch(`${api}/recordInfo?taskId=${taskId}`, { headers }).then((r) => r.json())).data;
  if (d.state === 'success') { url = JSON.parse(d.resultJson).resultUrls[0]; console.log(`selesai, ${d.creditsConsumed} kredit`); }
  else if (d.state === 'fail') { console.error('gagal:', d.failMsg); process.exit(1); }
}
if (!url) { console.error(`timeout; cek manual task ${taskId}`); process.exit(1); }
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
const out = path.join(epDir, 'audio.mp3');
fs.writeFileSync(out, buf);
console.log(out);
spawnSync('node', [path.join(ROOT, 'tools/timing.mjs'), epDir], { stdio: 'inherit' });
