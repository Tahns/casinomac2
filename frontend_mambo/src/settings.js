// Agent Mambo v2: the ONE preference store (SYNTHESIS 6 and 9, interface frozen in step 0).
//
// Frozen API:  settings.get(key)  settings.set(key, value)  settings.on(key | '*', fn) -> unsubscribe  settings.capabilities
// Everything else here (applyJurisdiction, reset, flush, effective values) is the documented extension surface for WP1 (owner).
//
// Rules:
//  - every storage access is inside try/catch and falls back to an in-memory copy (private mode, blocked data, framed cross-site);
//  - only whitelisted keys are ever read or written; values are validated and clamped on read AND on set;
//  - turbo, autoplay, bet, lang, social and jurisdiction flags are NEVER stored;
//  - audio keys (am_muted, am_vol_*) are owned by audio.js; they are whitelisted here so one helper (`storage`) can serve both;
//  - no network, no fetch, no DOM requirement (works in node for the unit tests).

export const SETTINGS_VERSION = 1;
export const STORAGE_KEYS = Object.freeze(['am_muted', 'am_vol_master', 'am_vol_music', 'am_vol_sfx', 'am_settings']);
const KEY_BLOB = 'am_settings';
const WRITE_DEBOUNCE_MS = 200;
const MAX_ROUND_MS = 60000; // guard against a nonsense unit coming from the RGS (value is assumed to be milliseconds)

// ---------------------------------------------------------------- stored settings (inside the am_settings blob)
// null = "never touched by the player": the effective value then follows the OS media query (reduced motion / contrast).
const MOTION = ['auto', 'full', 'calm', 'still'];
const TEXT_SIZES = [100, 115, 130];
const REMIND = [0, 15, 30, 60];
const SPEC = {
  motion: { def: 'auto', ok: (v) => MOTION.includes(v) },
  reduceFlash: { def: null, ok: (v) => v === null || typeof v === 'boolean' },
  highContrast: { def: null, ok: (v) => v === null || typeof v === 'boolean' },
  ledger: { def: true, ok: (v) => typeof v === 'boolean' },
  text: { def: 100, ok: (v) => TEXT_SIZES.includes(v) },   // reserved (P2)
  remind: { def: 0, ok: (v) => REMIND.includes(v) },       // reserved (cut candidate)
};
export const SETTING_KEYS = Object.freeze(Object.keys(SPEC));
// read-only values derived from the stored ones, the OS media queries and the capabilities
export const DERIVED_KEYS = Object.freeze(['motionLevel', 'flashReduced', 'contrastOn', 'ledgerOn']);

// ---------------------------------------------------------------- capabilities (RGS `jurisdiction`, all 12 flags)
// Positive polarity: `true` = the feature may be offered. Defaults = a market with no restrictions.
// Exact official names beyond the first three are unconfirmed (RGS.md elides them): unknown keys are ignored.
export const FLAG_NAMES = Object.freeze([
  'socialCasino', 'disabledFullscreen', 'disabledTurbo', 'disabledSuperTurbo', 'disabledAutoplay', 'disabledSlamstop',
  'disabledSpacebar', 'disabledBuyFeature', 'displayNetPosition', 'displayRTP', 'displaySessionTimer', 'minimumRoundDuration',
]);
// flag -> capability (one capability per flag)
export const FLAG_TO_CAPABILITY = Object.freeze({
  socialCasino: 'social', disabledFullscreen: 'fullscreen', disabledTurbo: 'turbo', disabledSuperTurbo: 'superTurbo',
  disabledAutoplay: 'autoplay', disabledSlamstop: 'slamstop', disabledSpacebar: 'spacebar', disabledBuyFeature: 'buyFeature',
  displayNetPosition: 'netPosition', displayRTP: 'rtp', displaySessionTimer: 'sessionTimer', minimumRoundDuration: 'minRound',
});
const truthy = (v) => v === true || v === 1 || v === 'true' || v === '1';
const num = (v) => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : 0; };

/** Pure: RGS jurisdiction object (or nothing) -> frozen capabilities snapshot. Never throws. */
export function capabilitiesFrom(flags) {
  const f = flags && typeof flags === 'object' ? flags : {};
  const ms = Math.max(0, Math.min(MAX_ROUND_MS, Math.round(num(f.minimumRoundDuration))));
  const netPosition = truthy(f.displayNetPosition), sessionTimer = truthy(f.displaySessionTimer);
  return Object.freeze({
    social: truthy(f.socialCasino),
    fullscreen: !truthy(f.disabledFullscreen),
    turbo: !truthy(f.disabledTurbo),
    superTurbo: !truthy(f.disabledSuperTurbo),   // we ship one turbo level; replay SKIP factor follows it
    autoplay: !truthy(f.disabledAutoplay),
    slamstop: !truthy(f.disabledSlamstop),       // false = no banner skip before the count-up has ended
    spacebar: !truthy(f.disabledSpacebar),
    buyFeature: !truthy(f.disabledBuyFeature),   // the Secret Entrance button, its dialog and the door picker
    netPosition,                                 // displayNetPosition: session ledger shows net position, locked on
    rtp: truthy(f.displayRTP),
    sessionTimer,                                // displaySessionTimer: session ledger shows elapsed time, locked on
    minRound: ms > 0,                            // minimumRoundDuration set
    minRoundMs: ms,                              // its value in ms (0 = none); next round not before t0 + minRoundMs
    // not RGS driven (extension to the 12 flags):
    anticipation: true,                          // kill switch for the honest slow-roll (SYNTHESIS 4 lever 3)
    ledgerLocked: netPosition || sessionTimer,   // derived: the session summary cannot be switched off
  });
}
export const DEFAULT_CAPABILITIES = capabilitiesFrom(null);

/** Pure (U5): ms still to wait before the next round may start; 0 when no minimum or already past. */
export function remainingRoundMs(t0, now, minMs) {
  const a = Number(t0), b = Number(now), m = Number(minMs);
  if (![a, b, m].every(Number.isFinite) || m <= 0) return 0;
  return Math.max(0, Math.ceil(a + m - b));
}

// ---------------------------------------------------------------- safe storage (whitelist + try/catch + memory fallback)
/** env.storage: a Storage-like object, or a thunk returning one (may throw: a blocked localStorage getter throws). */
export function createStorage(env = {}) {
  const mem = new Map();
  const wl = new Set(STORAGE_KEYS);
  const backend = () => {
    const s = typeof env.storage === 'function' ? env.storage() : env.storage;
    return s || null;
  };
  const get = () => { try { return backend(); } catch (e) { return null; } };
  return {
    read(key) {
      if (!wl.has(key)) return null;
      if (mem.has(key)) return mem.get(key);
      try { const s = get(); if (s) { const v = s.getItem(key); return v == null ? null : String(v); } } catch (e) { /* blocked: memory only */ }
      return null;
    },
    write(key, value) {
      if (!wl.has(key)) return false;
      const v = String(value);
      mem.set(key, v);
      try { const s = get(); if (s) s.setItem(key, v); } catch (e) { return false; } // memory copy keeps working
      return true;
    },
    remove(key) {
      if (!wl.has(key)) return false;
      mem.delete(key);
      try { const s = get(); if (s) s.removeItem(key); } catch (e) { return false; }
      return true;
    },
  };
}

/** Pure (U2): raw am_settings text -> full validated object. Corrupt JSON / wrong version -> defaults; a bad key -> that default. */
export function parseStored(raw) {
  const out = {};
  for (const k of SETTING_KEYS) out[k] = SPEC[k].def;
  if (typeof raw !== 'string' || !raw) return out;
  let o;
  try { o = JSON.parse(raw); } catch (e) { return out; }
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== SETTINGS_VERSION) return out;
  for (const k of SETTING_KEYS) if (Object.prototype.hasOwnProperty.call(o, k) && SPEC[k].ok(o[k])) out[k] = o[k];
  return out;
}

function coerce(key, value) {
  const s = SPEC[key];
  if (!s) return undefined;
  let v = value;
  if (key === 'text' || key === 'remind') v = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if ((key === 'reduceFlash' || key === 'highContrast') && v === undefined) v = null;
  return s.ok(v) ? v : undefined;
}

// ---------------------------------------------------------------- the store
export function createSettings(env = {}) {
  const storage = createStorage({ storage: env.storage !== undefined ? env.storage : () => globalThis.localStorage });
  const mm = typeof env.matchMedia === 'function' ? env.matchMedia : (typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia.bind(globalThis) : null);
  const doc = env.document !== undefined ? env.document : (typeof document !== 'undefined' ? document : null);
  const win = env.window !== undefined ? env.window : (typeof window !== 'undefined' ? window : null);

  let values = parseStored(storage.read(KEY_BLOB));
  let caps = DEFAULT_CAPABILITIES;
  const listeners = new Map(); // key -> Set<fn>
  let timer = 0, dirty = false;

  // OS preferences (live)
  const queries = {};
  const media = (name, q) => {
    try { if (mm && !queries[name]) queries[name] = mm(q); } catch (e) { queries[name] = null; }
    return queries[name] || null;
  };
  const osReduced = () => { const m = media('motion', '(prefers-reduced-motion: reduce)'); return !!(m && m.matches); };
  const osContrast = () => { const m = media('contrast', '(prefers-contrast: more)'); return !!(m && m.matches); };

  function derive() {
    const motionLevel = values.motion === 'auto' ? (osReduced() ? 'calm' : 'full') : values.motion;
    return {
      motionLevel,
      flashReduced: values.reduceFlash === null ? osReduced() : values.reduceFlash,
      contrastOn: values.highContrast === null ? osContrast() : values.highContrast,
      ledgerOn: caps.ledgerLocked ? true : values.ledger,
    };
  }
  let derived = derive();

  function emit(key, value, prev) {
    for (const k of [key, '*']) {
      const set = listeners.get(k);
      if (!set) continue;
      for (const fn of [...set]) { try { fn(value, key, prev); } catch (e) { /* a listener must never break the store */ } }
    }
  }
  function applyDom() {
    try {
      const el = doc && doc.documentElement;
      if (!el || !el.setAttribute) return;
      el.setAttribute('data-motion', derived.motionLevel);
      el.setAttribute('data-flash', derived.flashReduced ? 'reduced' : 'full');
      el.setAttribute('data-contrast', derived.contrastOn ? 'more' : 'normal');
      el.setAttribute('data-text', String(values.text));
    } catch (e) { /* ignore */ }
  }
  // recompute the derived values and tell the listeners about every one that changed
  function refresh() {
    const next = derive();
    const changed = DERIVED_KEYS.filter((k) => next[k] !== derived[k]);
    const prev = derived;
    derived = next;
    applyDom();
    for (const k of changed) emit(k, next[k], prev[k]);
  }

  function write() {
    timer = 0; dirty = false;
    const o = { v: SETTINGS_VERSION };
    for (const k of SETTING_KEYS) if (values[k] !== SPEC[k].def) o[k] = values[k];
    storage.write(KEY_BLOB, JSON.stringify(o));
  }
  function schedule() {
    dirty = true;
    if (timer) return;
    try { timer = setTimeout(write, WRITE_DEBOUNCE_MS); if (timer && typeof timer.unref === 'function') timer.unref(); } catch (e) { write(); }
  }
  function flush() { if (timer) { try { clearTimeout(timer); } catch (e) { /* ignore */ } } if (dirty) write(); timer = 0; }

  const api = {
    /** Stored keys (SETTING_KEYS) and derived read-only keys (DERIVED_KEYS); unknown key -> undefined. */
    get(key) {
      if (Object.prototype.hasOwnProperty.call(SPEC, key)) return values[key];
      if (DERIVED_KEYS.includes(key)) return derived[key];
      return undefined;
    },
    /** Validates; an invalid value is rejected (store unchanged). Returns the value now held for the key. */
    set(key, value) {
      if (!Object.prototype.hasOwnProperty.call(SPEC, key)) return undefined;
      const v = coerce(key, value);
      if (v === undefined) return values[key];
      if (v === values[key]) return v;
      const prev = values[key];
      values[key] = v;
      schedule();
      emit(key, v, prev);
      refresh();
      return v;
    },
    /** on('motion', fn) | on('*', fn): fn(value, key, previousValue). Returns the unsubscribe function. */
    on(key, fn) {
      if (typeof fn !== 'function') return () => {};
      let set = listeners.get(key);
      if (!set) { set = new Set(); listeners.set(key, set); }
      set.add(fn);
      return () => { set.delete(fn); };
    },
    /** Current frozen snapshot; read it at the point of use (a new object replaces it when the flags change). */
    get capabilities() { return caps; },
    /** WP1 calls this once after /wallet/authenticate with config.jurisdiction; applyJurisdiction(null) restores the defaults. */
    applyJurisdiction(flags) {
      const prev = caps;
      caps = capabilitiesFrom(flags);
      let changed = false;
      for (const k of Object.keys(caps)) if (caps[k] !== prev[k]) changed = true;
      if (changed) emit('capabilities', caps, prev);
      refresh();
      return caps;
    },
    /** Defaults for every stored setting (audio levels are reset through audio.js). */
    reset() {
      for (const k of SETTING_KEYS) api.set(k, SPEC[k].def);
      flush();
    },
    flush,
    remainingRoundMs,
    storage,
    get version() { return SETTINGS_VERSION; },
  };

  // live OS preference changes
  for (const [name, q] of [['motion', '(prefers-reduced-motion: reduce)'], ['contrast', '(prefers-contrast: more)']]) {
    const m = media(name, q);
    if (!m) continue;
    try {
      if (typeof m.addEventListener === 'function') m.addEventListener('change', refresh);
      else if (typeof m.addListener === 'function') m.addListener(refresh);
    } catch (e) { /* ignore */ }
  }
  // flush on pagehide / tab hidden so a quick reload keeps the last change
  try {
    if (win && win.addEventListener) win.addEventListener('pagehide', flush);
    if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', () => { if (doc.hidden) flush(); });
  } catch (e) { /* ignore */ }

  applyDom();
  return api;
}

export const settings = createSettings();
export default settings;
