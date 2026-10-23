// Replay mode: no wallet calls, no betting UI. Exports startReplay().
import { t, isSocial, applyI18n } from './i18n/index.js';
import { params } from './params.js';
import { fetchReplay } from './rgs.js';
import { formatMoney as defaultFormatMoney } from './money.js';

const MICRO = 1_000_000;
const HIDE = ['#btn-bet', '#btn-bet-minus', '#btn-bet-plus', '#btn-autoplay', '#btn-unleash', '#btn-menu', '#btn-turbo',
  '#modal-autoplay', '#modal-confirm', '.bet-controls', '.hud-bet', '#unleash-cost'];

const STYLE = `
body.replay #replay-ui{position:absolute;left:0;right:0;bottom:0;z-index:50;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 10px;padding:4px 8px;background:rgba(10,8,5,.82);color:#f3ead7;font:12px/1.25 system-ui,sans-serif;text-align:center;box-sizing:border-box}
body.replay #replay-ui .rp-line{font-weight:600;white-space:normal}
body.replay #replay-ui .rp-win{font-weight:700;color:#ffd700}
body.replay #replay-ui .rp-msg{width:100%}
body.replay #replay-btn{font:700 13px system-ui,sans-serif;border:2px solid #ffd700;background:#7a4b10;color:#fff;border-radius:8px;padding:5px 18px;cursor:pointer;min-height:30px}
body.replay #replay-btn[disabled]{opacity:.5;cursor:default}
body.replay #replay-turbo{font:700 13px system-ui,sans-serif;border:2px solid #ffd700;background:#1e2f4a;color:#fff;border-radius:8px;padding:5px 12px;cursor:pointer;min-height:30px}
body.replay #replay-turbo[aria-pressed="true"]{background:#e8a92b;color:#2b1a12}
body.replay .rp-badge{position:absolute;top:4px;left:6px;z-index:50;font:700 11px system-ui,sans-serif;color:#ffd700;background:rgba(10,8,5,.7);padding:2px 6px;border-radius:4px}
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
  const btn = mk('button', '', t('replay.start'));
  btn.id = 'replay-btn';
  btn.type = 'button';
  btn.disabled = true;
  // Optional fast-forward for long bonus replays. Off by default: the replay plays exactly as it happened.
  const turboBtn = mk('button', '', t('btn.turbo'));
  turboBtn.id = 'replay-turbo';
  turboBtn.type = 'button';
  turboBtn.setAttribute('aria-pressed', 'false');
  let turbo = false;
  (infoHost || ui).appendChild(lineEl);
  ui.appendChild(btn);
  ui.appendChild(turboBtn);
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
    setMsg('');
    btn.dataset.mode = 'start';
    btn.disabled = false;
  }

  async function play() {
    if (playing || !replay) return;
    playing = true;
    btn.disabled = true;
    winEl.textContent = '';
    setMsg(t('replay.playing'));
    try {
      const r = await ensureRenderer();
      if (r.setTurbo) r.setTurbo(turbo);
      if (r.setFormat) r.setFormat((x) => formatMoney(Math.round((Number(x) || 0) * replay._amount), currency, { social: isSocial() }));
      const hooks = { onTotal() {}, onWin() {}, onFreeSpinCounter() {} };
      await r.playBook(replay.state, hooks);
    } catch (e) {
      setMsg(t('replay.error'));
      playing = false;
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
    btn.textContent = t('replay.again');
    btn.dataset.mode = 'again';
    btn.disabled = false;
  }

  turboBtn.addEventListener('click', () => {
    turbo = !turbo;
    turboBtn.setAttribute('aria-pressed', String(turbo));
    if (renderer && renderer.setTurbo) renderer.setTurbo(turbo);
  });
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === 'retry') load();
    else play();
  });
  try { applyI18n(doc); } catch (e) { /* ignore */ }
  await load();
}

export default startReplay;
