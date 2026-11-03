// Render the direction B pages to PNG. Usage: node render.cjs [page w h out]...   (server: python3 -m http.server 6210 at the repo root)
const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:6210/docs/v2/art_direction/B_atomic_lounge/';
const jobs = process.argv.length > 2 ? [process.argv.slice(2)] : [
  ['mockup.html', 1280, 720, 'png/mockup_1280x720.png'],
  ['mockup.html', 425, 812, 'png/mockup_425x812.png'],
  ['symbols.html', 1600, 900, 'png/symbols.png'],
  ['intro.html', 1280, 720, 'png/intro_1280x720.png'],
  ['palette.html', 1200, 260, 'png/palette.png'],
];
(async () => {
  const b = await chromium.launch();
  for (const [pg, w, h, out] of jobs) {
    const page = await b.newPage({ viewport: { width: +w, height: +h } });
    page.on('pageerror', (e) => console.log(pg, 'pageerror', e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log(pg, 'console', m.text()); });
    await page.goto(`${BASE}${pg}?w=${w}&h=${h}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => console.log(pg, 'not ready'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, out) });
    console.log('wrote', out);
    await page.close();
  }
  await b.close();
})();
