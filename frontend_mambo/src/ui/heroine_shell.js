// Heroine shell (WP1): the box the heroine rig (WP3) is drawn into, LEFT of the grid, and the logic that keeps it from ever
// overlapping the grid or a button. WP3 only has to draw into #heroine-slot; this module does the rest:
//
//  - the slot stays `hidden` (and the v1 #mascot-slot stays shown) until the slot has content (an <svg> or any element);
//    when the rig arrives the slot is shown, #mascot-slot is hidden and <body> gets `has-heroine`;
//  - landscape (aspect > 11/10): the slot is the grid area `mascot` of the left column (styles.css / ui.css), full figure;
//    under 140 px high it asks for the waist-up crop (under 80 px the face crop) so she still reads;
//  - portrait (aspect <= 11/10): no vertical room is left for a full figure, so the slot becomes a waist-up (bust) or
//    face (head) corner box placed in the largest free rectangle at the left edge that touches neither the grid frame, the
//    logo, a HUD panel nor a visible button; when nothing fits the slot is hidden;
//  - the decision is published as slot.dataset.mode ('left' | 'corner' | 'none'), slot.dataset.crop ('full' | 'bust' | 'head')
//    and the event `am:heroine-layout` { mode, crop, rect } on the slot, so WP3 can call createHeroine / setCrop.
//
// Pure helper (unit tested): findCorner(obstacles, view, candidates).

export const PORTRAIT_QUERY = '(max-aspect-ratio: 11/10)';
// ratio = width / height of the crop (rig viewBoxes: bust 226x322, head 160x176); hMin = smallest height that still reads
export const CORNER_CANDIDATES = Object.freeze([
  Object.freeze({ crop: 'bust', ratio: 226 / 322, hMin: 96 }),
  Object.freeze({ crop: 'head', ratio: 160 / 176, hMin: 72 }),
]);
const BUST_H = 140; // landscape box shorter than this -> waist-up crop
const HEAD_H = 80;  // ... and shorter than this -> face-and-cap crop (a full body would be a speck)

const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/**
 * Pure. obstacles: [{l,t,r,b}] (already padded), view: {w,h}. Looks for the largest candidate (bust first, then head) that fits
 * in a rectangle anchored at x = pad, preferring the lowest position. Returns { crop, x, y, w, h } or null.
 */
export function findCorner(obstacles, view, { candidates = CORNER_CANDIDATES, pad = 4, step = 4, maxH = null, maxW = null } = {}) {
  const hCap = Math.min(maxH ?? view.h * 0.3, 260);
  const wCap = maxW ?? view.w * 0.45;
  for (const c of candidates) {
    for (let h = Math.floor(hCap); h >= c.hMin; h -= step) {
      const w = Math.round(h * c.ratio);
      if (w > wCap) continue;
      for (let y = view.h - h - pad; y >= pad; y -= step) {
        const r = { l: pad, t: y, r: pad + w, b: y + h };
        if (!obstacles.some((o) => hit(r, o))) return { crop: c.crop, x: pad, y, w, h };
      }
    }
  }
  return null;
}

export function initHeroineShell({ doc = typeof document !== 'undefined' ? document : null, win = typeof window !== 'undefined' ? window : null, settings = null } = {}) {
  const slot = doc && doc.getElementById('heroine-slot');
  const app = doc && doc.getElementById('app');
  if (!slot || !app || !win) return { layout() {}, destroy() {}, get mode() { return 'none'; } };
  const old = doc.getElementById('mascot-slot');
  const mq = typeof win.matchMedia === 'function' ? win.matchMedia(PORTRAIT_QUERY) : null;
  let raf = 0, last = '';

  const hasRig = () => slot.childElementCount > 0;
  const rectOf = (el, pad = 0) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    return { l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad };
  };
  function obstacles() {
    const list = [];
    const add = (o) => { if (o) list.push(o); };
    const board = doc.querySelector('.board-wrap') || doc.getElementById('game');
    const b = rectOf(board, 8);
    if (b) { add(b); add({ l: b.l, r: b.r, t: b.t - 38, b: b.t }); } // + the Clearance Dial strip above the grid
    add(rectOf(doc.querySelector('#logo-area .logo svg') || doc.getElementById('logo-area'), 2));
    doc.querySelectorAll('#hud-info .stat').forEach((e) => add(rectOf(e, 4)));
    doc.querySelectorAll('#hud-ctrl .tbtn, #hud-ctrl .spin, #hud-ctrl .unleash').forEach((e) => add(rectOf(e, 6)));
    doc.querySelectorAll('#replay-ui, #replay-bar:not([hidden])').forEach((e) => add(rectOf(e, 4)));
    return list;
  }

  function publish(mode, crop, rect) {
    const key = `${mode}|${crop}|${rect ? [rect.x, rect.y, rect.w, rect.h].join(',') : ''}`;
    slot.dataset.mode = mode; slot.dataset.crop = crop;
    if (key === last) return;
    last = key;
    try { slot.dispatchEvent(new win.CustomEvent('am:heroine-layout', { bubbles: true, detail: { mode, crop, rect: rect || null } })); } catch (e) { /* ignore */ }
  }

  function layout() {
    raf = 0;
    const rig = hasRig();
    doc.body.classList.toggle('has-heroine', rig);
    if (old) old.hidden = rig;           // retire the v1 mascot box once the rig is in
    if (!rig) { slot.hidden = true; publish('none', 'full', null); return; }
    const portrait = !!(mq && mq.matches);
    if (!portrait) {
      slot.hidden = false;
      slot.style.removeProperty('--hx'); slot.style.removeProperty('--hy'); slot.style.removeProperty('--hw'); slot.style.removeProperty('--hh');
      const r = slot.getBoundingClientRect();
      publish('left', r.height > 0 && r.height < HEAD_H ? 'head' : r.height > 0 && r.height < BUST_H ? 'bust' : 'full', null);
      return;
    }
    const view = { w: win.innerWidth, h: win.innerHeight };
    const spot = findCorner(obstacles(), view);
    if (!spot) { slot.hidden = true; publish('none', 'full', null); return; }
    slot.style.setProperty('--hx', spot.x + 'px'); slot.style.setProperty('--hy', spot.y + 'px');
    slot.style.setProperty('--hw', spot.w + 'px'); slot.style.setProperty('--hh', spot.h + 'px');
    slot.hidden = false;
    publish('corner', spot.crop, spot);
  }
  const schedule = () => { if (!raf) raf = win.requestAnimationFrame(layout); };

  const offs = [];
  try { const mo = new win.MutationObserver(schedule); mo.observe(slot, { childList: true }); offs.push(() => mo.disconnect()); } catch (e) { /* ignore */ }
  try {
    const mo2 = new win.MutationObserver(schedule);
    for (const id of ['hud-ctrl', 'hud-info']) { const e = doc.getElementById(id); if (e) mo2.observe(e, { attributes: true, attributeFilter: ['hidden', 'class', 'style'], subtree: true, childList: true }); }
    mo2.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    offs.push(() => mo2.disconnect());
  } catch (e) { /* ignore */ }
  try {
    const ro = new win.ResizeObserver(schedule);
    for (const id of ['app', 'hud-ctrl', 'hud-info', 'game']) { const e = doc.getElementById(id); if (e) ro.observe(e); }
    offs.push(() => ro.disconnect());
  } catch (e) { /* ignore */ }
  win.addEventListener('resize', schedule);
  offs.push(() => win.removeEventListener('resize', schedule));
  if (settings && typeof settings.on === 'function') offs.push(settings.on('capabilities', schedule));
  schedule();

  return {
    layout: () => { if (raf) { win.cancelAnimationFrame(raf); raf = 0; } layout(); },
    destroy() { offs.forEach((f) => f()); if (raf) win.cancelAnimationFrame(raf); },
    get mode() { return slot.dataset.mode || 'none'; },
  };
}
