// Mock RGS for Agent Mambo QA. Zero dependencies. Port MOCK_PORT (default 5180; 0 = pick a free port and print it).
// ALL wallet state is keyed by sessionID (POST body.sessionID, or a '/s/<sessionID>' path prefix on rgs_url, which also
// keys the stateless replay GET). Clients with different sessionIDs never see each other's balance/round/log/config.
// Control (all take the session via ?sid=<id> or body.sid; default '_default'):
//   POST /__mock/config (JSON, see applyConfig)   GET /__mock/log   DELETE|POST /__mock/log/clear   GET /__mock/state
//   GET /__mock/sessions   GET /__mock/health   POST /__mock/drop {sid}   (config {reset:true} resets only that session)
// Book selection is deterministic per session: seeded RNG (seed = hash of sid, restored by reset).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(HERE, '../../fixtures');
const PORT = Number(process.env.MOCK_PORT || 5180);
const MICRO = 1_000_000;

// ---------- books ----------
const HAND_BOOKS = {
  base: [
    { id: 1, payoutMultiplier: 0, events: [
      { index: 0, type: 'reveal', board: [[{name:'L1'},{name:'L2'},{name:'L3'},{name:'L4'},{name:'H1'}],[{name:'L2'},{name:'L3'},{name:'L4'},{name:'H1'},{name:'H2'}],[{name:'L3'},{name:'L4'},{name:'H1'},{name:'H2'},{name:'H3'}],[{name:'L4'},{name:'H1'},{name:'H2'},{name:'H3'},{name:'H4'}],[{name:'H1'},{name:'H2'},{name:'H3'},{name:'H4'},{name:'L1'}],[{name:'H2'},{name:'H3'},{name:'H4'},{name:'L1'},{name:'L2'}]], paddingPositions: [0,0,0,0,0,0], gameType: 'basegame', anticipation: [0,0,0,0,0,0] },
      { index: 1, type: 'setTotalWin', amount: 0 }, { index: 2, type: 'finalWin', amount: 0 } ] },
    { id: 2, payoutMultiplier: 250, events: [
      { index: 0, type: 'reveal', board: [], gameType: 'basegame' },
      { index: 1, type: 'setWin', amount: 250, winLevel: 2 }, { index: 2, type: 'setTotalWin', amount: 250 }, { index: 3, type: 'finalWin', amount: 250 } ] },
  ],
  bonus: [
    { id: 3, payoutMultiplier: 15000, events: [
      { index: 0, type: 'reveal', board: [], gameType: 'basegame' }, { index: 1, type: 'freeSpinTrigger', totalFs: 10 },
      { index: 2, type: 'setTotalWin', amount: 15000 }, { index: 3, type: 'finalWin', amount: 15000 } ] },
  ],
};

function readJsonl(file) {
  let buf = fs.readFileSync(file);
  if (file.endsWith('.zst')) buf = zlib.zstdDecompressSync(buf);
  return buf.toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

let books = { base: [], bonus: [] };
let costs = { base: 1, bonus: 100 };
let bookSource = 'hand-made';
function loadFixtures() {
  books = { base: [], bonus: [] }; costs = { base: 1, bonus: 100 }; bookSource = 'hand-made';
  try {
    const idxFile = path.join(FIX, 'index.json');
    if (fs.existsSync(idxFile)) {
      const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
      for (const m of idx.modes || []) {
        const name = String(m.name).toLowerCase();
        costs[name] = Number(m.cost ?? 1);
        const f = path.join(FIX, m.events || '');
        const cands = [f, f.replace(/\.zst$/, ''), f.replace(/\.jsonl(\.zst)?$/, '.sample.jsonl'), f.replace(/\.jsonl(\.zst)?$/, '_sample.jsonl')];
        const hit = cands.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
        if (hit) { books[name] = readJsonl(hit); bookSource = 'fixtures'; }
      }
    }
    // fallback: any books_<mode>*.jsonl[.zst] / *.json arrays in fixtures
    if (fs.existsSync(FIX)) {
      for (const f of fs.readdirSync(FIX, { recursive: true })) {
        const m = /books?_([a-z]+)[^/]*\.(jsonl(\.zst)?|json)$/i.exec(String(f));
        if (!m) continue; const name = m[1].toLowerCase();
        if (books[name]?.length) continue;
        try {
          const full = path.join(FIX, String(f));
          books[name] = m[2].endsWith('json') && !m[2].startsWith('jsonl') ? JSON.parse(fs.readFileSync(full, 'utf8')) : readJsonl(full);
          bookSource = 'fixtures';
        } catch {}
      }
    }
  } catch (e) { console.error('fixture load failed', e.message); }
  for (const k of Object.keys(HAND_BOOKS)) if (!books[k]?.length) books[k] = HAND_BOOKS[k];
}
loadFixtures();

const hasEv = (b, t) => (b.events || []).some((e) => e.type === t);
function category(b, mode) {
  const p = Number(b.payoutMultiplier || 0);
  if (hasEv(b, 'wincap') || p >= 500000) return 'maxwin';
  if (hasEv(b, 'freeSpinRetrigger')) return 'retrigger';
  if (hasEv(b, 'freeSpinTrigger')) return 'bonus';           // free-spin trigger (no retrigger)
  if (p >= 1500) return 'bigwin';                             // >= 15x
  return p > 0 ? 'win' : 'loss';
}
// Real SDK books: payoutMultiplier and event amounts are integers x100 (500000 = 5000x). The RGS serves round.payoutMultiplier as a plain multiplier.
const norm = (b) => ({ ...b, payoutMultiplier: Number(b.payoutMultiplier) / 100 });

// ---------- state (per sessionID) ----------
const SESSIONS = new Map();
function hashSeed(str) { let h = 2166136261 >>> 0; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h || 1; }
function rngFor(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function freshState(sid) {
  return {
    sid, rng: rngFor(hashSeed(sid)),
    balance: 1000 * MICRO, currency: 'USD',
    config: { minBet: 100000, maxBet: 1000 * MICRO, stepBet: 10000, defaultBetLevel: 1 * MICRO,
      betLevels: [100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000],
      jurisdiction: { socialCasino: false, disabledFullscreen: false, disabledTurbo: false, disabledSuperTurbo: false, disabledAutoplay: false, disabledSlamstop: false, disabledSpacebar: false, disabledBuyFeature: false, displayNetPosition: false, displayRTP: false, displaySessionTimer: false, minimumRoundDuration: 0 } },
    round: null,            // last round object (active or not)
    force: [],              // queue of {id?, category?, mode?}
    errors: [],             // [{endpoint, code, once}]
    keepActive: false,      // on end-round do not close (abort simulation)
    betSeq: 1000, log: [], delayMs: 0,
  };
}
function getS(sid) { sid = String(sid || '_default'); let s = SESSIONS.get(sid); if (!s) { s = freshState(sid); SESSIONS.set(sid, s); } return s; }
function reset(S) { const n = freshState(S.sid); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, n); }

const ERR_HTTP = { ERR_VAL: 400, ERR_IPB: 400, ERR_IS: 400, ERR_ATE: 400, ERR_GLE: 400, ERR_LOC: 400, ERR_ACT: 400, ERR_GEN: 500, ERR_MAINTENANCE: 500 };

function pickBook(S, mode, amountMicro) {
  const f = S.force.length ? S.force.shift() : null;
  const m = (f?.mode || mode || 'base').toLowerCase();
  const list = books[m] || books.base;
  let b;
  if (f?.id != null) b = list.find((x) => x.id === f.id) || Object.values(books).flat().find((x) => x.id === f.id) || list[0];
  else if (f?.category) { const cat = f.category === 'big' ? 'bigwin' : f.category; const c = list.filter((x) => category(x, m) === cat); b = c.length ? c[Math.floor(S.rng() * c.length)] : null; if (!b) throw new Error('no book of category ' + f.category + ' in ' + m); }
  else b = list[Math.floor(S.rng() * list.length)];
  return { book: norm(b), mode: m };
}
const bal = (S) => ({ amount: Math.round(S.balance), currency: S.currency });
const roundOut = (r) => r && ({ ...r });

function makeRound(S, book, mode, amount) {
  const payout = Math.round(amount * book.payoutMultiplier);
  return { betID: ++S.betSeq, amount, payout, payoutMultiplier: book.payoutMultiplier, active: book.payoutMultiplier > 0, mode: mode.toUpperCase(), event: String(book.id), state: book.events, bookId: book.id };
}

function takeError(S, endpoint) {
  const i = S.errors.findIndex((e) => e.endpoint === '*' || endpoint.startsWith(e.endpoint));
  if (i < 0) return null;
  const e = S.errors[i]; if (e.once !== false) S.errors.splice(i, 1);
  return e.code;
}

function applyConfig(S, c) {
  if (c.reset) reset(S);
  if (c.reloadFixtures) loadFixtures();
  if (c.bet) Object.assign(S.config, c.bet);                 // rewrite minBet/maxBet/stepBet/defaultBetLevel/betLevels
  if (c.jurisdiction) Object.assign(S.config.jurisdiction, c.jurisdiction);
  if (c.currency) S.currency = c.currency;
  if (c.balance != null) S.balance = c.balance;
  if (c.force) S.force = (Array.isArray(c.force) ? c.force : [c.force]).map((f) => (typeof f === 'string' ? (/^\d+$/.test(f) ? { id: +f } : { category: f }) : typeof f === 'number' ? { id: f } : f));
  if (c.keepActive != null) S.keepActive = !!c.keepActive;
  if (c.error) S.errors.push(...[].concat(c.error).map((e) => (typeof e === 'string' ? { endpoint: '*', code: e, once: true } : { endpoint: e.endpoint || '*', code: e.code, once: e.once !== false })));
  if (c.clearErrors) S.errors = [];
  if (c.delayMs != null) S.delayMs = c.delayMs;
  if (c.activeRound) { // pre-existing active round (for reload/restore tests)
    const a = c.activeRound; const { book, mode } = pickBook(S, a.mode || 'base', a.amount);
    const forced = a.id != null || a.category ? (S.force.unshift({ id: a.id, category: a.category || 'win', mode }), pickBook(S, mode, a.amount)) : { book, mode };
    const r = makeRound(S, forced.book, forced.mode, a.amount);
    r.active = true; if (r.payoutMultiplier === 0) { r.payoutMultiplier = 1; r.payout = a.amount; }
    S.round = r;
  }
  if (c.clearLog) S.log = [];
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS', 'access-control-allow-headers': '*', 'access-control-max-age': '600' };
const send = (res, code, obj) => { res.writeHead(code, { ...CORS, 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const fail = (res, code, msg) => send(res, ERR_HTTP[code] || 400, { error: code, message: msg || code, status: code });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = url.pathname.replace(/\/+$/, '') || '/';
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  let raw = ''; for await (const ch of req) raw += ch;
  let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { body = { __raw: raw }; }

  if (p === '/__mock/health') return send(res, 200, { ok: true, sessions: SESSIONS.size });
  if (p === '/__mock/sessions') return send(res, 200, [...SESSIONS.keys()]);
  if (p.startsWith('/__mock')) {
    const S = getS(url.searchParams.get('sid') || body.sid || body.sessionID);
    if (p === '/__mock/drop') { SESSIONS.delete(S.sid); return send(res, 200, { ok: true }); }
    if (p === '/__mock/log' && req.method === 'GET') return send(res, 200, S.log);
    if (p === '/__mock/log' && req.method === 'DELETE') { S.log = []; return send(res, 200, { ok: true }); }
    if (p === '/__mock/log/clear') { S.log = []; return send(res, 200, { ok: true }); }
    if (p === '/__mock/config' && req.method === 'POST') { applyConfig(S, body); return send(res, 200, { ok: true, state: { balance: S.balance, currency: S.currency, config: S.config, round: S.round && { ...S.round, state: undefined }, bookSource } }); }
    if (p === '/__mock/state') { const { rng, ...rest } = S; return send(res, 200, { ...rest, log: S.log.length, bookSource, costs, books: Object.fromEntries(Object.entries(books).map(([k, v]) => [k, v.map((b) => ({ id: b.id, p: b.payoutMultiplier, cat: category(b, k) }))])) }); }
    return send(res, 404, { error: 'unknown control' });
  }

  // session: '/s/<sid>/...' path prefix (keys replay GETs too), else body.sessionID, else shared default
  let sid = body.sessionID;
  const pm = /^\/s\/([^/]+)(\/.*)?$/.exec(p);
  if (pm) { sid = decodeURIComponent(pm[1]); p = pm[2] || '/'; }
  const S = getS(sid);
  S.log.push({ t: Date.now(), method: req.method, path: p + url.search, body, origin: req.headers.origin || null });
  if (S.delayMs) await new Promise((r) => setTimeout(r, S.delayMs));

  const ep = p.replace(/^\/wallet\//, '').replace(/^\/bet\//, 'bet-');
  const injected = takeError(S, ep);
  if (injected) return fail(res, injected);

  try {
    if (req.method === 'GET' && p.startsWith('/bet/replay/')) {
      const [, , , game, version, mode, event] = p.split('/');
      const m = (mode || 'base').toLowerCase();
      const list = books[m] || books.base;
      const b = list.find((x) => String(x.id) === String(decodeURIComponent(event || ''))) || list[0];
      if (!b) return fail(res, 'ERR_VAL', 'no such event');
      return send(res, 200, { payoutMultiplier: Number(b.payoutMultiplier) / 100, costMultiplier: costs[m] ?? 1, state: b.events, game, version, mode: m });
    }
    if (req.method !== 'POST') return send(res, 404, { error: 'not found' });
    if (p === '/wallet/authenticate') {
      if (!body.sessionID) return fail(res, 'ERR_VAL', 'sessionID required');
      return send(res, 200, { balance: bal(S), config: S.config, round: roundOut(S.round) || undefined });
    }
    if (p === '/wallet/balance') return send(res, 200, { balance: bal(S) });
    if (p === '/wallet/play') {
      const amount = Number(body.amount); const mode = String(body.mode || 'base').toLowerCase();
      if (!body.sessionID || !Number.isFinite(amount) || amount <= 0 || !(mode in costs)) return fail(res, 'ERR_VAL', 'bad play request');
      if (S.round?.active) return fail(res, 'ERR_ACT', 'round already active');
      const debit = amount * costs[mode];
      if (S.balance < debit) return fail(res, 'ERR_IPB', 'insufficient balance');
      S.balance -= debit;
      const { book, mode: m } = pickBook(S, mode, amount);
      const r = makeRound(S, book, m, amount);
      S.round = r; // 0x round closed server-side (active:false)
      return send(res, 200, { balance: bal(S), round: roundOut(r) });
    }
    if (p === '/wallet/end-round') {
      if (!S.round?.active) return fail(res, 'ERR_VAL', 'no active round');
      if (S.keepActive) return send(res, 200, { balance: bal(S) }); // "do not close": round stays active
      S.balance += S.round.payout; S.round = { ...S.round, active: false };
      return send(res, 200, { balance: bal(S) });
    }
    if (p === '/bet/event') return send(res, 200, { event: body.event ?? null });
    return send(res, 404, { error: 'not found' });
  } catch (e) { return fail(res, 'ERR_GEN', e.message); }
});
server.listen(PORT, () => console.log(`mock RGS http://localhost:${server.address().port} (books: ${bookSource}, base=${books.base.length} bonus=${books.bonus.length})`));
