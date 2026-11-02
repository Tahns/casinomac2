// Heroine (WP3): speech bubble placement. The slot clips everything that leaves her column (clip-path), so the bubble is a sibling
// in #app, positioned from the slot's rectangle. In the left column there is no free room next to her (HUD plates above, the grid
// on the right), so the bubble goes over her own skirt and legs, with the tail pointing up at her head: it never covers a number,
// a button or a symbol. A box too small for readable text (waist-up corner in portrait, face crop in a compact landscape) gets no
// visible bubble at all; the lines are flavour, the bubble is aria-hidden.
//
// v2 round 2 (NEW-bubble-hides-face-portrait): the bubble never covers her face. The caller passes the live head rectangle (the rig's
// head group: hair, cap, face, chin) and the rectangles it must not cover (buttons, HUD plates). The bubble goes under the chin
// (tail up) when it fits inside the box, else above the cap (tail down) when that is free, else it is not shown. In the portrait bust
// the face fills the top of the box, so the bubble sits on her chest, below the chin, never over the eyes or the mouth.

export const MIN_SLOT_W = 118;     // CSS px: narrower boxes show no bubble
export const MIN_SLOT_H = 150;
export const HEAD_PAD = 8;         // px kept free around the head rectangle (the 14 px tail may reach into it, the box never does)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Width of the bubble for a slot (so the caller can lay the text out and measure its height before placing it). */
export const bubbleWidth = (slot) => clamp(Math.round((slot && slot.width ? slot.width : 0) + 8), 124, 210);

/** Pure: do two { left, top, width, height } rectangles overlap (touching edges do not count)? */
export const intersects = (a, b) => !!(a && b && a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height);

export const VIEW_PAD = 4;         // px kept free at the viewport edges (left, right, bottom; the top too)

/**
 * Pure. slot / app: { left, top, width, height } in viewport px, size: { h } height of the bubble as laid out at bubbleWidth(slot).
 * opts: { head: rect of her head in viewport px (optional), avoid: [rects] the bubble must not cover (optional),
 *         viewport: { width, height } (innerWidth / innerHeight, optional) }.
 * Returns { left, top, width, tailX, tail: 'up' | 'down' } relative to `app`, or null when no bubble fits.
 *
 * v2 round 2 (bubble containment): with a viewport the bubble rectangle stays in [VIEW_PAD, width - VIEW_PAD] horizontally (its width
 * shrinks to fit a viewport narrower than the bubble) and its bottom at or above height - VIEW_PAD (its top at or below VIEW_PAD). When the
 * centred spot is taken (the head pad, an avoided rectangle) the bubble is shifted right over free space, up to the right edge of her box.
 */
export function placeBubble(slot, app, size, opts = {}) {
  if (!slot || !app || !size) return null;
  if (!(slot.width >= MIN_SLOT_W) || !(slot.height >= MIN_SLOT_H)) return null;
  const vp = opts && opts.viewport && opts.viewport.width > 0 && opts.viewport.height > 0 ? opts.viewport : null;
  const w = vp ? Math.min(bubbleWidth(slot), Math.floor(vp.width - 2 * VIEW_PAD)) : bubbleWidth(slot);
  if (!(w >= 60)) return null;
  const h = Math.max(24, size.h || 40);
  const head = opts && opts.head && opts.head.width > 0 && opts.head.height > 0 ? opts.head : null;
  const avoid = (opts && Array.isArray(opts.avoid) ? opts.avoid : []).filter((r) => r && r.width > 0 && r.height > 0);
  // horizontal range: inside the app (3 px), and inside the viewport (VIEW_PAD) when it is given
  let minL = app.left + 3, maxL = Math.max(minL, app.left + app.width - w - 3);
  if (vp) { minL = Math.max(minL, VIEW_PAD); maxL = Math.min(maxL, vp.width - VIEW_PAD - w); if (maxL < minL) maxL = minL = Math.max(VIEW_PAD, Math.min(minL, vp.width - VIEW_PAD - w)); }
  const maxBottom = vp ? vp.height - VIEW_PAD : Infinity, minTop = vp ? VIEW_PAD : -Infinity;
  // whole pixels (the result is rounded): the rectangle tested for overlaps is the one drawn
  minL = Math.ceil(minL); maxL = Math.max(minL, Math.floor(maxL));
  const base = clamp(Math.round(slot.left + slot.width / 2 - w / 2), minL, maxL);
  // candidate lefts: the centred one, then steps to the right over free space (not past the right edge of her box, nor the range)
  const lefts = [base];
  for (let x = base + 6, end = Math.min(maxL, slot.left + slot.width); x <= end; x += 6) lefts.push(x);
  const headX = head ? head.left + head.width / 2 : slot.left + slot.width * 0.52;
  const out = (left, top, tail) => ({ left: Math.round(left - app.left), top: Math.round(top - app.top), width: w, tailX: Math.round(clamp(headX - left, 14, w - 14)), tail });
  if (!head) {
    // her chin is at about 39% of the full figure: start under it, stay inside the box (and above the bottom of the viewport)
    let top = slot.top + slot.height * 0.47;
    top = Math.min(top, slot.top + slot.height - h - 6);
    top = Math.max(top, slot.top + slot.height * 0.3);
    if (vp) { top = Math.floor(Math.min(top, maxBottom - h)); if (top < minTop) return null; }
    return out(base, top, 'up');
  }
  const padded = { left: head.left - HEAD_PAD, top: head.top - HEAD_PAD, width: head.width + 2 * HEAD_PAD, height: head.height + 2 * HEAD_PAD };
  const free = (left, top) => { const r = { left, top, width: w, height: h }; return !intersects(r, padded) && !avoid.some((a) => intersects(r, a)); };
  // 1. under the chin, inside the box (tail up at her head)
  const below = Math.ceil(Math.max(slot.top + slot.height * 0.3, head.top + head.height + HEAD_PAD));
  if (below + h <= slot.top + slot.height - 2 && below + h <= maxBottom) { for (const l of lefts) if (free(l, below)) return out(l, below, 'up'); }
  // 2. above the cap, inside the app (tail down at her head)
  const above = Math.floor(head.top - HEAD_PAD - h);
  if (above >= app.top + 2 && above >= minTop && above + h <= maxBottom) { for (const l of lefts) if (free(l, above)) return out(l, above, 'down'); }
  return null;
}
