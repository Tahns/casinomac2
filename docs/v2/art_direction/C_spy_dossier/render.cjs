// Direction C render helper: serves the repo root on 127.0.0.1:6220 (ES modules need http) and screenshots the pages.
// Usage: node docs/v2/art_direction/C_spy_dossier/render.cjs [name ...]   (names: mockup, mockup_m, symbols, palette, intro, eyes)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../../..'), DIR = 'docs/v2/art_direction/C_spy_dossier', PORT = 6220;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
const JOBS = {
  mockup: ['mockup.html?w=1280&h=720', 'mockup_1280x720.png', 1280, 720],
  mockup_m: ['mockup.html?w=425&h=812', 'mockup_425x812.png', 425, 812],
  symbols: ['symbols.html', 'symbols.png', 1280, 900],
  palette: ['palette.html', 'palette.png', 1280, 260],
  intro: ['intro.html?w=1280&h=720', 'intro_1280x720.png', 1280, 720],
  eyes: ['eyes.html', 'eyes.png', 1280, 620],
};
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
srv.listen(PORT, '127.0.0.1', async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
  const b = await chromium.launch();
  try {
    for (const n of names) {
      const [url, out, w, h] = JOBS[n];
      const page = await b.newPage({ viewport: { width: w, height: h } });
      page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(n, m.type(), m.text()); });
      page.on('pageerror', (e) => console.log(n, 'pageerror', e.message));
      await page.goto(`http://127.0.0.1:${PORT}/${DIR}/${url}`);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => console.log(n, 'not ready'));
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(ROOT, DIR, out), fullPage: n === 'symbols' });
      console.log('wrote', out); await page.close();
    }
  } finally { await b.close(); srv.close(); }
});
