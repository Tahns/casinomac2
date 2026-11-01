# Agent Mambo v2: SWOT as a Stake Engine slot (H4, 2026-11-01)

Scope: the v2.0.0 front end (`frontend_mambo/`, branch `claude/elegant-bell-5q79k8`, code as of `bff5801`) on the FINAL math
(`math/games/agent_mambo`, four modes at 96.0000 %). Every claim below cites a measurement, a screenshot that was looked at, or a file.
Screenshots and raw numbers are in `/tmp/claude-0/scratch/H4_swot_perf/` (scratch, not committed): `shots/`, `baseline.json`,
`trace/summary_1024x576.json`, `flash_*.json`. Screening aid only: the Stake Studio review decides [217] and [253], and an IP
attorney decides patents and trademarks. Nothing here claims freedom to operate.

## Verdict in one paragraph
A clean, compliant, honest game with a distinctive look: rubber-hose 1960s heroine, sticker-outlined symbols, flat night skyline,
three bonus rule layers you can tell apart, and an Engine checklist that passes by machine on every mode. What holds it back from
"attractive" is not the rules but the shop window and the feel on a phone: the v2 store tile carries no game name, the heroine shrinks
to about 90 px and is half hidden on portrait mobile, the idle page runs at about 20 fps under a 4x CPU throttle, and the math is a
5,000x game in a lobby full of 10,000x+ cluster titles. Fix the tile, the phone heroine and the idle frame loop first; they are cheap.

## Strengths
| # | Strength | Evidence |
|---|---|---|
| S1 | Original, coherent visual identity: rubber-hose heroine (white three-finger gloves, round shoes, thick ink, halftone, print offset) left of the board, sticker-style symbols, flat skyline. Nothing in the cluster-slot field looks like it at a glance. | `shots/1280x720_idle.png`, `tests/shots/v2_m23/modes_1280x720_base_annex_mid.png` |
| S2 | Heroine changes outfit per mission behind a folding screen (inspectrice base, lab coat Briefing, trench Sealed Orders, casino gown Blackout), every outfit fully covered, back to base after the feature. Strong "character" hook that few Stake cluster slots have. | `m_trig1280.png` (screen), `modes_1280x720_door_*_feature.png` |
| S3 | Three bonus layers with different pay timing on one core: Briefing pays every step at the dial, Sealed Orders banks steps into an envelope paid once per spin, Blackout lights a 2x2 spotlight (x4). Per-mission palettes (teal lair, lilac hat-check, indigo ballroom) make them tell apart with the sound off. | `modes_1280x720_door_{stage,orders,blackout}_feature.png`; G2G3 report (palette pixels) |
| S4 | Honest door picker: three doors, nothing pre-selected, cost first, RTP, max win, median round and "31% of rounds return more than the cost", all equal to `library/shares.json`. Few games show this. | `shots/1280x720_picker_chosen.png`; rules tab "Modes & RTP" `shots/1280x720_info_tab4*.png` |
| S5 | Rules screen numbers are generated from the final tables and match them: RTP 96.00 % and 5,000x for all four modes, door medians 65.6x / 66.8x / 66.2x, P(R > cost) 31 %, plan shares 50.2 / 21.4 / 13.8 / 14.6 %, mission shares 40 / 30 / 30 %, paytable == `game_config.py`. | `data/rules_data.json` vs `math/games/agent_mambo/library/shares.json` (checked by script), `shots/1280x720_info_tab3.png` |
| S6 | Engine checklist: every machine-checkable item passes on four modes, three doors, replay; zero console errors, no external request, no scroll at the four viewports. | `docs/v2/G2G3_REPORT.md` |
| S7 | Responsible-design defaults: celebration gate by R/C (no fanfare when R <= C), session ledger (net, time), music at 5 %, mute kills every source, flash governor (max 2 flashes / s measured again here), motion levels and reduced-motion. | `shots/1280x720_settings.png` (music 5 %), `flash_blackout.json` and `flash_busy_425.json` (max 2 / s, `sharedGovernor` true) |
| S8 | Tiny, self-contained build: 67 files, 1.03 MB unzipped, no raster image in the game, one embedded font (Luckiest Guy, Apache-2.0), everything else drawn in SVG / canvas from code. | `unzip -l dist/agent_mambo_front_v2.0.0.zip`; `styles.css:6` |
| S9 | Floor plans give each base spin a visible shape (Mezzanine 30, Atrium 26, Lobby 24, Annex 36 cells) with honest shares and per-plan RTP already inside the base RTP. | rules tab, `MATH_REPORT.md` floor-plan table |

## Weaknesses
| # | Weakness | Evidence | Area |
|---|---|---|---|
| W1 | **The v2 store tile has no game name.** `tools/art/store_v2/agent_mambo_tile_3x4.png` shows the heroine on a skyline only ("portrait = heroine only, like the reference"). At 100 px in a lobby grid it reads as "cartoon policewoman", with no title, no symbol and no slot cue; the v1 tile had the logo. The cover has the title. | `tiles_small.png` (100 / 150 px v1 vs v2), `tile_v2_600.png`; `docs/research2/art/store/keyart.html:3,63` | shell (store) |
| W2 | **Heroine is tiny and half hidden on portrait mobile (425x812).** About 90 px tall in the bottom-left corner, cut at the waist by the SECRET ENTRANCE plate; in the features she becomes a head and shoulders behind the controls. The game's main asset is barely visible on the most common phone layout. | `tests/shots/v2_m23/modes_425x812_base_mezzanine_mid.png` (crop `z1.png`), `modes_425x812_door_stage_feature.png` | heroine |
| W3 | **Feel on low-end phones.** 4x CPU baseline today: p95 67-150 ms at 30 cells and 100-117 ms at 36 cells (budget 16.6), p50 33-50 ms, i.e. 20-30 fps while a tumble plays; the IDLE page alone is p50 50 ms / p95 83 ms. Layers exceed 45 on every Annex row (p90 47-50). | `baseline.json` (this run), `trace/summary_1024x576.json` | render |
| W4 | Base game is dry: 76.7 % dead spins, hit 23.3 %, P(R > 1x) 12.5 %, 10.8 % of spins are sub-stake wins; the trigger is 1 in 200 and the natural feature averages 74x. The game leans on the ritual of the doors. | `MATH_REPORT.md` base table, `shares.json` | (math, final) |
| W5 | Max win 5,000x in every mode (base cap reached 1 in 5,000,001). Stake's cluster/tumble audience is used to 10,000x-25,000x+ headlines; door volatility is moderate (std 89-90x on a 100x price, median 0.66 of the price). | `shares.json`, `MATH_REPORT.md` | (math, final) |
| W6 | Onboarding: no first-spin briefing card (L8 not built); three missions, a wire, a dial, four plans and three doors are explained only in a 7-tab rules screen of long prose tables. | `shots/1280x720_info_tab*.png`; G2G3 report | shell |
| W7 | Board voids read as broken: Lobby's empty top row and Atrium's corner voids are drawn as blank frame cells (dashed boxes), not as scenery. At 425x812 the Lobby looks like a board that failed to fill. | `tests/shots/v2_m23/modes_425x812_base_lobby_end.png` | render |
| W8 | Small-screen clutter: at 400x225 and 425x812 the dial badge, "+N" chip, envelope and plan stamp pile onto the logo corner; the "KEPT" pill is light grey on lilac (low contrast) and touches the left edge at 425x812. | `modes_425x812_door_stage_feature.png` (crop `z2.png`), `modes_400x225_door_blackout_feature.png` | layers |
| W9 | Two win readouts disagree during free spins: the board pill shows the spin's win ($3.50) while the HUD WIN stays $0.00 until the spin settles; the ledger NET stays $0.00 during a door round although the balance already shows the $100 debit. | `m_trig1280b.png` (t6, t7), `modes_1280x720_door_stage_feature.png` | shell |
| W10 | **The door cards do not say which mission each door plays.** The picker lists Stage Door, Coat Check, Service Stairs with cost and four identical-looking figures; the mission (The Briefing / Sealed Orders / Ballroom Blackout) and its rule appear only in the rules tab. The player picks blind between the three things the game is built around. | `shots/1280x720_picker_chosen.png`, `shots/425x812_picker_chosen.png`; `src/ui/doors.js:11-15,74-78` (card = name, cost, facts) | shell |
| W11 | **At 400x225 the door picker hides the third door and both buttons.** `.modal-box` scrolls (scrollHeight 306 > clientHeight 198); Service Stairs starts at y 205 and CANCEL / CONFIRM sit at y 288-312 in a 225 px viewport, with no scroll cue, and the initial focus (CANCEL) is off screen. At 800x450 the buttons are clipped by 14 px. | `shots/400x225_picker_open2.png`, `shots/800x450_picker_open2.png`, `pick400.mjs` output | shell |
| W12 | Paytable shows placeholder glyphs, not the symbols: coloured diamonds, a circle, a triangle, a square; the Bow Tie glyph is cream on cream (invisible) and the wild is a yellow star while the board shows a purple face in a sun badge. Players cannot map names to pictures. | `shots/1280x720_info_tab2.png`; `src/rules.js:26-30` | shell |
| W13 | HUD labels are below 8 px on landscape screens: BALANCE / BET / WIN / NET / TIME at 7.2 px (1024x576) and 5.6 px (800x450, the same as 400x225), SECRET ENTRANCE price 5.6 px at 400x225. | `fonts.mjs` output (computed font sizes); `shots/800x450_idle.png`; `styles.css:49,85` | shell |

## Opportunities
| # | Opportunity | Why |
|---|---|---|
| O1 | Put the AGENT MAMBO title (already drawn in `keyart.html` for the wide layouts) on the 3:4 tile, plus one hero symbol or the dial. | The tile is the only thing most players see; a named tile is the cheapest attractiveness gain in the whole project. |
| O2 | Give the heroine a real place on portrait mobile: under the logo, 160-200 px tall, waist-up crop, facing the board, controls moved below her. | The character is the differentiator vs every other 6x5 cluster game (S1, S2). |
| O3 | Cut the idle cost (top items in Performance below): the rig's per-vsync rAF, the 1 s ledger re-fit, the symbol clock walk, the dust canvas. | Idle is where players sit; a calm 60 fps idle makes the whole game feel premium on a mid-range Android. |
| O4 | A 3-card first-spin briefing (board shape, wire, doors), skippable, replayable from Info (L8). | Lowers the learning wall of W6 without touching the math. |
| O5 | Dress the voids (a velvet curtain, a brick pillar, a potted palm in the house palette). | Makes floor plans read as "rooms" (the theme) instead of missing cells (W7). |
| O6 | Mission trailer clips for the store page and socials (the costume swap and the three palettes are visual hooks). | Stake promotes games with short videos; the costume change is a 3-second story. |
| O7 | Social-casino mode is already clean (wording overrides + safety net), so the game can ship to the social side the same day. | `src/i18n/social.js`; runner [77] / [225] PASS. |

## Threats
| # | Threat | Note |
|---|---|---|
| T1 | [217] review of the heroine: user directives ask for glamour "at the border"; the game version is sober (fully covered, knee-length skirt, no cleavage seen in any screenshot), but the casino gown is the most fitted costume and the winks and poses are judged by a human. | Keep the sober tile (it is), keep the trench fallback for the gown. Human step. |
| T2 | [253] distinctness: the core (6x5 cluster, tumbles, rising multiplier, 4+ scatters, bonus buy) is shared with many Hacksaw, Pragmatic and Twist titles; distinctness rests on art, heroine, wire, floor plans and the three overlays. | SYNTHESIS 10 risk 7. |
| T3 | Patents (note only, attorney decides): size-paid clusters, adjacency groups and the tumble loop families listed in SYNTHESIS 10, and the variable-shape board families (IGT, BTG, Aristocrat) for the floor plans. | Never claim patent freedom. |
| T4 | Trademarks: "Agent Mambo", "Mambo Star", "Clearance Dial", "Sealed Orders", "Ballroom Blackout", "Secret Entrance" are not searched (class 9/28/41). "Mission" wording was already removed because of Mission X. | Human search. |
| T5 | Provenance: `docs/research2/art/higgs/` holds Higgsfield model sheets used as visual references; the shipped art is drawn in code (`mambo_art.mjs:3`) and the zip has no raster, but a reviewer seeing the folder may ask. | Keep it out of every upload, document the provenance in one line. |
| T6 | Low-end phones: the measured frame times (W3) on a real Snapdragon 4xx class device may mean visible stutter in the features, where retention is decided. | Real-device numbers remain a human item. |
| T7 | Alcohol imagery: the H2 "Atomic Fizz" symbol is a cocktail glass. The store art already avoids it; some operators or markets dislike alcohol next to gambling. | Low risk; a soda-siphon or atomic-fizz bottle redraw is a cheap hedge. |

## Performance (measured 2026-11-01, headless Chromium, software compositing, 4 shared CPUs; numbers only compare runs on this host)
`node tests/e2e/baseline.mjs --rate 4 --runs 2` (`perf_tumble.mjs` per viewport): p95 FAIL everywhere, canvas PASS, layers FAIL at 36 cells.

| Viewport | Cells | p50 | p95 | p99 | layers idle / p90 / max | canvas MB | load |
|---|---|---|---|---|---|---|---|
| 1024x576 | 30 | 33.4 | 99.9 | 116.8 | 33 / 41 / 47 | 24.2 | 0.64 |
| 1024x576 | 36 | 33.4 | 100 | 233.4 | 33 / 50 / 56 | 24.2 | 2.26 |
| 400x225 | 30 | 16.8 | 66.7 | 200 | 31 / 39 / 45 | 3.7 | 2.85 |
| 400x225 | 36 | 33.3 | 116.6 | 316.6 | 31 / 48 / 54 | 3.7 | - |
| 800x450 | 30 | 33.3 | 83.4 | 150 | 33 / 41 / 47 | 14.8 | 2.31 |
| 800x450 | 36 | 33.3 | 100.1 | 233.3 | 33 / 50 / 56 | 14.8 | 1.82 |
| 425x812 dpr 3 | 30 | 50 | 150 | 199.9 | 28 / 36 / 42 | 30.9 | 2.36 |
| 425x812 dpr 3 | 36 | 50 | 100.1 | 216.6 | 28 / 47 / 52 | 30.9 | 2.86 |

The host was shared with other agents (load 0.6-2.9), so these are worse than G2/G3 (33-67 ms); the ranking is the same.

CPU profile + timeline trace, real game, 1024x576, 4x (`trace.mjs`): idle 5 s = p50 50 ms, p95 83 ms; Annex tumble (book 25532) = p50 67 ms, p95 167 ms.
Main-thread time in 5 s of idle: Commit 1,252 ms, Layerize 746 ms, UpdateLayoutTree (style) 566 ms, Paint 389 ms, PrePaint 265 ms, Layout 258 ms;
JavaScript is about 22 % of samples. Top script costs (inclusive, idle): `src/render/heroine/mambo_rig.js:705` `frame()` 9.6 % (a rAF every vsync,
the SVG is only rewritten at 12 Hz), `src/render/symbols.js:366` `idleTick()` 5.7 % (walks `#game.getAnimations({subtree:true})` and calls
`getTiming()` / `getKeyframes()` per animation, then writes `--mbclk` per cell, which re-styles the board), `src/ui/ledger.js:74` 1 s interval
that calls `fitText` (`src/main.js:46`), which clears the font size and reads `scrollWidth` (a forced style + layout every second).
During the tumble `fitText` is the top named function (5 % self): every WIN update re-fits by a shrink loop with layout reads. Paint
attribution: `div.heroine-stage` repaints 120 times in 5 s idle. Nine canvases (four 1106x622 scene layers, two 1270x714 blinds, a 768x768 sweep,
full-viewport `dustc` and `fx`), the dust canvas is cleared and redrawn every 140 ms (`src/render/scene.js:355`).

## Prioritized improvements (cheap and safe first)
1. **Store tile with the title** (shell/store, half a day): add the AGENT MAMBO title block of the wide layout to the 3:4 layout of
   `docs/research2/art/store/keyart.html`, keep the sober inspectrice pose, check at 100 / 150 px, re-render with `tools/art/render_keyart.mjs`.
2. **Idle loop of the rig** (heroine, 1 hour): when not busy, schedule the next `frame()` with `setTimeout(1000 / idleHz)` instead of
   `requestAnimationFrame` (`mambo_rig.js:721`), switching back to rAF on any clip, tween, jump or spin. Removes about 10 % of idle main-thread
   time and lets the compositor sleep between the 12 Hz poses. Change in `docs/research2/art/mambo_rig.mjs`, then `tools/sync_heroine.mjs`.
3. **fitText without forced layouts** (shell, 1 hour): in `src/main.js:46` and the ledger, re-fit only when the string length or the box width
   changed (cache both on the element), and skip the ledger's 1 s re-fit of TIME (fixed-width digits, `tabular-nums`). Removes the per-second forced
   layout in idle and the top named function of the tumble.
4. **Heroine on portrait mobile** (heroine + shell, 1 day): give `heroine_shell.js` a portrait slot under the logo (160-200 px, waist-up crop
   `setCrop`), keep it clear of the board and the buttons, never under the SECRET ENTRANCE plate.
5. **Symbol idle clock** (render, half a day): drive the symbol idle animations by one class toggle per beat on `#game` (or per row) instead of
   walking every animation and writing `--mbclk` per cell in `symbols.js:366`; or pause them all when `quality.calm` is set.
6. **Dust canvas** (render, 1 hour): draw the twinkles into a small sprite and move them with `transform` on a few absolutely placed elements, or
   redraw only the dirty rectangles; at minimum stop the full clear at 7 Hz when no mote is lit (`scene.js:355`).
7. **Annex layer budget** (render/layers): drop `will-change` / promoted wrappers of the 6th row during the layout morph and blueprint; the
   36-cell p90 is 47-50 layers today (budget 45).
8. **Dress the voids and add the L8 briefing card** (render + shell): curtain or pillar art for void cells; three skippable cards on the first spin.

Quick wins found on the way (shell, each under an hour, no math or rule change):
- Door cards: add the mission name and its one-line rule under each door name (strings already exist in the dossier: "Every winning step turns
  the clearance dial up"), in `src/ui/doors.js` from `rules_data.missions[].name` by `mode`.
- Picker at low heights: make `#door-cards` the only scrolling part and keep CANCEL / CONFIRM in a non-scrolling footer, or lay the three cards
  in one row with name, mission and cost only when `max-height: 300px`; call `scrollIntoView({block:'nearest'})` on the focused button.
- Paytable: replace the `GLYPH` table of `src/rules.js:26-30` with 28 px thumbnails from `symbolMarkup(id)` (the store art already does this).
- HUD labels: floor `.lbl` at 9 px (`font-size:max(9px,calc(var(--fs)*.72))`) and give the 800x450 band the same `--fs` rule as 1024x576.

Math is FINAL and out of scope for changes; W4 and W5 are recorded so the store copy and marketing lean on the doors, the missions and the heroine
rather than on a max-win headline.
