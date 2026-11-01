// Secret Entrance door picker (WP1). ONE Secret Entrance button; its confirm dialog lists the doors that exist.
//   Stage Door = the Briefing (mode `bonus`), Coat Check = Sealed Orders (`entrance_orders`), Service Stairs = Ballroom
//   Blackout (`entrance_blackout`). Only Stage Door exists today: a card for a mode appears only when BOTH the rules data
//   lists the mode (the math exists) AND the shares data has facts for it (SYNTHESIS 2 "How bought", 8.10).
//
// Honest by construction (Engine [31], [266], UKGC RTS 14A): the real cost is shown, nothing is pre-selected, the focus
// starts on Cancel (done by main.js), no countdown, no "better odds" wording, every figure comes from the data files.
import { h } from './dom.js';
import { modeCost } from '../bet.js';

export const DOORS = Object.freeze([
  Object.freeze({ id: 'stage', mode: 'bonus', nameKey: 'door.stage', missionKey: 'door.mission.bonus', icon: 'flask' }),
  Object.freeze({ id: 'coat', mode: 'entrance_orders', nameKey: 'door.coat', missionKey: 'door.mission.entrance_orders', icon: 'envelope' }),
  Object.freeze({ id: 'stairs', mode: 'entrance_blackout', nameKey: 'door.stairs', missionKey: 'door.mission.entrance_blackout', icon: 'spotlight' }),
]);

// One small mark per mission (flask = the lab of The Briefing, envelope = Sealed Orders, spotlight = Ballroom Blackout).
// Closed palette only (charter): ink outline, teal / lemon / cream / coral fills. Trusted constant markup.
const SW = 'stroke="#14102B" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
export const MISSION_ICONS = Object.freeze({
  flask: `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M12 4h8M13.5 4v8L6 25a2.5 2.5 0 0 0 2.2 3.7h15.6A2.5 2.5 0 0 0 26 25l-7.5-13V4" fill="#FBF1D9" ${SW}/><path d="M9.2 20h13.6l3 5.2a1.6 1.6 0 0 1-1.4 2.4H7.6a1.6 1.6 0 0 1-1.4-2.4z" fill="#1FB5A3" ${SW}/><circle cx="14" cy="23.5" r="1.3" fill="#FBF1D9"/><circle cx="18.5" cy="22" r="1" fill="#FBF1D9"/></svg>`,
  envelope: `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect x="4" y="8" width="24" height="17" rx="2" fill="#FBF1D9" ${SW}/><path d="M4.5 9l11.5 9 11.5-9" fill="none" ${SW}/><circle cx="16" cy="18" r="3.4" fill="#F0472F" ${SW}/></svg>`,
  spotlight: `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M11 9l10 0 6 19H5z" fill="#FFD23F" stroke="none" opacity=".9"/><path d="M11 9L5 28M21 9l6 19" fill="none" ${SW}/><rect x="10" y="3.5" width="12" height="6.5" rx="2" fill="#2B2A6B" ${SW}/><ellipse cx="16" cy="28" rx="11" ry="2" fill="#FFD23F" ${SW}/></svg>`,
});

const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/**
 * Pure. data = parsed data/rules_data.json (or null). Returns the doors to offer, in order, each
 * { id, mode, nameKey, cost (multiplier), facts: { rtp, maxWin, medianX, pGtPrice } } (a fact is null when unknown).
 * Stage Door is always offered (an old data file without `modes` still gives a card, without facts).
 */
export function availableDoors(data) {
  const d = data && typeof data === 'object' ? data : {};
  const modes = Array.isArray(d.modes) ? d.modes : [];
  const shares = d.shares && typeof d.shares === 'object' ? d.shares : {};
  const out = [];
  for (const door of DOORS) {
    const m = modes.find((x) => x && String(x.name).toLowerCase() === door.mode) || null;
    const s = own(shares, door.mode) && shares[door.mode] && typeof shares[door.mode] === 'object' ? shares[door.mode] : null;
    if (door.id !== 'stage' && !(m && s)) continue; // later doors need the math AND the shares facts
    out.push({
      ...door,
      cost: fin(m && m.cost) ?? modeCost(door.mode),
      facts: {
        rtp: fin(s && s.rtp) ?? fin(m && m.rtp),
        maxWin: fin(s && s.maxWin) ?? fin(m && m.maxWin),
        medianX: fin(s && s.medianX),
        pGtPrice: fin(s && s.pGtPrice),
      },
    });
  }
  return out;
}

const pct = (x, digits) => (x * 100).toFixed(digits);
const commas = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Pure: the fact lines of a door, as plain strings (only the facts that are known). */
export function doorFactLines(door, t) { return doorFacts(door, t).map((x) => x.text); }
/** Pure: the same lines with their kind ('rtp' | 'max' | 'median' | 'share'), so the compact layout can fold the long ones. */
export function doorFacts(door, t) {
  const f = door.facts || {};
  const out = [];
  const has = (v) => v !== null && v !== undefined;
  if (has(f.rtp)) out.push({ kind: 'rtp', text: t('door.fact.rtp', { rtp: pct(f.rtp, 2) + '%' }) });
  if (has(f.maxWin)) out.push({ kind: 'max', text: t('door.fact.max', { max: commas(f.maxWin) }) });
  if (has(f.medianX)) out.push({ kind: 'median', text: t('door.fact.median', { x: commas(f.medianX) }) });
  if (has(f.pGtPrice)) out.push({ kind: 'share', text: t('door.fact.share', { p: pct(f.pGtPrice, f.pGtPrice < 0.1 ? 1 : 0) + '%' }) });
  return out;
}

/**
 * Renders the cards into `host` (cleared first). More than one door -> a radio group with NOTHING selected; one door -> a
 * single informational card. Returns { count, get selected (mode | null), onChange(fn), focusFirst() }.
 */
export function renderDoors(host, doors, { t, costText }) {
  host.textContent = '';
  const fns = new Set();
  let selected = null;
  const many = doors.length > 1;
  host.setAttribute('role', many ? 'radiogroup' : 'group');
  host.setAttribute('aria-label', t('door.title'));
  doors.forEach((door) => {
    const lines = doorFacts(door, t);
    const icon = h('span', { class: 'door-icon', 'data-icon': door.icon || '' });
    icon.innerHTML = MISSION_ICONS[door.icon] || '';
    const mission = door.missionKey ? t(door.missionKey) : '';
    const body = h('span', { class: 'door-body' },
      h('span', { class: 'door-head' }, icon, h('b', { class: 'door-name' }, t(door.nameKey))),
      mission && mission !== door.missionKey ? h('span', { class: 'door-mission', title: mission }, mission) : null,
      h('span', { class: 'door-cost' }, costText(door)),
      lines.length ? h('ul', { class: 'door-facts' }, lines.map((l) => h('li', { 'data-fact': l.kind }, l.text))) : null);
    if (!many) { host.append(h('div', { class: 'door single', 'data-mode': door.mode }, body)); return; }
    const input = h('input', { type: 'radio', name: 'door', value: door.mode, class: 'door-in' });
    input.addEventListener('change', () => { selected = door.mode; for (const f of [...fns]) { try { f(selected); } catch (e) { /* ignore */ } } });
    host.append(h('label', { class: 'door', 'data-mode': door.mode }, input, body));
  });
  return {
    count: doors.length,
    get selected() { return selected; },
    onChange(fn) { fns.add(fn); return () => fns.delete(fn); },
    focusFirst() { const i = host.querySelector('input'); if (i) i.focus(); },
  };
}
