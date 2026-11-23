// Banner YouTube 2560x1440 → desain/banner-youtube.png
//   node tools/banner.mjs [--guide]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(8133, r));
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 540 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
// 1) Pak Bero badan penuh, latar transparan
await page.goto('http://localhost:8133/desain/avatar.html?v=wave&bg=none&full=1');
await page.waitForFunction(() => window.READY === true);
await (await page.$('#c')).screenshot({ path: path.join(ROOT, 'out/bero-transparent.png'), omitBackground: true });
// 2) banner
await page.setViewportSize({ width: 1280, height: 720 });
const guide = process.argv.includes('--guide');
await page.goto(`http://localhost:8133/desain/banner.html${guide ? '?guide=1' : ''}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const out = path.join(ROOT, 'desain', guide ? 'banner-youtube-guide.png' : 'banner-youtube.png');
await (await page.$('#b')).screenshot({ path: out });
console.log(out);
await browser.close(); server.close();
