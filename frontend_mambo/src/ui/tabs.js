// ONE tabs helper, WAI-ARIA Authoring Practices "Tabs with automatic activation" (WP1). Used by the settings dialog;
// src/rules.js (WP11) may adopt it for the rules screen: createTabs({ tablist, tabs, panels, onSelect }).
//
// tabs / panels: arrays of elements in the same order (tab i controls panel i). The helper sets role, ids, aria-selected,
// aria-controls, aria-labelledby, roving tabindex and the `hidden` attribute of the panels. Keys: ArrowRight / ArrowLeft
// (wrap), Home, End (ArrowDown / ArrowUp too when orientation is 'vertical'). A tab with the `hidden` attribute is skipped.
//
// Returns { select(indexOrEl, { focus }), selected, setVisible(index, bool), refresh(), destroy() }.

let UID = 0;

export function createTabs({ tablist, tabs, panels, initial = 0, onSelect, orientation = 'horizontal', idPrefix } = {}) {
  if (!tablist || !tabs || !panels || tabs.length !== panels.length) throw new Error('createTabs: tablist, tabs and panels (same length) are required');
  const pre = idPrefix || `tabs${++UID}`;
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-orientation', orientation);
  let current = -1;

  tabs.forEach((tab, i) => {
    const panel = panels[i];
    if (!tab.id) tab.id = `${pre}-tab-${i}`;
    if (!panel.id) panel.id = `${pre}-panel-${i}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '0'); // scrollable panels must be keyboard reachable
    tab.setAttribute('tabindex', '-1');
    tab.setAttribute('aria-selected', 'false');
    panel.hidden = true;
  });

  const visibleIdx = () => tabs.map((t, i) => i).filter((i) => !tabs[i].hidden);
  const onClick = (ev) => { const i = tabs.indexOf(ev.currentTarget); if (i >= 0) select(i); };
  const onKey = (ev) => {
    const i = tabs.indexOf(ev.currentTarget);
    if (i < 0 || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const vis = visibleIdx();
    if (!vis.length) return;
    const pos = Math.max(0, vis.indexOf(i));
    const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    let target = null;
    if (ev.key === next) target = vis[(pos + 1) % vis.length];
    else if (ev.key === prev) target = vis[(pos - 1 + vis.length) % vis.length];
    else if (ev.key === 'Home') target = vis[0];
    else if (ev.key === 'End') target = vis[vis.length - 1];
    if (target === null) return;
    ev.preventDefault();
    select(target, { focus: true });
  };
  // arrow-key handling of a tab list lives on the tabs themselves (the Space shortcut of the game is a window listener in main.js)
  const ARROWS = 'keydown';
  tabs.forEach((tab) => { tab.addEventListener('click', onClick); tab.addEventListener(ARROWS, onKey); });

  function select(which, { focus = false } = {}) {
    let i = typeof which === 'number' ? which : tabs.indexOf(which);
    if (i < 0 || i >= tabs.length || tabs[i].hidden) { const vis = visibleIdx(); if (!vis.length) return current; i = vis[0]; }
    const changed = i !== current;
    tabs.forEach((tab, k) => {
      const on = k === i;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.setAttribute('tabindex', on ? '0' : '-1');
      panels[k].hidden = !on;
    });
    current = i;
    if (focus) tabs[i].focus();
    if (changed && typeof onSelect === 'function') { try { onSelect(i, tabs[i], panels[i]); } catch (e) { /* a listener never breaks the tabs */ } }
    return i;
  }
  /** Show or hide one tab (and its panel); keeps a visible tab selected. */
  function setVisible(i, visible) {
    tabs[i].hidden = !visible;
    if (!visible) panels[i].hidden = true;
    if (!visible && current === i) select(visibleIdx()[0] ?? 0);
  }
  /** Call after tabs were shown/hidden from outside. */
  function refresh() { if (current < 0 || tabs[current].hidden) select(visibleIdx()[0] ?? 0); }
  function destroy() { tabs.forEach((tab) => { tab.removeEventListener('click', onClick); tab.removeEventListener(ARROWS, onKey); }); }

  select(Math.min(Math.max(0, initial), tabs.length - 1));
  return { select, get selected() { return current; }, setVisible, refresh, destroy };
}
export default createTabs;
