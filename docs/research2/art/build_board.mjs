// build_board.mjs - renders art/board.html (live rig instances) to art/heroine_board.png
// usage: node build_board.mjs [out.png] [http://127.0.0.1:PORT/art/board.html]   (static server rooted at docs/research2)
import { createRequire } from 'node:module';
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');
const out = process.argv[2] || 'heroine_board.png', url = process.argv[3] || 'http://127.0.0.1:5731/art/board.html';
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => { try { return require('node:fs').statSync(p).isFile(); } catch { return false; } });
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 2000, height: 1000 } });
const errs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await p.goto(url); await p.waitForFunction(() => window.__ready); await p.waitForTimeout(400);
await p.screenshot({ path: out, fullPage: true });
console.log('wrote', out, JSON.stringify(errs.filter((e) => !/favicon|404/.test(e))));
await b.close();
