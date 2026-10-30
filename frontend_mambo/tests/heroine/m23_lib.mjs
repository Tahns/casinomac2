// Shared helpers of the WP1/WP2/WP3 M2/M3 browser suites (tests/heroine/visual.mjs, tests/audio/gesture.mjs).
// Spawns its OWN static server and mock RGS (default ports 5932 / 5933, PORTS="a,b" to change), kills only those PIDs.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(import.meta.url);
let pw; try { pw = req('playwright'); } catch { pw = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/')('playwright-core'); }
export const chromium = pw.chromium;

const kids = [];
function spawnOwn(script, env, re) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [script], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    kids.push(c); let buf = '';
    const to = setTimeout(() => reject(new Error('timeout ' + script + ' ' + buf)), 10000);
    c.stdout.on('data', (d) => { buf += d; const m = re.exec(buf); if (m) { clearTimeout(to); resolve(Number(m[1])); } });
    c.stderr.on('data', (d) => { buf += d; });
    c.on('exit', (code) => { clearTimeout(to); reject(new Error(script + ' exited ' + code + ' ' + buf)); });
  });
}
export const stopAll = () => { for (const c of kids) { try { c.removeAllListeners('exit'); c.kill('SIGKILL'); } catch { /* gone */ } } kids.length = 0; };
for (const s of ['exit', 'SIGINT', 'SIGTERM']) process.on(s, () => { stopAll(); if (s !== 'exit') process.exit(130); });

export async function startServers(defPorts) {
  const [gp, rp] = (process.env.PORTS || defPorts).split(',').map(Number);
  const GAME = `http://localhost:${await spawnOwn(path.join(FRONT, 'tools/mock-rgs/static-server.mjs'), { PORT: String(gp) }, /static server http:\/\/localhost:(\d+)/)}`;
  const RGS = `http://localhost:${await spawnOwn(path.join(FRONT, 'tools/mock-rgs/server.mjs'), { MOCK_PORT: String(rp) }, /mock RGS http:\/\/localhost:(\d+)/)}`;
  return { GAME, RGS };
}
export const gameUrl = ({ GAME, RGS }, extra = {}) => {
  const sid = 'm23-' + Math.random().toString(36).slice(2, 8);
  return `${GAME}/index.html?${new URLSearchParams({ sessionID: sid, rgs_url: `${RGS}/s/${sid}`, lang: 'en', device: 'desktop', ...extra })}`;
};

export function reporter() {
  const results = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`); };
  const done = () => { const f = results.filter((r) => !r.ok).length; console.log(`\n${results.length - f} PASS, ${f} FAIL`); stopAll(); process.exit(f ? 1 : 0); };
  return { check, done, results };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const VIEWPORTS = [{ width: 1280, height: 720 }, { width: 1024, height: 576 }, { width: 425, height: 812, touch: true }, { width: 400, height: 225 }];
export function shotsDir(sub) { const d = path.join(FRONT, sub); fs.mkdirSync(d, { recursive: true }); return d; }
