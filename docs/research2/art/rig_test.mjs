// rig_test.mjs - Playwright verification of the Mambo rig: console errors, per-frame cost, contact sheets of clips and poses.
//   node rig_test.mjs --out DIR [--url http://127.0.0.1:PORT/art/rig_demo.html] [--clips winBig,shock] [--frames 12] [--dt 0.08]
//                     [--size 360] [--outfit inspectrice] [--poses idle,point] [--perf 1]
// Frames are produced deterministically (raf off, fixed seed, manual stepping), so contact sheets are reproducible.
// Playwright is resolved from PW_DIR (default /tmp/claude-0/pw). Contact sheets are composed with PIL when available
// (python3 -I), otherwise the raw frames stay in DIR.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']]) : a), []));
const out = args.out || './rig_out', url = args.url || 'http://127.0.0.1:5731/art/rig_demo.html';
const frames = +(args.frames || 12), dt = +(args.dt || 0.08), size = +(args.size || 360), outfit = args.outfit || 'inspectrice';
const clips = (args.clips || '').split(',').filter(Boolean), poses = (args.poses || '').split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: +(args.scale || 1) });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`${url}?raf=0&idle=0&outfit=${outfit}&limited=${args.limited ?? 0}${args.reduced ? "&reduced=1" : ""}`);
await page.waitForFunction(() => window.__h);
await page.addStyleTag({ content: `#panel{display:none!important} body{display:block!important} #stage{position:fixed!important;inset:0;min-height:0!important} #pt{display:none!important} #hero{left:50%!important;transform:translateX(-50%);height:${size}px!important;bottom:0!important}` });
const hero = page.locator('#hero');
const results = {};
const clipBox = async () => { const r = await hero.boundingBox(); return { x: Math.max(0, r.x - r.width * 0.35), y: Math.max(0, r.y - r.height * 0.3), width: Math.min(900 - Math.max(0, r.x - r.width * 0.35), r.width * 1.7), height: Math.min(700, r.height * 1.3) }; };
async function sheet(name, list) {
  const files = [];
  for (let i = 0; i < list; i++) {
    const f = path.join(out, `${name}_${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: f, clip: await clipBox() }); files.push(f);
    await page.evaluate((d) => window.__h.step(d), dt);
  }
  const py = spawnSync('python3', ['-I', '-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).convert('RGB') for f in fs]
w,h=ims[0].size; cols=min(len(ims),6); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(cols*w,rows*h),(217,167,42))
for i,im in enumerate(ims): S.paste(im,((i%cols)*w,(i//cols)*h))
S.save(sys.argv[1])`, path.join(out, `${name}_sheet.png`), ...files]);
  if (py.status !== 0) console.log('PIL sheet failed:', String(py.stderr).slice(0, 200));
  else files.forEach((f) => fs.unlinkSync(f));
}
for (const c of clips) {
  await page.evaluate((c) => { const h = window.__h; h.stop(true); h.setPose('idle', { snap: true }); h.setMood('sly'); h.snap(); h.play(c); }, c);
  await sheet(`clip_${c}`, frames);
}
for (const p of poses) {
  await page.evaluate((p) => { const h = window.__h; h.stop(true); h.setPose(p, { snap: true }); h.snap(); }, p);
  const f = path.join(out, `pose_${p}.png`); await page.screenshot({ path: f, clip: await clipBox() });
}
const headBox = async () => { const r = await hero.boundingBox(); return { x: r.x + r.width * 0.22, y: r.y + r.height * 0.07, width: r.width * 0.56, height: r.height * 0.34 }; };
async function faceSheet(name, items, apply) {
  const files = [];
  for (let i = 0; i < items.length; i++) {
    await page.evaluate(apply, items[i]);
    const f = path.join(out, `${name}_${String(i).padStart(2, '0')}.png`); await page.screenshot({ path: f, clip: await headBox() }); files.push(f);
  }
  const py = spawnSync('python3', ['-I', '-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).convert('RGB') for f in fs]
w,h=ims[0].size; cols=min(len(ims),4); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(cols*w,rows*h),(217,167,42))
for i,im in enumerate(ims): S.paste(im,((i%cols)*w,(i//cols)*h))
S.save(sys.argv[1])`, path.join(out, `${name}_sheet.png`), ...files]);
  if (py.status === 0) files.forEach((f) => fs.unlinkSync(f));
}
if (args.looks) {
  await page.evaluate(() => { const h = window.__h; h.stop(true); h.setPose('idle', { snap: true }); h.snap(); });
  const box = await hero.boundingBox();
  const T = [[-0.5, 0.3], [0.1, -0.7], [1.4, 0.2], [1.4, -0.8], [0.5, 1.0], [-0.6, -0.8], [0.9, 0.9], [2.4, 0.3]];
  await faceSheet('looks', T.map(([nx, ny]) => ({ x: box.width * (0.52 + nx * 0.5), y: box.height * (0.27 + ny * 0.5) })), (p) => { const h = window.__h; h.setLook(p); for (let i = 0; i < 24; i++) h.step(1 / 60); });
}
if (args.visemes) {
  await page.evaluate(() => { const h = window.__h; h.stop(true); h.setPose('idle', { snap: true }); h.snap(); });
  const V = await page.evaluate(() => window.__h.visemes());
  await faceSheet('visemes', V, (v) => { const h = window.__h; h.setMouth(v, 0); h.step(1 / 60); });
}
if (args.eyes) {
  await page.evaluate(() => { const h = window.__h; h.stop(true); h.setPose('idle', { snap: true }); h.snap(); });
  const E = [{}, { uL: 1, uR: 1 }, { uL: 0.2, uR: 0.2 }, { uL: 0, lowL: 0.7 }, { uR: 0, lowR: 0.7 }, { joyL: 1, joyR: 1, uL: 0.1, uR: 0.1 }, { stars: 1, uL: 1, uR: 1 }, { uL: 1.1, uR: 1.1, wide: 0.5, pup: 0.4 }];
  await faceSheet('eyes', E, (e) => { const h = window.__h; h.clear(); h.set(e, true); h.snap(); });
}
if (args.soak) {
  results.soak = await page.evaluate(() => {
    const h = window.__h, bad = [], n = { steps: 0 };
    for (const o of h.outfits()) {
      h.setOutfit(o); h.snap();
      for (const p of h.poses()) { h.setPose(p, { snap: true }); for (let i = 0; i < 6; i++) { h.step(1 / 30); n.steps++; } }
      for (const c of h.clips()) {
        if (c === 'outfitChange') continue;
        h.stop(true); h.play(c);
        for (let i = 0; i < 150; i++) { h.step(1 / 30); n.steps++; const s = h.state(); for (const k in s) if (typeof s[k] === 'number' && !isFinite(s[k])) bad.push(`${o}/${c}/${k}`); }
      }
      h.stop(true);
    }
    h.setOutfit('inspectrice', { animated: true }); for (let i = 0; i < 90; i++) h.step(1 / 30);
    return { steps: n.steps, nonFinite: [...new Set(bad)].slice(0, 10) };
  });
}
if (args.crops) {   // pass 2: the crop and mirror options must run every pose and clip without a NaN or an exception
  results.crops = await page.evaluate(() => {
    const h = window.__h, bad = [], n = { steps: 0 };
    for (const [crop, mirror] of [['bust', false], ['head', false], ['full', true], ['bust', true]]) {
      h.setCrop(crop); h.setMirror(mirror);
      for (const o of h.outfits()) {
        h.setOutfit(o); h.snap();
        for (const p of h.poses()) { h.setPose(p, { snap: true }); for (let i = 0; i < 4; i++) { h.step(1 / 30); n.steps++; } }
        for (const c of ['winBig', 'shock', 'lose', 'winSmall', 'blowWhistle']) { h.stop(true); h.play(c); h.wink('L'); for (let i = 0; i < 60; i++) { h.step(1 / 30); n.steps++; const s = h.state(); for (const k in s) if (typeof s[k] === 'number' && !isFinite(s[k])) bad.push(`${crop}/${mirror}/${o}/${c}/${k}`); } }
      }
      h.stop(true);
    }
    h.setCrop('full'); h.setMirror(false); h.setOutfit('inspectrice');
    return { steps: n.steps, nonFinite: [...new Set(bad)].slice(0, 10), crop: h.crop, mirror: h.mirror };
  });
}
if (args.perf) {
  results.perf = await page.evaluate(() => {
    const h = window.__h; h.setPose('idle', { snap: true }); const seq = ['winBig', 'shock', 'lose', 'scatterTease', 'blowWhistle', 'impatient']; let n = 0, tot = 0, max = 0;
    for (let k = 0; k < 6; k++) { h.play(seq[k]); for (let i = 0; i < 100; i++) { const t0 = performance.now(); h.step(1 / 60); const ms = performance.now() - t0; tot += ms; max = Math.max(max, ms); n++; } }
    return { frames: n, avgMs: +(tot / n).toFixed(3), maxMs: +max.toFixed(2) };
  });
}
console.log(JSON.stringify({ errors: errors.filter((e) => !/favicon|404/.test(e)), ...results }, null, 1));
await b.close();
