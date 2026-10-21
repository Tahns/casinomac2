// URL parameter parsing. No hardcoded hosts.
export const SUPPORTED_LANGS = ['ar','de','en','es','fi','fr','hi','id','ja','ko','pl','pt','ru','tr','vi','zh'];

function truthy(v) { return v === 'true' || v === '1' || v === 'yes'; }

export function normalizeRgsUrl(raw) {
  if (!raw) return '';
  let u = String(raw).trim();
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
  return u.replace(/\/+$/, '');
}

export function parseParams(search) {
  const q = new URLSearchParams(search || '');
  const lang = (q.get('lang') || 'en').toLowerCase().split(/[-_]/)[0];
  const num = (k) => { const v = q.get(k); return v == null || v === '' ? null : Number(v); };
  return {
    sessionID: q.get('sessionID') || '',
    rgsUrl: normalizeRgsUrl(q.get('rgs_url')),
    lang: SUPPORTED_LANGS.includes(lang) ? lang : 'en',
    currency: (q.get('currency') || '').toUpperCase(),
    device: q.get('device') === 'mobile' ? 'mobile' : 'desktop',
    social: truthy(q.get('social')),
    demo: truthy(q.get('demo')),
    replay: truthy(q.get('replay')),
    replayGame: q.get('game') || '',
    replayVersion: q.get('version') || '',
    replayMode: q.get('mode') || 'base',
    replayEvent: q.get('event') || '',
    replayAmount: num('amount'),
  };
}

export const params = parseParams(typeof location !== 'undefined' ? location.search : '');
