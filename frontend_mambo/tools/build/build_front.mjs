#!/usr/bin/env node
// Build the static front-end bundle for upload. Zero dependencies (node >= 18).
//   node frontend/tools/build/build_front.mjs [--allow-missing]
// Output (git-ignored, repo-root dist/):
//   dist/front/                                   clean static folder (index.html at its root)
//   dist/agent_mambo_front_v<version>.zip  same content, index.html at the zip root
//   dist/front_MANIFEST.txt                       size + sha256 of every shipped file
// What ships = everything reachable from index.html (link/script/src/href, import/import(),
// fetch('data/..'), CSS url()/@import, string literals './x.js') -- tests, tools, fixtures,
// notes, dev pages, shots and store art are never reachable and so never shipped.
// Exit code 1 if a referenced file is missing, an absolute /path URL or an external host is found.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const ROOT = path.resolve(FRONT, '..');
const DIST = path.join(FRONT, 'dist');
const OUT = path.join(DIST, 'front');
const ALLOW_MISSING = process.argv.includes('--allow-missing');

const version = fs.readFileSync(path.join(FRONT, 'VERSION'), 'utf8').trim();
if (!/^\d+\.\d+\.\d+([-+][\w.]+)?$/.test(version)) throw new Error('bad VERSION: ' + version);
const ZIP = path.join(DIST, `agent_mambo_front_v${version}.zip`);

const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.md']);
const rel = (abs) => path.relative(FRONT, abs).split(path.sep).join('/');
const isDev = (r) => /(^|\/)(tests?|fixtures|tools|shots|node_modules)\//.test(r) || /\.(test|spec)\.m?js$/.test(r) ||
  /^(dev|mascot-dev)\.html$/.test(r) || /^NOTES.*\.md$/.test(r) || r === 'serve.mjs' || r === 'package.json' || r === 'VERSION';

// ---------- reference crawl ----------
const missing = [];
const shipped = new Set();
const queue = [];
function add(abs, from) {
  const r = rel(abs);
  if (r.startsWith('..')) { missing.push(`${from} -> ${abs} (outside frontend/)`); return; }
  if (shipped.has(r)) return;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { missing.push(`${from} -> ${r}`); return; }
  if (isDev(r)) { missing.push(`${from} -> ${r} (dev-only file referenced at runtime!)`); return; }
  shipped.add(r); queue.push(abs);
}
function refsOf(abs, text) {
  const ext = path.extname(abs).toLowerCase();
  const out = [];
  const skip = (u) => !u || /^(data:|blob:|#|mailto:|javascript:)/i.test(u) || /^[a-z][a-z0-9+.-]*:\/\//i.test(u) || u.startsWith('//');
  if (ext === '.html') {
    for (const m of text.matchAll(/<(?:script|link|img|source|audio|video)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]);
    // inline module scripts
    for (const m of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) out.push(...jsRefs(m[1]));
    for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) out.push(...cssRefs(m[1]));
  } else if (ext === '.css') out.push(...cssRefs(text));
  else if (ext === '.js' || ext === '.mjs') out.push(...jsRefs(text));
  // resolve: html/css/js refs are relative to the file, except fetch('data/..') which is relative to the page (root)
  return out.filter((u) => !skip(u)).map((u) => ({ u: u.split(/[?#]/)[0], page: false }));
}
function cssRefs(t) {
  const o = [];
  for (const m of t.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) o.push(m[2].trim());
  for (const m of t.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi)) o.push(m[1]);
  return o;
}
function jsRefs(t) {
  const o = [];
  for (const m of t.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\1/g)) o.push(m[2]);
  // any './x.ext' / '../x.ext' literal (covers helpers like tryImport('./rules.js'))
  for (const m of t.matchAll(/(['"`])(\.{1,2}\/[\w./-]+\.(?:m?js|css|json|png|jpe?g|webp|svg|woff2?|mp3|ogg|wav))\1/g)) o.push(m[2]);
  return o;
}
function jsPageRefs(t) {
  const o = [];
  for (const m of t.matchAll(/fetch\(\s*(['"`])([^'"`$]+)\1/g)) o.push(m[2]);
  return o;
}

add(path.join(FRONT, 'index.html'), 'build');
add(path.join(FRONT, 'styles.css'), 'build');
add(path.join(FRONT, 'data/rules_data.json'), 'build');
while (queue.length) {
  const abs = queue.shift();
  const ext = path.extname(abs).toLowerCase();
  if (!TEXT_EXT.has(ext)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  for (const { u } of refsOf(abs, text)) {
    const target = u.startsWith('/') ? path.join(FRONT, u) : path.resolve(path.dirname(abs), u);
    add(target, rel(abs));
  }
  if (ext === '.js' || ext === '.mjs' || ext === '.html') {
    for (const u of jsPageRefs(text)) if (!/^(\/|[a-z]+:)/i.test(u) && !/^\.\.?\//.test(u) && /\.\w+$/.test(u)) add(path.join(FRONT, u.split(/[?#]/)[0]), rel(abs));
  }
}

// ---------- unreferenced files under src/ (informational) ----------
const unref = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else { const r = rel(p); if (!shipped.has(r)) unref.push(r); }
  }
})(path.join(FRONT, 'src'));

// ---------- write dist/front ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.rmSync(ZIP, { force: true });
const files = [...shipped].filter((r) => fs.existsSync(path.join(FRONT, r))).sort();
for (const r of files) {
  const dst = path.join(OUT, r);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(FRONT, r), dst);
}

// ---------- static checks on built files ----------
const problems = [];
const extHosts = new Map();
const OK_HOST = /^https?:\/\/(www\.w3\.org\/(2000\/svg|1999\/xlink|1999\/xhtml)|localhost|127\.0\.0\.1)/i;
for (const r of files) {
  const ext = path.extname(r).toLowerCase();
  if (!TEXT_EXT.has(ext)) continue;
  const t = fs.readFileSync(path.join(OUT, r), 'utf8');
  const lines = t.split('\n');
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(/https?:\/\/[^\s'"`)<>\\]+/gi)) {
      if (OK_HOST.test(m[0])) continue;
      const k = `${r}:${i + 1}`;
      extHosts.set(k, m[0]);
    }
    // absolute /path URLs in markup/css/js module specifiers/fetches
    const abs = [
      /\b(?:src|href|action|poster)\s*=\s*["']\/(?!\/)[^"']*["']/i,
      /url\(\s*['"]?\/(?!\/)[^)'"]*/i,
      /\bfrom\s*['"]\/[^'"]*['"]/,
      /\bimport\s*\(\s*['"`]\/[^'"`]*['"`]/,
      /\bfetch\(\s*['"`]\/(?!\/)/,
      /\bnew URL\(\s*['"`]\/(?!\/)/,
    ];
    for (const re of abs) if (re.test(ln)) problems.push(`absolute path URL ${r}:${i + 1}: ${ln.trim().slice(0, 120)}`);
  });
}
// External hosts: report all; fail on any that is not in code paths documented as RGS (params.js builds the scheme only).
const HOST_ALLOW_FILES = []; // none: no host literals are expected in the bundle
for (const [k, u] of extHosts) {
  if (HOST_ALLOW_FILES.some((f) => k.startsWith(f))) continue;
  problems.push(`external URL literal ${k}: ${u}`);
}
for (const m of missing) problems.push('missing reference: ' + m);

// ---------- manifest ----------
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const entries = files.map((r) => { const b = fs.readFileSync(path.join(OUT, r)); return { r, b, sha: sha(b) }; });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'front_MANIFEST.txt'),
  `The Unleashed Mine front v${version}\n` + entries.map((e) => `${e.sha}  ${String(e.b.length).padStart(8)}  ${e.r}`).join('\n') + '\n');

// ---------- zip (hand-written, deflate, deterministic) ----------
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = zlib.crc32 ? (b) => zlib.crc32(b) >>> 0 : (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function writeZip(list, dest) {
  const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // fixed 2026-01-01 00:00 for reproducible output
  const parts = []; const central = []; let off = 0;
  for (const { r, b } of list) {
    const name = Buffer.from(r, 'utf8');
    const def = zlib.deflateRawSync(b, { level: 9 });
    const useDef = def.length < b.length;
    const data = useDef ? def : b; const method = useDef ? 8 : 0; const crc = crc32(b);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(b.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(0x031e, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(DOS_TIME, 12); ch.writeUInt16LE(DOS_DATE, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(b.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(((0o100644) << 16) >>> 0, 38); ch.writeUInt32LE(off, 42);
    central.push(ch, name);
    off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(list.length, 8); end.writeUInt16LE(list.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  fs.writeFileSync(dest, Buffer.concat([...parts, cd, end]));
}
writeZip(entries, ZIP);

// ---------- report ----------
const total = entries.reduce((s, e) => s + e.b.length, 0);
console.log(`The Unleashed Mine front v${version}`);
console.log(`dist/front: ${entries.length} files, ${total} bytes`);
for (const e of entries) console.log(`  ${String(e.b.length).padStart(8)}  ${e.r}`);
console.log(`zip: ${path.relative(ROOT, ZIP)} (${fs.statSync(ZIP).size} bytes, sha256 ${sha(fs.readFileSync(ZIP))})`);
if (unref.length) console.log('not shipped (src/ files nothing references): ' + unref.join(', '));
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`); for (const p of problems) console.log('  - ' + p);
  if (!(ALLOW_MISSING && problems.every((p) => p.startsWith('missing reference')))) process.exitCode = 1;
} else console.log('checks: no absolute /path URLs, no external hosts, no missing references');
