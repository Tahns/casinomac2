// Writes (or checks) the A4 baseline: an OfflineAudioContext render of every v1 cue and both beds with the engine as it
// was BEFORE the v2 buses (WP2). The fixture is tests/audio/fixtures/baseline_v1.json; audio.test.mjs compares against it.
//   PORT=5830 node tests/audio/baseline_render.mjs --write     record
//   PORT=5830 node tests/audio/baseline_render.mjs --check     render again and compare with the stored file (stability check)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v1Specs, inPageRender, compareRenders } from './render_cases.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const FIX = path.join(HERE, 'fixtures', 'baseline_v1.json');
const PORT = process.env.PORT || '5830';
const URL = `http://localhost:${PORT}/tests/audio/harness.html`;
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up() { try { return (await fetch(URL)).ok; } catch (e) { return false; } }
let srv = null;
if (!(await up())) { srv = spawn('node', ['serve.mjs'], { cwd: FRONT, env: { ...process.env, PORT }, stdio: 'ignore' }); for (let i = 0; i < 40 && !(await up()); i++) await sleep(150); }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium/chrome') ? '/opt/pw-browsers/chromium/chrome' : '/opt/pw-browsers/chromium'), args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror ' + e.message));
await page.goto(URL); await page.waitForFunction(() => window.__ready);
const res = await page.evaluate(inPageRender, [v1Specs(), {}]);
await browser.close(); if (srv) srv.kill();

if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(FIX), { recursive: true });
  const doc = { about: 'A4 baseline: OfflineAudioContext(2ch, 44100) render of every v1 cue and both beds with the pre-v2 engine (default options, limiter on). Values in dBFS: overall rms and peak, plus rms per window.', sampleRate: 44100, cases: res };
  fs.writeFileSync(FIX, JSON.stringify(doc) + '\n');
  console.log(`wrote ${FIX}: ${Object.keys(res).length} cases`);
} else {
  const base = JSON.parse(fs.readFileSync(FIX, 'utf8')).cases;
  const bad = compareRenders(base, res, 0.001);
  console.log(bad.length ? 'DIFF\n' + bad.slice(0, 20).join('\n') : `identical to the stored baseline (${Object.keys(base).length} cases, tolerance 0.001 dB)`);
  process.exit(bad.length ? 1 : 0);
}
