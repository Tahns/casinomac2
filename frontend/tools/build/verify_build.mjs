#!/usr/bin/env node
// Smoke-test dist/front served from a sub-path (/game/v1/) against the mock RGS.
//   PW_DIR=<dir containing node_modules/playwright-core> node frontend/tools/build/verify_build.mjs
// (install playwright-core in a temp dir outside the repo: npm i --no-save playwright-core@1.56.1)
// Ports: static 5230, mock RGS 5231 (override with PORT / MOCK_PORT). Writes dist/verify_*.png.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const FRONT = path.join(ROOT, 'dist/front');
const PORT = Number(process.env.PORT || 5230), MOCK = Number(process.env.MOCK_PORT || 5231);
const PREFIX = '/game/v1/';
const PW_DIR = process.env.PW_DIR || process.cwd();
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { chromium } = createRequire(path.join(PW_DIR, 'x.js'))('playwright-core');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const served = [];
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname);
  if (!p.startsWith(PREFIX)) { served.push([404, p]); res.writeHead(404).end('outside prefix'); return; }
  let f = path.join(FRONT, p.slice(PREFIX.length)); if (p.endsWith('/')) f = path.join(f, 'index.html');
  if (!f.startsWith(FRONT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { served.push([404, p]); res.writeHead(404).end('nf'); return; }
  served.push([200, p]); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(PORT, r));
const mock = spawn('node', [path.join(ROOT, 'frontend/tools/mock-rgs/server.mjs')], { env: { ...process.env, MOCK_PORT: String(MOCK) }, stdio: 'ignore' });
await sleep(800);

const errors = [], failed = [], bad = [], rgs = [];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const results = [];
for (const [device, vw, vh] of [['desktop', 1280, 720], ['mobile', 412, 800]]) {
  const page = await (await browser.newContext({ viewport: { width: vw, height: vh } })).newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${device}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${device}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => failed.push(`[${device}] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`[${device}] ${r.status()} ${r.url()}`); if (r.url().startsWith(`http://localhost:${MOCK}`)) rgs.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
  const url = `http://localhost:${PORT}${PREFIX}?sessionID=t&rgs_url=http://localhost:${MOCK}&lang=en&currency=USD&device=${device}&social=false&demo=false`;
  await page.goto(url); await page.waitForSelector('body:not(.state-booting)', { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  const bal0 = await page.textContent('#balance').catch(() => null);
  await page.screenshot({ path: path.join(ROOT, `dist/verify_${device}_idle.png`) });
  await page.click('#btn-bet', { force: true }).catch((e) => errors.push('click: ' + e.message));
  await sleep(6000);
  await page.screenshot({ path: path.join(ROOT, `dist/verify_${device}_after_bet.png`) });
  const bal1 = await page.textContent('#balance').catch(() => null), win = await page.textContent('#win').catch(() => null);
  results.push({ device, bal0, bal1, win, loadingGone: await page.evaluate(() => { const l = document.getElementById('loading'); return !l || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0' || l.hidden; }) });
}
await browser.close(); mock.kill(); srv.close();
console.log('results', JSON.stringify(results));
console.log('RGS calls:', [...new Set(rgs)].join(' | '));
console.log('served 200:', served.filter((s) => s[0] === 200).map((s) => s[1].slice(PREFIX.length) || '/').filter((v, i, a) => a.indexOf(v) === i).join(', '));
console.log('served 404:', served.filter((s) => s[0] === 404).map((s) => s[1]).join(', ') || 'none');
console.log('HTTP>=400:', bad.join(' | ') || 'none');
console.log('request failures:', failed.join(' | ') || 'none');
console.log('console errors/warnings:', errors.length ? '\n  ' + errors.join('\n  ') : 'none');
process.exitCode = errors.length || bad.length || failed.length ? 1 : 0;
