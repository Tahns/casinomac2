# NOTES_qa (QA agent)

## What exists
- `node tests/guidelines/run.mjs` : FULLY ISOLATED. Each run spawns its OWN static server (`tools/mock-rgs/static-server.mjs`) and OWN mock RGS (`tools/mock-rgs/server.mjs`) on random free ports (override with env `PORTS=game,rgs`), never reuses a running one, kills both on exit/SIGINT. Every test gets a unique sessionID (`qa-<run>-<testid>`) and the game is pointed at `rgs_url=<mock>/s/<sessionID>`; the mock keys ALL state (balance, round, config, force queue, errors, log, seeded RNG) by sessionID, so tests and other clients/agents can't interfere. Parallel runs are safe.
- Env: `QA_ONLY=181,222,UNL-PRICE` (or `--only=`) runs a subset; `QA_REPORT=path` writes the report elsewhere (default tests/guidelines/REPORT.md; previous kept as REPORT_previous.md); `QA_REPLAY_MAX=480` seconds cap for REPLAY-LONG. Drives Playwright chromium (/opt/node-tools playwright, /opt/pw-browsers/chromium). Screenshots: `tests/shots/qa_*.png`.
- Mock control (all take `?sid=<sessionID>`, default `_default`): `POST /__mock/config` {reset, reloadFixtures, bet, currency, balance, force:{category|id,mode}, error:{endpoint,code,once}, keepActive, activeRound, delayMs, jurisdiction}, `GET /__mock/log|state`, `GET /__mock/sessions`, `/__mock/health`. Game endpoints use body.sessionID, or a `/s/<sid>` prefix on rgs_url (needed to key the stateless replay GET). Book choice is deterministic per session (seeded from sid; restored by reset).
- Books: REAL SDK books from `fixtures/` (x100 payoutMultiplier; API returns plain multiplier).
- Checks added in this pass: UNL-MIN-USD/JPY/MXN (UNLEASH below the minimum price: disabled, "from <min>", no play; at the minimum: confirm dialog + bonus play), UNL-PRICE (round cost values for the 0.10..100 ladder), REPLAY-LONG (longest fixture bonus book: seconds, >60 s flagged, speed control probe), [31]/[222] adjusted for the minimum price. Helpers in lib.mjs: waitVisible/waitEnabled/setBet (no sleeps > 2 s).

## Findings for owners (see REPORT.md for evidence)
1. AT RISK (RENDER, styles.css balance box at portrait 425x812): 7-figure balances are ellipsised ("CA$1,234,48..."); `#balance` text 96px in 89px box. Fine up to 12,345.67. Fix: smaller font / font-fit when text is long (main.js `fitAll()` exists, check it covers #balance).
2. AT RISK (RENDER): `dev.html` (served from the submission root) hard-codes `$` and fetches index.html; delete or move it out of frontend/ before packaging.
3. AT RISK (TEXT): replay.js:33,36,145 fall back to `(x/MICRO).toFixed(2)` in catch blocks (no symbol, wrong for JPY); only reachable if formatMoney throws. rules.js:22 `toLocaleString(maximumFractionDigits:2)` for multipliers is fine.
4. INFO (CORE): JPY balance 12.34 JPY displays "¥12.34" (money.js shows all non-zero fractional digits, never rounds). Acceptable; real JPY balances are whole.
5. INFO: src/i18n/social.js:52 contains a regex literal /\bstake\b/ mapping to "play amount" (source only, not shown). 
6. NEEDS A HUMAN: audible mute on a device, touch pinch/double-tap zoom on a phone, visual polish of `tests/shots/qa_*.png`.

## Not covered
- Real Engine RGS differences (error body shape: mock returns {error,code:ERR_*}); session timeouts; slamstop/jurisdiction flags (mock sends all false).
