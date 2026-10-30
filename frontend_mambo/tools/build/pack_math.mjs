#!/usr/bin/env node
// Validate and collect the Agent Mambo math upload set (WP11). Zero npm dependencies (node >= 22 for zstd streaming; skipped with a note otherwise).
//   node tools/build/pack_math.mjs [--src <publish_files dir>] [--out <dir>] [--stable-secs 30] [--deep] [--books-sample 5000] [--no-copy] [--no-zip] [--no-sdk]
// Reads math/games/agent_mambo/library/publish_files (never writes there), waits until no file changed for --stable-secs, then checks:
//   * index.json in the strict Stake Engine form ({modes:[{name,cost,events,weights}]}, events *.jsonl.zst, weights *.csv, files present);
//   * per mode RTP / hit rate / max win recomputed from the CSV (96.00 % +-0.05 and <= 5000x expected), payouts multiples of 10;
//   * sha256 of every file against the SDK-written library/configs/config.json (bookShelfConfig) and cost / maxWin / bookLength / rtp;
//   * the SDK's own checks (tools/build/sdk_verify.py with math/env/bin/python: verify_lookup_format + the books_<mode>.verification.json
//     sidecars: books sha256, payout hash, entry count) unless --no-sdk;
//   * the first --books-sample books of each mode (or ALL with --deep) decompressed: id / events / payoutMultiplier present, payout == CSV.
// Then copies EXACTLY index.json + each mode's books + lookup table to dist/math_upload/ (+ MANIFEST.txt, documentation only) and writes
// dist/agent_mambo_math_v<VERSION>.zip with those files at the zip root (books stored, csv/json deflated). Exit code 1 on any FAIL.
// RTP = sum(weight * payout/100) / sum(weight) / cost ; CSV columns = id, weight (uint64), payout (x100 integer).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const ROOT = path.resolve(FRONT, '..');
const DIST = path.join(FRONT, 'dist');
const VERSION = fs.readFileSync(path.join(FRONT, 'VERSION'), 'utf8').trim();
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(k);
const GAME = path.join(ROOT, 'math/games/agent_mambo');
const SRC = path.resolve(arg('--src', path.join(GAME, 'library/publish_files')));
const OUT = path.resolve(arg('--out', path.join(DIST, 'math_upload')));
const ZIP = path.join(DIST, `agent_mambo_math_v${VERSION}.zip`);
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

// ---------- SDK checks (math/env python, read-only; see tools/build/sdk_verify.py) ----------
let sdkResult = null;
function runSdk() {
  const py = [path.join(ROOT, 'math/env/bin/python'), 'python3'].find((p) => p === 'python3' || fs.existsSync(p));
  console.log(`\nSDK checks (${path.relative(ROOT, py) || py} tools/build/sdk_verify.py) ...`);
  const r = spawnSync(py, ['-B', path.join(HERE, 'sdk_verify.py'), SRC, path.join(GAME, 'library/configs')], { encoding: 'utf8', maxBuffer: 1 << 24 });
  let out = null;
  try { out = JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { /* below */ }
  if (!out) { FAIL(`SDK check did not run: ${(r.stderr || r.error?.message || '').slice(-300)}`); return null; }
  for (const f of out.fails) FAIL('SDK: ' + f);
  for (const [name, m] of Object.entries(out.modes)) console.log(`  ${m.books_sha256_ok && m.payout_hash_ok && m.entries_ok ? 'ok  ' : 'FAIL'} ${name}: lookup format ${m.lookup_format || '-'}, ${m.entries} entries, books sha256 ${m.books_sha256_ok ? 'matches' : 'DIFFERS from'} the sidecar, payout hash ${m.payout_hash_ok ? 'ok' : 'DIFFERS'}`);
  return out;
}

// ---------- zip (hand-written, deterministic; books stored, text deflated; files < 4 GB so no ZIP64) ----------
const crc32 = (b) => zlib.crc32(b) >>> 0;
async function writeZip(names, dir, zipPath, shas) {
  const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1;
  const fd = fs.openSync(zipPath + '.part', 'w');
  let off = 0; const cen = [];
  const w = (buf) => { fs.writeSync(fd, buf); off += buf.length; };
  for (const n of names) {
    const raw = fs.readFileSync(path.join(dir, n));
    if (crypto.createHash('sha256').update(raw).digest('hex') !== shas[n]) { FAIL(`zip: ${n} changed since it was hashed`); continue; }
    const store = /\.zst$/.test(n);
    const data = store ? raw : zlib.deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw); const nameB = Buffer.from(n);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(store ? 0 : 8, 8);
    lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameB.length, 26); lh.writeUInt16LE(0, 28);
    const at = off; w(lh); w(nameB); w(data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(store ? 0 : 8, 10);
    ch.writeUInt16LE(DOS_TIME, 12); ch.writeUInt16LE(DOS_DATE, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(0o100644 << 16 >>> 0, 38); ch.writeUInt32LE(at, 42);
    cen.push(Buffer.concat([ch, nameB]));
  }
  const cdAt = off; for (const c of cen) w(c);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(cen.length, 8); end.writeUInt16LE(cen.length, 10); end.writeUInt32LE(off - cdAt, 12); end.writeUInt32LE(cdAt, 16);
  w(end); fs.closeSync(fd);
  if (off >= 0xffffffff) { FAIL('zip would need ZIP64'); return; }
  fs.renameSync(zipPath + '.part', zipPath);
  // self-check: read the central directory back, every entry inflates to the hashed bytes
  const z = fs.readFileSync(zipPath); const e = z.length - 22; const n = z.readUInt16LE(e + 10); let p = z.readUInt32LE(e + 16); const seen = [];
  for (let i = 0; i < n; i++) {
    const method = z.readUInt16LE(p + 10), csize = z.readUInt32LE(p + 20), nlen = z.readUInt16LE(p + 28), lho = z.readUInt32LE(p + 42);
    const name = z.toString('utf8', p + 46, p + 46 + nlen); p += 46 + nlen;
    const ds = lho + 30 + z.readUInt16LE(lho + 26) + z.readUInt16LE(lho + 28);
    const body = z.subarray(ds, ds + csize); const raw = method === 0 ? body : zlib.inflateRawSync(body);
    if (crypto.createHash('sha256').update(raw).digest('hex') !== shas[name]) FAIL(`zip self-check: ${name} does not match`);
    seen.push(name);
  }
  if (seen.slice().sort().join('|') !== names.slice().sort().join('|')) FAIL('zip self-check: entry list differs from the upload set');
  console.log(`zip: ${path.relative(ROOT, zipPath)} (${seen.length} files, ${(z.length / 1048576).toFixed(1)} MB, sha256 ${crypto.createHash('sha256').update(z).digest('hex')}); self-check ${fails.length ? 'FAILED' : 'ok'}`);
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

  // ---------- the SDK's own checks (read-only) ----------
  if (!flag('--no-sdk')) sdkResult = runSdk();
  console.log('\nVALIDATION TABLE (recomputed from CSV)');
  console.log('mode   cost   rows    sum(weight)        RTP        hit rate   max win   P(max)        median  min   std');
  for (const s of rows) console.log(`${s.name.padEnd(6)} ${String(s.cost).padEnd(6)} ${String(s.rows).padEnd(7)} ${String(s.totalWeight).padEnd(18)} ${(s.rtp * 100).toFixed(4)}%   ${(s.hit * 100).toFixed(3)}%   ${fmt(s.max, 1)}x   1 in ${Math.round(s.oneIn).toLocaleString('en-US')}   ${s.median}x  ${s.min}x  ${s.std.toFixed(2)}`);
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'math_validation.json'), JSON.stringify({ generated: new Date().toISOString(), src: path.relative(ROOT, SRC), sdk: sdkResult, modes: rows.map((s) => ({ name: s.name, cost: s.cost, rows: s.rows, rtp: s.rtp, hitRate: s.hit, maxWin: s.max, pMax: s.pMax, oneInMax: s.oneIn, median: s.median, minPayout: s.min, std: s.std })) }, null, 2) + '\n');

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
    if (!fails.length && !flag('--no-zip')) await writeZip(Object.keys(shas), OUT, ZIP, shas);
    if (!fails.length) {
      fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), `# Agent Mambo math upload set (sha256, bytes, file)\n# generated ${new Date().toISOString()} from ${path.relative(ROOT, SRC)}\n# Upload only the files listed below (index.json + each mode's csv and zst); MANIFEST.txt is documentation, not part of the strict index.json set.\n` + man.join('\n') + '\n');
      console.log(`\npacked ${man.length} files into ${path.relative(ROOT, OUT)}/ (+ MANIFEST.txt)`);
    }
  }
}
console.log(`\n${fails.length} FAIL, ${warns.length} WARN`);
process.exitCode = fails.length ? 1 : 0;
