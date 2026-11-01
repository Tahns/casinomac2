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
if (args.checks) {   // v2 round 1 (I6): machine checks of the defects found in H3 (hands over eyes, floating feet, casino legs, head crop)
  results.checks = await page.evaluate(() => {
    const h = window.__h, fails = [], n = { poses: 0, frames: 0 };
    const svg = () => h.svg, pre = () => h.svg.querySelector('[id$="root-t"]').id.replace(/root-t$/, '');
    const el = (id) => svg().querySelector('#' + CSS.escape(pre() + id));
    // a box in art units (viewBox space), through the element's CTM relative to the svg
    const artBox = (e) => {
      if (!e) return null; const b = e.getBBox(); if (!(b.width > 0 && b.height > 0)) return null;
      const m = svg().getScreenCTM().inverse().multiply(e.getScreenCTM());
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
    };
    const visGlove = (s) => [...svg().querySelectorAll(`[id^="${pre()}g-${s}-"]`)].find((g) => /^[a-z]+$/.test(g.id.slice((pre() + 'g-' + s + '-').length)) && g.getAttribute('display') !== 'none');
    // share of the eye white covered by the visible glove shapes (grid of points inside the sclera, tested against every painted glove path)
    const shown = (e, stop) => { for (let x = e; x && x !== stop; x = x.parentNode) if (x.getAttribute && (x.getAttribute('opacity') === '0' || x.getAttribute('display') === 'none')) return false; return true; };
    const cover = (eyeId, glove) => {
      const sc = el(eyeId + '-sclera'); if (!sc || !glove) return 0;
      const paths = [...glove.querySelectorAll('path')].filter((q) => shown(q, glove) && q.getAttribute('fill') && q.getAttribute('fill') !== 'none');
      const b = sc.getBBox(), M = sc.getScreenCTM(); let tot = 0, hit = 0;
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 10; j++) {
        const pt = new DOMPoint(b.x + (b.width * i) / 8, b.y + (b.height * j) / 10); if (!sc.isPointInFill(pt)) continue; tot++;
        const sp = pt.matrixTransform(M);
        if (paths.some((q) => q.isPointInFill(sp.matrixTransform(q.getScreenCTM().inverse())))) hit++;
      }
      return tot ? hit / tot : 0;
    };
    // v2 round 2 (NEW-glove-over-face-boom): the sleeve counts too (a raised arm across the face hides the eye as well as the glove does)
    const sleeve = (s) => { const g = el(`arm-${s}-ink`); return g && g.getAttribute('d') ? { querySelectorAll: () => [g] } : null; };
    // a closed (winking) eye has no sclera to sample: the eye area is sampled once with the eyes open, in head coordinates, and carried by the head
    let eyePts = null;
    const learnEyes = () => {
      const head = el('head-t'); eyePts = {};
      for (const eye of ['eye-l', 'eye-r']) {
        const sc = el(eye + '-sclera'); if (!sc || !head) continue;
        const b = sc.getBBox(), M = head.getScreenCTM().inverse().multiply(sc.getScreenCTM()), pts = [];
        for (let i = 0; i <= 8; i++) for (let j = 0; j <= 10; j++) { const pt = new DOMPoint(b.x + (b.width * i) / 8, b.y + (b.height * j) / 10); if (sc.isPointInFill(pt)) pts.push(pt.matrixTransform(M)); }
        eyePts[eye] = pts;
      }
    };
    const coverArea = (eye, glove) => {
      const head = el('head-t'), pts = eyePts && eyePts[eye]; if (!head || !pts || !pts.length || !glove) return 0;
      const paths = [...glove.querySelectorAll('path')].filter((q) => shown(q, glove) && q.getAttribute('fill') && q.getAttribute('fill') !== 'none');
      const M = head.getScreenCTM(); let hit = 0;
      for (const p of pts) { const sp = p.matrixTransform(M); if (paths.some((q) => q.isPointInFill(sp.matrixTransform(q.getScreenCTM().inverse())))) hit++; }
      return hit / pts.length;
    };
    const handOverEye = (tag) => {
      for (const s of ['l', 'r']) for (const eye of ['eye-l', 'eye-r']) {
        const k = Math.max(cover(eye, visGlove(s)), coverArea(eye, visGlove(s))); if (k > 0.1) fails.push(`${tag}: hand-${s} covers ${Math.round(100 * k)}% of ${eye}`);
        const a = Math.max(cover(eye, sleeve(s)), coverArea(eye, sleeve(s))); if (a > 0.1) fails.push(`${tag}: arm-${s} covers ${Math.round(100 * a)}% of ${eye}`);
      }
    };
    const GROUND = 566;
    for (const o of h.outfits()) {
      h.setCrop('full'); h.setOutfit(o); h.stop(true);
      if (o === 'casino' && (el('leg-l') || el('leg-r'))) fails.push('casino: legs are drawn under the gown');
      h.setPose('idle', { snap: true }); h.snap(); learnEyes();
      for (const p of h.poses()) {
        h.setPose(p, { snap: true }); h.snap(); n.poses++;
        handOverEye(`${o}/${p}`);
        const sb = ['shoe-l', 'shoe-r'].map((id) => artBox(el(id)));
        if (sb[0] && sb[1] && Math.max(sb[0].b, sb[1].b) < GROUND - 10) fails.push(`${o}/${p}: both shoes off the ground (lowest sole y ${Math.round(Math.max(sb[0].b, sb[1].b))})`);
        if (o === 'casino') for (const [i, b] of sb.entries()) if (b && (b.b < GROUND - 9 || b.b > GROUND + 14)) fails.push(`casino/${p}: shoe ${i} lifted under the floor-length gown (sole y ${Math.round(b.b)})`);
      }
      for (const t of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.4]) {
        h.stop(true); h.setPose('idle', { snap: true }); h.snap(); h.play('winSmall'); h.step(t); n.frames++;
        handOverEye(`${o}/winSmall@${t}`);
      }
      // v2 round 2 (NEW-glove-over-face-boom): the wire-blast reaction (shock) and the mission salute (freeSpinStart), frame by frame
      for (const c of ['shock', 'freeSpinStart']) for (const t of [0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.3, 1.6]) {
        h.stop(true); h.setPose('idle', { snap: true }); h.snap(); h.play(c); h.step(t); n.frames++;
        handOverEye(`${o}/${c}@${t}`);
      }
      // the head crop keeps the chin and both cheeks in its window in every pose
      h.stop(true); h.setCrop('head');
      for (const p of h.poses()) {
        h.setPose(p, { snap: true }); h.snap();
        const [x, y, w, hh] = svg().getAttribute('viewBox').split(/\s+/).map(Number), fb = artBox(el('face'));
        if (fb && (fb.b > y + hh + 1 || fb.l < x - 1 || fb.r > x + w + 1)) fails.push(`${o}/${p}: face outside the head crop (face ${[fb.l, fb.t, fb.r, fb.b].map(Math.round)} vb ${[x, y, x + w, y + hh]})`);
      }
      h.setCrop('full');
    }
    h.stop(true); h.setOutfit('inspectrice'); h.setPose('idle', { snap: true }); h.snap();
    return { ...n, fails };
  });
  if (results.checks.fails.length) process.exitCode = 1;
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
