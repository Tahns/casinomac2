// RGS client. All URLs built from params.rgsUrl; never hardcoded.
import { params } from './params.js';

export class RgsError extends Error {
  constructor(code, message, status) {
    super(message || code);
    this.name = 'RgsError';
    this.code = code;
    this.status = status || 0;
  }
}

// RGS code -> UI error category (i18n key suffix)
export function mapError(code) {
  switch (code) {
    case 'ERR_VAL': return 'validation';
    case 'ERR_IPB': return 'insufficient';
    case 'ERR_GLE': return 'limit';
    case 'ERR_ACT': return 'retry';
    case 'ERR_IS': case 'ERR_ATE': return 'session';
    case 'ERR_CONN': return 'connection';
    case 'ERR_AUTH': return 'auth';
    case 'ERR_TIMEOUT': return 'connection';
    default: return 'generic';
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRgs(opts = {}) {
  const base = opts.rgsUrl ?? params.rgsUrl;
  const sessionID = opts.sessionID ?? params.sessionID;
  const timeoutMs = opts.timeoutMs ?? 15000;
  const retryDelay = opts.retryDelay ?? 700;
  const doFetch = opts.fetchImpl || ((...a) => fetch(...a));

  async function once(path, init) {
    if (!base) throw new RgsError('ERR_CONN', 'Missing rgs_url');
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    let res;
    try {
      res = await doFetch(base + path, { ...init, signal: ctl && ctl.signal });
    } catch (e) {
      throw new RgsError(e && e.name === 'AbortError' ? 'ERR_TIMEOUT' : 'ERR_CONN', String(e && e.message || e));
    } finally { if (timer) clearTimeout(timer); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok) {
      const code = data && (data.code || data.error);
      throw new RgsError(typeof code === 'string' && code.startsWith('ERR_') ? code : (data ? 'ERR_GEN' : 'ERR_CONN'),
        (data && (data.message || data.error)) || ('HTTP ' + res.status), res.status);
    }
    if (data === null || typeof data !== 'object') throw new RgsError('ERR_CONN', 'Invalid response (not JSON)', res.status);
    if (typeof data.code === 'string' && data.code.startsWith('ERR_')) throw new RgsError(data.code, data.message, res.status);
    return data;
  }

  async function request(path, init, retries = 3) {
    for (let i = 0; ; i++) {
      try { return await once(path, init); }
      catch (e) {
        if (e.code === 'ERR_ACT' && i < retries) { await sleep(retryDelay); continue; }
        throw e;
      }
    }
  }
  const post = (path, body) => request(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionID, ...body }),
  });

  return {
    async authenticate() {
      if (!sessionID) throw new RgsError('ERR_AUTH', 'Missing sessionID');
      const d = await post('/wallet/authenticate', {});
      if (!d.balance || typeof d.balance.amount !== 'number' || !d.config) throw new RgsError('ERR_AUTH', 'Invalid authenticate response');
      return d; // {balance:{amount,currency}, config, round}
    },
    balance: () => post('/wallet/balance', {}),
    play: (amountMicro, mode) => post('/wallet/play', { amount: Math.round(amountMicro), mode }),
    endRound: () => post('/wallet/end-round', {}),
    betEvent: (event) => post('/bet/event', { event }),
    fetchReplay: (game, version, mode, event) => request(
      `/bet/replay/${encodeURIComponent(game)}/${encodeURIComponent(version)}/${encodeURIComponent(mode)}/${encodeURIComponent(event)}`,
      { method: 'GET' }),
  };
}

const def = createRgs();
export const authenticate = (...a) => def.authenticate(...a);
export const balance = (...a) => def.balance(...a);
export const play = (...a) => def.play(...a);
export const endRound = (...a) => def.endRound(...a);
export const betEvent = (...a) => def.betEvent(...a);
export const fetchReplay = (...a) => def.fetchReplay(...a);
