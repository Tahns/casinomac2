// Boot + state machine: booting -> authenticating -> idle -> betting -> playing -> settling -> idle
import { params } from './params.js';
import { formatMoney, formatAmount, currencyMeta, MICRO } from './money.js';
import { createBetState, modeCost, unleashMinPrice, unleashAvailable } from './bet.js';
import { checkPlay, shouldEndRound, needsConfirm, spaceAction, createAutoplay } from './input.js';
import * as rgs from './rgs.js';
import * as i18n from './i18n/index.js';
import { audio } from './audio.js';
import { settings } from './settings.js';
import { createRenderer } from './render/index.js';

const $ = (id) => document.getElementById(id);
const t = i18n.t;
async function tryImport(p) { try { return await import(p); } catch (e) { return null; } }

const S = {
  state: 'booting', balance: 0, currency: params.currency || 'USD', config: null, bet: null,
  mode: 'base', turbo: false, muted: !!audio.muted, renderer: null, audio, autoplay: createAutoplay(), lastRound: null,
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
  ['btn-bet', 'btn-bet-minus', 'btn-bet-plus'].forEach((id) => { const e = $(id); if (e) e.disabled = !idle; });
  updateUnleashButton();
  updateBetButtons();
  const ap = $('btn-autoplay'); if (ap) ap.disabled = !(idle || S.autoplay.active);
}
function setText(id, v) { const e = $(id); if (e) { e.textContent = v; if (e.classList.contains('val')) fitText(e); } }
// Shrink long money strings to fit their panel (keeps the symbol; never ellipsized unless extreme).
function fitText(e) {
  e.style.fontSize = '';
  if (!e.clientWidth) return;
  let fs = parseFloat(getComputedStyle(e).fontSize) || 14;
  const min = fs * 0.55;
  while (e.scrollWidth > e.clientWidth + 0.5 && fs > min) { fs *= 0.94; e.style.fontSize = fs.toFixed(1) + 'px'; }
}
function fitAll() { ['balance', 'bet', 'win'].forEach((id) => { const e = $(id); if (e) fitText(e); }); }
function renderBalance() { setText('balance', fm(S.balance)); }
function updateRendererFormat() {
  if (!(S.renderer && S.renderer.setFormat && S.bet)) return;
  const b = S.bet.bet;
  const unit = Math.pow(10, 6 - currencyMeta(S.currency).decimals); // minor unit in micro-units
  // count-up frames show whole minor units (no 6-decimal flicker); final amounts stay exact
  S.renderer.setFormat((x) => fm(Math.round((Number(x) || 0) * b)), (x) => fm(Math.round(Math.round((Number(x) || 0) * b) / unit) * unit));
}
function unleashOk() { return !!S.bet && unleashAvailable(S.bet.bet, S.currency); }
function updateUnleashButton() {
  const btn = $('btn-unleash'); if (!btn) return;
  const ok = unleashOk();
  btn.disabled = !(S.state === 'idle' && ok);
  btn.classList.toggle('below-min', !ok);
  const u = $('unleash-cost');
  if (u && S.bet) u.textContent = ok ? fm(S.bet.cost('bonus')) : t('unleash.from', { min: fm(unleashMinPrice(S.currency)) });
}
function renderBet() { setText('bet', fm(S.bet.bet)); updateUnleashButton(); updateBetButtons(); updateRendererFormat(); }
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
const BEHIND = ['game', 'hud-info', 'hud-ctrl', 'logo-area'];
function syncInert() {
  const on = modalOpen();
  BEHIND.forEach((id) => { const e = $(id); if (!e) return; if (on) e.setAttribute('inert', ''); else e.removeAttribute('inert'); });
}
function openModal(el) { if (el) { el.hidden = false; el.classList.add('open'); syncInert(); } }
function closeModal(el) { if (el) { el.hidden = true; el.classList.remove('open'); syncInert(); } }
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
  S.autoplay.stop();
  const kind = (err && err.code && ({ ERR_AUTH: 'auth', ERR_IS: 'session', ERR_ATE: 'session', ERR_LOC: 'session', ERR_MAINTENANCE: 'maintenance' }[err.code])) || 'connection';
  // Unrecoverable: the dialog stays; its button reloads the game.
  const m = $('modal-message'), ok = $('message-ok');
  setText('message-text', t('err.' + kind)); openModal(m);
  if (ok) { ok.textContent = t('btn.reload'); ok.addEventListener('click', () => location.reload(), { once: true }); }
  return new Promise(() => {});
}

// ---- win/play flow
function hooks() {
  return {
    // WIN shows the running total. In free spins setWin/tumble amounts are per spin, so only totals are shown there.
    onTotal: (v) => renderWin(multToMicro(v)),
    onWin: (v) => { if (!S.inFs) renderWin(multToMicro(v)); },
    onFreeSpinCounter: (cur, total) => { S.inFs = !!total; setText('freespin-counter', total ? `${cur}/${total}` : ''); },
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
  S.inFs = false;
  if (S.renderer && S.renderer.setCost) S.renderer.setCost(modeCost(mode));
  renderWin(0);
  let res;
  try { res = await rgs.play(S.bet.bet, mode); }
  catch (e) {
    S.autoplay.stop(); syncAutoplayUI();
    // The request may have been processed without its answer reaching us (lost response / server error /
    // expired session): the round state is unknown, so the player must reload to finish any open round.
    if (!e.code || ['ERR_CONN', 'ERR_TIMEOUT', 'ERR_GEN', 'ERR_IS', 'ERR_ATE', 'ERR_LOC', 'ERR_MAINTENANCE'].includes(e.code)) { await fatal(e); return false; }
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
  if (S.state !== 'idle' || S.autoplay.active || modalOpen()) return;
  await playRound('base');
}
async function onUnleash() {
  if (S.state !== 'idle' || modalOpen() || S.autoplay.active || S.noBuy) return;
  if (!unleashOk()) { await showMessage(t('unleash.minPrice', { min: fm(unleashMinPrice(S.currency)) })); return; }
  const cost = S.bet.cost('bonus');
  const chk = checkPlay(S.balance, S.bet.bet, 'bonus');
  if (!chk.ok) { await showMessage(t('err.insufficient', { cost: fm(cost) })); return; }
  if (needsConfirm(modeCost('bonus'))) {
    const ok = await confirmDialog(t('unleash.title'), t('unleash.confirm', { cost: fm(cost) }));
    if (!ok || S.state !== 'idle' || S.autoplay.active) return;
    if (S.bet.cost('bonus') !== cost || !unleashOk()) return; // the stated cost must be the cost that is played
  }
  try { if (S.renderer && S.renderer.mascot) { S.renderer.mascot.pose('plunger', 1600); S.renderer.mascot.say('mascot.fs', 2000, true); } } catch (e) { /* ignore */ }
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
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', (ev) => { try { audio.play('click'); } catch (x) { /* ignore */ } return fn(ev); }); };
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
  on('btn-menu', () => {
    const c = $('hud-ctrl'); if (!c) return;
    const open = c.classList.toggle('menu-open');
    const b = $('btn-menu'); if (b) b.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (ev) => {
    const c = $('hud-ctrl'); if (!c || !c.classList.contains('menu-open')) return;
    const keep = ev.target && ev.target.closest && (ev.target.closest('#btn-menu') || (ev.target.closest('.tools') && ev.target.closest('#btn-sound')));
    if (keep) return;
    c.classList.remove('menu-open'); const b = $('btn-menu'); if (b) b.setAttribute('aria-expanded', 'false');
  });
  on('btn-info', async () => {
    const r = await tryImport('./rules.js');
    const fn = r && (r.openRules || r.showRules || r.default);
    if (typeof fn === 'function') fn({ currency: S.currency, social: params.social, formatMoney: fm });
  });
  on('btn-fullscreen', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    } catch (e) { /* ignore */ }
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (params.replay || !S.bet || S.noSpace) return;
    e.preventDefault();
    if (e.repeat) return;
    if (spaceAction({ state: S.state, modalOpen: modalOpen() }) === 'spin' && !S.autoplay.active) onSpin();
  });
  // any dialog (also the rules opened by rules.js) makes the UI behind it inert
  try { const mo = new MutationObserver(syncInert); document.querySelectorAll('.modal').forEach((m) => mo.observe(m, { attributes: true, attributeFilter: ['class', 'hidden'] })); } catch (e) { /* ignore */ }
  window.addEventListener('resize', () => { fitAll(); if (S.renderer && S.renderer.resize) S.renderer.resize(); });
}

function applyI18n() { i18n.applyI18n(document); }

async function boot() {
  setState('booting');
  document.documentElement.lang = 'en'; // only English text is shipped; unknown/other langs fall back to English
  applyI18n();
  const root = $('game') || $('stage') || document.body;
  S.renderer = createRenderer(root);
  S.renderer.setTurbo(S.turbo);
  bindUI();

  if (params.replay) {
    // Replay mode: no wallet calls at all (not even authenticate).
    const rp = await tryImport('./replay.js');
    if (rp && rp.startReplay) { setState('idle'); return rp.startReplay({ renderer: S.renderer, formatMoney: fm, rgs, params }); }
    return showMessage(t('err.generic'));
  }

  if (!params.sessionID || !params.rgsUrl) { setState('error'); return showMessage(t('err.noParams')); }
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
  try { settings.applyJurisdiction(fs); } catch (e) { /* ignore */ } // v2: capabilities for the settings store (WP1 builds the UI on them)
  if (fs) {
    if (fs.disabledFullscreen && $('btn-fullscreen')) $('btn-fullscreen').hidden = true;
    if (fs.disabledTurbo && $('btn-turbo')) $('btn-turbo').hidden = true;
    if (fs.disabledSpacebar) S.noSpace = true;
    if (fs.disabledAutoplay && $('btn-autoplay')) { $('btn-autoplay').hidden = true; $('btn-autoplay').disabled = true; }
    if (fs.disabledBuyFeature) { S.noBuy = true; ['btn-unleash'].forEach((id) => { const e = $(id); if (e) { e.hidden = true; e.disabled = true; } }); }
    if (fs.socialCasino && !params.social) { try { params.social = true; i18n.setSocial(true); applyI18n(); renderBalance(); renderBet(); renderWin(0); } catch (e) { /* ignore */ } }
  }
  setState('idle');

  // Resume an unfinished round: replay its state events, then end-round if paid.
  const r = auth.round;
  if (r && r.active) {
    setState('playing');
    if (S.renderer && S.renderer.setCost) S.renderer.setCost(modeCost(String(r.mode || 'base').toLowerCase()));
    try { await runEvents(r); } catch (e) { console.error(e); }
    try { await settle(r); } catch (e) { return fatal(e); }
    setState('idle');
  }
}

boot().catch((e) => { console.error(e); try { fatal(e); } catch (x) { /* ignore */ } });
export { S as _state };
