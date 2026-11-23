// Render foto profil Pak Bero → desain/avatar-<variasi>.png (1080x1080)
//   node tools/avatar.mjs                # semua variasi default
//   node tools/avatar.mjs wave teal      # satu variasi
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(8131, r));
const variants = process.argv[2] ? [[process.argv[2], process.argv[3] ?? 'teal']] : [['wave', 'teal'], ['happy', 'peach'], ['wave', 'sky']];
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 540 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
for (const [v, bg] of variants) {
  await page.goto(`http://localhost:8131/desain/avatar.html?v=${v}&bg=${bg}`);
  await page.waitForFunction(() => window.READY === true);
  const out = path.join(ROOT, 'desain', `avatar-${v}-${bg}.png`);
  await (await page.$('#c')).screenshot({ path: out });
  console.log(out);
}
await browser.close(); server.close();
