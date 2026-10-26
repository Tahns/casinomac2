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
  Object.freeze({ id: 'stage', mode: 'bonus', nameKey: 'door.stage' }),
  Object.freeze({ id: 'coat', mode: 'entrance_orders', nameKey: 'door.coat' }),
  Object.freeze({ id: 'stairs', mode: 'entrance_blackout', nameKey: 'door.stairs' }),
]);

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
export function doorFactLines(door, t) {
  const f = door.facts || {};
  const lines = [];
  if (f.rtp !== null && f.rtp !== undefined) lines.push(t('door.fact.rtp', { rtp: pct(f.rtp, 2) + '%' }));
  if (f.maxWin !== null && f.maxWin !== undefined) lines.push(t('door.fact.max', { max: commas(f.maxWin) }));
  if (f.medianX !== null && f.medianX !== undefined) lines.push(t('door.fact.median', { x: commas(f.medianX) }));
  if (f.pGtPrice !== null && f.pGtPrice !== undefined) lines.push(t('door.fact.share', { p: pct(f.pGtPrice, f.pGtPrice < 0.1 ? 1 : 0) + '%' }));
  return lines;
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
    const lines = doorFactLines(door, t);
    const body = h('span', { class: 'door-body' },
      h('b', { class: 'door-name' }, t(door.nameKey)),
      h('span', { class: 'door-cost' }, costText(door)),
      lines.length ? h('ul', { class: 'door-facts' }, lines.map((l) => h('li', null, l))) : null);
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
