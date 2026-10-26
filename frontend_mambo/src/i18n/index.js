// i18n: t(key, vars), t.mode(name), applyI18n(root), setLang, setSocial.
import { en as enBase } from './en.js';
import { en_ui } from './en_ui.js';
import { en_hero } from './en_hero.js';
import { en_layers } from './en_layers.js';
import { en_rules } from './en_rules.js';
import { social, SOCIAL_REPLACEMENTS } from './social.js';

// v2: en.js plus the work-package partials, merged in this order; a later partial (and any partial over en.js) wins.
// EN is the one English table every lookup below uses (also exported for the renderer's key checks).
export const EN = Object.freeze({ ...enBase, ...en_ui, ...en_hero, ...en_layers, ...en_rules });
const en = EN;

const LANGS = { en };
let params = {};
try {
  // params.js is written by CORE; tolerate absence or non-browser environments.
  ({ params } = await import('../params.js'));
} catch (e) {
  params = {};
}

let lang = 'en';
let socialMode = !!(params && params.social);

export function setLang(l) {
  const k = String(l || 'en').toLowerCase().split(/[-_]/)[0];
  lang = LANGS[k] ? k : 'en';
  return lang;
}
export function getLang() { return lang; }
export function setSocial(b) { socialMode = !!b; }
export function isSocial() { return socialMode; }
setLang(params && params.lang);

function matchCase(src, rep) {
  if (src.length > 1 && src === src.toUpperCase() && /[A-Z]/.test(src)) return rep.toUpperCase();
  if (/^[A-Z]/.test(src)) return rep.charAt(0).toUpperCase() + rep.slice(1);
  return rep;
}

/** Replace restricted words with social-safe ones (whole word, case-insensitive). */
export function socialize(text) {
  let s = String(text);
  for (const [re, rep] of SOCIAL_REPLACEMENTS) s = s.replace(re, (m) => matchCase(m, rep));
  return s;
}

function humanise(key) {
  const last = String(key == null ? '' : key).split('.').pop() || '';
  const s = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, name) => {
    const v = vars ? vars[name] : undefined;
    if (v === undefined || v === null) return '';
    if (typeof v === 'number' && !Number.isFinite(v)) return '';
    const out = String(v);
    return out === 'NaN' || out === 'undefined' || out === 'null' ? '' : out;
  });
}

export function t(key, vars) {
  let raw;
  const table = LANGS[lang] || en;
  if (socialMode && Object.prototype.hasOwnProperty.call(social, key)) raw = social[key];
  else if (Object.prototype.hasOwnProperty.call(table, key)) raw = table[key];
  else if (Object.prototype.hasOwnProperty.call(en, key)) raw = en[key];
  else raw = humanise(key);
  let out = interpolate(String(raw), vars).replace(/\s{2,}/g, ' ').trim();
  if (socialMode) out = socialize(out);
  return out;
}

/** Mode display name; identical in normal and social, base game and SECRET ENTRANCE. */
t.mode = function mode(name) {
  const n = String(name || '').toLowerCase();
  if (n === 'bonus' || n === 'unleash' || n === 'unleashed') return t('mode.bonus');
  if (n === 'base' || n === 'basegame' || n === 'base game') return t('mode.base');
  if (n === 'entrance_orders') return t('mode.entrance_orders');
  if (n === 'entrance_blackout') return t('mode.entrance_blackout');
  if (n === 'freegame' || n === 'free') return t('mode.freegame');
  const h = humanise(n);
  return socialMode ? socialize(h) : h;
};

export function allKeys() { return Object.keys(en); }
export function hasKey(key) { return Object.prototype.hasOwnProperty.call(en, key); }

export function applyI18n(root) {
  const doc = root || (typeof document !== 'undefined' ? document : null);
  if (!doc || !doc.querySelectorAll) return;
  const vars = (el) => {
    try { return el.dataset && el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : undefined; } catch (e) { return undefined; }
  };
  doc.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'), vars(el));
  });
  doc.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const v = t(el.getAttribute('data-i18n-title'), vars(el));
    el.setAttribute('title', v);
    el.setAttribute('aria-label', v);
  });
  doc.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'), vars(el)));
  });
  doc.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'), vars(el)));
  });
  if (typeof document !== 'undefined' && (!root || root === document)) {
    try { document.title = t('game.title'); } catch (e) { /* ignore */ }
  }
}

export default t;
