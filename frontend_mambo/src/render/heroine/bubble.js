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

/**
 * Pure. slot / app: { left, top, width, height } in viewport px, size: { h } height of the bubble as laid out at bubbleWidth(slot).
 * opts: { head: rect of her head in viewport px (optional), avoid: [rects] the bubble must not cover (optional) }.
 * Returns { left, top, width, tailX, tail: 'up' | 'down' } relative to `app`, or null when no bubble fits.
 */
export function placeBubble(slot, app, size, opts = {}) {
  if (!slot || !app || !size) return null;
  if (!(slot.width >= MIN_SLOT_W) || !(slot.height >= MIN_SLOT_H)) return null;
  const w = bubbleWidth(slot);
  const h = Math.max(24, size.h || 40);
  const head = opts && opts.head && opts.head.width > 0 && opts.head.height > 0 ? opts.head : null;
  const avoid = (opts && Array.isArray(opts.avoid) ? opts.avoid : []).filter((r) => r && r.width > 0 && r.height > 0);
  let left = slot.left + slot.width / 2 - w / 2;
  left = clamp(left, app.left + 3, Math.max(app.left + 3, app.left + app.width - w - 3));
  const headX = head ? head.left + head.width / 2 : slot.left + slot.width * 0.52;
  const out = (top, tail) => ({ left: Math.round(left - app.left), top: Math.round(top - app.top), width: w, tailX: Math.round(clamp(headX - left, 14, w - 14)), tail });
  if (!head) {
    // her chin is at about 39% of the full figure: start under it, stay inside the box
    let top = slot.top + slot.height * 0.47;
    top = Math.min(top, slot.top + slot.height - h - 6);
    top = Math.max(top, slot.top + slot.height * 0.3);
    return out(top, 'up');
  }
  const padded = { left: head.left - HEAD_PAD, top: head.top - HEAD_PAD, width: head.width + 2 * HEAD_PAD, height: head.height + 2 * HEAD_PAD };
  const free = (top) => { const r = { left, top, width: w, height: h }; return !intersects(r, padded) && !avoid.some((a) => intersects(r, a)); };
  // 1. under the chin, inside the box (tail up at her head)
  const below = Math.max(slot.top + slot.height * 0.3, head.top + head.height + HEAD_PAD);
  if (below + h <= slot.top + slot.height - 2 && free(below)) return out(below, 'up');
  // 2. above the cap, inside the app (tail down at her head)
  const above = head.top - HEAD_PAD - h;
  if (above >= app.top + 2 && free(above)) return out(above, 'down');
  return null;
}
