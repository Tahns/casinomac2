#!/usr/bin/env node
// WP11: render the Stake store images of Agent Mambo v2 from the hand-built key art (docs/research2/art/store/keyart.html: vector scene
// + the hand-drawn heroine rig, base outfit `inspectrice`). No generative AI: the page draws everything in SVG / DOM.
//   node tools/art/render_keyart.mjs [--port 5926] [--out tools/art/store_v2] [--pose bigwin]
// Serves docs/research2/art on 127.0.0.1:<port> (the page imports ../mambo_rig.mjs), renders every size below at deviceScaleFactor 1,
// writes <out>/<name>.png plus small preview copies (<name>_preview_<w>.png) used to check legibility at lobby size, and
// <out>/STORE_RENDER.json (sizes, bytes, sha256, source hash). Only kills the server it started.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const ROOT = path.resolve(FRONT, '..');
const ART = path.join(ROOT, 'docs/research2/art');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', 5926));
const OUT = path.resolve(arg('--out', path.join(HERE, 'store_v2')));
const POSE = arg('--pose', '');
// Stake asks for a game tile 3:4 and a cover 16:9 (docs/READINESS.md, items 1 and 2); the banner is the wide key art of docs/research2/art/store.
const JOBS = [
  { name: 'agent_mambo_tile_3x4', w: 1536, h: 2048, previews: [150, 300] },
  { name: 'agent_mambo_cover_16x9', w: 1920, h: 1080, previews: [320] },
  { name: 'agent_mambo_banner_2000x667', w: 2000, h: 667, previews: [] },
];
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ART, p);
  if (!f.startsWith(ART) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('playwright-core')); }
const browser = await chromium.launch();
fs.mkdirSync(OUT, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const report = { generated: new Date().toISOString(), source: 'docs/research2/art/store/keyart.html', sourceSha256: sha(fs.readFileSync(path.join(ART, 'store/keyart.html'))), rigSha256: sha(fs.readFileSync(path.join(ART, 'mambo_rig.mjs'))), outfit: 'inspectrice', files: [] };
const errors = [];
try {
  for (const j of JOBS) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${j.name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${j.name}: ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${PORT}/store/keyart.html?w=${j.w}&h=${j.h}${POSE ? '&pose=' + encodeURIComponent(POSE) : ''}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
    await page.waitForTimeout(300);
    const file = path.join(OUT, j.name + '.png');
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    const buf = fs.readFileSync(file);
    report.files.push({ file: path.relative(FRONT, file), width: j.w, height: j.h, bytes: buf.length, sha256: sha(buf) });
    for (const pw of j.previews) {
      const ph = Math.round(pw * j.h / j.w);
      const pv = await browser.newPage({ viewport: { width: pw, height: ph }, deviceScaleFactor: 1 });
      await pv.setContent(`<html><body style="margin:0;background:#000"><img src="data:image/png;base64,${buf.toString('base64')}" style="width:${pw}px;height:${ph}px;display:block"></body></html>`);
      await pv.waitForTimeout(150);
      const pf = path.join(OUT, `${j.name}_preview_${pw}.png`);
      await pv.screenshot({ path: pf });
      report.files.push({ file: path.relative(FRONT, pf), width: pw, height: ph, preview: true });
      await pv.close();
    }
    await page.close();
  }
} finally {
  await browser.close(); srv.close();
}
report.errors = errors;
fs.writeFileSync(path.join(OUT, 'STORE_RENDER.json'), JSON.stringify(report, null, 1) + '\n');
console.log(report.files.map((f) => `${f.file} ${f.width}x${f.height}${f.bytes ? ' ' + f.bytes + ' B' : ''}`).join('\n'));
if (errors.length) { console.log('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
