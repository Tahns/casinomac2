// Render SVGs to PNG with playwright chromium. Usage: node render_store_art.mjs <storeDir>
// Needs playwright-core resolvable (e.g. NODE_PATH=<tmp>/node_modules).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const dir = process.argv[2] || '.';
const jobs = [['tile_3x4', 1536, 2048], ['cover_16x9', 1920, 1080]];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
for (const [name, w, h] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const svg = fs.readFileSync(path.join(dir, name + '.svg'), 'utf8');
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, name + '.png'), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}
await browser.close();
console.log('rendered');
