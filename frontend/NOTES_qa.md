# NOTES_qa (QA agent)

## What exists
- `node tests/guidelines/run.mjs [--only=181,222] [--wait=N]` : starts serve.mjs (5173) + mock RGS (5180) if not up, drives Playwright chromium (/opt/node-tools playwright, executablePath /opt/pw-browsers/chromium), writes `tests/guidelines/REPORT.md` (verdict table, evidence, static review). Screenshots: `tests/shots/qa_*.png`.
- Mock RGS `tools/mock-rgs/server.mjs` (port 5180, zero deps). Serves REAL SDK books from `fixtures/` (index.json -> books_*_sample.jsonl). Book `payoutMultiplier` and event amounts are x100 (as in publish files / lookups); the API returns `round.payoutMultiplier` as plain multiplier (x/100), `payout = amount * mult` micro.
  - Control: `POST /__mock/config` {reset, reloadFixtures, bet:{minBet,maxBet,stepBet,defaultBetLevel,betLevels}, currency, balance, force:{category|id,mode} (categories: loss, win, bigwin, bonus=free-spin trigger, retrigger, maxwin), error:{endpoint,code,once}, keepActive, activeRound:{amount,category}, delayMs, jurisdiction}, `GET /__mock/log`, `/__mock/state`.
  - Endpoints: wallet/authenticate|balance|play|end-round, bet/event, GET bet/replay/{game}/{version}/{mode}/{event}; CORS open; ERR_* codes.
- Checks added this pass: WIN-<mode>-<category> (displayed win == bet x payoutMultiplier/100 and balance arithmetic, all 8 mode/category combos incl. 5000x), 219b (currency clipping), 273 (sub-cent), RULES (content coverage), graph-based mute proof for 107.

## Findings for owners (see REPORT.md for evidence)
1. AT RISK (RENDER, styles.css balance box at portrait 425x812): 7-figure balances are ellipsised ("CA$1,234,48..."); `#balance` text 96px in 89px box. Fine up to 12,345.67. Fix: smaller font / font-fit when text is long (main.js `fitAll()` exists, check it covers #balance).
2. AT RISK (RENDER): `dev.html` (served from the submission root) hard-codes `$` and fetches index.html; delete or move it out of frontend/ before packaging.
3. AT RISK (TEXT): replay.js:33,36,145 fall back to `(x/MICRO).toFixed(2)` in catch blocks (no symbol, wrong for JPY); only reachable if formatMoney throws. rules.js:22 `toLocaleString(maximumFractionDigits:2)` for multipliers is fine.
4. INFO (CORE): JPY balance 12.34 JPY displays "¥12.34" (money.js shows all non-zero fractional digits, never rounds). Acceptable; real JPY balances are whole.
5. INFO: src/i18n/social.js:52 contains a regex literal /\bstake\b/ mapping to "play amount" (source only, not shown). 
6. NEEDS A HUMAN: audible mute on a device, touch pinch/double-tap zoom on a phone, visual polish of `tests/shots/qa_*.png`.

## Not covered
- Real Engine RGS differences (error body shape: mock returns {error,code:ERR_*}); session timeouts; slamstop/jurisdiction flags (mock sends all false).
