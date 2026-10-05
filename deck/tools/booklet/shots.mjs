import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = '/dist';
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  const t = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';
  s.writeHead(200, {'content-type': t}); s.end(fs.readFileSync(f)); }).listen(5199);
const b = await chromium.launch();
const p = await b.newPage({ reducedMotion: 'reduce', viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:5199/?paper#/0');
await p.waitForTimeout(2500);
const meta = await p.evaluate(() => [...document.querySelectorAll('.slides > section')].map((s) => ({
  key: s.dataset.s, frags: ['arch', 'paths'].includes(s.dataset.s) ? 0 : s.querySelectorAll('.fragment').length, chapter: s.classList.contains('chapter'),
  title: (s.querySelector('h1,h2')?.textContent || '').trim().replace(/\s+/g, ' '),
  kicker: (s.querySelector('.kicker')?.textContent || '').trim().replace(/\s+/g, ' '),
})));
const pairs = process.argv.slice(2).filter((a) => a.includes(":")).map((a) => a.split(":").map(Number));
const only = process.argv.slice(2).filter((a) => !a.includes(":")).map(Number);
for (const [i, f] of pairs) { await p.goto(`http://127.0.0.1:5199/?paper#/${i}${f >= 0 ? `/0/${f}` : ""}`); await p.waitForTimeout(1800); await p.screenshot({ path: `/w/book/alt-${i}-${f}.jpg`, type: "jpeg", quality: 80 }); }
if (pairs.length) { await b.close(); srv.close(); process.exit(0); }
for (let i = 0; i < meta.length; i++) {
  if (only.length && !only.includes(i)) continue;
  const f = meta[i].frags;
  await p.goto(`http://127.0.0.1:5199/?paper#/${i}${f ? `/0/${f - 1}` : ''}`);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `/w/book/s${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 90 });
  if (i === 0) await p.locator('#cover-art svg').screenshot({ path: '/w/book/cover-art.png', omitBackground: true });
}
fs.writeFileSync('/w/book/meta.json', JSON.stringify(meta, null, 1));
await b.close(); srv.close();
