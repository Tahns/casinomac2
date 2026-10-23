// Bakes the in-game mascot (src/render/mascot.js + mascot.css) into static, self-contained SVG fragments
// (one per pose) written to gus_poses.json. No animation, CSS transforms resolved to inline matrices.
// Usage: node bake_gus.mjs   (needs playwright-core resolvable; chromium at CHROMIUM or /opt/pw-browsers/chromium)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : import.meta.url);
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const rdir = path.join(here, '../../src/render');
const js = fs.readFileSync(path.join(rdir, 'mascot.js'), 'utf8')
  .replace(/import\.meta\.url/g, 'location.href').replace(/export default createMascot;/, '').replace(/export /g, '');
const css = fs.readFileSync(path.join(rdir, 'mascot.css'), 'utf8');
const POSES = ['bigwin', 'plunger', 'happy', 'celebrate'];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
await page.setContent('<!doctype html><body style="margin:0"><div id="h"></div></body>');
await page.addStyleTag({ content: css + '*{animation:none!important;transition:none!important}' });
await page.addScriptTag({ content: js + ';window.__cm=createMascot;' });
const out = {};
for (const pose of POSES) {
  out[pose] = await page.evaluate(([pose, i]) => {
    const h = document.getElementById('h'); h.innerHTML = '';
    window.__cm(h, { size: 560, variant: 'full', pose });
    const svg = h.querySelector('svg.gus');
    // unique ids per baked pose
    const uidRe = /g\d+_/g; let html = svg.innerHTML;
    const els = [...svg.querySelectorAll('*')];
    const keep = new Map();
    for (const el of els) {
      if (el.closest('defs') || el.closest('clipPath') || el.closest('pattern')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') { el.setAttribute('data-rm', '1'); continue; }
      if (el.classList.contains('o')) el.setAttribute('stroke-width', cs.strokeWidth.replace('px', ''));
      if (cs.transform && cs.transform !== 'none') {
        const [ox, oy] = cs.transformOrigin.split(' ');
        el.setAttribute('style', `transform-box:view-box;transform-origin:${ox} ${oy};transform:${cs.transform}`);
      }
    }
    svg.querySelectorAll('.burst, .mlh, .mlhop').forEach((e) => e.remove()); // scene supplies its own starburst; motion lines look like stray dashes when frozen
    svg.querySelectorAll('[data-rm]').forEach((e) => e.remove());
    svg.querySelectorAll('.o').forEach((e) => { e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#2B1A12'); e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('stroke-linecap', 'round'); });
    svg.querySelectorAll('*').forEach((e) => { e.removeAttribute('class'); });
    const uid = (svg.querySelector('pattern').id).replace('ht', '');
    return svg.innerHTML.split(uid).join('P' + i + '_');
  }, [pose, POSES.indexOf(pose)]);
}
fs.writeFileSync(path.join(here, 'gus_poses.json'), JSON.stringify({ viewBox: [-20, -24, 240, 280], poses: out }, null, 1));
await browser.close();
console.log('baked', Object.keys(out).join(','));
