// Cover/thumbnail 1080x1920: frame bersih + judul besar.
//   node tools/render.mjs --ep 01-bendungan --still 3.9 --scale 2 --clean   (→ out/<ep>-t3_9.png)
//   node tools/cover.mjs out/01-bendungan-t3_9.png "Nahan sungai pakai|*ranting*?" "Bisa nggak?" out/01-bendungan-cover.jpg
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [img, title, tag = '', out = 'out/cover.jpg'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(8132, r));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
const rel = '/' + path.relative(ROOT, path.resolve(img));
await page.goto(`http://localhost:8132/desain/cover.html?img=${encodeURIComponent(rel)}&t=${encodeURIComponent(title)}&tag=${encodeURIComponent(tag)}`);
await page.waitForFunction(() => window.READY === true);
await (await page.$('#c')).screenshot({ path: out, type: 'jpeg', quality: 92 });
console.log(out);
await browser.close(); server.close();
