# Gate G1 (milestone 1): Engine self-check and QA report

Date 2026-10-30, branch `claude/elegant-bell-5q79k8`, front end `frontend_mambo/` (menu + sliders + heroine + celebration gate on
v1 books). Verdicts: PASS / FAIL / AT RISK / NEEDS A HUMAN. Evidence = automated run on fresh, isolated servers (own ports
5870-5889, own mock RGS), screenshots viewed by WP10, or `file:line`. Screening aid, not a platform approval: the Stake Studio
review stays the arbiter ([217], [253]).

## Summary
| Suite | Result |
|---|---|
| Guideline runner `node tests/guidelines/run.mjs` (full, final run after every fix) | **47 PASS, 0 FAIL, 0 AT RISK, 0 HUMAN** (runtime checks). Static review: 4 AT RISK heuristics, reviewed benign (below) |
| Shell guideline checks `node tests/guidelines/shell.mjs` (G1-G8 + FLAGS, HERO, MOTION, LEDGER, PICKER, PACE) | 14 PASS, 0 FAIL; console 0, page errors 0, external 0 |
| `node --test tests/core tests/text` (now also imports shell, audio taper, fx) | 111 / 111 |
| `node --test tests/heroine` / `tests/render` / `tests/audio/taper.test.mjs` | 58 / 58, 24 / 24, 4 / 4 |
| Browser: `tests/heroine/browser.mjs` | 41 / 41 (A1 budget avg 0.39 ms/frame, p95 0.9) |
| Browser: `tests/audio/audio.test.mjs` / `tests/audio/menu.test.mjs` | ALL PASSED (161 PASS lines) / ALL PASSED (18) |
| Browser: `tests/render/browser.mjs` | 346 / 346 after the harness fix (was 345 / 346, see fixes) |
| e2e smoke `tests/e2e/smoke.mjs` (menu + sliders + heroine, 4 viewports) | 72 / 72 |
| Flash capture `tests/e2e/flash_capture.mjs` (busy, fixture, fixture turbo) | pass: max 1, 1, 2 flashes in any 1 s window; `sharedGovernor: true` |
| Perf baseline `tests/e2e/baseline.mjs` (30 cells, 4x CPU) | **FAIL** p95 66.7-83 ms vs 16.6; layers while playing p90 56 vs 45 (see Performance) |
| `npm run build` + `npm run verify:build` | zip built (`frontend_mambo/dist/agent_mambo_front_v1.0.0.zip`), verify green after fixing its paths |

**G1 verdict:** shippable as M1 for every Engine guideline we can check by machine; the performance budget (WP5 acceptance, not an
Engine guideline) is not met and needs WP4's per-column drop; [217] / [253] and real-device checks need a human.

## Engine self-check, item by item
| Id | Verdict | Evidence |
|---|---|---|
| [181] authenticate on load | PASS | first request = `POST /wallet/authenticate {"sessionID":"qa-...-181"}` on the `rgs_url` of the URL, game reaches idle |
| [274] rgs_url=example.com | PASS | authenticate goes to example.com only, mock RGS log empty, error message visible, no spinner; bare host `rgs.test` gets `https://rgs.test/wallet/authenticate` and plays |
| [183] play request | PASS | `POST /wallet/play {"sessionID":...,"amount":1000000,"mode":"base"}`, the returned round plays |
| [275] no Stake Engine loader | PASS | no "stake engine" in DOM, network URLs or shipped source (the only "stake" is the social.js sanitizer regex) |
| [213] title | PASS | `<title>Agent Mambo</title>` (index.html:7), logo "AGENT MAMBO"; static check "title restrictions" PASS; no Megaways/RTP/Gates/Bonanza/Olympus/Rush words. Trademark search = human (SYNTHESIS 10) |
| [217] no sexual / inappropriate content | NEEDS A HUMAN | heroine fully covered (inspector uniform, knee skirt, gloves; screenshots 1024x576, 800x450, 425x812, 400x225 viewed); no kiss, no garment removal seen in M1 clips. User directive 9 loosened glamour one notch: Stake review decides |
| [253] distinct from existing titles | NEEDS A HUMAN | shared core (cluster, tumble, dial) with other titles; theme, heroine, wire and presentation are ours (SYNTHESIS 10 risk 7) |
| [242] bet levels from authenticate | PASS | default 1.40 shown first, only the 4 levels visited, stops at both ends (+ disabled at 2.00, - at 1.00); JPY ¥200 -> ¥500, play amount 500000000 |
| [187] active round restored | PASS | bet shows $3.00 (round.amount) after load and after reload, default was 1.00 |
| [219] currencies | PASS | USD $12.34, EUR €12.34, CAD CA$12.34, MXN MX$12.34, JPY ¥12, XSC 12.34 SC, XGC 12.34 GC; [219b] 0 clipped values at 4 viewports incl. 7-figure stress |
| [273] sub-cent wins | PASS | bet 0.01 x 0.1x shown with enough decimals (not 0.00) |
| [221] end-round only for wins | PASS | 0x round: play 1, end-round 0; win round: play 1, end-round 1 |
| [222] balance < cost | PASS | no `/wallet/play` from button, Space, autoplay or Secret Entrance; message "You need at least $100.00" for the door (real cost = bet x 100) |
| [228] Space | PASS | Space -> exactly 1 play, `preventDefault` on body keydown, no scroll; inside the settings dialog Space toggles the control and sends no play (smoke, G5, G7) |
| [227] no scroll | PASS | scroll (0,0), overflow hidden at 1024x576, 400x225, 800x450, 425x812, idle / after a bet / rules open; settings dialog open: no page scroll (smoke, G2) |
| [104] autoplay | PASS | one press opens the autoplay panel, sends no play |
| [31] modes > 2x confirmed | PASS | Secret Entrance: one press sends no play; dialog states "costs $100.00 for this round", Stage Door card "Cost: $100.00", focus on CANCEL, cancel safe, OK plays `mode: bonus`; UNL-PRICE and UNL-MIN-USD/JPY/MXN PASS; MODAL-INERT PASS (Tab stays inside, BET/BET+/UNLEASH inert) |
| [107] sound control mutes all | PASS | mute -> no audible source (graph probe); audio suite: master 0 restores, replay mode 136 sources none bypasses master |
| [25] RTP + max win per mode | PASS | rules list 96.00% for each mode and the 5,000x cap (RULES check, `missing: []`) |
| [26] how wins form | PASS | RULES check: clusters, tumbles, multipliers, scatters present |
| [27] each mode + cost | PASS | Secret Entrance described with 100x cost, mode table Mode/Cost/RTP/Max win |
| [24] paying symbols with wins | PASS | RULES check: every symbol listed with its win table (`missing: []`); wire / dial text generated from data (`tests/text`) |
| [28] | n/a | not in the Engine checklist given to us (it lists [24]-[27], [29]) |
| [29] free games and retriggers | PASS | RULES check: trigger, count, retrigger present |
| [235] every button explained | PASS (after fix) | `controls not mentioned: []`; WP10 added SETTINGS (gear) and Session summary lines to the Interaction guide (`src/rules.js`), which were missing |
| [185] disclaimer verbatim | PASS | `src/rules.js:10-11` DISCLAIMER = the exact Engine text ending "TM and © 2026 Engine."; shown in the legal tab |
| [193] 1024x576 | PASS | smoke + screenshot `tests/shots/v2_m1/smoke_1024x576_main.png`: full heroine left of the grid, HUD left, controls right, nothing overlaps |
| [195] 400x225 and 800x450 | PASS | 400x225: heroine waist-up in the bottom-left corner, settings via MENU, dialog fits (`smoke_400x225_*.png`); 800x450 full figure left (`smoke_800x450_main.png`); MENU-400x225 PASS |
| [194] 425x812 touch | PASS | heroine small, bottom-left beside SPIN, no overlap with grid or button (`smoke_425x812_main.png`); a round plays; real-device touch = human |
| [223] double-tap zoom | PASS | meta `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`, `touch-action: none` on #game |
| [239] lang=en | PASS | screens main, autoplay, confirm, info + 7 tabs, **settings + 4 tabs**, after-bet, error: no keys / undefined / NaN / {..} |
| [240] lang=zz | PASS | same screens, English fallback, no keys, `<html lang>=en` |
| [77] social wording | PASS | social=true, all screens incl. settings tabs and 4 error messages: 0 restricted words visible, 0 in hidden DOM text |
| [78] XSC/XGC no "$" | PASS | amounts "SC"/"GC" everywhere |
| [225] mode names / rules wording | PASS | rules, autoplay, confirm and **settings** (now included in the scan): hits [] |
| [188] replay wording + fetch failure | PASS | replay failure shows a message; replay social scan clean ([243]) |
| [171] replay calls | PASS | `GET /bet/replay/{game}/{version}/{mode}/{event}`, zero wallet calls |
| [172] replay UI | PASS | auto-load, PLAY button, no betting UI, replay again after the end; bet amount shown |
| [173] replay again / cost | PASS | "SECRET ENTRANCE: $1.00 · 100x · REAL COST: $100.00" |
| [174] replay at 400x225 | PASS | sw/cw 400, sh/ch 225, scrollY 0 |
| [243] replay social | PASS | social wording, XSC amounts, no "$" |
| extra | PASS | EXT: no external host in any session; CONSOLE: 0 console / page errors in launch, play, replay; WIN-*: displayed win == bet x payoutMultiplier for base loss/win/bonus/retrigger/maxwin and bonus bonus/retrigger/maxwin |

### Static review AT RISK lines (reviewed, benign, unchanged)
- `dev.html` formats money with "$": dev page, never shipped (build crawls from index.html only; not in the zip manifest).
- `src/replay.js:38,41,183` `toFixed(2)`: only in the `catch` of `formatMoney` (fallback if the formatter throws).
- `src/replay.js:8` local `MICRO` constant: used by that fallback only.
- `src/render/index.js` `fetch('../../data/rules_data.json')`: same-origin static data, not an RGS call.

## Performance (WP5 acceptance, SYNTHESIS 9 rows 5 and 10) - FAIL, blocker in WP4
`tests/e2e/baseline_m1.json`, 30-cell tumble from step 8, 4x CPU, 2 runs per viewport, load average 1.3-1.8 (4 shared CPUs;
headless software compositing, harsher than a GPU phone). Before the WP1 CSS snippet: idle layers 89-94, p95 50-83 ms.

| Viewport | p50 ms | p95 ms | p99 ms | idle layers | layers p90 / max while playing | canvas MB |
|---|---|---|---|---|---|---|
| 1024x576 | 33.3 | 83.3 | 133.3 | 33 | 56 / 64 | 24.2 |
| 400x225 | 16.7 | 50.1 | 116.6 | 31 | 52 / 62 | 3.7 |
| 800x450 | 33.3 | 66.6 | 133.4 | 33 | 56 / 64 | 14.8 |
| 425x812 (touch, dpr 3) | 33.4 | 100 | 150.1 | 28 | 48 / 59 | 30.9 |

Budgets: p95 16.6 ms FAIL everywhere; layers <= 45 idle PASS, while playing FAIL; canvas <= 96 MB PASS. The remaining layers are the per-cell drop animations (WP5_to_WP4 item 6, written again in
`docs/v2/requests/WP10_to_WP4.md`). Real-device numbers = human (SYNTHESIS 10).

## Flash / luminance
Own capture (`tests/e2e/flash_capture.mjs`, WP5's script, CDP screencast ~20 fps, WCAG relative luminance, 25 windows): busy book
max 1 flash/s, fixture bonus book (x67.9) max 1/s, fixture turbo max 2/s; saturated red <= 4.2% of a frame. All page flashes now
go through the one governor (`governorFlashes = pageFlashes = 7`). AT RISK only in method: the capture runs at ~20 fps, not the
60 fps of SYNTHESIS row 10; a PEAT (or equivalent) pass on a recorded run stays a human item.

## Viewports (screenshots viewed)
`frontend_mambo/tests/shots/v2_m1/`: `smoke_{1024x576,400x225,800x450,425x812}_{main,settings}.png`. The heroine stands left of the
grid at the three landscape sizes (full figure at 1024 and 800, waist-up at 400x225) and in the bottom-left corner at 425x812;
the settings dialog (Sound tab: Mute, Master, Music, Effects at 75%) fits every viewport with no page scroll. Build check
screenshots: `frontend_mambo/dist/verify_{desktop,mobile}_{idle,after_bet}.png`.

## Integration fixes made by WP10 (details in docs/v2/NOTES_WP10_QA.md)
1. `tests/guidelines/run.mjs`: WP1's MODAL-INERT drop-in; settings dialog in the screen scan (via MENU at short heights); [225] scans the settings dialog.
2. `tests/core/index.js`: imports the shell, audio taper and fx unit suites.
3. `src/rules.js`: SETTINGS and Session summary in the Interaction guide ([235]).
4. `src/render/index.js`: page flash through the shared governor (`flash.js`), `layerCtx.flash`, cached `shortSide`.
5. `styles.css`: WP5's layer-budget snippet (no per-cell promotion, bob on `--mbt`, loading screen stops animating): idle 94 -> 33 layers.
6. `tests/render/harness.html`: hit-stop probe ignores CSS loops paused on purpose by the stepped symbol clock.
7. `tools/build/verify_build.mjs`: verified the wrong (old repo-root) dist and a missing mock path; now checks `frontend_mambo/dist/front`.
8. `tools/mock-rgs/server.mjs`: serves `entrance_orders` / `entrance_blackout` at cost 100 (bonus books stand in) for M2/M3.

## Open, for a human or a later milestone
- [217] / [253] Stake Studio review; IP and trademark items of SYNTHESIS 10.
- Frame budget and layers while playing (WP4 per-column drop); real-device performance and touch drag on sliders.
- 36-cell (Annex) baseline: floor plans arrive in M2.
- Screen-reader pass, listening test, PEAT flash analysis on a recording.
