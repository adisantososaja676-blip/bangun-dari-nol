// Render episode → MP4 (atau still PNG) dengan Chromium headless.
//
//   node tools/render.mjs --ep 01-bendungan --scale 1            # preview 540x960
//   node tools/render.mjs --ep 01-bendungan --scale 2            # final 1080x1920
//   node tools/render.mjs --ep 01-bendungan --still 2,15.5,40    # PNG di detik tsb
//   node tools/render.mjs --ep 01-bendungan --from 20 --to 30    # potongan
//   node tools/render.mjs --serve                                # buka engine di browser (http://localhost:8123/engine/index.html?ep=01-bendungan&play=1)
//
// Kalau ada episodes/<ep>/audio.mp3 (atau .wav/.m4a), audio otomatis digabung.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const ep = args.ep ?? '01-bendungan';
const scale = Number(args.scale ?? 1);
const fps = Number(args.fps ?? 30);
const PORT = Number(args.port ?? 8123);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));
const url = `http://localhost:${PORT}/engine/index.html?ep=${ep}&dpr=${scale}`;
if (args.serve) { console.log(`Buka: ${url}&play=1`); await new Promise(() => {}); }

const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
const duration = await page.evaluate(() => window.DURATION);
const stage = await page.$('#stage');
const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });

if (args.still) {
  const times = String(args.still).split(',').map(Number);
  for (const t of times) {
    await page.evaluate((t) => window.renderAt(t), t);
    const f = path.join(outDir, `${ep}-t${String(t).replace('.', '_')}.png`);
    await stage.screenshot({ path: f });
    console.log(f);
  }
} else {
  const from = Number(args.from ?? 0), to = Math.min(Number(args.to ?? duration), duration);
  const audio = ['mp3', 'wav', 'm4a'].map((x) => path.join(ROOT, 'episodes', ep, `audio.${x}`)).find((f) => fs.existsSync(f));
  const out = path.join(outDir, `${ep}${scale >= 2 ? '' : '-preview'}${args.from || args.to ? `-${from}-${to}` : ''}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...(audio ? ['-ss', String(from), '-t', String(to - from), '-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', scale >= 2 ? '17' : '21', '-pix_fmt', 'yuv420p',
    // apad: audio diberi hening di akhir; -shortest lalu mengikuti panjang video (bukan audio)
    ...(audio ? ['-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  let ffClosed = false; ff.on('close', () => { ffClosed = true; });
  const n = Math.round((to - from) * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    // pengaman: kalau satu frame macet, coba ulang (pernah macet di dekat akhir video)
    let buf;
    for (let attempt = 0; attempt < 3 && !buf; attempt++) {
      try {
        await page.evaluate((t) => window.renderAt(t), t);
        buf = await stage.screenshot({ type: 'jpeg', quality: 92, timeout: 20000 });
      } catch (e) { console.error(`\nframe ${i} gagal (percobaan ${attempt + 1}): ${e.message.split('\n')[0]}`); }
    }
    if (!buf) throw new Error(`frame ${i} gagal 3x`);
    if (ffClosed) throw new Error('ffmpeg berhenti lebih awal');
    if (!ff.stdin.write(buf)) await new Promise((r) => { ff.stdin.once('drain', r); ff.once('close', r); });
    if (i % 60 === 0) process.stdout.write(`\r${i}/${n} frame · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  if (!ffClosed) await new Promise((r) => ff.on('close', r));
  console.log(`\n${out}${audio ? ' (+audio)' : ' (tanpa audio)'}`);
}
await browser.close();
server.close();
