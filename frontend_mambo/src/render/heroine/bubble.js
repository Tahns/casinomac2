// Heroine (WP3): speech bubble placement. The slot clips everything that leaves her column (clip-path), so the bubble is a sibling
// in #app, positioned from the slot's rectangle. In the left column there is no free room next to her (HUD plates above, the grid
// on the right), so the bubble goes over her own skirt and legs, with the tail pointing up at her head: it never covers a number,
// a button or a symbol. A box too small for readable text (waist-up corner in portrait, face crop in a compact landscape) gets no
// visible bubble at all; the lines are flavour, the bubble is aria-hidden.

export const MIN_SLOT_W = 118;     // CSS px: narrower boxes show no bubble
export const MIN_SLOT_H = 150;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Width of the bubble for a slot (so the caller can lay the text out and measure its height before placing it). */
export const bubbleWidth = (slot) => clamp(Math.round((slot && slot.width ? slot.width : 0) + 8), 124, 210);

/**
 * Pure. slot / app: { left, top, width, height } in viewport px, size: { h } height of the bubble as laid out at bubbleWidth(slot).
 * Returns { left, top, width, tailX } relative to `app`, or null when no bubble fits.
 */
export function placeBubble(slot, app, size) {
  if (!slot || !app || !size) return null;
  if (!(slot.width >= MIN_SLOT_W) || !(slot.height >= MIN_SLOT_H)) return null;
  const w = bubbleWidth(slot);
  const h = Math.max(24, size.h || 40);
  let left = slot.left + slot.width / 2 - w / 2;
  left = clamp(left, app.left + 3, Math.max(app.left + 3, app.left + app.width - w - 3));
  // her chin is at about 39% of the full figure: start under it, stay inside the box
  let top = slot.top + slot.height * 0.47;
  top = Math.min(top, slot.top + slot.height - h - 6);
  top = Math.max(top, slot.top + slot.height * 0.3);
  const headX = slot.left + slot.width * 0.52;
  return { left: Math.round(left - app.left), top: Math.round(top - app.top), width: w, tailX: Math.round(clamp(headX - left, 14, w - 14)) };
}
