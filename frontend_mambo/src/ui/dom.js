// Tiny DOM helpers for the v2 shell (WP1). No framework, no innerHTML for anything that is not trusted markup.

/** h('button', { class: 'x', 'aria-label': 'y', onclick: fn }, child, 'text') -> element. null/false children are skipped. */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** Visible, focusable, enabled descendants in DOM order (used by the dialog focus trap). */
export function focusables(root) {
  if (!root) return [];
  const sel = 'button:not([disabled]),[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  return [...root.querySelectorAll(sel)].filter((e) => {
    if (e.closest('[hidden],[inert]')) return false;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

/** True when the element can receive focus right now (in the document, not hidden, not inert, not disabled). */
export function canFocus(el) {
  if (!el || !el.isConnected || el.disabled) return false;
  if (el.closest('[hidden],[inert]')) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Focus the first candidate that can take it; returns it (or null). */
export function focusFirst(candidates) {
  for (const c of candidates) {
    if (c && canFocus(c)) { try { c.focus({ preventScroll: true }); } catch (e) { c.focus(); } return c; }
  }
  return null;
}

/**
 * Tab / Shift+Tab wrap-around inside a dialog. Call from a keydown listener while the dialog is open.
 * Returns true when it handled the key.
 */
export function trapTab(ev, root) {
  if (ev.key !== 'Tab' || !root) return false;
  const list = focusables(root);
  if (!list.length) { ev.preventDefault(); return true; }
  const first = list[0], last = list[list.length - 1];
  const active = document.activeElement;
  if (!root.contains(active)) { ev.preventDefault(); first.focus(); return true; }
  if (ev.shiftKey && active === first) { ev.preventDefault(); last.focus(); return true; }
  if (!ev.shiftKey && active === last) { ev.preventDefault(); first.focus(); return true; }
  return false;
}
