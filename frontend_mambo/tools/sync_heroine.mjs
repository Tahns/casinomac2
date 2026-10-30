// Agent Mambo v2, WP3 HEROINE: copies the hand-drawn vector rig from docs/research2/art/ into src/render/heroine/.
//
//   node tools/sync_heroine.mjs              copy + apply the patches below + write src/render/heroine/SYNC.json
//   node tools/sync_heroine.mjs --check      verify the shipped copies equal "source + patches" (exit 1 on drift, writes nothing)
//   node tools/sync_heroine.mjs --fallback   also regenerate src/render/heroine/fallback_art.js (the static SVG shown when the rig
//                                            throws); needs playwright-core (PW_DIR, default /tmp/claude-0/pw) and a chromium
//
// The copies are byte-identical to the source EXCEPT for the named patches (each one must match exactly once, otherwise the sync
// fails loudly) and the file extension: the art uses .mjs, the shipped copies are .js (every other module of the game is .js, and a static
// host that does not know .mjs would refuse to serve it as a module), so the import specifiers between the four files are retargeted. Everything WP3 adds lives in its own files (clips.js, director.js, gaze.js, bubble.js, index.js ...) so a new
// version of the art can be dropped in with one command. Never edit the four synced files by hand.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '..');
const SRC = path.resolve(FRONT, '../docs/research2/art');
const DST = path.join(FRONT, 'src/render/heroine');
export const FILES = ['mambo_art.mjs', 'mambo_outfits.mjs', 'mambo_rig.mjs', 'mambo_compat.mjs'];
export const destName = (f) => f.replace(/\.mjs$/, '.js');
const retarget = (text) => text.replace(/(\.\/mambo_(?:art|outfits|rig|compat))\.mjs/g, '$1.js');

// Named patches, applied to the rig after the copy. Keep this list short and every entry justified.
export const PATCHES = [
  {
    file: 'mambo_rig.mjs', id: 'osFollow',
    why: 'A live OS reduced-motion change must not undo the motion level chosen in the settings (Auto / Full / Calm / Still): the host passes followOs:false and drives setReduced() itself.',
    find: 'const onMq = (e) => { reduced = O.reduced ?? e.matches; applyTargets(true); };',
    replace: 'const onMq = (e) => { if (O.followOs === false) return; reduced = O.reduced ?? e.matches; applyTargets(true); };',
  },
  {
    file: 'mambo_rig.mjs', id: 'frameGuard',
    why: 'An exception inside the rAF loop silently kills the loop and freezes the figure. With an onError option the loop stops, the rig marks itself destroyed and the host swaps in the static fallback.',
    find: 'const t0 = performance.now(); update(dt);\n      const busy = !!clipS.cur || tweens.length > 0 || fxP.length > 0 || !grounded || spinS.active;\n      const slot = O.idleHz > 0 ? Math.floor(time * O.idleHz) : -2;\n      if (busy || slot === -2 || slot !== idleSlot || !rendered) { idleSlot = slot; render(); }',
    replace: 'const t0 = performance.now();\n      try {\n        update(dt);\n        const busy = !!clipS.cur || tweens.length > 0 || fxP.length > 0 || !grounded || spinS.active;\n        const slot = O.idleHz > 0 ? Math.floor(time * O.idleHz) : -2;\n        if (busy || slot === -2 || slot !== idleSlot || !rendered) { idleSlot = slot; render(); }\n      } catch (err) { if (O.onError) { destroyed = true; try { O.onError(err); } catch (e2) { /* ignore */ } return; } throw err; }',
  },
  {
    file: 'mambo_rig.mjs', id: 'tightFull',
    why: 'The full figure uses 400x600 art units but the painted figure only spans about x 100..300, y 40..566: a tighter window makes her about 7% bigger in the left column (the box height limits her), jumps keep using the 18% headroom above the slot.',
    find: "full: { vb: [0, 0, 400, 600], overflow: 'visible', lower: true },",
    replace: "full: { vb: [60, 30, 280, 556], overflow: 'visible', lower: true },",
  },
];

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** Pure: the content a synced file must have (source text with its patches applied). Throws when a patch does not match exactly once. */
export function patched(file, text) {
  let out = text;
  for (const p of PATCHES.filter((x) => x.file === file)) {
    const n = out.split(p.find).length - 1;
    if (n !== 1) throw new Error(`patch "${p.id}" on ${file}: expected exactly one match, found ${n} (the art source changed: update PATCHES in tools/sync_heroine.mjs)`);
    out = out.replace(p.find, () => p.replace);
  }
  return retarget(out);
}

export function plan() {
  return FILES.map((f) => {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    return { file: f, dest: destName(f), src, out: patched(f, src), patches: PATCHES.filter((p) => p.file === f).map((p) => p.id) };
  });
}

function manifest(items) {
  return JSON.stringify({
    note: 'written by tools/sync_heroine.mjs; do not edit the synced files by hand',
    source: 'docs/research2/art',
    files: Object.fromEntries(items.map((i) => [i.dest, { source: i.file, sourceSha: sha(i.src), shippedSha: sha(i.out), patches: i.patches }])),
  }, null, 2) + '\n';
}

function check() {
  const items = plan(); const bad = [];
  for (const i of items) {
    let have = null;
    try { have = fs.readFileSync(path.join(DST, i.dest), 'utf8'); } catch { /* missing */ }
    if (have !== i.out) bad.push(i.dest);
  }
  let man = null; try { man = fs.readFileSync(path.join(DST, 'SYNC.json'), 'utf8'); } catch { /* missing */ }
  if (man !== manifest(items)) bad.push('SYNC.json');
  return bad;
}

function sync() {
  fs.mkdirSync(DST, { recursive: true });
  const items = plan();
  for (const i of items) fs.writeFileSync(path.join(DST, i.dest), i.out);
  fs.writeFileSync(path.join(DST, 'SYNC.json'), manifest(items));
  return items;
}

// ---------------------------------------------------------------------------------------------------- static fallback snapshot
// Renders the rig once (reduced motion, idle pose, no raf) in headless Chromium and stores the markup as a plain string module.
// The string depends on nothing: it is what the host draws when the rig module throws. Hidden glove kinds, duplicate thumbs and
// the empty particle layer are dropped to keep it small; ids are made unique with the "mfb-" prefix.
async function fallback() {
  const req = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
  const { chromium } = req('playwright-core');
  const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  const srv = http.createServer((rq, rs) => {
    const u = new URL(rq.url, 'http://x'); const f = path.join(DST, path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, ''));
    if (u.pathname === '/') { rs.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body><div id="s" style="width:400px;height:600px"></div>'); return; }
    if (!f.startsWith(DST) || !fs.existsSync(f)) { rs.writeHead(404).end(); return; }
    rs.writeHead(200, { 'content-type': 'text/javascript' }).end(fs.readFileSync(f));
  });
  await new Promise((r) => srv.listen(Number(process.env.SYNC_PORT || 5849), '127.0.0.1', r));
  const port = srv.address().port;
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    const page = await b.newPage({ viewport: { width: 500, height: 700 } });
    await page.goto(`http://127.0.0.1:${port}/`);
    const svg = await page.evaluate(async (pfx) => {
      const { createHeroine } = await import('/mambo_rig.js');
      const el = document.getElementById('s');
      const h = createHeroine(el, { outfit: 'inspectrice', raf: false, reduced: true, idle: false, idPrefix: pfx });
      h.setPose('idle', { snap: true }); h.snap();
      const s = el.firstElementChild;
      s.querySelectorAll('[display="none"]').forEach((n) => n.remove());
      s.querySelectorAll(`#${pfx}fx,#${pfx}prop-store`).forEach((n) => n.remove());
      s.querySelectorAll('[opacity="0"]').forEach((n) => n.remove());
      s.removeAttribute('style'); s.setAttribute('width', '100%'); s.setAttribute('height', '100%');
      return s.outerHTML;
    }, 'mfb-');
    const out = `// GENERATED by tools/sync_heroine.mjs --fallback from the rig (inspectrice, idle pose, reduced motion). Do not edit.\n// The static picture the host shows when the animated rig throws. No dependency, no script, no external reference.\nexport const FALLBACK_SVG = ${JSON.stringify(svg)};\nexport default FALLBACK_SVG;\n`;
    fs.writeFileSync(path.join(DST, 'fallback_art.js'), out);
    return svg.length;
  } finally { await b.close(); srv.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--check')) {
    const bad = check();
    if (bad.length) { console.error('heroine sync drift: ' + bad.join(', ') + '\nrun: node tools/sync_heroine.mjs'); process.exit(1); }
    console.log('heroine sync ok (' + FILES.length + ' files, ' + PATCHES.length + ' patches)');
  } else {
    const items = sync();
    for (const i of items) console.log(`${i.file} -> ${i.dest}  ${i.src.length} -> ${i.out.length} bytes${i.patches.length ? '  patches: ' + i.patches.join(', ') : ''}`);
    if (args.has('--fallback')) console.log('fallback_art.js  ' + (await fallback()) + ' chars of SVG');
  }
}
