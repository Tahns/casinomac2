// Mock RGS for The Unleashed Mine QA. Zero dependencies. Port 5180.
// Control:  POST /__mock/config  (JSON, see applyConfig)   GET /__mock/log   DELETE|POST /__mock/log/clear   GET /__mock/state
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
    { id: 2, payoutMultiplier: 2.5, events: [
      { index: 0, type: 'reveal', board: [], gameType: 'basegame' },
      { index: 1, type: 'setWin', amount: 2.5, winLevel: 2 }, { index: 2, type: 'setTotalWin', amount: 2.5 }, { index: 3, type: 'finalWin', amount: 2.5 } ] },
  ],
  bonus: [
    { id: 3, payoutMultiplier: 150, events: [
      { index: 0, type: 'reveal', board: [], gameType: 'basegame' }, { index: 1, type: 'freeSpinTrigger', totalFs: 10 },
      { index: 2, type: 'setTotalWin', amount: 150 }, { index: 3, type: 'finalWin', amount: 150 } ] },
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
  if (hasEv(b, 'wincap') || p >= 5000) return 'maxwin';
  if (mode !== 'base' || hasEv(b, 'freeSpinTrigger')) return 'bonus';
  return p > 0 ? 'win' : 'loss';
}
const norm = (b) => ({ ...b, payoutMultiplier: Number(b.payoutMultiplier) }); // book payout is a plain multiplier

// ---------- state ----------
let S;
function reset() {
  S = {
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
reset();

const ERR_HTTP = { ERR_VAL: 400, ERR_IPB: 400, ERR_IS: 400, ERR_ATE: 400, ERR_GLE: 400, ERR_LOC: 400, ERR_ACT: 400, ERR_GEN: 500, ERR_MAINTENANCE: 500 };

function pickBook(mode, amountMicro) {
  const f = S.force.length ? S.force.shift() : null;
  const m = (f?.mode || mode || 'base').toLowerCase();
  const list = books[m] || books.base;
  let b;
  if (f?.id != null) b = Object.values(books).flat().find((x) => x.id === f.id) || list[0];
  else if (f?.category) { const c = list.filter((x) => category(x, m) === f.category); b = c.length ? c[Math.floor(Math.random() * c.length)] : list[0]; }
  else b = list[Math.floor(Math.random() * list.length)];
  return { book: norm(b), mode: m };
}
const bal = () => ({ amount: Math.round(S.balance), currency: S.currency });
const roundOut = (r) => r && ({ ...r });

function makeRound(book, mode, amount) {
  const payout = Math.round(amount * book.payoutMultiplier);
  return { betID: ++S.betSeq, amount, payout, payoutMultiplier: book.payoutMultiplier, active: book.payoutMultiplier > 0, mode: mode.toUpperCase(), event: String(book.id), state: book.events, bookId: book.id };
}

function takeError(endpoint) {
  const i = S.errors.findIndex((e) => e.endpoint === '*' || endpoint.startsWith(e.endpoint));
  if (i < 0) return null;
  const e = S.errors[i]; if (e.once !== false) S.errors.splice(i, 1);
  return e.code;
}

function applyConfig(c) {
  if (c.reset) reset();
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
    const a = c.activeRound; const { book, mode } = pickBook(a.mode || 'base', a.amount);
    const forced = a.id != null || a.category ? (S.force.unshift({ id: a.id, category: a.category || 'win', mode }), pickBook(mode, a.amount)) : { book, mode };
    const r = makeRound(forced.book, forced.mode, a.amount);
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
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  let raw = ''; for await (const ch of req) raw += ch;
  let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { body = { __raw: raw }; }

  if (p.startsWith('/__mock')) {
    if (p === '/__mock/log' && req.method === 'GET') return send(res, 200, S.log);
    if (p === '/__mock/log' && req.method === 'DELETE') { S.log = []; return send(res, 200, { ok: true }); }
    if (p === '/__mock/log/clear') { S.log = []; return send(res, 200, { ok: true }); }
    if (p === '/__mock/config' && req.method === 'POST') { applyConfig(body); return send(res, 200, { ok: true, state: { balance: S.balance, currency: S.currency, config: S.config, round: S.round && { ...S.round, state: undefined }, bookSource } }); }
    if (p === '/__mock/state') return send(res, 200, { ...S, log: S.log.length, bookSource, costs, books: Object.fromEntries(Object.entries(books).map(([k, v]) => [k, v.map((b) => ({ id: b.id, p: b.payoutMultiplier, cat: category(b, k) }))])) });
    return send(res, 404, { error: 'unknown control' });
  }

  S.log.push({ t: Date.now(), method: req.method, path: p + url.search, body, origin: req.headers.origin || null });
  if (S.delayMs) await new Promise((r) => setTimeout(r, S.delayMs));

  const ep = p.replace(/^\/wallet\//, '').replace(/^\/bet\//, 'bet-');
  const injected = takeError(ep);
  if (injected) return fail(res, injected);

  try {
    if (req.method === 'GET' && p.startsWith('/bet/replay/')) {
      const [, , , game, version, mode, event] = p.split('/');
      const m = (mode || 'base').toLowerCase();
      const list = books[m] || books.base;
      const b = list.find((x) => String(x.id) === String(decodeURIComponent(event || ''))) || list[0];
      if (!b) return fail(res, 'ERR_VAL', 'no such event');
      return send(res, 200, { payoutMultiplier: Number(b.payoutMultiplier), costMultiplier: costs[m] ?? 1, state: b.events, game, version, mode: m });
    }
    if (req.method !== 'POST') return send(res, 404, { error: 'not found' });
    if (p === '/wallet/authenticate') {
      if (!body.sessionID) return fail(res, 'ERR_VAL', 'sessionID required');
      return send(res, 200, { balance: bal(), config: S.config, round: roundOut(S.round) || undefined });
    }
    if (p === '/wallet/balance') return send(res, 200, { balance: bal() });
    if (p === '/wallet/play') {
      const amount = Number(body.amount); const mode = String(body.mode || 'base').toLowerCase();
      if (!body.sessionID || !Number.isFinite(amount) || amount <= 0 || !(mode in costs)) return fail(res, 'ERR_VAL', 'bad play request');
      if (S.round?.active) return fail(res, 'ERR_ACT', 'round already active');
      const debit = amount * costs[mode];
      if (S.balance < debit) return fail(res, 'ERR_IPB', 'insufficient balance');
      S.balance -= debit;
      const { book, mode: m } = pickBook(mode, amount);
      const r = makeRound(book, m, amount);
      S.round = r; // 0x round closed server-side (active:false)
      return send(res, 200, { balance: bal(), round: roundOut(r) });
    }
    if (p === '/wallet/end-round') {
      if (!S.round?.active) return fail(res, 'ERR_VAL', 'no active round');
      if (S.keepActive) return send(res, 200, { balance: bal() }); // "do not close": round stays active
      S.balance += S.round.payout; S.round = { ...S.round, active: false };
      return send(res, 200, { balance: bal() });
    }
    if (p === '/bet/event') return send(res, 200, { event: body.event ?? null });
    return send(res, 404, { error: 'not found' });
  } catch (e) { return fail(res, 'ERR_GEN', e.message); }
});
server.listen(PORT, () => console.log(`mock RGS http://localhost:${PORT} (books: ${bookSource}, base=${books.base.length} bonus=${books.bonus.length})`));
