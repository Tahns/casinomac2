// Tiny helper: render a local HTML/SVG file to PNG with Playwright chromium.
// Usage: node render_png.mjs <in.html|in.svg> <out.png> <width> <height> [deviceScaleFactor=1]
// Playwright is resolved from /tmp/claude-0/pw (set PW_DIR to override). Nothing is fetched from the network.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');

export async function renderToPng(input, output, width, height, scale = 1) {
  const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => {
    try { return require('node:fs').statSync(p).isFile(); } catch { return false; }
  });
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    const url = /^https?:/.test(input) ? input : pathToFileURL(path.resolve(input)).href;
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(url);
    await page.waitForTimeout(Number(process.env.WAIT_MS || 400));
    if (errs.length) console.log('CONSOLE:', errs.join('\n'));
    await page.screenshot({ path: output, clip: { x: 0, y: 0, width, height } });
  } finally { await b.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , inp, out, w, h, s] = process.argv;
  await renderToPng(inp, out, Number(w), Number(h), Number(s || 1));
  console.log('wrote', out);
}
