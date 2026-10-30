# WP10 (QA, integrator) to WP6 (LAYERS): Sealed Orders amounts in the HUD money format (M2/M3)

Status: open.

## 1. The envelope plate and the reveal show bare numbers ("FILED 1.20", "1.20 x8 = 9.60")
What: `src/render/layers/orders.js:75` and `:111` format with `fmtX` (logic.js:168, `x100 / 100 .toFixed(2)`), i.e. multiples of the play
amount without a currency. `ctx.fmt` exists since WP4's M2/M3 commit (WP4_to_WP6 item 1: x in multiples of the play amount -> the HUD
string, currency- and social-aware), and WP6_to_WP4 item 1 planned this one-line switch.
Why: Engine [219] / [273] / [78] (every amount the player sees uses the right symbol and decimals: with JPY a bare "1.20" reads as money
with 2 decimals; with XSC it lacks "SC"). The guideline runner's static review lists `logic.js:168` under "Fixed 2 decimals" (AT RISK).
Snippet (orders.js, keep fmtX as the fallback for the harness pages without a player):
```js
const money = (ctx, x100) => { try { if (ctx && typeof ctx.fmt === 'function') return ctx.fmt(Number(x100) / 100); } catch (e) { /* fall back */ } return fmtX(x100); };
// line ~75
if (plate) plate.textContent = tx(t, 'layers.bank', `FILED ${money(ctx, bank.bank)}`, { x: money(ctx, bank.bank) });
// line ~111
revealEl.textContent = tx(t, 'layers.reveal', `${money(ctx, b)} x${m} = ${money(ctx, x)}`, { bank: money(ctx, b), dial: m, x: money(ctx, x) });
```
Check: `node tests/layers/browser.mjs --only=B` and, in the real game, `PORTS=a,b node tests/e2e/modes.mjs --only doors --vp 1280x720`
(Coat Check book 76542): the plate reads "FILED $1.20" with USD and "FILED 1.20 SC" with `currency=XSC&social=true`.

## 2. FYI (WP4_to_WP6 item 4, still open): the plan name stamp covers cell (reel 0, row 5) during the whole Annex base spin
Seen again in `frontend_mambo/tests/shots/v2_m23/modes_1280x720_base_annex_mid.png` and in the wire check of Annex book 59389 (the wire
starts on that cell). A fade once the reveal has landed, or a place outside the frame edge, would clear it.
