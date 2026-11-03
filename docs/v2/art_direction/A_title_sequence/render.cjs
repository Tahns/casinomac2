// Renders the direction A pages to PNG. Usage: node render.cjs [page...]   (static server on port 6201, repo root)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../../..'), DIR = 'docs/v2/art_direction/A_title_sequence', PORT = 6201;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.css': 'text/css' };
const JOBS = {
  mockup: [['mockup.html?w=1280&h=720', 1280, 720, 'mockup_1280x720.png'], ['mockup.html?w=425&h=812', 425, 812, 'mockup_425x812.png']],
  intro: [['intro.html?w=1280&h=720', 1280, 720, 'intro_1280x720.png']],
  symbols: [['symbols.html', 1600, 900, 'symbols.png', true]],
  eyes: [['eyes.html', 1000, 420, 'eyes.png']],
  palette: [['palette.html', 1350, 200, 'palette.png']],
};
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
srv.listen(PORT, async () => {
  const b = await chromium.launch();
  const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
  for (const k of which) for (const [url, w, h, out, full] of JOBS[k]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    pg.on('pageerror', (e) => console.log('ERR', url, e.message)); pg.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', url, m.text()); });
    await pg.goto(`http://127.0.0.1:${PORT}/${DIR}/${url}`);
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => console.log('timeout', url));
    await pg.waitForTimeout(250);
    await pg.screenshot({ path: path.join(ROOT, DIR, out), fullPage: !!full });
    console.log('ok', out); await pg.close();
  }
  await b.close(); srv.close();
});
