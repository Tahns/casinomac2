// Boot + state machine: booting -> authenticating -> idle -> betting -> playing -> settling -> idle
import { params } from './params.js';
import { formatMoney, formatAmount, currencyMeta, MICRO } from './money.js';
import { createBetState, modeCost, unleashMinPrice, unleashAvailable } from './bet.js';
import { checkPlay, shouldEndRound, needsConfirm, spaceDecision, createAutoplay, createPacer } from './input.js';
import * as rgs from './rgs.js';
import * as i18n from './i18n/index.js';
import { audio } from './audio.js';
import { settings } from './settings.js';
import { createRenderer } from './render/index.js';
// v2 shell (WP1)
import { createLedger, createLedgerView } from './ui/ledger.js';
import { createSettingsDialog } from './ui/settings_dialog.js';
import { availableDoors, renderDoors } from './ui/doors.js';
import { initHeroineShell } from './ui/heroine_shell.js';
import { trapTab, focusables, focusFirst } from './ui/dom.js';

const $ = (id) => document.getElementById(id);
const t = i18n.t;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tryImport(p) { try { return await import(p); } catch (e) { return null; } }

const S = {
  state: 'booting', balance: 0, currency: params.currency || 'USD', config: null, bet: null,
  mode: 'base', turbo: false, muted: !!audio.muted, renderer: null, audio, autoplay: createAutoplay(), lastRound: null,
  ledger: createLedger(), pacer: createPacer(), rulesData: null,
};
const fm = (micro) => formatMoney(micro, S.currency, { social: params.social });
let ledgerView = null, settingsDialog = null;

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
function fitAll() { ['balance', 'bet', 'win'].forEach((id) => { const e = $(id); if (e) fitText(e); }); if (ledgerView) ledgerView.render(); }
function renderBalance() { setText('balance', fm(S.balance)); if (ledgerView) ledgerView.render(); }
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
  btn.disabled = !(S.state === 'idle' && ok) || !!S.noBuy; // noBuy: jurisdiction disabledBuyFeature
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
// Every dialog: the UI behind it is inert, focus moves in when it opens and returns to the control that opened it when it
// closes (the opener is the last button activated, or the one passed to openModal), Escape closes settings / autoplay /
// confirm, Tab wraps inside the open dialog. Rules (src/rules.js) opens #modal-info by itself: the observer below covers it.
const OPENERS = new Map();
const WAS_OPEN = new WeakMap();
let lastTrigger = null;
function modalOpen() { return !!document.querySelector('.modal.open'); }
const BEHIND = ['game', 'hud-info', 'hud-ctrl', 'logo-area', 'replay-bar', 'replay-ui'];
function syncInert() {
  const on = modalOpen();
  BEHIND.forEach((id) => { const e = $(id); if (!e) return; if (on) e.setAttribute('inert', ''); else e.removeAttribute('inert'); });
}
function focusInto(m) {
  if (!m || m.contains(document.activeElement)) return;
  focusFirst([m.querySelector('[data-autofocus]'), ...focusables(m)]);
}
function returnFocus(op) {
  // the opener may be gone, hidden (menu popup closed) or disabled (round running): fall back to the menu, then to SPIN
  focusFirst([op, $('btn-menu'), $('btn-bet')]);
}
function openModal(el, opener) {
  if (!el) return;
  if (!OPENERS.has(el)) OPENERS.set(el, opener || lastTrigger || document.activeElement);
  el.hidden = false; el.classList.add('open'); syncInert();
  focusInto(el);
}
function closeModal(el) {
  if (!el) return;
  el.hidden = true; el.classList.remove('open'); syncInert();
  noteClosed(el);
}
function noteClosed(el) {
  if (!WAS_OPEN.get(el)) { OPENERS.delete(el); return; }
  WAS_OPEN.set(el, false);
  const op = OPENERS.get(el); OPENERS.delete(el);
  returnFocus(op);
}
function onModalMutation(records) {
  syncInert();
  for (const m of new Set(records.map((r) => r.target))) {
    const open = m.classList.contains('open') && !m.hidden;
    const was = !!WAS_OPEN.get(m);
    if (open && !was) { WAS_OPEN.set(m, true); if (!OPENERS.has(m)) OPENERS.set(m, lastTrigger); }
    else if (!open && was) noteClosed(m);
  }
}
function showMessage(text) {
  return new Promise((res) => {
    const m = $('modal-message'); if (!m) { res(); return; }
    setText('message-text', text); openModal(m);
    const ok = $('message-ok');
    const done = () => { closeModal(m); if (ok) ok.removeEventListener('click', done); res(); };
    if (ok) ok.addEventListener('click', done);
  });
}
// The Secret Entrance confirm dialog (Engine [31]): the real cost is stated, the focus starts on CANCEL, nothing is
// pre-selected (with several doors CONFIRM stays off until one is chosen), no countdown. Resolves the chosen mode or null.
function confirmDoors(doors) {
  return new Promise((res) => {
    const m = $('modal-confirm'); if (!m) { res(null); return; }
    const host = $('door-cards'), hint = $('door-hint'), ok = $('confirm-ok'), no = $('confirm-cancel');
    const costs = doors.map((d) => S.bet.cost(d.mode));
    const same = costs.every((c) => c === costs[0]);
    setText('confirm-title', t('unleash.title'));
    setText('confirm-text', same ? t('unleash.confirm', { cost: fm(costs[0]) }) : t('unleash.chooseText'));
    const view = renderDoors(host, doors, { t, costText: (d) => t('door.cost', { cost: fm(S.bet.cost(d.mode)) }) });
    const many = view.count > 1;
    host.hidden = false; hint.hidden = !many;
    ok.disabled = many;
    view.onChange(() => { ok.disabled = false; hint.hidden = true; });
    const single = doors[0] ? doors[0].mode : 'bonus';
    const fin = (v) => { closeModal(m); host.hidden = true; host.textContent = ''; hint.hidden = true; ok.disabled = false; ok.removeEventListener('click', yes); no.removeEventListener('click', nope); res(v); };
    const yes = () => { const v = many ? view.selected : single; if (v) fin(v); };
    const nope = () => fin(null);
    ok.addEventListener('click', yes); no.addEventListener('click', nope);
    openModal(m);
    no.focus({ preventScroll: true }); // [31]: the safe answer has the focus
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

// ---- jurisdiction capabilities (all 12 flags, src/settings.js): what the shell shows or hides
function applyCaps() {
  const caps = settings.capabilities;
  const hide = (id, off) => { const e = $(id); if (!e) return; e.hidden = off; if (off) e.disabled = true; };
  hide('btn-fullscreen', !caps.fullscreen);
  if (!params.replay) {
    hide('btn-turbo', !caps.turbo);
    hide('btn-autoplay', !caps.autoplay);
    hide('btn-unleash', !caps.buyFeature);
    S.noBuy = !caps.buyFeature;
    if (!caps.turbo && S.turbo) setTurbo(false);
    if (!caps.autoplay && S.autoplay.active) { S.autoplay.stop(); syncAutoplayUI(); }
    setState(S.state);
  }
  const b = document.body;
  if (b) for (const [k, off] of [['turbo', !caps.turbo], ['autoplay', !caps.autoplay], ['buy', !caps.buyFeature], ['fullscreen', !caps.fullscreen], ['space', !caps.spacebar], ['slam', !caps.slamstop]]) b.classList.toggle('no-' + k, off);
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

// session ledger: cost and return of a finished round (a round resumed after a reload is not counted)
function recordLedger(round, cost) {
  if (!round) return;
  const p = Number(round.payout);
  const payout = Number.isFinite(p) ? p : Math.round((Number(round.payoutMultiplier) || 0) * (Number(round.amount) || 0));
  S.ledger.addRound({ cost, payout });
}
// jurisdiction `minimumRoundDuration`: the next round never starts before t0 + minimum, turbo and autoplay included
async function holdMinRound() {
  const caps = settings.capabilities;
  if (caps.minRound && S.pacer.remaining(caps.minRoundMs) > 0) await S.pacer.wait(caps.minRoundMs);
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
  S.pacer.begin();
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
  try { recordLedger(round, chk.cost); } catch (e) { /* the ledger never breaks a round */ }
  await holdMinRound();
  setState('idle');
  return true;
}

async function autoplayLoop() {
  while (S.autoplay.active) {
    while (modalOpen() && S.autoplay.active) await sleep(120); // nothing starts behind an open dialog
    if (!S.autoplay.active) break;
    const ok = await playRound('base');
    if (!ok) { S.autoplay.stop(); break; }
    S.autoplay.afterRound({ balance: S.balance, round: S.lastRound });
    syncAutoplayUI();
    if (S.autoplay.active) await sleep(S.turbo ? 150 : 500);
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
// Doors on offer: Stage Door always; the others only when the rules data lists the mode AND has its shares facts.
async function currentDoors() {
  if (!S.rulesData) {
    const r = await tryImport('./rules.js');
    if (r && r.loadRulesData) S.rulesData = await Promise.race([r.loadRulesData(), sleep(500).then(() => null)]);
  }
  return availableDoors(S.rulesData);
}
async function onUnleash() {
  if (S.state !== 'idle' || modalOpen() || S.autoplay.active || S.noBuy) return;
  if (!unleashOk()) { await showMessage(t('unleash.minPrice', { min: fm(unleashMinPrice(S.currency)) })); return; }
  const cost = S.bet.cost('bonus');
  const chk = checkPlay(S.balance, S.bet.bet, 'bonus');
  if (!chk.ok) { await showMessage(t('err.insufficient', { cost: fm(cost) })); return; }
  let mode = 'bonus';
  if (needsConfirm(modeCost('bonus'))) {
    const doors = await currentDoors();
    if (S.state !== 'idle' || modalOpen() || S.autoplay.active) return;
    const chosen = await confirmDoors(doors);
    if (!chosen || S.state !== 'idle' || S.autoplay.active) return;
    mode = chosen;
    const c2 = checkPlay(S.balance, S.bet.bet, mode);
    if (!c2.ok) { await showMessage(t('err.insufficient', { cost: fm(c2.cost) })); return; }
    if (S.bet.cost('bonus') !== cost || !unleashOk()) return; // the stated cost must be the cost that is played
  }
  try { if (S.renderer && S.renderer.mascot) { S.renderer.mascot.pose('plunger', 1600); S.renderer.mascot.say('mascot.fs', 2000, true); } } catch (e) { /* ignore */ }
  await playRound(mode);
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

// turbo is one switch with several views (button, settings dialog); it is never stored
const turboFns = new Set();
function setTurbo(b) {
  const v = !!b && settings.capabilities.turbo;
  S.turbo = v; document.body.classList.toggle('turbo', v);
  const btn = $('btn-turbo'); if (btn) btn.setAttribute('aria-pressed', String(v));
  if (S.renderer && S.renderer.setTurbo) S.renderer.setTurbo(v);
  for (const f of [...turboFns]) { try { f(v); } catch (e) { /* ignore */ } }
}
function openSettings(opener) {
  if (!settingsDialog || modalOpen()) return;
  settingsDialog.open(opener || $('btn-settings'));
}
// everything the settings dialog needs from the game, behind one object
function settingsHost() {
  return {
    replay: !!params.replay,
    openModal, closeModal,
    getTurbo: () => S.turbo, setTurbo, onTurbo: (fn) => { turboFns.add(fn); return () => turboFns.delete(fn); },
    autoplayState: () => (S.autoplay.active ? 'active' : S.state === 'idle' ? 'ready' : 'busy'),
    openAutoplay: () => { if (S.state !== 'idle') return; settingsDialog.close(); openModal($('modal-autoplay'), $('btn-settings')); },
    stopAutoplay: () => { S.autoplay.stop(); syncAutoplayUI(); },
    ledger: () => S.ledger.snapshot(),
    format: (micro) => fm(micro),
    rulesCtx: () => ({ currency: S.currency, formatMoney: fm }),
  };
}

function bindUI() {
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', (ev) => { try { audio.play('click'); } catch (x) { /* ignore */ } return fn(ev); }); };
  // the control that was activated last is where focus returns when the dialog it opened closes
  document.addEventListener('click', (ev) => { const b = ev.target && ev.target.closest && ev.target.closest('button'); if (b) lastTrigger = b; }, true);
  on('btn-bet', onSpin);
  on('btn-bet-minus', () => { if (S.state === 'idle') { S.bet.down(); renderBet(); } });
  on('btn-bet-plus', () => { if (S.state === 'idle') { S.bet.up(); renderBet(); } });
  on('btn-unleash', onUnleash);
  on('btn-autoplay', onAutoplayButton);
  on('ap-confirm', onAutoplayConfirm);
  on('ap-cancel', () => closeModal($('modal-autoplay')));
  on('btn-turbo', () => setTurbo(!S.turbo));
  // sound button: audio.js is the one source of truth. toggleMute() unmutes, or brings the sliders back when they made the game
  // silent, or mutes; audio.js also writes body.muted and the button's aria-pressed ("silent"), the dialog switch follows its events
  on('btn-sound', () => {
    if (S.audio && typeof S.audio.toggleMute === 'function') S.audio.toggleMute(); else if (S.audio && S.audio.setMuted) S.audio.setMuted(!S.audio.muted);
    S.muted = !!(S.audio && S.audio.muted);
  });
  try { audio.onChange((ev) => { if (ev && ev.type === 'mute') S.muted = !!ev.muted; }); } catch (e) { /* ignore */ }
  on('btn-settings', (ev) => openSettings(ev.currentTarget));
  on('btn-menu', () => {
    const c = $('hud-ctrl'); if (!c) return;
    const open = c.classList.toggle('menu-open');
    const b = $('btn-menu'); if (b) b.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (ev) => {
    const c = $('hud-ctrl'); if (!c || !c.classList.contains('menu-open')) return;
    const keep = ev.target && ev.target.closest && (ev.target.closest('#btn-menu') || (ev.target.closest('.tools') && ev.target.closest('#btn-sound, #btn-settings')));
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
  const isDialogControl = (el) => !!(el && el.closest && el.closest('.modal') && el.closest('button,input,select,textarea,summary,a,[role=tab],[role=switch],[role=radio]'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.querySelector('.modal.open');
      if (!m) return;
      if (m.id === 'modal-settings') { e.preventDefault(); settingsDialog.close(); }
      else if (m.id === 'modal-autoplay') { e.preventDefault(); closeModal(m); }
      else if (m.id === 'modal-confirm') { e.preventDefault(); const c = $('confirm-cancel'); if (c) c.click(); }
      return; // the rules dialog closes itself (src/rules.js)
    }
    if (e.key === 'Tab') { const m = document.querySelector('.modal.open'); if (m) trapTab(e, m); return; }
    if (e.code !== 'Space' && e.key !== ' ') return;
    const d = spaceDecision({
      state: S.state, modalOpen: modalOpen(), replay: params.replay, spacebar: settings.capabilities.spacebar,
      hasBet: !!S.bet, autoplayActive: S.autoplay.active, controlFocused: isDialogControl(e.target), repeat: e.repeat,
    });
    if (d.prevent) e.preventDefault();
    if (d.spin) onSpin();
  });
  // with the spacebar switched off by the jurisdiction a focused SPIN button must not click on Space either
  window.addEventListener('keyup', (e) => {
    if ((e.code !== 'Space' && e.key !== ' ') || params.replay || settings.capabilities.spacebar) return;
    if (e.target && e.target.closest && e.target.closest('#btn-bet, #btn-unleash')) e.preventDefault();
  });
  // any dialog (also the rules opened by rules.js) makes the UI behind it inert and gets its focus handled
  try { const mo = new MutationObserver(onModalMutation); document.querySelectorAll('.modal').forEach((m) => mo.observe(m, { attributes: true, attributeFilter: ['class', 'hidden'] })); } catch (e) { /* ignore */ }
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
  settingsDialog = createSettingsDialog({ el: $('modal-settings'), settings, audio, t, host: settingsHost() });
  ledgerView = createLedgerView({ el: $('ledger'), ledger: S.ledger, settings, t, format: fm, fit: fitText });
  settings.on('capabilities', () => { applyCaps(); if (ledgerView) ledgerView.render(); });
  applyCaps();
  try { initHeroineShell({ settings }); } catch (e) { console.error('heroine shell', e); }
  bindUI();

  if (params.replay) {
    // Replay mode: no wallet calls at all (not even authenticate).
    const rp = await tryImport('./replay.js');
    if (rp && rp.startReplay) { setState('idle'); return rp.startReplay({ renderer: S.renderer, formatMoney: fm, rgs, params, openSettings }); }
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
  // all 12 jurisdiction flags become capabilities (settings.js); the listener above applies them to the shell
  try { settings.applyJurisdiction(auth.config && auth.config.jurisdiction); } catch (e) { /* ignore */ }
  applyCaps();
  if (settings.capabilities.social && !params.social) {
    try { params.social = true; i18n.setSocial(true); applyI18n(); if (settingsDialog) settingsDialog.rebuild(); renderBalance(); renderBet(); renderWin(0); } catch (e) { /* ignore */ }
  }
  setState('idle');
  // the rules data (also the door facts) is fetched once, after the game is up
  tryImport('./rules.js').then((r) => { if (r && r.loadRulesData) return r.loadRulesData().then((d) => { S.rulesData = d; }); }).catch(() => {});

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
