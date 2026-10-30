# Gates G2 and G3 (milestones 2 and 3): Engine self-check and QA report

Date 2026-10-30, branch `claude/elegant-bell-5q79k8`, front end `frontend_mambo/` (v2.0.0: floor plans, Sealed Orders, Ballroom Blackout,
Secret Entrance picker with three doors) on the FINAL math (`math/games/agent_mambo`, four modes at 96.0000 %, max 5,000x).
Verdicts: PASS / FAIL / AT RISK / NEEDS A HUMAN. Evidence = automated run on fresh, isolated servers (WP10 ports 5940-5959, own mock RGS
serving the FINAL fixture books of the four modes), screenshots viewed by WP10, or `file:line`. Screening aid, not a platform approval:
the Stake Studio review stays the arbiter ([217], [253]).

## Summary
| Suite | Result |
|---|---|
| Guideline runner `node tests/guidelines/run.mjs` (full run, ports 5951/5952) | **46 PASS, 0 FAIL, 1 AT RISK, 0 HUMAN**. The AT RISK ([275]) was the runner reading the JSON key `pGtStake` of `data/rules_data.json` as text; the check now skips camelCase JSON keys (never displayed) and `QA_ONLY=275` gives PASS. Static review: 4 AT RISK heuristics, 3 benign (below) and 1 real (Orders plate, request WP10_to_WP6) |
| Scripted Engine self-check `node tests/guidelines/engine_selfcheck.mjs` (new) | **13 PASS, 0 FAIL** (math recomputed from the lookup tables, door figures, static source, rules screen, door cards, social currencies) |
| Shell checks `node tests/guidelines/shell.mjs` (G1-G8 + FLAGS, HERO, MOTION, LEDGER, PICKER, PACE) | 14 PASS, 0 FAIL; console 0, page errors 0, external 0 (PICKER now expects the three doors) |
| e2e modes `node tests/e2e/modes.mjs` (new): 4 viewports x (base on Mezzanine / Atrium / Lobby / Annex, Stage Door, Coat Check, Service Stairs) + replay of each mode | **358 PASS, 0 FAIL** (final run after the integrator changes, 448 s; first run also 358 / 0); zero console / page errors, no external request, no scroll |
| e2e smoke `tests/e2e/smoke.mjs` (menu, sliders, heroine, 4 viewports) | 72 / 72 |
| `node --test tests/core tests/text` | 115 / 115 |
| `node --test tests/heroine tests/render` / `npm test` (core, text, heroine, render, layers) | 88 / 88 / 214 / 214 |
| Browser: `tests/heroine/browser.mjs` / `tests/heroine/visual.mjs` | 41 / 41 / 17 PASS, 0 FAIL |
| Browser: `tests/render/browser.mjs` / `tests/render/browser_v2.mjs` | 366 / 366 / 123 / 123 |
| Browser: `tests/layers/browser.mjs` | 74 PASS, 0 FAIL |
| Browser: `tests/audio/gesture.mjs` / `menu.test.mjs` / `audio.test.mjs` | 6 PASS / ALL PASSED (19) / ALL PASSED (162 PASS lines; replay probe: 161 sources, none bypasses master) |
| Flash capture on Orders and Blackout books (normal and turbo) | PASS: max 2 flashes in any 1 s window (limit 2), `sharedGovernor` true; method AT RISK (~25-30 fps capture) |
| Perf baseline 30 and 36 cells, 4x CPU (`tests/e2e/baseline_m23.json`) | **FAIL**: p95 33-67 ms at 30 cells, 50-83 ms at 36 cells (budget 16.6); layers PASS at 30 cells (p90 36-41), FAIL at 36 cells (p90 46-50); canvas PASS |
| `npm run build` + `npm run verify:build` | zip `frontend_mambo/dist/agent_mambo_front_v2.0.0.zip` (359,212 B, sha256 3a817402...); no external hosts; verify: desktop and mobile authenticate + play + end-round 200, no 404, no console error |

**G2/G3 verdict:** every Engine guideline we can check by machine passes on all four modes, on the three doors and in replay of every
mode, at the four Engine viewports, with zero console errors. Not done: the frame budget (WP5 acceptance, not an Engine guideline), the
L8 first-spin briefing card (not built), and the human items ([217], [253], 10-second test, listening, real devices). Overall completion
state at the end of this report.

## Engine self-check, item by item
| Id | Verdict | Evidence |
|---|---|---|
| [181] authenticate on load | PASS | first request `POST /wallet/authenticate {"sessionID":"qa-...-181"}` on the `rgs_url` of the URL; game reaches idle |
| [274] rgs_url=example.com | PASS | authenticate goes to `https://example.com/wallet/authenticate` only, mock log empty, error shown, no spinner |
| [183] play request | PASS | `POST /wallet/play {"sessionID":...,"amount":1000000,"mode":"base"}`; modes suite: `mode` = `bonus` / `entrance_orders` / `entrance_blackout` for the chosen door, amount = the bet, the served book plays |
| [275] no Stake Engine loader | PASS | runner: DOM, network and source clean ([275] AT RISK only on the JSON key `pGtStake`, fixed in the runner, rerun PASS); engine_selfcheck: 70 shipped source files and `dist/front` clean |
| [213] title | PASS | `<title>Agent Mambo</title>`; no restricted word. Trademark search = human (SYNTHESIS 10) |
| [217] no sexual / inappropriate content | NEEDS A HUMAN | screenshots viewed (tests/shots/v2_m23/modes_*): base outfit inspectrice in base play; trench (Orders), casino gown (Blackout), lab coat (Briefing) only during the feature, back to the base outfit 3.2 s after the feature (dossier.js backToBase); all fully covered; no garment removal (the costume swap happens behind the folding screen). Stake review decides |
| [253] distinct from existing titles | NEEDS A HUMAN | shared core (cluster, tumble, dial); floor plans add the per-spin shape question (SYNTHESIS 10 risks 2 and 7) |
| [242] bet levels from authenticate | PASS | default 1.40 shown first, only the 4 levels visited, stops at both ends |
| [187] active round restored | PASS | bet shows $3.00 (round.amount) after load and after reload |
| [219] currencies | PASS | USD, EUR, CAD, MXN, JPY, XSC, XGC and now **XEC** (12.34 SC); [219b] 0 clipped values at 4 viewports incl. 7-figure stress. AT RISK detail outside the HUD: the Sealed Orders envelope plate shows bare multiples ("FILED 1.20", "1.20 x8 = 9.60", `layers/orders.js:75,111`) instead of the HUD money format: request `WP10_to_WP6.md` |
| [273] sub-cent wins | PASS | bet 0.01 x 0.1x shown as $0.001 |
| [221] end-round only for wins | PASS | 0x: play 1, end-round 0; win: play 1, end-round 1; modes suite: 1 end-round per winning round in every mode |
| [222] balance < cost | PASS | no `/wallet/play` from button, Space, autoplay, Secret Entrance (door picked); message shown |
| [228] Space | PASS | exactly 1 play, `preventDefault`, no scroll |
| [227] no scroll | PASS | runner at 4 viewports (idle, after a round, rules open); modes suite: no scroll after every mode and replay at 1280x720, 1024x576, 425x812, 400x225 |
| [104] autoplay | PASS | one press opens the panel, no play |
| [31] modes > 2x confirmed | PASS | one press sends no play; dialog states "costs $100.00 for this round" and lists **three doors** (Stage Door, Coat Check, Service Stairs) with cost, nothing pre-selected, CONFIRM disabled until a door is chosen, focus on CANCEL; cancel safe; the chosen door is the mode played (PICKER, modes suite); UNL-MIN-USD/JPY/MXN, UNL-PRICE, MODAL-INERT PASS |
| [107] sound control mutes all | PASS | mute -> master gain 0, no audible source; audio suite replay probe 161 sources, none bypasses master |
| [25] RTP + max win per mode | PASS | recomputed from `library/publish_files/lookUpTable_<mode>_0.csv`: base 96.0000 % (112,500 rows), bonus / entrance_orders / entrance_blackout 96.0000 % (100,000 / 103,125 / 103,125), max 5,000x each == rules data; rules screen shows 96.00 % and 5,000x |
| [26] how wins form | PASS | RULES check: clusters, tumbles, multipliers, scatters |
| [27] each mode + cost | PASS | index.json costs (1 / 100 / 100 / 100) == rules data; rules screen names Stage Door, Coat Check, Service Stairs, The Briefing, Sealed Orders, Ballroom Blackout, the floor plans, 100x, 96.00 % (27-UI) |
| [24] paying symbols with wins | PASS | RULES check `missing: []` |
| [29] free games and retriggers | PASS | RULES check: trigger, count, retrigger |
| [266] displayed probabilities match the math | PASS | door cards: median 65.6x / 66.8x / 66.2x and "31% of rounds return more than the cost" == shares.json == recomputed from the tables (P(R > 100x) 31.00 % each); shown in the real game (266-UI) |
| [235] every button explained | PASS | `controls not mentioned: []` |
| [185] disclaimer verbatim | PASS | exact text in `src/rules.js`, shown in the legal tab |
| [193] 1024x576 | PASS | modes suite + shots `tests/shots/v2_m23/modes_1024x576_*`: heroine left of the grid, controls right, Annex 6-row frame fits |
| [195] 400x225 and 800x450 | PASS | 400x225: all four plans and three doors play, no overflow (Annex cells 34.6 px, browser_v2); 800x450 in the runner and smoke |
| [194] 425x812 touch | PASS | every mode plays with touch emulation; real-device touch = human |
| [223] double-tap zoom | PASS | viewport meta with `maximum-scale=1, user-scalable=no`, `touch-action: none` on #game |
| [239] lang=en / [240] lang=zz | PASS | 18 screens incl. the three-door confirm and the settings tabs: no keys / undefined / NaN |
| [77] social wording / [225] mode names | PASS | all screens incl. the door cards ("31% of rounds return more than the cost": no restricted word); hits [] |
| [78] XSC/XGC no "$" | PASS | runner; door picker in XSC / XGC / XEC shows "100.00 SC" / "100.00 GC" / "100.00 SC", no "$" |
| [188] replay wording + fetch failure | PASS | failure message shown |
| [171] replay calls | PASS | `GET /bet/replay/agent_mambo/2/<mode>/<event>` for each of the four modes, zero wallet calls |
| [172] replay UI | PASS | auto-load, PLAY, no betting UI, REPLAY after the end; amount shown |
| [173] replay again / [174] real cost | PASS | "SECRET ENTRANCE: COAT CHECK: $1.00 · 100x · REAL COST: $100.00" (and Service Stairs, Stage Door); TOTAL WIN == amount x payoutMultiplier in every mode |
| [243] replay at 400x225 / social | PASS | replay of each mode at 400x225 fits, plays, no scroll; social replay clean |
| extra | PASS | EXT (82 runner sessions + modes + engine sessions), CONSOLE 0, WIN-*: displayed win == bet x payoutMultiplier for base loss/win/bonus/retrigger/maxwin and bonus bonus/retrigger/maxwin; modes: the same for the four plans and the three doors |
| MATH-MODES | PASS | 4 modes (<= 20), every events / weights file present |

### Static review AT RISK lines
- `dev.html` money with "$": dev page, never shipped (benign, as in G1).
- "Fixed 2 decimals": `src/replay.js:38,41,184` fallback of `formatMoney` only (benign); `render/index.js:339` and `layers/art.js:148-149` are
  SVG/CSS geometry (benign); **`layers/logic.js:168` `fmtX` is displayed** on the Sealed Orders plate and reveal (AT RISK, WP10_to_WP6).
- `src/replay.js:8` local `MICRO`: used by that fallback only (benign).
- `src/render/index.js:437` `fetch('../../data/rules_data.json')`: same-origin static data, not an RGS call (benign).

## Milestones 2 and 3 features (SYNTHESIS 2, 3, 4, 9)
| Item | Verdict | Evidence |
|---|---|---|
| Floor plans: board drawn in the plan, cells == cellCount, 4 plans x 4 viewports, no overflow | PASS | browser_v2 P (Annex 36 cells, Lobby 24 + 6 voids, Atrium 26); modes suite `.board-wrap[data-plan]` and 6 rows only on Annex |
| Wire on the Annex 6-row frame | PASS (after the fix) | WP4_to_WP5 item 1 applied by WP10: `wire.js` reads the frame height; Annex book 59389 (path on geometric rows 5-4-3) drawn on the right cells (viewBox 0 0 6 6) |
| Sealed Orders: banked steps never on WIN, caseOpen == bank x dial, final WIN == payoutMultiplier | PASS | browser_v2 M; layers suite B; modes suite Coat Check WIN == bet x payoutMultiplier at 4 viewports |
| Ballroom Blackout: lightRoute, lit clusters x4, spotlight | PASS | layers suite C; modes suite Service Stairs (lit book 2477) |
| Per-mission palette (lair / hat-check / ballroom) | PASS (after the fix) | WP6_to_WP5 applied by WP10 in `scene.js`; lair canvas pixel: Briefing (17,112,121) teal, Orders (154,123,208) lilac, Blackout (43,42,107) indigo |
| 10-second test (5 viewers, sound off, name the mission >= 4/5) | NEEDS A HUMAN | builder proxy frames in `tests/layers/shots/tensec_*` |
| L8 first-spin briefing card | FAIL (not built) | no card in `src/`; request `WP10_to_WP1.md` item 1 (build it or record the cut) |
| L12 picker with honest per-door facts, no countdown, no default | PASS | PICKER, [266]-UI, [31] |
| L10 `winLike` on every sound | PASS | audio suite: "winLike is an explicit boolean on EVERY sound", the ten v2 cues exist and are neutral by default (caseOpen is win-like only above its cost share, per WP2's `isWinLike`, not re-measured here); listening = human |
| Debrief and quiet staging when R <= C | PASS | layers suite F (debrief tab at 4 viewports), B (slips neutral, never gold); render suite A (gate holds at R <= C at cost 1 and 100: no sparks, shake, flash, win sound or happy pose) |
| MISSION START burst at 425x812 / 400x225 | AT RISK (polish) | the word runs off the left edge (`modes_425x812_door_orders_mid.png`); request `WP10_to_WP4.md` M2/M3 item 1 |
| Plan name stamp over cell (0, last row) | AT RISK (polish) | ANNEX / LOBBY stamp covers that cell the whole base spin; WP4_to_WP6 item 4, repeated in WP10_to_WP6 item 2 |

## Performance (WP5 acceptance, SYNTHESIS 9 rows 5 and 10)
FAIL on the frame budget, as in G1; better at 30 cells, over the layer budget at 36 cells.
`frontend_mambo/tests/e2e/baseline_m23.json` (`node tests/e2e/baseline.mjs --rate 4 --runs 2 --port 5958`), 4x CPU, 2 runs per row, headless
software compositing on 4 shared CPUs (load average next to each row). The 36-cell rows use the real FINAL Annex book 25532 through the new
`perf_tumble.mjs --fixture` option; the layer probe samples the whole book, so the layout event (frame morph, blueprint) is inside.

| Viewport | Cells | Book | p50 ms | p95 ms | p99 ms | idle layers | layers p90 / max while playing | canvas MB | load avg |
|---|---|---|---|---|---|---|---|---|---|
| 1024x576 | 30 | devbook tumble (10 tumbles, from step 8) | 16.8 | 66.6 | 83.4 | 33 | 41 / 47 | 24.17 | 0.61 |
| 1024x576 | 36 | Annex #25532 (4 tumbles, from tumble 1) | 16.7 | 66.6 | 116.6 | 33 | 49 / 55 | 24.17 | 1.41 |
| 400x225 | 30 | devbook tumble (10 tumbles, from step 8) | 16.7 | 33.4 | 66.7 | 31 | 38 / 45 | 3.69 | 1.36 |
| 400x225 | 36 | Annex #25532 (4 tumbles, from tumble 1) | 16.7 | 50 | 83.3 | 31 | 49 / 54 | 3.69 | 1.5 |
| 800x450 | 30 | devbook tumble (10 tumbles, from step 8) | 16.7 | 50 | 66.7 | 33 | 41 / 47 | 14.75 | 1.3 |
| 800x450 | 36 | Annex #25532 (4 tumbles, from tumble 1) | 16.7 | 50.1 | 116.6 | 33 | 50 / 56 | 14.75 | 1.48 |
| 425x812 (touch, dpr 3) | 30 | devbook tumble (10 tumbles, from step 8) | 33.3 | 66.7 | 116.7 | 28 | 36 / 42 | 30.93 | 1.44 |
| 425x812 (touch, dpr 3) | 36 | Annex #25532 (4 tumbles, from tumble 1) | 33.3 | 83.3 | 166.7 | 28 | 46 / 51 | 30.93 | 1.69 |

Budgets: p95 <= 16.6 ms **FAIL** everywhere (30 cells 33-67 ms, was 50-100 in G1; 36 cells 50-83 ms). Layers <= 45 while playing:
**PASS at 30 cells** (p90 36-41, was 48-56 in G1, WP4's per-reel wrappers), **FAIL at 36 cells** (p90 46-50; request WP10_to_WP4 item 3).
Canvas <= 96 MB PASS (max 30.9 MB at dpr 3). The idle page alone is p95 50 ms at 4x (WP4's trace): the largest lever is WP5's canvas
upload every frame (WP4_to_WP5 item 3, still open, WP5 was not active in this milestone). Real-device numbers = human.

## Flash / luminance
`tests/e2e/flash_capture.mjs` (WP5's script, CDP screencast, WCAG relative luminance, 25 windows), busiest fixture book of each door
(both are 5,000x cap books), summary in `frontend_mambo/tests/e2e/flash_m23.json`:

| Book | Speed | Max flashes in any 1 s window | Full-frame flashes / s | Max saturated red | Capture fps | Governor / page flashes |
|---|---|---|---|---|---|---|
| Orders #700 (103 events, x5000) | normal | 2 | 1 | 7.9 % | 25.3 | 10 / 10 |
| Orders #700 | turbo | 2 | 1 | 7.4 % | 29.6 | 10 / 10 |
| Blackout #1459 (117 events, x5000) | normal | 2 | 1 | 7.6 % | 27.0 | 10 / 10 |
| Blackout #1459 | turbo | 2 | 1 | 7.6 % | 26.3 | 10 / 10 |

PASS at the limit (<= 2). Every page flash goes through the shared governor. AT RISK in method only: the capture runs at 25-30 fps, not
60 fps; a PEAT (or equivalent) pass on a recorded run stays a human item.

## Viewports (screenshots viewed by WP10)
`frontend_mambo/tests/shots/v2_m23/`: `modes_<viewport>_<case>_{mid,end}.png` for base on each plan and the three doors (plus `_feature.png` 13 s into each door feature) at 1280x720,
1024x576, 425x812 and 400x225, and `replay_<viewport>_<mode>.png`. Viewed: the Annex 6x6 frame fits at 1280x720 and 400x225 with the
heroine left (waist-up at 400x225), Lobby voids drawn as empty frame cells at 425x812, the dossier names the mission ("MISSION: SEALED
ORDERS" / "MISSION: BALLROOM BLACKOUT") over the board, the costume screen hides the outfit change, the Orders hat-check palette and the
Blackout dark ballroom are distinct, the replay bar fits at 400x225. Issues seen: the MISSION START burst clipped at 425x812 and 400x225,
the plan stamp over the bottom-left cell (both above); at 400x225 the Orders envelope, the dial badge and the "+N" chip crowd the top-left
corner over the logo during the feature (`modes_400x225_door_orders_feature.png`; readable, polish for WP4/WP6).

## Integration work by WP10 in milestones 2 and 3 (details in docs/v2/NOTES_WP10_M23.md)
1. `tools/mock-rgs/server.mjs`: `MOCK_FIXTURES`, non-recursive fixture scan (no phantom `entrance` mode, v1 never fills a v2 mode), force
   tags `plan_<id>`, `mission_<id>`, `caseOpen`, `lightRoute` (WP11_to_WP10 items 1-2).
2. `tests/guidelines/lib.mjs` `pickDoor()` and the runner picks a door before every CONFIRM (WP11_to_WP10 item 4): the 7 FAILs reported
   by WP4/WP11 are gone. [219] adds XEC; [275] ignores camelCase JSON keys.
3. `tests/guidelines/shell.mjs` PICKER expects the three FINAL doors (WP123_to_WP10 item 4).
4. New `tests/e2e/modes.mjs` and `tests/guidelines/engine_selfcheck.mjs`; `perf_tumble.mjs --fixture/--id`; `baseline.mjs` 36-cell rows.
5. Applied as integrator: WP4_to_WP5 item 1 (`src/render/wire.js` rows-aware, the Annex adapter of render/index.js steps aside) and
   WP6_to_WP5 (`src/render/scene.js` per-mission palettes).
6. `package.json` 2.0.0; scripts `test` (core, text, heroine, render, layers), `qa:modes`, `qa:engine`, `qa:gesture`, `qa:visual`,
   `qa:render2`, `qa:layers`.
7. Request files given a status line: WP11/WP123/WP1/WP2/WP3/WP4/WP5_to_WP10, WP4_to_WP5, WP6_to_WP5, WP6_to_WP1, WP6_to_WP4.

## Requests written
- `docs/v2/requests/WP10_to_WP6.md`: Orders plate and reveal in the HUD money format (`ctx.fmt`); plan stamp over a cell.
- `docs/v2/requests/WP10_to_WP4.md` (M2/M3 section): MISSION START burst kept inside the viewport; the Annex wire adapter is now inert.
- `docs/v2/requests/WP10_to_WP1.md`: L8 briefing card not built; autoplay stop option and `mode.freegame` name the Briefing for every
  mission; optional Stage Door name in the replay line.
- Still open from others: WP4_to_WP5 item 3 (canvas cost, the frame-budget lever) for WP5.

## Open, for a human or a later milestone
- [217] / [253] Stake Studio review; IP and trademark items of SYNTHESIS 10 (floor-plan patents included).
- 10-second test with 5 real viewers; listening test (music 5 %, new cues incl. caseOpen); screen-reader pass; PEAT on a recording.
- Real-device performance and touch; the frame budget (above).

## Overall completion state (honest)
- **Shippable by the Engine checklist, with human items left.** Every machine-checkable Engine guideline passes on base, on the three
  doors and in replay of the four modes, at the four Engine viewports; zero console or page errors and no external request in every
  session (runner 82 sessions, modes suite 36 sessions, engine and suite sessions). Build and verify are green (v2.0.0 zip).
- **Milestone 2 (floor plans):** built and verified (4 plans, Annex 6 rows incl. the wire, plan-aware wins, 4 viewports). Open: L8 first-spin
  briefing card not built (FAIL, WP1), plan stamp over a cell (polish, WP6).
- **Milestone 3 (Sealed Orders, Ballroom Blackout, picker):** built and verified (three doors with honest facts, banked steps and caseOpen,
  lit clusters and spotlight, mission palettes, costume swap, debrief). Open: Orders plate amounts not in the money format (AT RISK, WP6),
  MISSION START burst clipped on narrow screens (polish, WP4).
- **Not met:** the WP5 frame budget (p95 16.6 ms at 4x CPU) at 30 and 36 cells, and the 45-layer budget at 36 cells. Not an Engine
  guideline; it decides how the game feels on low-end phones and needs real-device numbers.
- **Needs a human:** [217], [253], IP / trademark, 10-second test with 5 viewers, listening test (music 5 %), screen reader, PEAT on a
  recording, real-device touch and performance.
- Rough completion against SYNTHESIS 9 acceptance: Engine-checkable items 100 % PASS; M2/M3 feature items 8 of 12 PASS, 1 FAIL (L8),
  2 AT RISK polish, 1 needs a human (10-second test); WP5 performance acceptance 1 of 3 budgets met at 36 cells (canvas), 2 of 3 at 30 cells (layers, canvas).
