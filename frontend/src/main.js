// Boot + state machine: booting -> authenticating -> idle -> betting -> playing -> settling -> idle
import { params } from './params.js';
import { formatMoney, formatAmount, MICRO } from './money.js';
import { createBetState, modeCost } from './bet.js';
import { checkPlay, shouldEndRound, needsConfirm, spaceAction, createAutoplay } from './input.js';
import * as rgs from './rgs.js';

const $ = (id) => document.getElementById(id);
const FALLBACK_TEXT = {
  'err.insufficient': 'Insufficient balance for this play.', 'err.connection': 'Connection error. Please reload the game.',
  'err.auth': 'Authentication failed. Please reload the game.', 'err.limit': 'Limit exceeded.',
  'err.generic': 'Something went wrong. Please try again.', 'err.retry': 'Please try again in a moment.',
  'err.validation': 'Invalid request.', 'err.session': 'Session expired. Please reload the game.',
};
let t = (k, v) => (FALLBACK_TEXT[k] || '').replace(/\{(\w+)\}/g, (m, n) => (v && v[n] != null ? v[n] : m));
async function tryImport(p) { try { return await import(p); } catch (e) { return null; } }

const S = {
  state: 'booting', balance: 0, currency: params.currency || 'USD', config: null, bet: null,
  mode: 'base', turbo: false, muted: false, renderer: null, audio: null, autoplay: createAutoplay(), lastRound: null,
};
const fm = (micro) => formatMoney(micro, S.currency, { social: params.social });

function setState(s) {
  S.state = s;
  const b = document.body;
  if (b) {
    [...b.classList].filter((c) => c.startsWith('state-')).forEach((c) => b.classList.remove(c));
    b.classList.add('state-' + s);
  }
  const idle = s === 'idle';
  ['btn-bet', 'btn-bet-minus', 'btn-bet-plus', 'btn-unleash'].forEach((id) => { const e = $(id); if (e) e.disabled = !idle; });
  updateBetButtons();
  const ap = $('btn-autoplay'); if (ap) ap.disabled = !(idle || S.autoplay.active);
}
function setText(id, v) { const e = $(id); if (e) e.textContent = v; }
function renderBalance() { setText('balance', fm(S.balance)); }
function renderBet() { setText('bet', fm(S.bet.bet)); const u = $('unleash-cost'); if (u) u.textContent = fm(S.bet.cost('bonus')); updateBetButtons(); }
function renderWin(micro) { setText('win', fm(micro || 0)); }
function updateBetButtons() {
  if (!S.bet) return;
  const idle = S.state === 'idle';
  const m = $('btn-bet-minus'), p = $('btn-bet-plus');
  if (m) m.disabled = !idle || !S.bet.canDown();
  if (p) p.disabled = !idle || !S.bet.canUp();
}
function setBalance(b) { if (b && typeof b.amount === 'number') { S.balance = b.amount; if (b.currency && !params.currency) S.currency = b.currency; renderBalance(); renderBet(); } }

// ---- modals
function modalOpen() { return !!document.querySelector('.modal.open'); }
function openModal(el) { if (el) { el.hidden = false; el.classList.add('open'); } }
function closeModal(el) { if (el) { el.hidden = true; el.classList.remove('open'); } }
function showMessage(text) {
  return new Promise((res) => {
    const m = $('modal-message'); if (!m) { res(); return; }
    setText('message-text', text); openModal(m);
    const ok = $('message-ok');
    const done = () => { closeModal(m); if (ok) ok.removeEventListener('click', done); res(); };
    if (ok) ok.addEventListener('click', done);
  });
}
function confirmDialog(title, text) {
  return new Promise((res) => {
    const m = $('modal-confirm'); if (!m) { res(false); return; }
    setText('confirm-title', title); setText('confirm-text', text); openModal(m);
    const ok = $('confirm-ok'), no = $('confirm-cancel');
    const fin = (v) => { closeModal(m); ok && ok.removeEventListener('click', yes); no && no.removeEventListener('click', nope); res(v); };
    const yes = () => fin(true), nope = () => fin(false);
    ok && ok.addEventListener('click', yes); no && no.addEventListener('click', nope);
  });
}
function fatal(err) {
  setState('error');
  const kind = err && err.code ? ({ ERR_AUTH: 'auth', ERR_IS: 'session', ERR_ATE: 'session' }[err.code] || (err.code === 'ERR_CONN' || err.code === 'ERR_TIMEOUT' ? 'connection' : 'generic')) : 'connection';
  return showMessage(t('err.' + kind));
}

// ---- win/play flow
function hooks() {
  return {
    onTotal: (v) => renderWin(multToMicro(v)),
    onWin: (v) => renderWin(multToMicro(v)),
    onFreeSpinCounter: (cur, total) => setText('freespin-counter', total ? `${cur}/${total}` : ''),
  };
}
// Renderer reports win as a multiplier of the base bet.
function multToMicro(x) { return Math.round((Number(x) || 0) * S.bet.bet); }

async function runEvents(round) {
  if (S.renderer && round && round.state) await S.renderer.playBook(round.state, hooks());
}

async function settle(round) {
  setState('settling');
  if (shouldEndRound(round)) {
    const r = await rgs.endRound();
    setBalance(r.balance);
  }
  if (round && round.payout != null) renderWin(round.payout);
  S.lastRound = round;
}

async function playRound(mode) {
  if (S.state !== 'idle') return false;
  const chk = checkPlay(S.balance, S.bet.bet, mode);
  if (!chk.ok) {
    S.autoplay.stop(); syncAutoplayUI();
    await showMessage(t('err.insufficient', { cost: fm(chk.cost) }));
    return false;
  }
  setState('betting');
  renderWin(0);
  let res;
  try { res = await rgs.play(S.bet.bet, mode); }
  catch (e) {
    S.autoplay.stop(); syncAutoplayUI();
    setState('idle');
    const key = e.code === 'ERR_IPB' ? 'insufficient' : ({ ERR_VAL: 'validation', ERR_GLE: 'limit', ERR_ACT: 'retry' }[e.code] || (e.code === 'ERR_CONN' || e.code === 'ERR_TIMEOUT' ? 'connection' : 'generic'));
    await showMessage(t('err.' + key, { cost: fm(chk.cost) }));
    try { setBalance((await rgs.balance()).balance); } catch (x) { /* ignore */ }
    return false;
  }
  setBalance(res.balance);
  const round = res.round;
  setState('playing');
  try { await runEvents(round); }
  catch (e) { console.error('render error', e); }
  try { await settle(round); }
  catch (e) { S.autoplay.stop(); await fatal(e); return false; }
  setState('idle');
  return true;
}

async function autoplayLoop() {
  while (S.autoplay.active) {
    const ok = await playRound('base');
    if (!ok) { S.autoplay.stop(); break; }
    S.autoplay.afterRound({ balance: S.balance, round: S.lastRound });
    syncAutoplayUI();
    if (S.autoplay.active) await new Promise((r) => setTimeout(r, S.turbo ? 150 : 500));
  }
  syncAutoplayUI();
}
function syncAutoplayUI() {
  const b = document.body; if (b) b.classList.toggle('autoplay', S.autoplay.active);
  setText('autoplay-left', S.autoplay.active ? String(S.autoplay.remaining) : '');
  const ap = $('btn-autoplay'); if (ap) ap.setAttribute('aria-pressed', String(S.autoplay.active));
}

async function onSpin() {
  if (S.state !== 'idle' || S.autoplay.active) return;
  await playRound('base');
}
async function onUnleash() {
  if (S.state !== 'idle' || modalOpen()) return;
  const cost = S.bet.cost('bonus');
  const chk = checkPlay(S.balance, S.bet.bet, 'bonus');
  if (!chk.ok) { await showMessage(t('err.insufficient', { cost: fm(cost) })); return; }
  if (needsConfirm(modeCost('bonus'))) {
    const ok = await confirmDialog(t('unleash.title'), t('unleash.confirm', { cost: fm(cost) }));
    if (!ok) return;
  }
  await playRound('bonus');
}
function onAutoplayButton() {
  if (S.autoplay.active) { S.autoplay.stop(); syncAutoplayUI(); return; }
  if (S.state !== 'idle' || modalOpen()) return;
  openModal($('modal-autoplay'));
}
function onAutoplayConfirm() {
  const num = (id, d) => { const e = $(id); return e && e.value !== '' ? Number(e.value) : d; };
  const chk = (id) => { const e = $(id); return !!(e && e.checked); };
  closeModal($('modal-autoplay'));
  S.autoplay.start({
    count: num('ap-count', 10), stopBigWin: chk('ap-stop-bigwin'), stopFeature: chk('ap-stop-feature'),
    stopBelow: Math.round(num('ap-stop-below', 0) * MICRO),
  });
  syncAutoplayUI();
  autoplayLoop();
}

function bindUI() {
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
  on('btn-bet', onSpin);
  on('btn-bet-minus', () => { if (S.state === 'idle') { S.bet.down(); renderBet(); } });
  on('btn-bet-plus', () => { if (S.state === 'idle') { S.bet.up(); renderBet(); } });
  on('btn-unleash', onUnleash);
  on('btn-autoplay', onAutoplayButton);
  on('ap-confirm', onAutoplayConfirm);
  on('ap-cancel', () => closeModal($('modal-autoplay')));
  on('btn-turbo', () => {
    S.turbo = !S.turbo; document.body.classList.toggle('turbo', S.turbo);
    const b = $('btn-turbo'); if (b) b.setAttribute('aria-pressed', String(S.turbo));
    if (S.renderer && S.renderer.setTurbo) S.renderer.setTurbo(S.turbo);
  });
  on('btn-sound', () => {
    S.muted = !S.muted; document.body.classList.toggle('muted', S.muted);
    const b = $('btn-sound'); if (b) b.setAttribute('aria-pressed', String(S.muted));
    if (S.audio && S.audio.setMuted) S.audio.setMuted(S.muted);
  });
  on('btn-info', async () => {
    const r = await tryImport('./rules.js');
    const fn = r && (r.openRules || r.showRules || r.default);
    if (typeof fn === 'function') fn();
  });
  on('btn-fullscreen', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    } catch (e) { /* ignore */ }
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (spaceAction({ state: S.state, modalOpen: modalOpen() }) === 'spin' && !S.autoplay.active) onSpin();
  });
  window.addEventListener('resize', () => S.renderer && S.renderer.resize && S.renderer.resize());
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-title]').forEach((e) => { const v = t(e.getAttribute('data-i18n-title')); e.title = v; e.setAttribute('aria-label', v); });
}

async function boot() {
  setState('booting');
  const i18n = await tryImport('./i18n/index.js');
  if (i18n && typeof i18n.t === 'function') t = i18n.t;
  document.documentElement.lang = params.lang;
  applyI18n();
  const aud = await tryImport('./audio.js');
  S.audio = aud && aud.audio;
  const rend = await tryImport('./render/index.js');
  const root = $('game') || $('stage') || document.body;
  if (rend && rend.createRenderer) S.renderer = rend.createRenderer(root);
  bindUI();

  if (params.replay) {
    // Replay mode: no wallet calls at all (not even authenticate).
    const rp = await tryImport('./replay.js');
    if (rp && rp.startReplay) { setState('idle'); return rp.startReplay({ renderer: S.renderer, formatMoney: fm, rgs, params }); }
    return showMessage(t('err.generic'));
  }

  setState('authenticating');
  let auth;
  try { auth = await rgs.authenticate(); }
  catch (e) { return fatal(e); } // never continue as connected
  S.config = auth.config;
  S.currency = params.currency || (auth.balance && auth.balance.currency) || 'USD';
  S.bet = createBetState(auth.config, auth.round);
  setBalance(auth.balance);
  renderBet(); renderWin(0);
  const fs = auth.config && auth.config.jurisdiction;
  if (fs) {
    if (fs.disabledFullscreen && $('btn-fullscreen')) $('btn-fullscreen').hidden = true;
    if (fs.disabledTurbo && $('btn-turbo')) $('btn-turbo').hidden = true;
  }
  setState('idle');

  // Resume an unfinished round: replay its state events, then end-round if paid.
  const r = auth.round;
  if (r && r.active) {
    setState('playing');
    try { await runEvents(r); } catch (e) { console.error(e); }
    try { await settle(r); } catch (e) { return fatal(e); }
    setState('idle');
  }
}

boot().catch((e) => { console.error(e); try { fatal(e); } catch (x) { /* ignore */ } });
export { S as _state };
