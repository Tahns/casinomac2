## Triage of remaining FAIL / AT RISK (hand-verified; appended to every generated report)

Isolation: every run spawns its own static server + mock RGS on free ports, one sessionID per test, mock state keyed by sessionID. Two full runs (and several parallel ones) give identical verdicts. The cross-talk FAILs seen earlier ([187] bet 1.00 vs 3.00, [221], [222], [219] 11.34 vs 12.34, [227], [104], [274]) were caused by sharing the fixed session `qa-session` / ports 5173+5180 with other agents; none reproduce in isolation.

| Check | Verdict | Real game bug? | Where / suggested fix | Owner |
|---|---|---|---|---|
| 219b (MXN, bet "MX$100.00") | FAIL | YES (reproduced by hand with Playwright) | `#bet` text is wider than its box: 28px text in a 27px box at 400x225 (font already shrunk to 4.5px, unreadable), 70px in 68px at 425x812 (11px). `src/main.js` `fitText()` (line ~46) stops shrinking at `fs*0.55` and the box clips (`overflow:hidden`). Fix: widen `.hud-bet`/`#bet` box in styles.css (>= 76px at 425x812, >= 32px at 400x225) or lower the floor / drop the currency prefix spacing; also ensure a readable minimum font size at 400x225. | STYLE (styles.css), WIRING (main.js fitText) |
| REPLAY-LONG | AT RISK | Design gap, not a failure | Longest fixture bonus book (id 46698, 320 events, 5000x) replays in ~250 s (350 s under CPU load) at normal speed. Replay hides the turbo button: `src/replay.js:8-9` HIDE list contains `#btn-turbo`. Suggested (optional, guideline [171] wants "exactly as it happened" by default): remove `#btn-turbo` from HIDE so the renderer's `setTurbo` (render/index.js:57) can fast-forward; test measures it automatically when a control exists. | TEXT (replay.js) |
| static: dev.html | AT RISK | Yes, packaging | `dev.html:31`, `fuse-dev.html:31` format money with literal `$` and sit in the submission root. Delete / move out of frontend/ before packaging. | RENDER |
| static: fixed 2 decimals / micro | AT RISK | Low | `src/replay.js:33,36,145` catch-block fallbacks use `(x/MICRO).toFixed(2)` (no symbol, wrong for JPY); only reached if formatMoney throws. | TEXT |

Timing: with turbo, a forced bonus round (WIN-bonus-*) takes 26-38 s; base-game rounds 1-3 s (bigwin 20-36 s).
