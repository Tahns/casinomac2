// Shared helpers for the QA runner.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FRONT = path.resolve(HERE, '../..');
export const SHOTS = path.join(FRONT, 'tests/shots');
// Live bindings: set by ensureServers() (own free ports per run) and setSid() (unique sessionID per test).
export let GAME = '';
export let RGS = '';
export let SESSION = 'qa-session';
export const RUN_ID = Math.random().toString(36).slice(2, 7);
export function setSid(id) { SESSION = `qa-${RUN_ID}-${id}`; return SESSION; }

const req = createRequire(import.meta.url);
export function loadPlaywright() {
  const tries = [path.join(FRONT, 'node_modules/playwright-core'), '/opt/node-tools/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright', 'playwright-core', 'playwright'];
  for (const t of tries) { try { return req(t); } catch {} }
  throw new Error('playwright(-core) not resolvable');
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function httpJson(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = http.request({ method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'content-type': 'application/json' } }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject); if (body !== undefined) r.write(JSON.stringify(body)); r.end();
  });
}
const sidq = () => '?sid=' + encodeURIComponent(SESSION);
export const mockCfg = (c) => httpJson('POST', RGS + '/__mock/config' + sidq(), c);
export const mockReset = () => mockCfg({ reset: true, reloadFixtures: true });
export const mockLog = () => httpJson('GET', RGS + '/__mock/log' + sidq());
export const mockClear = () => httpJson('POST', RGS + '/__mock/log/clear' + sidq(), {});
export const mockState = () => httpJson('GET', RGS + '/__mock/state' + sidq());
export const plays = (log) => log.filter((l) => l.path.startsWith('/wallet/play'));
export const ends = (log) => log.filter((l) => l.path.startsWith('/wallet/end-round'));

const children = [];
function spawnOwn(script, env, re) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [script], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(c);
    let buf = ''; const to = setTimeout(() => reject(new Error('timeout starting ' + script + ': ' + buf)), 10000);
    c.stdout.on('data', (d) => { buf += d; const m = re.exec(buf); if (m) { clearTimeout(to); resolve(Number(m[1])); } });
    c.stderr.on('data', (d) => { buf += d; });
    c.on('exit', (code) => { clearTimeout(to); reject(new Error(script + ' exited ' + code + ': ' + buf)); });
  });
}
// Always spawns OWN static server + OWN mock RGS (never reuses a running one). Ports: random free ports, or env PORTS="game,rgs".
export async function ensureServers() {
  const [gp, rp] = (process.env.PORTS || '0,0').split(',').map((x) => Number(x) || 0);
  const gamePort = await spawnOwn(path.join(FRONT, 'tools/mock-rgs/static-server.mjs'), { PORT: String(gp) }, /static server http:\/\/localhost:(\d+)/);
  const rgsPort = await spawnOwn(path.join(FRONT, 'tools/mock-rgs/server.mjs'), { MOCK_PORT: String(rp) }, /mock RGS http:\/\/localhost:(\d+)/);
  GAME = 'http://localhost:' + gamePort; RGS = 'http://localhost:' + rgsPort;
  console.log(`own servers: game ${GAME}  rgs ${RGS}  run ${RUN_ID}`);
}
export function stopServers() { for (const c of children) { try { c.removeAllListeners('exit'); c.kill('SIGKILL'); } catch {} } children.length = 0; }
for (const sig of ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { stopServers(); if (sig !== 'exit') process.exit(130); });

export async function waitForGame(maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (fs.existsSync(path.join(FRONT, 'index.html')) && fs.existsSync(path.join(FRONT, 'src/main.js'))) return true;
    await sleep(3000);
  }
  return false;
}

const localOk = (host) => [GAME, RGS].some((b) => { const h = new URL(b).host; return host === h || host === h.replace('localhost', '127.0.0.1'); });
export const VIEWPORTS = [
  { name: '1024x576', width: 1024, height: 576 },
  { name: '400x225', width: 400, height: 225 },
  { name: '800x450', width: 800, height: 450 },
  { name: '425x812', width: 425, height: 812, touch: true },
];

// Page-init instrumentation: keydown defaultPrevented recorder + WebAudio tracker.
const INIT = `(() => {
  window.__qa = { keys: [], ctxs: [], destSources: [], media: [] };
  window.addEventListener('keydown', (e) => { const rec = { code: e.code, key: e.key, target: (e.target && (e.target.id || e.target.tagName)) || '', prevented: false }; window.__qa.keys.push(rec); setTimeout(() => { rec.prevented = e.defaultPrevented; }, 0); }, true);
  window.addEventListener('keydown', (e) => { const rec = window.__qa.keys[window.__qa.keys.length - 1]; if (rec) setTimeout(() => { rec.prevented = e.defaultPrevented; }, 0); }, false);
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const origConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) { try { if (dest && dest instanceof AudioDestinationNode) window.__qa.destSources.push(this); if (dest instanceof AudioNode) (this.__out || (this.__out = [])).push(dest); (window.__qa.nodes || (window.__qa.nodes = new Set())).add(this); } catch (e) {} return origConnect.call(this, dest, ...a); };
    window.__qa.audible = () => { const memo = new Map(); const aud = (n, seen) => { if (n instanceof AudioDestinationNode) return true; if (n instanceof GainNode && n.gain.value < 0.001) return false; if (memo.has(n)) return memo.get(n); if (seen.has(n)) return false; seen.add(n); const r = (n.__out || []).some((m) => aud(m, seen)); memo.set(n, r); return r; }; const srcs = [...(window.__qa.nodes || [])].filter((n) => n instanceof OscillatorNode || n instanceof AudioBufferSourceNode || n instanceof ConstantSourceNode); return { sources: srcs.length, audibleSources: srcs.filter((n) => aud(n, new Set())).length, masterGains: [...window.__qa.nodes].filter((n) => n instanceof GainNode && n.gain.value < 0.001).length }; };
    const W = function (...a) { const c = new AC(...a); window.__qa.ctxs.push(c); return c; };
    W.prototype = AC.prototype; window.AudioContext = W; window.webkitAudioContext = W;
  }
})();`;

export class Session {
  constructor(browser, opts = {}) { this.browser = browser; this.opts = opts; this.reqs = []; this.consoleErrors = []; this.pageErrors = []; this.failed = []; }
  async open(query = {}, o = {}) {
    const vp = o.viewport || VIEWPORTS[0];
    this.ctx = await this.browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await this.ctx.addInitScript(INIT);
    if (o.routes) await o.routes(this.ctx);
    this.page = await this.ctx.newPage();
    const page = this.page;
    page.on('request', (r) => this.reqs.push({ method: r.method(), url: r.url(), post: r.postData() }));
    page.on('requestfailed', (r) => this.failed.push({ url: r.url(), err: r.failure()?.errorText }));
    page.on('console', (m) => { if (m.type() === 'error') this.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => this.pageErrors.push(String(e && e.message || e)));
    const q = { sessionID: SESSION, rgs_url: RGS + '/s/' + encodeURIComponent(SESSION), lang: 'en', device: vp.touch ? 'mobile' : 'desktop', ...query };
    for (const k of Object.keys(q)) if (q[k] === null) delete q[k];
    this.url = GAME + '/index.html?' + new URLSearchParams(q).toString();
    await page.goto(this.url, { waitUntil: 'load' });
    if (!o.noWait) await this.waitIdle(o.idleMs || 12000).catch(() => {});
    return this;
  }
  externalReqs() {
    return this.reqs.filter((r) => { try { const u = new URL(r.url); if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return false; return !localOk(u.host); } catch { return false; } });
  }
  async bodyClass() { return this.page.evaluate(() => document.body.className).catch(() => ''); }
  async waitIdle(ms = 45000) { await this.page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: ms }); }
  async state() { const c = await this.bodyClass(); return (/state-(\w+)/.exec(c) || [])[1] || '?'; }
  async text(sel) { return this.page.locator(sel).first().innerText({ timeout: 1500 }).catch(() => null); }
  async visible(sel) { return this.page.locator(sel).first().isVisible().catch(() => false); }
  async visibleText() { return this.page.evaluate(() => { const t = document.body.innerText || ''; const attrs = [...document.querySelectorAll('[title],[aria-label],[placeholder]')].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => [e.title, e.getAttribute('aria-label'), e.getAttribute('placeholder')].filter(Boolean).join(' | ')); return t + '\n' + attrs.join('\n') + '\n[title] ' + document.title; }); }
  async allText() { return this.page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' '); }); }
  async click(sel, o = {}) { await this.page.locator(sel).first().click({ timeout: 4000, force: o.force, noWaitAfter: true }); }
  async clickIfVisible(sel) { if (await this.visible(sel)) { await this.click(sel).catch(() => {}); return true; } return false; }
  // one full round via bet button; resolves when state returns to idle
  async playRound(o = {}) {
    await this.waitIdle(20000).catch(() => {});
    if (o.turbo !== false) await this.page.evaluate(() => { if (!document.body.classList.contains('turbo')) document.querySelector('#btn-turbo')?.click(); }).catch(() => {});
    await this.click('#btn-bet');
    await sleep(300);
    await this.waitIdle(o.timeout || 60000).catch(() => {});
  }
  async closeOverlays() {
    for (let i = 0; i < 3; i++) {
      await this.page.keyboard.press('Escape').catch(() => {});
      for (const s of ['#message-ok', '#confirm-cancel', '#ap-cancel', '#rules-close', '.rules-close', '[data-close]', '.modal.open .close', '.modal:not([hidden]) button[aria-label*="lose" i]', '.overlay:not([hidden]) button[aria-label*="lose" i]', 'button:has-text("Close")', 'button:has-text("×")']) await this.clickIfVisible(s);
      await sleep(150);
    }
  }
  async close() { await this.ctx?.close().catch(() => {}); }
}

export const nums = (s) => (String(s || '').match(/[0-9]+(?:[.,][0-9]+)?/g) || []).map((x) => parseFloat(x.replace(',', '.')));
export const snippet = (s, n = 160) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
