// Replay mode: no wallet calls, no betting UI. Exports startReplay().
import { t, isSocial, applyI18n } from './i18n/index.js';
import { params } from './params.js';
import { fetchReplay } from './rgs.js';
import { formatMoney as defaultFormatMoney } from './money.js';
import { settings } from './settings.js';

const MICRO = 1_000_000;
const HIDE = ['#btn-bet', '#btn-bet-minus', '#btn-bet-plus', '#btn-autoplay', '#btn-unleash', '#btn-menu', '#btn-turbo', '#btn-settings', '#ledger',
  '#modal-autoplay', '#modal-confirm', '.bet-controls', '.hud-bet', '#unleash-cost'];

// Charter look (display font, 3 px ink border, hard ink shadow, palette tokens). The bar is docked in the control column
// (#hud-ctrl: right column in landscape, bottom row in portrait), so it takes its own room and never covers the board.
const STYLE = `
body.replay #replay-ui{order:-1;flex:0 0 100%;display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:0;max-width:100%;margin:0;padding:0;color:var(--ink);text-align:center;box-sizing:border-box;font-family:var(--ui)}
body.replay #replay-ui .rp-line{padding:4px 6px;border:3px solid var(--ink);border-radius:10px;background:var(--cream);box-shadow:3px 3px 0 var(--ink);font-weight:800;font-size:clamp(10px,1.7vh,13px);line-height:1.25;white-space:normal;overflow-wrap:anywhere}
body.replay #replay-ui .rp-btns{display:flex;flex-direction:column;gap:7px}
body.replay #replay-ui .rp-btn{min-height:34px;padding:5px 10px;border:3px solid var(--ink);border-radius:999px;font-family:var(--disp);font-weight:400;letter-spacing:.05em;font-size:clamp(12px,2.2vh,17px);color:var(--ink);background:var(--cream);box-shadow:3px 4px 0 var(--ink);cursor:pointer}
body.replay #replay-ui .rp-btn:active:not([disabled]){transform:translate(3px,4px);box-shadow:0 0 0 var(--ink)}
body.replay #replay-ui .rp-btn[disabled]{opacity:.5;cursor:default;box-shadow:none}
body.replay #replay-btn{background:var(--lemon)}
body.replay #replay-turbo[aria-pressed="true"]{background:var(--coral);color:var(--cream)}
body.replay #replay-ui .rp-gear{align-self:center}
body.replay #replay-ui .rp-win{padding:3px 6px;border:3px solid var(--ink);border-radius:10px;background:var(--cream);box-shadow:3px 3px 0 var(--coral),3px 3px 0 2px var(--ink);font-family:var(--num);font-weight:900;font-size:clamp(11px,2vh,16px);color:var(--coral-dk)}
body.replay #replay-ui .rp-win:empty{display:none}
body.replay #replay-ui .rp-msg{font-weight:800;font-size:clamp(10px,1.7vh,13px);color:var(--cream);text-shadow:1px 1px 0 var(--ink)}
body.replay #replay-ui .rp-msg:empty{display:none}
body.replay .rp-badge{position:absolute;top:4px;left:6px;z-index:50;padding:1px 8px;border:2px solid var(--ink);border-radius:8px;background:var(--lemon);color:var(--ink);font-family:var(--disp);font-size:11px;letter-spacing:.08em;box-shadow:2px 2px 0 var(--ink)}
@media (max-aspect-ratio:11/10){
  body.replay #replay-ui{flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 8px}
  body.replay #replay-ui .rp-line{flex:1 1 100%}
  body.replay #replay-ui .rp-btns{flex-direction:row;gap:8px}
  body.replay #replay-ui .rp-win{flex:0 1 auto}
  body.replay #replay-ui .rp-msg{flex:1 1 100%}
}
@media (orientation:landscape) and (max-height:360px){
  body.replay #replay-ui{gap:4px}
  body.replay #replay-ui .rp-line{padding:1px 3px;border-width:2px;font-size:8px;line-height:1.15;box-shadow:2px 2px 0 var(--ink)}
  body.replay #replay-ui .rp-btns{gap:4px}
  body.replay #replay-ui .rp-btn{min-height:26px;padding:1px 4px;border-width:2px;font-size:10px;box-shadow:2px 2px 0 var(--ink)}
  body.replay #replay-ui .rp-gear{width:28px;height:28px;min-width:28px;border-width:2px;box-shadow:2px 2px 0 var(--ink)}
  body.replay #replay-ui .rp-gear svg{width:18px;height:18px}
  body.replay #replay-ui .rp-win{padding:1px 3px;border-width:2px;font-size:9px;box-shadow:2px 2px 0 var(--ink)}
  body.replay #replay-ui .rp-msg{display:none}
}
@media (max-height:300px){body.replay .rp-badge{display:none}}
`;

function sanitiseAmount(a) {
  const n = Number(a);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : MICRO;
}

export function buildInfo({ amount, costMultiplier, mode, currency, formatMoney = defaultFormatMoney }) {
  const amt = sanitiseAmount(amount);
  const mult = Number(costMultiplier);
  const name = t.mode(mode);
  const cur = currency || (isSocial() ? 'XSC' : 'USD');
  let amountStr;
  try { amountStr = formatMoney(amt, cur, { social: isSocial() }); } catch (e) { amountStr = (amt / MICRO).toFixed(2); }
  if (Number.isFinite(mult) && mult > 1) {
    let real;
    try { real = formatMoney(Math.round(amt * mult), cur, { social: isSocial() }); } catch (e) { real = ((amt * mult) / MICRO).toFixed(2); }
    return { amt, mult, amountStr, line: t('replay.line', { mode: name, amount: amountStr, mult: String(mult), real }) };
  }
  return { amt, mult: 1, amountStr, line: `${t('replay.bet')}: ${amountStr} · ${name}` };
}

export async function startReplay(opts = {}) {
  const doc = document;
  doc.body.classList.add('replay');
  if (!doc.getElementById('replay-style')) {
    const st = doc.createElement('style');
    st.id = 'replay-style';
    st.textContent = STYLE;
    doc.head.appendChild(st);
  }
  for (const sel of HIDE) doc.querySelectorAll(sel).forEach((el) => { el.hidden = true; el.style.display = 'none'; });
  const formatMoney = opts.formatMoney || defaultFormatMoney;
  const currency = params.currency || (params.social ? 'XSC' : 'USD');

  let ui = doc.getElementById('replay-bar') || doc.getElementById('replay-ui');
  if (!ui) { ui = doc.createElement('div'); doc.body.appendChild(ui); }
  // dock it in the control column (where SPIN normally is): it gets its own room instead of covering the board
  const dock = doc.getElementById('hud-ctrl');
  if (dock && ui.parentNode !== dock) dock.insertBefore(ui, dock.firstChild);
  ui.id = 'replay-ui';
  ui.hidden = false;
  ui.style.display = '';
  ui.innerHTML = '';
  const infoHost = doc.getElementById('replay-info');
  const mk = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const lineEl = mk('div', 'rp-line', '');
  const winEl = mk('div', 'rp-win', '');
  const msgEl = mk('div', 'rp-msg', '');
  msgEl.setAttribute('role', 'status');
  const btn = mk('button', 'rp-btn', t('replay.start'));
  btn.id = 'replay-btn';
  btn.type = 'button';
  btn.disabled = true;
  // Optional fast-forward for long bonus replays. Off by default: the replay plays exactly as it happened.
  const turboBtn = mk('button', 'rp-btn', t('btn.turbo'));
  turboBtn.id = 'replay-turbo';
  // SKIP: fast-forward the rest of the round (only while it plays); the result is the same, only the animation is shortened
  const skipBtn = mk('button', 'rp-btn', t('btn.skip'));
  skipBtn.id = 'replay-skip';
  skipBtn.type = 'button';
  skipBtn.disabled = true;
  turboBtn.type = 'button';
  turboBtn.setAttribute('aria-pressed', 'false');
  let turbo = false;
  // v2: the settings gear lives in the replay bar (sound, motion, flashes, contrast; the HUD column is hidden in portrait and
  // in compact landscape, so there was no sound control at all there). The dialog itself is created by main.js.
  const gearBtn = mk('button', 'rp-gear');
  gearBtn.id = 'replay-settings';
  gearBtn.type = 'button';
  gearBtn.setAttribute('aria-haspopup', 'dialog');
  gearBtn.setAttribute('title', t('btn.settings'));
  gearBtn.setAttribute('aria-label', t('btn.settings'));
  gearBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.1"/><circle cx="12" cy="12" r="6.4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/></svg>';
  gearBtn.addEventListener('click', () => { if (typeof opts.openSettings === 'function') opts.openSettings(gearBtn); });
  (infoHost || ui).appendChild(lineEl);
  const btns = mk('div', 'rp-btns');
  btns.appendChild(btn);
  btns.appendChild(turboBtn);
  btns.appendChild(skipBtn);
  ui.appendChild(btns);
  ui.appendChild(gearBtn);
  // jurisdiction `disabledSuperTurbo`: SKIP is the replay's super-fast level; without it only the one TURBO level is offered
  const syncCaps = () => { skipBtn.hidden = !settings.capabilities.superTurbo; turboBtn.hidden = !settings.capabilities.turbo; };
  syncCaps();
  settings.on('capabilities', syncCaps);
  ui.appendChild(winEl);
  ui.appendChild(msgEl);
  if (!doc.querySelector('.rp-badge')) doc.body.appendChild(mk('div', 'rp-badge', t('replay.badge')));

  const setMsg = (s) => { msgEl.textContent = s || ''; };
  const info = buildInfo({ amount: params.replayAmount, costMultiplier: 1, mode: params.replayMode, currency, formatMoney });
  lineEl.textContent = info.line;

  if (!params.replayGame || !params.replayVersion || !params.replayEvent) {
    setMsg(t('replay.badParams'));
    return;
  }

  let renderer = opts.renderer || null;
  async function ensureRenderer() {
    if (renderer) return renderer;
    const mod = await import('./render/index.js');
    const root = doc.getElementById('game') || doc.getElementById('stage') || doc.body;
    renderer = mod.createRenderer(root);
    return renderer;
  }

  let replay = null;
  let playing = false;

  async function load() {
    btn.disabled = true;
    btn.textContent = t('replay.start');
    setMsg(t('replay.loading'));
    try {
      replay = await fetchReplay(params.replayGame, params.replayVersion, params.replayMode, params.replayEvent);
      if (!replay || !Array.isArray(replay.state)) throw new Error('bad replay');
    } catch (e) {
      replay = null;
      setMsg(t('replay.error'));
      btn.textContent = t('btn.retry');
      btn.disabled = false;
      btn.dataset.mode = 'retry';
      return;
    }
    const cm = Number(replay.costMultiplier);
    const costMult = Number.isFinite(cm) && cm > 0 ? cm : 1;
    const i2 = buildInfo({ amount: params.replayAmount, costMultiplier: costMult, mode: params.replayMode, currency, formatMoney });
    lineEl.textContent = i2.line;
    replay._amount = i2.amt;
    replay._cost = costMult;
    setMsg('');
    btn.dataset.mode = 'start';
    btn.disabled = false;
  }

  async function play() {
    if (playing || !replay) return;
    playing = true;
    btn.disabled = true;
    skipBtn.disabled = false;
    winEl.textContent = '';
    setMsg(t('replay.playing'));
    try {
      const r = await ensureRenderer();
      if (r.setTurbo) r.setTurbo(turbo);
      if (r.setCost) r.setCost(replay._cost || 1);
      if (r.setMode) r.setMode(String(params.replayMode || 'base').toLowerCase());
      if (r.setFormat) r.setFormat((x) => formatMoney(Math.round((Number(x) || 0) * replay._amount), currency, { social: isSocial() }));
      const hooks = { onTotal() {}, onWin() {}, onFreeSpinCounter() {} };
      await r.playBook(replay.state, hooks);
    } catch (e) {
      setMsg(t('replay.error'));
      playing = false;
      skipBtn.disabled = true;
      btn.textContent = t('replay.again');
      btn.disabled = false;
      btn.dataset.mode = 'again';
      return;
    }
    const pm = Number(replay.payoutMultiplier);
    const total = Number.isFinite(pm) ? Math.round(pm * replay._amount) : 0;
    let totalStr;
    try { totalStr = formatMoney(total, currency, { social: isSocial() }); } catch (e) { totalStr = (total / MICRO).toFixed(2); }
    winEl.textContent = `${t('replay.totalWin')}: ${totalStr}`;
    setMsg(t('replay.done'));
    playing = false;
    skipBtn.disabled = true;
    btn.textContent = t('replay.again');
    btn.dataset.mode = 'again';
    btn.disabled = false;
  }

  turboBtn.addEventListener('click', () => {
    turbo = !turbo;
    turboBtn.setAttribute('aria-pressed', String(turbo));
    if (renderer && renderer.setTurbo) renderer.setTurbo(turbo);
  });
  skipBtn.addEventListener('click', () => { if (renderer && renderer.setSkip && playing) renderer.setSkip(true); });
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === 'retry') load();
    else play();
  });
  try { applyI18n(doc); } catch (e) { /* ignore */ }
  await load();
}

export default startReplay;
