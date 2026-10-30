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
// WP6 layers (milestones 2-3): blueprint (floor plan), Sealed Orders envelope, Ballroom Blackout spotlight, dossier cutscene + costume
// screen + door transition, debrief tab. They attach themselves to LAYERS on the first dispatch that comes from a real player (a ctx
// with a board element): the list stays empty for a bare import (unit tests of the dispatcher, tools), and the order is
// [layers pushed by others before the first book (test probes), then ours].
import { createBlueprint } from './blueprint.js';
import { createOrders } from './orders.js';
import { createBlackout } from './blackout.js';
import { createDossier } from './dossier.js';
import { createDebrief } from './debrief.js';

export const LAYERS = [];
export const WP6 = { attached: false, layers: null };

/** create and attach the WP6 layers once (idempotent); returns them as { blueprint, orders, blackout, dossier, debrief } */
export function attachLayers() {
  if (WP6.attached) return WP6.layers;
  WP6.attached = true;
  const L = { blueprint: createBlueprint(), dossier: createDossier(), orders: createOrders(), blackout: createBlackout(), debrief: createDebrief() };
  WP6.layers = L;
  LAYERS.push(L.blueprint, L.dossier, L.orders, L.blackout, L.debrief);
  if (typeof window !== 'undefined') { try { window.__mamboLayers = L; } catch (e) { /* ignore */ } }
  return L;
}
const realPlayer = (ctx) => !!(ctx && ctx.board && typeof ctx.board === 'object' && typeof ctx.board.querySelector === 'function');

const isLayer = (l) => !!l && typeof l === 'object' && typeof l.onEvent === 'function';
const warn = (id, what, e) => { try { console.error('layer', id, what, e); } catch (x) { /* ignore */ } };

/** Call every layer for one event. Returns null when no layer returned a Promise, else one Promise that never rejects. */
export function dispatch(ev, ctx) {
  if (!WP6.attached && realPlayer(ctx)) attachLayers();
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
