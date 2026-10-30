// Settings dialog (WP1, SYNTHESIS 6): #modal-settings, role=dialog, aria-modal, four tabs Sound / Display / Play / Info
// built with the one APG tabs helper. Every control reads and writes the single stores:
//   sound  -> audio.js (setMuted, setVolume, getVolume, preview, onChange; WP2 implements the buses behind them)
//   others -> settings.js (motion, reduceFlash, highContrast, ledger) and the host (turbo, autoplay)
// Turbo and autoplay are NOT stored. Jurisdiction capabilities hide controls (turbo, autoplay) and lock the session summary.
//
// createSettingsDialog({ el, settings, audio, t, host }) -> { open(opener), close(), refresh(), el }
//   host: { replay, openModal(el, opener), closeModal(el), getTurbo(), setTurbo(b), onTurbo(fn) -> off,
//           autoplayState() -> 'ready'|'busy'|'active', openAutoplay(), stopAutoplay(), ledger() -> snapshot,
//           format(micro) -> money string, rulesCtx() -> { currency, formatMoney } }
import { h } from './dom.js';
import { createTabs } from './tabs.js';
import { formatElapsed, formatNet } from './ledger.js';
import { VERSION } from './version.js';

const KINDS = [['master', 'settings.vol.master'], ['music', 'settings.vol.music'], ['sfx', 'settings.vol.sfx']];
const MOTIONS = ['auto', 'full', 'calm', 'still'];

export function createSettingsDialog({ el, settings, audio, t, host }) {
  const box = el.querySelector('.modal-box');
  const offs = [];
  const on = (off) => { offs.push(off); return off; };
  let tabs = null, built = false, infoTimer = 0, backdropBound = false;
  const ui = {}; // control elements by name

  // ------------------------------------------------------------------ small controls
  const hintId = (name) => `st-hint-${name}`;
  function sw(name, labelKey, { hintKey, onToggle }) {
    const b = h('button', { type: 'button', role: 'switch', class: 'st-sw', id: `st-${name}`, 'aria-checked': 'false', 'aria-labelledby': `st-lbl-${name}`, 'aria-describedby': hintKey ? hintId(name) : null });
    b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') === 'true') return; onToggle(b.getAttribute('aria-checked') !== 'true'); });
    ui[name] = b;
    return h('div', { class: 'st-row', 'data-row': name },
      h('div', { class: 'st-lbl' }, h('span', { id: `st-lbl-${name}`, class: 'st-name' }, t(labelKey)), hintKey ? h('span', { id: hintId(name), class: 'st-hint' }, t(hintKey)) : null),
      b);
  }
  const setSwitch = (name, checked) => { const b = ui[name]; if (b) b.setAttribute('aria-checked', checked ? 'true' : 'false'); };

  function slider(kind, labelKey) {
    const id = `st-vol-${kind}`;
    const input = h('input', { type: 'range', id, class: 'st-range', min: '0', max: '100', step: '1', value: String(audio.getVolume(kind) ?? 75), 'aria-labelledby': `st-lbl-${kind}` });
    const out = h('output', { class: 'st-out', id: `st-out-${kind}`, for: id });
    const sync = () => {
      const v = Number(input.value);
      out.textContent = `${v}%`;
      input.setAttribute('aria-valuetext', v === 0 ? t('settings.vol.off') : t('settings.vol.text', { n: v }));
      input.style.setProperty('--fill', `${v}%`);
    };
    input.addEventListener('input', () => { audio.setVolume(kind, Number(input.value)); sync(); });
    input.addEventListener('change', () => { try { audio.preview(kind); } catch (e) { /* ignore */ } });
    ui['vol-' + kind] = { input, sync };
    sync();
    return h('div', { class: 'st-row st-slider', 'data-row': 'vol-' + kind }, h('span', { id: `st-lbl-${kind}`, class: 'st-name' }, t(labelKey)), input, out);
  }

  // ------------------------------------------------------------------ panels
  function soundPanel() {
    return [
      sw('mute', 'settings.mute', { onToggle: (v) => audio.setMuted(v) }),
      ...KINDS.map(([k, key]) => slider(k, key)),
    ];
  }
  function displayPanel() {
    const group = h('div', { class: 'st-seg', role: 'radiogroup', 'aria-labelledby': 'st-lbl-motion' });
    for (const m of MOTIONS) {
      const input = h('input', { type: 'radio', name: 'st-motion', value: m, id: `st-motion-${m}`, class: 'st-seg-in' });
      input.addEventListener('change', () => { if (input.checked) settings.set('motion', m); });
      group.append(h('label', { class: 'st-seg-opt' }, input, h('span', null, t('settings.motion.' + m))));
    }
    return [
      h('div', { class: 'st-row st-motion', 'data-row': 'motion' }, h('div', { class: 'st-lbl' }, h('span', { id: 'st-lbl-motion', class: 'st-name' }, t('settings.motion')), h('span', { class: 'st-hint' }, t('settings.motion.hint'))), group),
      sw('flash', 'settings.flash', { hintKey: 'settings.flash.hint', onToggle: (v) => settings.set('reduceFlash', !v) }),
      sw('contrast', 'settings.contrast', { onToggle: (v) => settings.set('highContrast', v) }),
      sw('ledger', 'settings.summary', { hintKey: 'settings.summary.hint', onToggle: (v) => { if (!settings.capabilities.ledgerLocked) settings.set('ledger', v); } }),
    ];
  }
  function playPanel() {
    const ap = h('button', { type: 'button', class: 'mbtn st-btn', id: 'st-autoplay' });
    ap.addEventListener('click', () => {
      if (ap.getAttribute('aria-disabled') === 'true') return;
      if (host.autoplayState() === 'active') { host.stopAutoplay(); refreshPlay(); return; }
      host.openAutoplay();
    });
    ui.autoplay = ap;
    return [
      sw('turbo', 'settings.turbo', { hintKey: 'settings.turbo.hint', onToggle: (v) => host.setTurbo(v) }),
      h('div', { class: 'st-row', 'data-row': 'autoplay' }, h('div', { class: 'st-lbl' }, h('span', { class: 'st-name' }, t('settings.autoplay')), h('span', { id: hintId('autoplay'), class: 'st-hint' }, t('settings.autoplay.hint'))), ap),
    ];
  }
  function infoPanel() {
    ui.session = h('div', { class: 'st-session', id: 'st-session' });
    ui.rtp = h('p', { class: 'st-rtp', id: 'st-rtp', hidden: true });
    ui.rules = h('div', { class: 'st-rules', id: 'st-rules' });
    ui.version = h('p', { class: 'st-version', id: 'st-version' });
    return [ui.rtp, ui.session, ui.rules, ui.version];
  }

  // ------------------------------------------------------------------ build (once)
  function build() {
    built = true;
    box.textContent = '';
    const title = h('h2', { id: 'st-title', class: 'st-title' }, t('settings.title'));
    const closeBtn = h('button', { type: 'button', class: 'mbtn st-close', id: 'st-close' }, t('btn.close'));
    closeBtn.addEventListener('click', () => api.close());
    const tabNames = ['sound', 'display', 'play', 'info'];
    const tablist = h('div', { class: 'st-tabs', 'aria-label': t('settings.tabs') });
    const tabEls = tabNames.map((n) => h('button', { type: 'button', class: 'st-tab', id: `st-tab-${n}`, 'data-tab': n }, t('settings.tab.' + n)));
    tablist.append(...tabEls);
    const builders = { sound: soundPanel, display: displayPanel, play: playPanel, info: infoPanel };
    const panelEls = tabNames.map((n) => h('div', { class: 'st-panel', id: `st-panel-${n}`, 'data-panel': n }, builders[n]()));
    const body = h('div', { class: 'st-body' }, panelEls);
    box.append(h('div', { class: 'st-head' }, title, closeBtn), tablist, body);
    box.classList.add('st-box');
    el.setAttribute('aria-labelledby', 'st-title');
    el.removeAttribute('aria-label');
    tabs = createTabs({ tablist, tabs: tabEls, panels: panelEls, idPrefix: 'st', onSelect: (i, tab) => { if (tab.dataset.tab === 'info') startInfo(); else stopInfo(); } });
    ui.tabEls = tabEls; ui.panelEls = panelEls;

    // external changes keep the controls in step
    on(audio.onChange(() => refreshSound()));
    for (const k of ['motion', 'flashReduced', 'contrastOn', 'ledgerOn']) on(settings.on(k, () => refreshDisplay()));
    on(settings.on('capabilities', () => { refreshPlay(); refreshDisplay(); refreshInfo(); }));
    on(host.onTurbo(() => refreshPlay()));
    if (!backdropBound) { backdropBound = true; el.addEventListener('click', (ev) => { if (ev.target === el) api.close(); }); }
  }

  // ------------------------------------------------------------------ refresh (state -> controls)
  function refreshSound() {
    if (!built) return;
    setSwitch('mute', !!audio.muted);
    for (const [k] of KINDS) { const c = ui['vol-' + k]; c.input.value = String(audio.getVolume(k) ?? 75); c.sync(); }
    el.classList.toggle('st-muted', !!audio.muted);
  }
  function refreshDisplay() {
    if (!built) return;
    const m = settings.get('motion');
    for (const v of MOTIONS) { const r = box.querySelector(`#st-motion-${v}`); if (r) r.checked = v === m; }
    setSwitch('flash', !settings.get('flashReduced'));
    setSwitch('contrast', !!settings.get('contrastOn'));
    const locked = !!settings.capabilities.ledgerLocked;
    setSwitch('ledger', !!settings.get('ledgerOn'));
    const lb = ui.ledger;
    lb.setAttribute('aria-disabled', locked ? 'true' : 'false');
    lb.classList.toggle('locked', locked);
    const hint = box.querySelector('#' + hintId('ledger'));
    if (hint) hint.textContent = t(locked ? 'settings.summary.locked' : 'settings.summary.hint');
  }
  function refreshPlay() {
    if (!built) return;
    const caps = settings.capabilities;
    const turboRow = box.querySelector('[data-row="turbo"]'), apRow = box.querySelector('[data-row="autoplay"]');
    if (turboRow) turboRow.hidden = !caps.turbo;
    if (apRow) apRow.hidden = !caps.autoplay;
    setSwitch('turbo', !!host.getTurbo());
    const st = host.autoplayState();
    const ap = ui.autoplay;
    ap.textContent = t(st === 'active' ? 'settings.autoplay.stop' : 'settings.autoplay.open');
    ap.setAttribute('aria-disabled', st === 'busy' ? 'true' : 'false');
    ap.setAttribute('aria-describedby', hintId('autoplay'));
    const hint = box.querySelector('#' + hintId('autoplay'));
    if (hint) hint.textContent = t(st === 'busy' ? 'settings.autoplay.busy' : 'settings.autoplay.hint');
    // no play option left (replay, or both shortcuts switched off by the jurisdiction): the whole tab goes
    const playTab = ui.tabEls[2];
    const none = host.replay || (!caps.turbo && !caps.autoplay);
    if (tabs) tabs.setVisible(2, !none);
    if (none) playTab.hidden = true;
  }
  function rtpLine(data) {
    const modes = data && Array.isArray(data.modes) ? data.modes.filter((m) => m && Number.isFinite(Number(m.rtp))) : [];
    if (!modes.length) return '';
    const pct = (r) => (Number(r) * 100).toFixed(2) + '%';
    const first = pct(modes[0].rtp);
    if (modes.every((m) => pct(m.rtp) === first)) return t('info.rtp.all', { rtp: first });
    return t('info.rtp.modes', { list: modes.map((m) => `${t.mode(m.name)} ${pct(m.rtp)}`).join(', ') });
  }
  function renderSession() {
    const s = host.ledger();
    ui.session.textContent = '';
    ui.session.append(
      h('h3', { class: 'st-h' }, t('info.session')),
      h('dl', { class: 'st-dl' },
        h('dt', null, t('ledger.net')), h('dd', { id: 'st-net' }, formatNet(s.net, host.format)),
        h('dt', null, t('ledger.time')), h('dd', { id: 'st-time' }, formatElapsed(s.elapsedMs))));
  }
  let infoData = null, infoSeq = 0;
  async function refreshInfo() {
    if (!built) return;
    const seq = ++infoSeq;
    renderSession();
    ui.session.hidden = !!host.replay; // a replay has no session of its own
    ui.version.textContent = t('info.version', { v: VERSION });
    let data = infoData;
    let rules = null;
    try {
      rules = await import('../rules.js');
      if (!data) data = infoData = await rules.loadRulesData();
    } catch (e) { rules = null; }
    if (seq !== infoSeq || !built) return;
    const line = settings.capabilities.rtp ? rtpLine(data) : '';
    ui.rtp.textContent = line; ui.rtp.hidden = !line;
    ui.rules.textContent = '';
    if (!rules || !data) return;
    let sections = [];
    try { sections = rules.buildRules(data, host.rulesCtx()).sections; } catch (e) { sections = []; }
    const by = (id) => sections.find((s) => s.id === id);
    const groups = [
      { key: 'info.rules', ids: ['overview', 'howto', 'features'] },
      { key: 'rules.tab.wins', ids: ['wins'] },
      { key: 'info.controls', ids: ['controls'] },
      { key: 'info.modes', ids: ['modes'] },
      { key: 'info.legal', ids: ['legal'] },
    ];
    for (const g of groups) {
      const html = g.ids.map((id) => (by(id) ? by(id).html : '')).join('');
      if (!html) continue;
      const d = h('details', { class: 'st-det', 'data-group': g.key });
      const body = h('div', { class: 'st-det-body rules-html' });
      body.innerHTML = html; // markup produced (and escaped) by src/rules.js
      if (g.extra) body.append(h('p', { class: 'st-extra' }, t(g.extra)));
      d.append(h('summary', null, t(g.key)), body);
      ui.rules.append(d);
    }
  }
  function startInfo() {
    stopInfo();
    refreshInfo();
    infoTimer = setInterval(() => {
      const net = box.querySelector('#st-net'), time = box.querySelector('#st-time');
      if (!net || !time) return;
      const s = host.ledger();
      net.textContent = formatNet(s.net, host.format); time.textContent = formatElapsed(s.elapsedMs);
    }, 1000);
  }
  function stopInfo() { clearInterval(infoTimer); infoTimer = 0; }
  function refresh() { refreshSound(); refreshDisplay(); refreshPlay(); }

  // ------------------------------------------------------------------ open / close
  const api = {
    el,
    get isOpen() { return el.classList.contains('open'); },
    refresh,
    open(opener) {
      if (!built) build();
      refresh();
      host.openModal(el, opener);
      tabs.refresh();
      if (ui.tabEls[tabs.selected] && ui.tabEls[tabs.selected].dataset.tab === 'info') startInfo();
      const tab = ui.tabEls[tabs.selected];
      if (tab) tab.focus({ preventScroll: true });
    },
    close() { stopInfo(); host.closeModal(el); },
    /** Re-translate after a language / social switch (the next open rebuilds the text). */
    rebuild() { stopInfo(); offs.splice(0).forEach((f) => f()); built = false; },
  };
  return api;
}
