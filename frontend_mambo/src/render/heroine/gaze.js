// Heroine (WP3): gaze targets. Where she looks: the grid (default), the last winning cluster, the Clearance Dial (meter), the spin button,
// the player (the viewer, a glance out of the screen). Pure geometry + a thin DOM reader, so the maths is unit tested in node.
//
// The rig accepts { nx, ny, turn } look targets (nx, ny in -1..1: eyes right/down positive; turn: how far the head/body faces right).
// We compute them from real screen positions, aware of the crop (the figure's eye sits at a different place of the box in the waist-up
// and the face crops) and of the letterboxing of the svg (preserveAspectRatio xMidYMax meet).

export const EYE = Object.freeze({ x: 200, y: 176 });          // the eyes in rig art coordinates (full viewBox 0 0 400 600)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Where the eyes are on screen. box = svg client rect {left,top,width,height}; vb = [x,y,w,h] viewBox of the current crop. */
export function eyeOnScreen(box, vb) {
  if (!box || !vb || !(box.width > 0) || !(box.height > 0)) return null;
  const s = Math.min(box.width / vb[2], box.height / vb[3]);
  const cw = vb[2] * s, ch = vb[3] * s;                          // drawn size; xMid / yMax alignment
  const ox = box.left + (box.width - cw) / 2, oy = box.top + (box.height - ch);
  return { x: ox + (EYE.x - vb[0]) * s, y: oy + (EYE.y - vb[1]) * s, size: cw };
}

/** Look target toward a screen point. eye = eyeOnScreen(), pt = {x,y} in the same (viewport) coordinates. Mirrored: she faces left. */
export function lookToward(eye, pt, mirrored = false) {
  if (!eye || !pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
  const sz = Math.max(60, eye.size);
  const dx = (mirrored ? -1 : 1) * (pt.x - eye.x), dy = pt.y - eye.y;
  return { nx: clamp(dx / (sz * 0.7), -1, 1), ny: clamp(dy / sz, -1, 1), turn: clamp(1 + dx / (sz * 2.4), 0.05, 1) };
}

// named fallbacks (the rig's own numbers) used when the element or the geometry is missing
export const FALLBACK = Object.freeze({
  grid: { nx: 1, ny: 0.12, turn: 0.75 }, spin: { nx: 0.8, ny: 0.5, turn: 0.7 }, meter: { nx: 0.1, ny: -0.7, turn: 0.4 },
  cluster: { nx: 1, ny: 0.12, turn: 0.75 }, player: { nx: -0.25, ny: 0.05, turn: 0.08 },
});

// a point inside an element's box, as fractions of its width / height (centre by default)
const pointOf = (el, fx = 0.5, fy = 0.5) => {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? { x: r.left + r.width * fx, y: r.top + r.height * fy } : null;
};
const centreOf = (el) => pointOf(el);

/**
 * createGaze({ doc, getBox, getViewBox, mirrored }) -> { targets, setCluster, clearCluster, point }
 *   getBox(): the svg client rect (null when not drawn), getViewBox(): the current crop's viewBox array.
 *   targets: the object given to createHeroine({ lookTargets }): grid / cluster / meter / spin / player, each () => {nx,ny,turn}.
 *   setCluster({x,y}): viewport px of the last winning cluster (react('win', { at })); stale after `ttl` ms (default 6000) -> grid.
 */
export function createGaze({ doc, getBox, getViewBox, mirrored = () => false, now = () => Date.now(), ttl = 6000 } = {}) {
  let cluster = null, clusterAt = 0;
  const q = (sel) => { try { return doc && doc.querySelector(sel); } catch (e) { return null; } };
  const aim = (pt, name) => {
    try { const eye = eyeOnScreen(getBox && getBox(), getViewBox && getViewBox()); const l = pt && eye ? lookToward(eye, pt, mirrored()) : null; return l || FALLBACK[name]; } catch (e) { return FALLBACK[name]; }
  };
  const points = {
    // she stands low in the left column: she watches the lower left part of the board (the symbols nearest to her), not its far top corner
    grid: () => pointOf(q('.board-wrap') || q('#game'), 0.3, 0.6),
    spin: () => centreOf(q('#btn-bet')),
    meter: () => { const m = q('#meter-slot .mm:not([hidden]) .mm-badge') || q('#meter-slot .mm:not([hidden])'); return m ? centreOf(m) : null; },
    cluster: () => (cluster && now() - clusterAt < ttl ? cluster : points.grid()),
  };
  const targets = {
    grid: () => aim(points.grid(), 'grid'), spin: () => aim(points.spin(), 'spin'), meter: () => aim(points.meter(), 'meter'),
    cluster: () => aim(points.cluster(), 'cluster'), player: () => FALLBACK.player,
  };
  return {
    targets,
    point: (name) => (points[name] ? points[name]() : null),
    setCluster(pt) { if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) { cluster = { x: pt.x, y: pt.y }; clusterAt = now(); } },
    clearCluster() { cluster = null; },
  };
}
