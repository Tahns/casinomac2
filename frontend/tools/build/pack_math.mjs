#!/usr/bin/env node
// Validate and collect the math upload set. Zero dependencies (node >= 22 for zstd streaming; skipped with a note otherwise).
//   node frontend/tools/build/pack_math.mjs [--src <publish_files dir>] [--out <dir>] [--stable-secs 30] [--deep] [--books-sample 5000] [--no-copy]
// Reads math/games/the_unleashed_mine/library/publish_files at run time, waits until no file changed for --stable-secs
// (the math agent may be regenerating it), validates, recomputes per-mode RTP / hit rate / max win from the CSVs,
// copies to dist/math_upload/ and writes MANIFEST.txt (sha256 + size). Exit code 1 on any FAIL.
// RTP = sum(weight * payout/100) / sum(weight) / cost ; CSV columns = id, weight (uint64), payout (x100 integer).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(k);
const GAME = path.join(ROOT, 'math/games/the_unleashed_mine');
const SRC = path.resolve(arg('--src', path.join(GAME, 'library/publish_files')));
const OUT = path.resolve(arg('--out', path.join(ROOT, 'dist/math_upload')));
const STABLE = Number(arg('--stable-secs', 30));
const DEEP = flag('--deep');
const SAMPLE = Number(arg('--books-sample', 5000));
const MAX_MODES = 20;
const fails = [], warns = [];
const FAIL = (m) => { fails.push(m); console.log('FAIL: ' + m); };
const WARN = (m) => { warns.push(m); console.log('WARN: ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- stability ----------
const snap = () => fs.readdirSync(SRC).sort().map((n) => { const s = fs.statSync(path.join(SRC, n)); return { n, size: s.size, m: s.mtimeMs }; });
const key = (s) => s.map((x) => `${x.n}:${x.size}:${x.m}`).join('|');
async function waitStable() {
  if (!fs.existsSync(SRC)) { FAIL('source dir missing: ' + SRC); return false; }
  if (STABLE <= 0) { WARN('stability wait disabled (--stable-secs 0): files may be partial if math is regenerating'); return true; }
  for (let round = 0; round < 40; round++) {
    const a = snap();
    const age = (Date.now() - Math.max(...a.map((x) => x.m))) / 1000;
    if (age < STABLE) { console.log(`newest file modified ${age.toFixed(0)} s ago (< ${STABLE} s): waiting ${(STABLE - age).toFixed(0)} s for the math run to settle...`); await sleep((STABLE - age) * 1000 + 500); continue; }
    if (key(a) === key(snap())) { console.log(`stable: newest mtime ${age.toFixed(0)} s old, unchanged (>= ${STABLE} s)`); return true; }
  }
  FAIL('files kept changing; refusing to pack partial files'); return false;
}

// ---------- hashing ----------
function sha256File(p) {
  return new Promise((res, rej) => { const h = crypto.createHash('sha256'); fs.createReadStream(p).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej); });
}
const fmt = (n, d = 4) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- CSV ----------
async function readCsv(p, label) {
  const ids = [], pay = [], w = [];
  let lines = 0, bad = 0, nonStep = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(p), crlfDelay: Infinity });
  for await (const ln of rl) {
    if (!ln) continue; lines++;
    const c = ln.split(',');
    if (c.length !== 3 || !c.every((x) => /^\d+$/.test(x.trim()))) { if (bad++ < 3) FAIL(`${label}: row ${lines} not 3 uint columns: "${ln.slice(0, 60)}"`); continue; }
    ids.push(Number(c[0])); w.push(BigInt(c[1])); const pv = Number(c[2]); pay.push(pv);
    if (pv % 10 !== 0) nonStep++;
  }
  if (bad > 3) FAIL(`${label}: ${bad} malformed rows total`);
  if (nonStep) FAIL(`${label}: ${nonStep} payouts are not multiples of 10 (0.1x)`);
  // ids unique and sequential?
  const seq = ids.every((v, i) => v === ids[0] + i);
  if (!seq) WARN(`${label}: ids are not a contiguous sequence`);
  return { ids, pay, w, rows: lines - bad };
}
function stats(t, cost) {
  let tot = 0n, win = 0n, wp = 0n; let max = 0, min = Infinity;
  for (let i = 0; i < t.w.length; i++) { tot += t.w[i]; wp += t.w[i] * BigInt(t.pay[i]); if (t.pay[i] > 0) win += t.w[i]; if (t.pay[i] > max) max = t.pay[i]; if (t.pay[i] < min) min = t.pay[i]; }
  const S = 10n ** 12n;
  const rtp = Number(wp * S / tot) / 1e12 / 100 / cost; // wp = sum(w*payout_x100); /100 -> multiples
  const hit = Number(win * S / tot) / 1e12;
  let wMax = 0n; for (let i = 0; i < t.w.length; i++) if (t.pay[i] === max) wMax += t.w[i];
  const pMax = Number(wMax * S / tot) / 1e12;
  // median payout (weighted)
  const order = t.pay.map((p, i) => i).sort((a, b) => t.pay[a] - t.pay[b]); let acc = 0n, med = 0;
  for (const i of order) { acc += t.w[i]; if (acc * 2n >= tot) { med = t.pay[i]; break; } }
  // volatility: weighted std of payout multiple per unit staked
  let m1 = 0, m2 = 0; for (let i = 0; i < t.w.length; i++) { const f = Number(t.w[i] * S / tot) / 1e12, x = t.pay[i] / 100 / cost; m1 += f * x; m2 += f * x * x; }
  return { rtp, hit, max: max / 100, pMax, oneIn: pMax > 0 ? 1 / pMax : Infinity, min: min / 100, median: med / 100, std: Math.sqrt(Math.max(0, m2 - m1 * m1)), totalWeight: tot, rows: t.w.length };
}

// ---------- books (zstd jsonl) ----------
async function checkBooks(p, label, table, limit) {
  if (typeof zlib.createZstdDecompress !== 'function') { WARN(`${label}: node ${process.version} has no zstd; books not inspected`); return null; }
  const input = fs.createReadStream(p).pipe(zlib.createZstdDecompress());
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let n = 0, mism = 0, missingKeys = 0, firstId = null, evOk = 0, idMap = new Map();
  table.ids.forEach((v, i) => idMap.set(v, i));
  try {
    for await (const ln of rl) {
      if (!ln) continue;
      const b = JSON.parse(ln); n++;
      if (firstId === null) firstId = b.id;
      if (!('id' in b) || !('events' in b) || !('payoutMultiplier' in b)) missingKeys++;
      else {
        if (Array.isArray(b.events) && b.events.length) evOk++;
        // book id vs CSV: the SDK writes CSV id = book id - 1 ... accept either offset but they must be consistent
        const idx = idMap.has(b.id) ? idMap.get(b.id) : -1;
        if (idx < 0 || table.pay[idx] !== b.payoutMultiplier) mism++;
      }
      if (limit && n >= limit) break;
    }
  } catch (e) { FAIL(`${label}: books stream error after ${n} lines: ${e.message}`); }
  rl.close(); input.destroy();
  return { n, firstId, mism, missingKeys, evOk, full: !limit };
}

// ---------- main ----------
console.log(`source: ${SRC}`);
if (await waitStable()) {
  const names = fs.readdirSync(SRC).sort();
  const idxPath = path.join(SRC, 'index.json');
  if (!fs.existsSync(idxPath)) FAIL('index.json missing');
  let index = null;
  try { index = JSON.parse(fs.readFileSync(idxPath, 'utf8')); } catch (e) { FAIL('index.json is not valid JSON: ' + e.message); }
  const modes = [];
  if (index) {
    if (!index.modes || !Array.isArray(index.modes) || !index.modes.length) FAIL('index.json: "modes" must be a non-empty array');
    else {
      if (index.modes.length > MAX_MODES) FAIL(`index.json: ${index.modes.length} modes > ${MAX_MODES}`);
      const extra = Object.keys(index).filter((k) => k !== 'modes'); if (extra.length) WARN('index.json has extra top-level keys: ' + extra.join(','));
      const seen = new Set();
      for (const m of index.modes) {
        const L = `mode "${m.name}"`;
        if (typeof m.name !== 'string' || !m.name) FAIL('mode without a string name');
        if (seen.has(m.name)) FAIL(`${L}: duplicate name`); seen.add(m.name);
        if (typeof m.cost !== 'number' || !(m.cost > 0)) FAIL(`${L}: cost must be a positive number (got ${m.cost})`);
        if (typeof m.events !== 'string' || !/\.jsonl\.zst$/.test(m.events)) FAIL(`${L}: events must be a *.jsonl.zst filename (got ${m.events})`);
        if (typeof m.weights !== 'string' || !/\.csv$/.test(m.weights)) FAIL(`${L}: weights must be a *.csv filename (got ${m.weights})`);
        for (const f of [m.events, m.weights]) { if (f && !names.includes(f)) FAIL(`${L}: file listed in index.json not found: ${f}`); if (f && /[\\/]/.test(f)) FAIL(`${L}: filename must not contain a path: ${f}`); }
        const k = Object.keys(m).filter((x) => !['name', 'cost', 'events', 'weights'].includes(x)); if (k.length) WARN(`${L}: extra keys ${k.join(',')} (index.json form is strictly enforced)`);
        modes.push(m);
      }
      const listed = new Set(['index.json', ...index.modes.flatMap((m) => [m.events, m.weights])]);
      for (const n of names) if (!listed.has(n)) WARN(`file in publish_files not referenced by index.json (will not be packed): ${n}`);
      // naming per docs example: books_<mode>.jsonl.zst / lookUpTable_<mode>_0.csv
      for (const m of index.modes) {
        if (m.events !== `books_${m.name}.jsonl.zst`) WARN(`mode ${m.name}: events name "${m.events}" differs from docs example books_${m.name}.jsonl.zst (any name is allowed if index.json matches)`);
        if (m.weights !== `lookUpTable_${m.name}_0.csv`) WARN(`mode ${m.name}: weights name "${m.weights}" differs from docs example lookUpTable_${m.name}_0.csv`);
      }
    }
  }

  // config.json cross-check (SDK-written sha256 / maxWin / cost)
  let cfg = null; const cfgPath = path.join(GAME, 'library/configs/config.json');
  if (fs.existsSync(cfgPath)) { try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { /* ignore */ } }

  console.log('\nsizes + sha256:');
  const shas = {};
  for (const n of ['index.json', ...modes.flatMap((m) => [m.events, m.weights])]) {
    if (!fs.existsSync(path.join(SRC, n))) continue;
    shas[n] = await sha256File(path.join(SRC, n));
    console.log(`  ${shas[n]}  ${String(fs.statSync(path.join(SRC, n)).size).padStart(11)}  ${n}`);
  }
  if (cfg) for (const b of cfg.bookShelfConfig || []) {
    const t = b.tables?.[0]; const bf = b.booksFile;
    if (t && shas[t.file] && shas[t.file] !== t.sha256) FAIL(`${t.file}: sha256 differs from library/configs/config.json (CSV changed after config was written; re-run math or re-sync config)`);
    if (bf && shas[bf.file] && shas[bf.file] !== bf.sha256) FAIL(`${bf.file}: sha256 differs from library/configs/config.json`);
  }

  const rows = [];
  for (const m of modes) {
    const p = path.join(SRC, m.weights); if (!fs.existsSync(p)) continue;
    const t = await readCsv(p, m.weights); const s = stats(t, m.cost); s.name = m.name; s.cost = m.cost; rows.push(s);
    if (cfg) { const b = (cfg.bookShelfConfig || []).find((x) => x.name === m.name); if (b) {
      if (b.cost !== m.cost) FAIL(`${m.name}: cost ${m.cost} != config.json cost ${b.cost}`);
      if (b.maxWin !== s.max) FAIL(`${m.name}: CSV max win ${s.max}x != config.json maxWin ${b.maxWin}`);
      if (b.bookLength !== s.rows) FAIL(`${m.name}: CSV rows ${s.rows} != config.json bookLength ${b.bookLength}`);
      if (Math.abs(b.rtp - s.rtp) > 5e-4) FAIL(`${m.name}: RTP ${s.rtp} != config.json ${b.rtp}`);
    } }
    if (Math.abs(s.rtp - 0.96) > 0.0005) WARN(`${m.name}: RTP ${(s.rtp * 100).toFixed(4)}% is not 96.00% +-0.05`);
    if (s.max > 5000 * 1.0000001) WARN(`${m.name}: max win ${s.max}x above the 5000x cap`);
    // books
    const bp = path.join(SRC, m.events);
    if (fs.existsSync(bp)) {
      const t0 = Date.now();
      const r = await checkBooks(bp, m.events, t, DEEP ? 0 : SAMPLE);
      if (r) {
        const ok = r.mism === 0 && r.missingKeys === 0 && r.evOk === r.n;
        (ok ? console.log : (x) => FAIL(x))(`${ok ? 'ok  ' : ''}${m.events}: ${DEEP ? 'ALL' : 'first'} ${r.n} books checked in ${((Date.now() - t0) / 1000).toFixed(1)} s (first id ${r.firstId}; payout vs CSV mismatches ${r.mism}; missing id/events/payoutMultiplier ${r.missingKeys}; with events ${r.evOk})`);
        if (DEEP && r.n !== s.rows) FAIL(`${m.events}: ${r.n} books but ${s.rows} CSV rows`);
        s.books = r;
      }
    }
  }

  console.log('\nVALIDATION TABLE (recomputed from CSV)');
  console.log('mode   cost   rows    sum(weight)        RTP        hit rate   max win   P(max)        median  min   std');
  for (const s of rows) console.log(`${s.name.padEnd(6)} ${String(s.cost).padEnd(6)} ${String(s.rows).padEnd(7)} ${String(s.totalWeight).padEnd(18)} ${(s.rtp * 100).toFixed(4)}%   ${(s.hit * 100).toFixed(3)}%   ${fmt(s.max, 1)}x   1 in ${Math.round(s.oneIn).toLocaleString('en-US')}   ${s.median}x  ${s.min}x  ${s.std.toFixed(2)}`);
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dist/math_validation.json'), JSON.stringify({ generated: new Date().toISOString(), src: SRC, modes: rows.map((s) => ({ name: s.name, cost: s.cost, rows: s.rows, rtp: s.rtp, hitRate: s.hit, maxWin: s.max, pMax: s.pMax, oneInMax: s.oneIn, median: s.median, minPayout: s.min, std: s.std })) }, null, 2) + '\n');

  // ---------- copy ----------
  if (!fails.length && !flag('--no-copy')) {
    const after = key(snap());
    fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
    const man = [];
    for (const n of Object.keys(shas)) {
      fs.copyFileSync(path.join(SRC, n), path.join(OUT, n));
      const h = await sha256File(path.join(OUT, n));
      if (h !== shas[n]) FAIL(`copy of ${n} does not match source hash (source changed while copying?)`);
      man.push(`${h}  ${String(fs.statSync(path.join(OUT, n)).size).padStart(11)}  ${n}`);
    }
    if (key(snap()) !== after) FAIL('source changed while copying; discard dist/math_upload and re-run');
    if (!fails.length) {
      fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), `# The Unleashed Mine math upload set (sha256, bytes, file)\n# generated ${new Date().toISOString()} from ${path.relative(ROOT, SRC)}\n# Upload only the files listed below (index.json + each mode's csv and zst); MANIFEST.txt is documentation, not part of the strict index.json set.\n` + man.join('\n') + '\n');
      console.log(`\npacked ${man.length} files into ${path.relative(ROOT, OUT)}/ (+ MANIFEST.txt)`);
    }
  }
}
console.log(`\n${fails.length} FAIL, ${warns.length} WARN`);
process.exitCode = fails.length ? 1 : 0;
