# Engine guideline QA report

Generated 2026-10-22T06:35:28.357Z by `node tests/guidelines/run.mjs`. Mock RGS books: see mock state.

Totals: 1 PASS, 0 FAIL, 0 AT RISK, 0 NEEDS A HUMAN.

## Verdicts

| Id | Check | Verdict |
|---|---|---|
| RULES | rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer | **PASS** |

## Evidence

### [RULES] rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer - PASS

- info text length=10223; RTP-like percentages found: ["96.00","96.00","96.00","96.00","96.00","96.00"]
- missing: []
- controls not mentioned in rules text: []

## Static code review

### Hardcoded hosts / external http(s) URLs (should be none; RGS only via params.rgsUrl) - PASS

- none found

### localhost references (params.js only defaults a scheme-less LOCAL rgs_url to http://; no host is hardcoded) - PASS

- src/params.js:13 (CORE): const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u);

### External scripts/styles/fonts/CDN in HTML/CSS - PASS

- none found

### dev.html (RENDER harness, served from the same root) formats money with a literal "$" - delete before submission - AT RISK

- dev.html:30 (?): renderer.setFormat((x) => `$${(x * bet / 1e6).toFixed(2)}`);

### Fixed '$' symbol (currency symbol must come from money.js per currency) - PASS

- none found

### money.js symbol table lines (review XSC/XGC have no '$') - INFO

- src/money.js:5 (CORE): USD: ['$', 2], CAD: ['CA$', 2], JPY: ['¥', 0], EUR: ['€', 2], RUB: ['₽', 2], CNY: ['CN¥', 2],
- src/money.js:6 (CORE): PHP: ['₱', 2], INR: ['₹', 2], IDR: ['Rp', 0], KRW: ['₩', 0], BRL: ['R$', 2], MXN: ['MX$', 2],
- src/money.js:45 (CORE): return (neg ? '-' : '') + (meta.symbolAfter ? `${abs} ${meta.symbol}` : `${meta.symbol}${abs}`);

### Fixed 2 decimals / /100 (JPY has 0 decimals; sub-cent payouts need more) - AT RISK

- src/render/index.js:51 (RENDER): fmt: (x) => `${(Math.round(x * 100) / 100).toFixed(2)}x`,
- src/replay.js:33 (TEXT): try { amountStr = formatMoney(amt, cur, { social: isSocial() }); } catch (e) { amountStr = (amt / MICRO).toFixed(2); }
- src/replay.js:36 (TEXT): try { real = formatMoney(Math.round(amt * mult), cur, { social: isSocial() }); } catch (e) { real = ((amt * mult) / MICRO).toFixed
- src/replay.js:145 (TEXT): try { totalStr = formatMoney(total, currency, { social: isSocial() }); } catch (e) { totalStr = (total / MICRO).toFixed(2); }
- src/rules.js:22 (TEXT): const commas = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
- src/rules.js:23 (TEXT): const pct = (r) => (Number.isFinite(Number(r)) ? (Number(r) * 100).toFixed(2) + '%' : '-');

### Micro-unit conversions outside money.js/bet.js (review) - AT RISK

- src/replay.js:7 (TEXT): const MICRO = 1_000_000;
- src/rules.js:70 (TEXT): example = `<p>Example: with a ${B} of ${esc(fmt(1_000_000, currency))}, a cluster of ${tierLabel(tiers[tiers.length - 1])} ${esc(t

### end-round call sites (must be guarded: only payoutMultiplier > 0; never for 0x) - PASS

- src/main.js:109 (CORE): if (S.renderer && round && round.state) await S.renderer.playBook(round.state, hooks()); ⏎ } ⏎  ⏎ async function settle(round) { ⏎ setState('settling'); ⏎ if (shouldEndRound(round)) { ⏎ const r = await rgs.endRound();

### keydown listeners (Space must be on window, preventDefault called) - PASS

- listener src/main.js:226 (CORE): window.addEventListener('keydown', (e) => {
- listener src/rules.js:256 (TEXT): window.addEventListener('keydown', (e) => {
- preventDefault src/main.js:228 (CORE): e.preventDefault();

### Space key handling lines - INFO

- src/main.js:227 (CORE): if (e.code !== 'Space' && e.key !== ' ') return;

### HTML/CSS: viewport meta, title restrictions, overflow, touch-action - PASS

- viewport meta: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
- <title>: The Unleashed Mine
- <html lang>: en
- styles.css html,body overflow:hidden rule: true; height:100%: true; touch-action:none: true

### Network calls outside rgs.js (must be none; replay must not touch wallet) - PASS

- none found

### src/i18n/social.js string values containing restricted words - PASS

- none found

## NEEDS A HUMAN (always)

- Real audio audibility on a device (graph-level mute is checked above).
- Visual quality of the four screenshots in `tests/shots/qa_*.png`.
- Touch behaviour on a real phone (pinch/double-tap zoom).
