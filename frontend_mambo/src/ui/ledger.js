// Session ledger (WP1): net position and elapsed time of THIS session (since the page was loaded). Pure logic plus one
// tiny HUD view. UKGC RTS 13C / 2E style information (medium evidence): neutral, never colour-coded as good or bad, no
// celebration. Amounts are micro-units like everywhere else (1_000_000 = 1.00).
//
// Net position = everything returned minus everything it cost, round by round. A round resumed after a reload is not
// counted (its cost belongs to an earlier session).

const pad2 = (n) => String(n).padStart(2, '0');

/** ms -> 'm:ss' (under one hour) or 'h:mm:ss'. Junk -> '0:00'. */
export function formatElapsed(ms) {
  const n = Number(ms);
  const s = Number.isFinite(n) && n > 0 ? Math.floor(n / 1000) : 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`;
}

/** Signed money string: '+1.20', '-5.00', '0.00' (no sign at zero). `fmt(microAbs)` formats the absolute amount. */
export function formatNet(micro, fmt) {
  const n = Math.round(Number(micro));
  const v = Number.isFinite(n) ? n : 0;
  const body = fmt(Math.abs(v));
  return v > 0 ? `+${body}` : v < 0 ? `-${body}` : body;
}

export function createLedger({ now = () => Date.now() } = {}) {
  let t0 = now(), net = 0, spent = 0, returned = 0, rounds = 0;
  const fns = new Set();
  const snap = () => ({ net, spent, returned, rounds, elapsedMs: Math.max(0, now() - t0) });
  const emit = () => { for (const f of [...fns]) { try { f(snap()); } catch (e) { /* a listener never breaks the ledger */ } } };
  const amount = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  return {
    /** One finished round: cost and payout in micro-units (invalid values count as 0). */
    addRound({ cost, payout }) {
      const c = amount(cost), p = amount(payout);
      spent += c; returned += p; net += p - c; rounds += 1;
      emit();
      return snap();
    },
    snapshot: snap,
    get net() { return net; },
    get rounds() { return rounds; },
    get elapsedMs() { return Math.max(0, now() - t0); },
    /** fn(snapshot) after every round. Returns the unsubscribe function. */
    onChange(fn) { if (typeof fn !== 'function') return () => {}; fns.add(fn); return () => { fns.delete(fn); }; },
    reset() { t0 = now(); net = 0; spent = 0; returned = 0; rounds = 0; emit(); },
  };
}

/**
 * HUD view: fills #ledger (index.html) and keeps the clock running while it is visible.
 *   const view = createLedgerView({ el, ledger, settings, t, format, fit })   // format(micro) -> money string; fit(el) shrinks long text
 *   view.render()   view.destroy()
 * Visible only when settings.get('ledgerOn') (the summary switch, forced on by displayNetPosition / displaySessionTimer).
 */
export function createLedgerView({ el, ledger, settings, t, format, fit = null, doc = typeof document !== 'undefined' ? document : null }) {
  if (!el) return { render() {}, destroy() {} };
  const netEl = el.querySelector('[data-ledger="net"]'), timeEl = el.querySelector('[data-ledger="time"]');
  let timer = 0;
  const on = () => settings.get('ledgerOn') !== false;
  function render() {
    const show = on();
    el.hidden = !show;
    if (!show) return;
    const s = ledger.snapshot();
    if (netEl) netEl.textContent = formatNet(s.net, format);
    if (timeEl) timeEl.textContent = formatElapsed(s.elapsedMs);
    if (fit) { try { if (netEl) fit(netEl); if (timeEl) fit(timeEl); } catch (e) { /* ignore */ } }
    el.setAttribute('aria-label', `${t('ledger.title')}: ${t('ledger.net')} ${netEl ? netEl.textContent : ''}, ${t('ledger.time')} ${timeEl ? timeEl.textContent : ''}`);
  }
  function loop() {
    clearInterval(timer); timer = 0;
    if (!on() || (doc && doc.hidden)) return;
    timer = setInterval(() => { if (!(doc && doc.hidden)) render(); }, 1000);
  }
  const offs = [settings.on('ledgerOn', () => { render(); loop(); }), ledger.onChange(render)];
  const vis = () => { render(); loop(); };
  if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', vis);
  render(); loop();
  return {
    render,
    destroy() { clearInterval(timer); offs.forEach((f) => f()); if (doc && doc.removeEventListener) doc.removeEventListener('visibilitychange', vis); },
  };
}
