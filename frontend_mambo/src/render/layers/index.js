// Agent Mambo v2: bonus/overlay layers (WP6 owns this folder). Frozen in step 0.
//
// A layer is a plain object:  { id: string, onEvent(ev, ctx) -> void | Promise, reset() -> void }
//   - onEvent is called for EVERY book event, in book order, right when the event player (render/index.js, WP4) reaches it.
//     A layer ignores the events it does not care about. When it returns a Promise the player waits for it together with its
//     own handling of the same event (both run at the same time); a rejection or a throw is logged and never stops the book.
//   - reset() is called at the start and at the end of every book (and whenever the player is destroyed): remove all DOM and
//     timers the layer owns. It must be safe to call twice.
//   - `ctx` is the object built by the player (see docs/v2/INTERFACES.md): { app, board, wrap, geo, T, sleep, ... }. Fields are only ever added.
//
// WP6 registers its layers here (static imports, then list them in LAYERS). Step 0 ships the empty list: v1 plays unchanged.
export const LAYERS = [];

const isLayer = (l) => !!l && typeof l === 'object' && typeof l.onEvent === 'function';
const warn = (id, what, e) => { try { console.error('layer', id, what, e); } catch (x) { /* ignore */ } };

/** Call every layer for one event. Returns null when no layer returned a Promise, else one Promise that never rejects. */
export function dispatch(ev, ctx) {
  let waits = null;
  for (const layer of LAYERS) {
    if (!isLayer(layer)) continue;
    try {
      const r = layer.onEvent(ev, ctx);
      if (r && typeof r.then === 'function') (waits || (waits = [])).push(Promise.resolve(r).catch((e) => warn(layer.id, 'onEvent', e)));
    } catch (e) { warn(layer.id, 'onEvent', e); }
  }
  return waits ? Promise.all(waits).then(() => undefined) : null;
}

/** Reset every layer (start/end of a book, destroy). Never throws. */
export function resetLayers() {
  for (const layer of LAYERS) {
    if (!layer || typeof layer.reset !== 'function') continue;
    try { layer.reset(); } catch (e) { warn(layer.id, 'reset', e); }
  }
}

export default LAYERS;
