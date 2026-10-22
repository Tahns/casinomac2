# Engine guideline QA report

Generated 2026-10-22T06:26:48.954Z by `node tests/guidelines/run.mjs`. Mock RGS books: see mock state.

Totals: 2 PASS, 0 FAIL, 0 AT RISK, 0 NEEDS A HUMAN.

## Verdicts

| Id | Check | Verdict |
|---|---|---|
| WIN-base-loss | base mode, forced loss book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |
| WIN-base-win | base mode, forced win book: displayed win == bet x payoutMultiplier/100, balance consistent | **PASS** |

## Evidence

### [WIN-base-loss] base mode, forced loss book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 16552 payoutMultiplier=0x bet=$2.00 -> expected win $0.00; displayed win=$0.00; balance $4,998.00 (expected $4,998.00); round took 3s; final state idle=true
- renderer's last #win value before end-round request: $0.00 (matches); #win values seen: ["$0.00"]
- end-round calls=0 (expected 0)

### [WIN-base-win] base mode, forced win book: displayed win == bet x payoutMultiplier/100, balance consistent - PASS

- book 5874 payoutMultiplier=0.1x bet=$2.00 -> expected win $0.20; displayed win=$0.20; balance $4,998.20 (expected $4,998.20); round took 5s; final state idle=true
- renderer's last #win value before end-round request: $0.20 (matches); #win values seen: ["$0.00","$0.20"]
- end-round calls=1 (expected 1)

## Static code review

### Hardcoded hosts / external http(s) URLs (should be none; RGS only via params.rgsUrl) - PASS

- none found

### Hardcoded localhost references - FAIL

- src/params.js:13 (CORE): const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u);

### External scripts/styles/fonts/CDN in HTML/CSS - PASS

- none found

### Fixed '$' symbol (currency symbol must come from money.js per currency) - FAIL

- dev.html:30 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);
- src/i18n/index.js:43 (TEXT): .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
- src/money.js:5 (CORE): USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],

### money.js symbol table lines (review XSC/XGC have no '$') - INFO

- src/money.js:5 (CORE): USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],
- src/money.js:6 (CORE): PHP: ['₱', 2], INR: ['₹', 2], IDR: ['Rp', 0], KRW: ['₩', 0], BRL: ['R$', 2], MXN: ['MX$', 2],
- src/money.js:45 (CORE): return (neg ? '-' : '') + (meta.symbolAfter ? `${abs} ${meta.symbol}` : `${meta.symbol}${abs}`);

### Fixed 2 decimals / /100 (JPY has 0 decimals; sub-cent payouts need more) - AT RISK

- dev.html:29 (?): let bet = 1000000; const fmt = (x) => (x * 1).toFixed(2);
- dev.html:30 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);
- src/render/index.js:51 (RENDER): fmt: (x) => `${(Math.round(x * 100) / 100).toFixed(2)}x`,
- src/render/index.js:177 (RENDER): return { transform: i === n ? 'none' : `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${((Math.random() - .5) * amp * k 
- src/render/index.js:315 (RENDER): total += (w.win || 0) / 100;
- src/render/index.js:319 (RENDER): popup(ov[1], ov[0], `${S.fmt((w.win || 0) / 100)}${cm}`, wi * 120, (w.win || 0) / 100);
- src/render/index.js:383 (RENDER): const rows = distPct / 100;
- src/render/index.js:546 (RENDER): const x = (Number(ev.amount) || 0) / 100;
- src/render/index.js:563 (RENDER): const x = (Number(ev.amount) || 0) / 100; hook('onWin', x); chip(chipTw, S.fmt(x), x > 0); return null;
- src/render/index.js:577 (RENDER): const x = (Number(ev.amount) || 0) / 100; hook('onWin', x);
- src/render/index.js:583 (RENDER): case 'setTotalWin': hook('onTotal', (Number(ev.amount) || 0) / 100); return null;
- src/render/index.js:585 (RENDER): hook('onTotal', (Number(ev.amount) || WINCAP * 100) / 100);
- src/render/index.js:586 (RENDER): await winBanner(Math.max(WINCAP, (Number(ev.amount) || 0) / 100), { title: 'win.max' });
- src/render/index.js:589 (RENDER): case 'finalWin': hook('onTotal', (Number(ev.amount) || 0) / 100); chip(chipTw, '', false); chip(chipCombo, '', false); return null
- src/render/scene.js:307 (RENDER): for (const l of lays) { const k = Number(l.dataset.k || 0); l.style.transform = `translate3d(${(cx * k * -14).toFixed(2)}px,${(cy 
- src/render/symbols.js:12 (RENDER): const f = (n) => Math.round(n * 100) / 100;
- src/replay.js:33 (TEXT): try { amountStr = formatMoney(amt, cur, { social: isSocial() }); } catch (e) { amountStr = (amt / MICRO).toFixed(2); }
- src/replay.js:36 (TEXT): try { real = formatMoney(Math.round(amt * mult), cur, { social: isSocial() }); } catch (e) { real = ((amt * mult) / MICRO).toFixed
- src/replay.js:145 (TEXT): try { totalStr = formatMoney(total, currency, { social: isSocial() }); } catch (e) { totalStr = (total / MICRO).toFixed(2); }
- src/rules.js:20 (TEXT): return String(Math.round(v * 100) / 100);
- src/rules.js:22 (TEXT): const commas = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
- src/rules.js:23 (TEXT): const pct = (r) => (Number.isFinite(Number(r)) ? (Number(r) * 100).toFixed(2) + '%' : '-');

### Micro-unit conversions outside money.js/bet.js (review) - AT RISK

- dev.html:29 (?): let bet = 1000000; const fmt = (x) => (x * 1).toFixed(2);
- dev.html:30 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);
- dev.html:31 (?): const hooks = { onTotal: (x) => { $('win').textContent = fmt(x * bet / 1e6); }, onWin: (x) => { $('win').textContent = fmt(x * bet
- src/render/devbooks.js:57 (RENDER): return { symbol: k.symbol, clusterSize: k.cells.length, win: Math.round(base * m * 100), positions: k.cells.map(([c, r]) => ({ ree
- src/render/devbooks.js:139 (RENDER): push({ type: 'setWin', amount: x * 100, winLevel: 8 }); push({ type: 'setTotalWin', amount: x * 100 }); push({ type: 'finalWin', a
- src/render/index.js:51 (RENDER): fmt: (x) => `${(Math.round(x * 100) / 100).toFixed(2)}x`,
- src/render/index.js:236 (RENDER): await Promise.all(items.map((cell) => anim(cell.el, [{ transform: 'translateY(0)' }, { transform: `translateY(${(ROWS - cell.r + 1
- src/render/index.js:256 (RENDER): const dist = (r + 1.3) * 100;
- src/render/index.js:368 (RENDER): const dist = (i + 1.4 + (n - i) * 0.0) * 100;
- src/render/index.js:374 (RENDER): if (to !== from) falls.push(drop(cell.el, (to - from) * 100, c, 0, j));
- src/render/index.js:585 (RENDER): hook('onTotal', (Number(ev.amount) || WINCAP * 100) / 100);
- src/render/symbols.js:12 (RENDER): const f = (n) => Math.round(n * 100) / 100;
- src/replay.js:7 (TEXT): const MICRO = 1_000_000;
- src/rules.js:20 (TEXT): return String(Math.round(v * 100) / 100);
- src/rules.js:23 (TEXT): const pct = (r) => (Number.isFinite(Number(r)) ? (Number(r) * 100).toFixed(2) + '%' : '-');
- src/rules.js:70 (TEXT): example = `<p>Example: with a ${B} of ${esc(fmt(1_000_000, currency))}, a cluster of ${tierLabel(tiers[tiers.length - 1])} ${esc(t

### end-round call sites (must be guarded: only payoutMultiplier > 0; never for 0x) - FAIL

- src/main.js:100 (CORE): if (S.renderer && round && round.state) await S.renderer.playBook(round.state, hooks()); ⏎ } ⏎  ⏎ async function settle(round) { ⏎ setState('settling'); ⏎ if (shouldEndRound(round)) { ⏎ const r = await rgs.endRound();

### keydown listeners (Space must be on window, preventDefault called) - PASS

- listener src/main.js:217 (CORE): window.addEventListener('keydown', (e) => {
- listener src/rules.js:256 (TEXT): window.addEventListener('keydown', (e) => {
- preventDefault src/main.js:219 (CORE): e.preventDefault();

### Space key handling lines - INFO

- src/main.js:218 (CORE): if (e.code !== 'Space' && e.key !== ' ') return;

### HTML/CSS: viewport meta, title restrictions, overflow, touch-action - PASS

- viewport meta: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
- <title>: The Unleashed Mine
- <html lang>: en
- styles.css html,body overflow:hidden rule: true; height:100%: true; touch-action:none: true

### Network calls outside rgs.js (must be none; replay must not touch wallet) - AT RISK

- dev.html:19 (?): const html = await (await fetch('index.html')).text();
- src/rules.js:202 (TEXT): dataPromise = fetch('data/rules_data.json').then((r) => { if (!r.ok) throw new Error('rules data'); return r.json(); }).catch(() =

### src/i18n/social.js string values containing restricted words - PASS

- none found

## NEEDS A HUMAN (always)

- Real audio audibility on a device (graph-level mute is checked above).
- Visual quality of the four screenshots in `tests/shots/qa_*.png`.
- Touch behaviour on a real phone (pinch/double-tap zoom).
