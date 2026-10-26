import test from 'node:test';
import assert from 'node:assert/strict';
import { createTabs } from '../../src/ui/tabs.js';

// minimal fake elements: the helper only touches attributes, hidden, focus and listeners
let focused = null;
function el(id) {
  const attrs = new Map(); const ls = {};
  const e = { id, hidden: false, setAttribute(k, v) { attrs.set(k, String(v)); }, getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; }, hasAttribute(k) { return attrs.has(k); },
    addEventListener(t, f) { (ls[t] ||= []).push(f); }, removeEventListener(t, f) { ls[t] = (ls[t] || []).filter((x) => x !== f); }, focus() { focused = e; },
    fire(t, ev = {}) { const evt = { currentTarget: e, preventDefault() { evt.prevented = true; }, ...ev }; (ls[t] || []).forEach((f) => f(evt)); return evt; } };
  return e;
}
const make = (n = 4, opts = {}) => {
  const tablist = el('tl'); const tabs = Array.from({ length: n }, (_, i) => el('t' + i)); const panels = Array.from({ length: n }, (_, i) => el('p' + i));
  const seen = [];
  const api = createTabs({ tablist, tabs, panels, onSelect: (i) => seen.push(i), ...opts });
  return { tablist, tabs, panels, api, seen };
};

test('tabs: roles, ids, aria wiring, roving tabindex, one visible panel', () => {
  const { tablist, tabs, panels } = make();
  assert.equal(tablist.getAttribute('role'), 'tablist');
  tabs.forEach((t, i) => {
    assert.equal(t.getAttribute('role'), 'tab'); assert.equal(t.getAttribute('aria-controls'), panels[i].id);
    assert.equal(panels[i].getAttribute('role'), 'tabpanel'); assert.equal(panels[i].getAttribute('aria-labelledby'), t.id);
    assert.equal(t.getAttribute('aria-selected'), i === 0 ? 'true' : 'false'); assert.equal(t.getAttribute('tabindex'), i === 0 ? '0' : '-1');
    assert.equal(panels[i].hidden, i !== 0); assert.equal(panels[i].getAttribute('tabindex'), '0');
  });
});
test('tabs: arrows wrap, Home/End, click selects, automatic activation focuses', () => {
  const { tabs, panels, api, seen } = make();
  tabs[0].fire('keydown', { key: 'ArrowRight' }); assert.equal(api.selected, 1); assert.equal(focused, tabs[1]); assert.equal(panels[1].hidden, false); assert.equal(panels[0].hidden, true);
  tabs[1].fire('keydown', { key: 'End' }); assert.equal(api.selected, 3);
  tabs[3].fire('keydown', { key: 'ArrowRight' }); assert.equal(api.selected, 0);          // wraps
  tabs[0].fire('keydown', { key: 'ArrowLeft' }); assert.equal(api.selected, 3);           // wraps back
  tabs[3].fire('keydown', { key: 'Home' }); assert.equal(api.selected, 0);
  const ev = tabs[0].fire('keydown', { key: 'ArrowDown' }); assert.equal(api.selected, 0); assert.ok(!ev.prevented); // horizontal: Down is not ours
  tabs[2].fire('click'); assert.equal(api.selected, 2);
  assert.deepEqual(seen, [0, 1, 3, 0, 3, 0, 2]);                                            // the first entry is the initial selection
  const mod = tabs[2].fire('keydown', { key: 'ArrowRight', ctrlKey: true }); assert.equal(api.selected, 2); assert.ok(!mod.prevented);
});
test('tabs: hidden tabs are skipped; setVisible keeps a visible tab selected', () => {
  const { tabs, panels, api } = make();
  api.setVisible(2, false);
  tabs[1].fire('keydown', { key: 'ArrowRight' }); assert.equal(api.selected, 3);
  api.select(2); assert.notEqual(api.selected, 2);                                        // a hidden tab cannot be selected
  api.select(3); api.setVisible(3, false); assert.ok(!tabs[api.selected].hidden); assert.equal(panels.filter((p) => !p.hidden).length, 1);
  tabs[0].fire('keydown', { key: 'End' }); assert.equal(api.selected, 1);
});
test('tabs: vertical orientation uses Up/Down; initial index; bad arguments throw', () => {
  const { tabs, api } = make(3, { orientation: 'vertical', initial: 1 });
  assert.equal(api.selected, 1);
  tabs[1].fire('keydown', { key: 'ArrowDown' }); assert.equal(api.selected, 2);
  tabs[2].fire('keydown', { key: 'ArrowUp' }); assert.equal(api.selected, 1);
  assert.throws(() => createTabs({ tablist: el('x'), tabs: [el('a')], panels: [] }));
  assert.throws(() => createTabs({}));
});
test('tabs: a throwing onSelect never breaks the helper', () => {
  const { tabs, api } = make(3, { onSelect() { throw new Error('boom'); } });
  assert.doesNotThrow(() => tabs[0].fire('keydown', { key: 'ArrowRight' })); assert.equal(api.selected, 1);
});
