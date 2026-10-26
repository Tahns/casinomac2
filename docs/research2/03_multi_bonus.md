# 03 Several bonuses: structure, a five-mission menu, modes and patent flags (Agent Mambo v2)

Date 2026-10-26. Angle: multiple-bonus structures. Screening aid only: NOT legal advice, NOT a clearance. "Found nothing" never means free to use; a human IP attorney must review section 7. Reddit is unreachable (403) and was not used. Evidence: strong = primary page read with claim text visible; medium = primary or trade page read, claims not visible; weak = search snippet or press only. Google Patents status and expiry are Google's own estimates. WebFetch summarises pages and cuts them near 100k characters, so claims were usually NOT visible (said each time). No named competitor's mechanic, name or art is copied: games below are evidence of structure only.

## 0. Bottom line
1. The market recipe for "several bonuses" is 2 to 3 bonuses, one natural trigger each (symbol type or scatter count), and one buy price per bonus with RTP kept within about 0.2 points across buys (six buys at 96.22 to 96.35 in one title) [S2-S4]. That maps cleanly onto our platform: one mode per bonus, same RTP, different price or shape.
2. Two common patterns are impossible or weak here. Unlocking bonuses by how many times you triggered before (Thunderstruck II style) needs state across rounds; Stake games are stateless [S1, C1]. A pick screen after the trigger cannot change a pre-computed outcome, so it can only be a reveal. Do not fake a choice.
3. Three of the games read (Hand of Anubis, Wanted Dead or a Wild, Chaos Crew 2) use, as one or both of their bonuses, a respin round whose counter resets to 3 [S2-S4]. That is the hold-and-spin skeleton 01 section 3.7 says to avoid. Our cluster/tumble engine has other levers, so the menu below uses the wire, a banked payout, a moving overlay and a shrinking symbol pool instead.
4. Proposed menu (section 4): BRIEFING (exists), DEMOLITION RUN, LOCKED CASE, SEARCHLIGHT, COVER BLOWN. Each changes a different layer: meter ladder, blast engine, when the meter is applied, a board overlay, the symbol pool.
5. Measured on a proxy (section 4.1): at equal mean, structure changes the shape only moderately (post-floor cv 1.05 to 1.16, median 12.5x to 23x) except COVER BLOWN (cv 2.1, median 7x). The spin-count/step dial moves the median far more (1.2x at 5 spins to 40x at 20 spins). So sell the missions by rules, pace and animation; set volatility tiers with the dial.
6. Build order by cost and risk: shared mission plumbing (about 7 h), DEMOLITION RUN (config level, 1 to 2 h), LOCKED CASE (2 to 4 h), SEARCHLIGHT (4 to 6 h). COVER BLOWN is NOT a few hours: it is the strongest lever and needs strip redesign plus a patent check (IGT symbol-elimination family). Estimates are from reading the code, not measured.
7. Entry: natural trigger draws the mission from pinned weights (shown in the rules), then an honest dossier reveal; Secret Entrance gets one door per mission plus the current mixed door: 7 modes of the 20 allowed. Open risk: book size (about 316 MB per bonus mode today, limits unpublished).
8. Patent flags to put in front of counsel first: IGT US7749063 (symbol elimination in free spins), IGT US9098976 (symbol type sets free games + multiplier), the IGT/Aristocrat post-trigger volatility-choice families, LNW US11893862 (levels that grow the array), plus the 01 list (cluster family, US8192275 for the wire).

## 1. Platform rules that shape any multi-bonus design
| Rule | Source | Consequence |
|---|---|---|
| Strictly stateless: no continuation or progression across rounds | docs/STAKE_COMPLIANCE.md (read from official page; detail partly assumed) | No unlock by trigger count, no cross-round collection. Progress exists only inside one round |
| Outcomes are pre-computed books chosen by weights | task brief, SDK docs | A choice is a mode or cosmetic. A reveal must not imply influence |
| At most 20 modes (more needs a support exception) | docs/research2/00_ENGINE_SELFCHECK_PROMPT.md | Plan 7 now, keep 13 free |
| RTP 90-98 percent, spread between modes under 0.5 points (third-party summary, unofficial) | skills.rest via docs/STAKE_COMPLIANCE.md | Price and shape are free, EV is fixed per mode. Observed practice: 96.22 to 96.35 across six buys [S4] |
| Any mode costing more than 2x: no one-press bet, confirm dialog or mode switch showing the cost [31] | selfcheck prompt | Every door needs the confirm dialog; keep the 50-unit minimum round price |
| Mode names are shown as written in index.json; social words fail ("bonus buy", "buy feature", "super bet") [225] | selfcheck prompt | Name modes entrance_* never buy_*; UI strings use the existing SECRET ENTRANCE wording |
| Rules screen lists every non-base mode with cost, RTP, max win; any displayed probability must match the math [25][27][266] | selfcheck prompt | Mission odds and door table are generated from the FINAL weighted lookup tables |
| Payout values are multiples of 0.1x | docs/STAKE_COMPLIANCE.md | Integer lens factors only; no x2.5 |
| Book size: bonus mode is 316 MB at 100k books; upload limits unpublished | MATH_REPORT.md, STAKE_COMPLIANCE.md | Six large modes is about 1.9 GB: ask Stake (section 8) |
| Buy features are not offered everywhere (two of the pages below say "not for UK players") | S2, S3 | Natural triggers must carry the game; one front-end flag must hide all doors |

## 2. How shipped slots present several bonuses
| Title (maker) | Structure | Lesson | Src, quality |
|---|---|---|---|
| Thunderstruck II | Four free-spin levels unlocked by lifetime trigger count (1-4, 5-9, 10-14, 15+): 10/15/20/25 spins, Loki wild magic, Odin raven multipliers, Thor rolling reels | Cross-round unlock: impossible on a stateless platform | S1, medium |
| Hand of Anubis (Hacksaw) | 3 scatters in the sequence start Underworld (10 spins, column multipliers); 4 start Judgment (hold-and-win style, counter resets to 3). Two buys: 129x (RTP 96.29) and 200x (96.18) | Scatter count picks the type inside one round: allowed here, but the 4+ odds are tiny (below) | S2, medium |
| Wanted Dead or a Wild (Hacksaw) | Three trigger symbols, three bonuses; buys 80x / 200x / 400x with RTP 96.27 / 96.33 / 96.43; the 400x bonus is a collect-and-respin with resets to 3 | One buy per bonus at its own price, near-equal RTP | S3, medium |
| Chaos Crew 2 (Hacksaw) | 3 scatters Bonus, 4 scatters Super Bonus, "best of 3" variants (highest round pays); six buys 5x / 100x / 200x / 200x / 250x / 500x, RTP 96.22 to 96.35 | A ladder of buys inside the same RTP band | S4, medium |
| Money Train 3 (Relax) | Four buys (100x, a two-spin bonus, a one-spin bonus, 500x persistent); RTP 96.10 normal, 96.50 with buy. A search snippet says a sibling title without buy exists for restricted markets | Buy menus differ in RTP in some titles; we must not | S5, medium (sibling: weak) |
| Unusual Suspects 2 (Games Global) | Pre-bonus "suspect line-up": pick one of five suspects, each reveals a perk; last-spin bomb-defuse bonus | Name and visual collision for a "line-up" scene and a bomb/defuse end bonus: avoid copying (renamed COVER BLOWN) | S6, medium |
| Gates-style end-of-sequence multiplier sum (Pragmatic) | Multiplier symbols summed and applied to the sequence total at its end | Commercial reference for LOCKED CASE; ours is a global gauge, not symbols | S7, weak |
| Sweet Bonanza 2500 (Pragmatic) | Ante Bet 2.5x and 12x (more trigger chance), Super Spin 20x and 250x | Chance-bearing extra-wager modes: avoid (01 section 3.11) | S8, weak |

Reading: (a) variety is sold by price ladders and distinct trigger symbols; (b) natural frequency is low (our trigger is 1 in 200, so 39 percent of 100-spin sessions see one bonus, 78 percent of 300-spin sessions, 22 percent of 50-spin sessions), so most players meet a given mission through the doors or not at all; (c) nobody in this sample lets the player choose AFTER the trigger without it being a real mode or a reveal.

## 3. Presentation patterns translated to pre-computed books
| Pattern | Possible here | How, and the catch |
|---|---|---|
| Mission select screen after the trigger | Reveal only | Outcome is fixed in the book. Pick-after-trigger-sets-volatility is the subject of IGT US8876590 / US9299220 (active, est. 2028) and Aristocrat US20240105019 (est. 2040); descriptions read, claims not visible [P2, P3]. Show an "assignment" stamp, not a pick |
| Random bonus type on trigger | Yes | Draw with the SDK's `get_random_outcome` from weights in the distribution conditions; pin shares with `record({"mission": id})` like `bonusTier` |
| Unlock by scatter count | Partly | Today count sets spins. Exact odds on the BR0 strip (initial board): 3+ scatters 1 in 105, 4+ 1 in 1 587 (published trigger is 1 in 200 after weighting), 5+ 1 in 44 567, 6+ 1 in 2.99 million. Count cannot choose among five missions |
| Distinct trigger symbol per bonus | Possible, not advised | Costs strip and paytable room; IGT US9098976 claim 1 reads on symbol types that each fix a free-game count and a multiplier [P1] |
| Ladder inside one round | Yes | Meter thresholds only; no grid growth in this menu (LNW US11893862 [P4]; see 02 concept C2) |
| Collectable progress across rounds | No | Stateless |
| Separate buy per bonus | Yes, best fit | One mode per door, same RTP, own confirm |
| Pre-spin "operation" choice (4 extra base modes pinning the mission) | Legal, weak | A bonus appears about 1 spin in 200, so the choice pays off rarely; doubles optimizer and book work. Phase 2 at most |

## 4. The menu: five missions
### 4.1 Proxy comparison (read ratios, not absolutes)
Method: `docs/research2/03_missions_proxy.py` (reproduce: `python3 docs/research2/03_missions_proxy.py 32000`, about 3.5 min on 4 cores; modes `dial` and `cover` give the other tables; raw output saved in `03_missions_proxy_output.txt`). Real FR0 strip, SDK-style stop windows and tumble refill, real paytable, wild joins, scatter inert, retrigger on 3+ scatters of the final board, win cap 5000x, wire per SDK rules, 32 000 bonuses per row, 10 starting spins. NOT the SDK, no lookup-table reweighting. Calibration: Briefing post-floor mean 101x vs "natural mean of a 10-spin buy about 100x" in MATH_REPORT; the default wire adds only 3.5 percent in the proxy (35.5 vs 34.3 raw), matching "mostly spectacle". Each row has ONE parameter tuned so the mean of bonuses paying 30x or more (what the 30x buy floor keeps) equals Briefing's. Caveat: the proxy under-counts winning steps against the published books (mean peak meter 29 here; published buys peak at x33 to x65 after floor and tilt).

| Mission (tuned parameter) | Post-floor mean | Post-floor cv | Median | p90 | Below 30x | 100x+ | 300x+ | 1000x+ | Winning steps | Peak meter |
|---|---|---|---|---|---|---|---|---|---|---|
| Briefing (meter step 8) | 101.4 | 1.05 | 13.1 | 94.6 | 69.0% | 9.3% | 1.47% | 0.04% | 3.5 | 29 |
| Demolition Run (step 2, wire 12 cells, 5 burnt at reveal, +2 per win) | 96.1 | 1.16 | 12.7 | 81.3 | 72.0% | 7.6% | 1.13% | 0.05% | 6.1 | 13 |
| Locked Case (step 7, pay at spin end) | 100.1 | 1.05 | 23.1 | 120.9 | 57.1% | 13.1% | 1.70% | 0.06% | 3.5 | 25 |
| Searchlight (2x2 lens x4, step 3) | 104.0 | 1.09 | 12.5 | 94.9 | 69.1% | 9.4% | 1.59% | 0.07% | 3.5 | 11 |
| Cover Blown (step 4, unmask every 32 points) | 105.0 | 2.13 | 7.1 | 49.9 | 82.3% | 4.2% | 0.90% | 0.13% | 3.5 | 15 |
| Cold Trail, REJECTED (step 28, meter halves on a dead spin) | 101.2 | 0.93 | 12.2 | 104.6 | 67.0% | 10.6% | 1.30% | 0.02% | 3.5 | 53 |

Volatility dial of the plain ratchet bonus (same method, `python3 ... dial`):
| Start spins | Meter step | Post-floor mean | cv | Median | p90 | Below 30x | 100x+ | 300x+ |
|---|---|---|---|---|---|---|---|---|
| 5 | 12 | 99.6 | 1.18 | 1.2 | 39.1 | 87.2% | 3.6% | 0.56% |
| 7 | 10 | 98.5 | 1.09 | 5.6 | 63.1 | 80.0% | 5.7% | 0.88% |
| 10 | 8 | 102.6 | 1.07 | 12.9 | 93.4 | 69.4% | 9.1% | 1.40% |
| 15 | 5 | 99.4 | 0.98 | 24.4 | 124.9 | 56.0% | 13.5% | 1.71% |
| 20 | 4 | 105.4 | 0.92 | 40.2 | 159.2 | 40.2% | 20.6% | 2.74% |

Reading: (1) Locked Case is the only structure that lifts the median (23x vs 13x) and cuts duds (57% below 30x vs 69%); (2) Demolition Run nearly doubles winning steps (6.1 vs 3.5) at a low meter: constant action; (3) Searchlight keeps Briefing's tail but the lens, not the meter, does the work (peak meter 11); (4) Cover Blown has the heaviest tail (1000x+ at 0.13%, 3x Briefing) and the weakest middle; (5) with the 30x floor kept, the share of simulated books that pass is 31% (Briefing), 28%, 43%, 31%, 18% (Cover Blown): Cover Blown costs about 1.8x more simulation time per accepted book than Briefing.

### 4.2 Mission cards
**M1 BRIEFING (exists, "Mission Briefing")**
- Rule: free spins 10/12/15/18/20 by scatter count (4 to 8), retrigger on 3+, meter x1, paid at the CURRENT value then +8 per winning step, cap x100, never drops, 6x5.
- Feel: workhorse; many small beats, climb you can see. Medium-high volatility (buy median 64x in the published weighted books). Outfit per directive 2: policewoman uniform (mission outfit, no longer the base).
- Patent: global meter that rises per winning step: nearest anchors expired (IGT US7258611 expired 2022-02-28, US8029358 expired 2024-01-10, both claims visible: a multiplier picked for each free play independent of symbols) [P7]. Low to medium, as in 01 section 3.5.

**M2 DEMOLITION RUN (the wire becomes the engine)**
- Rule: same cluster/tumble/meter engine. The wire is 12 cells, 5 already burnt at reveal, +2 per winning step, blast threshold 3. Every dead board blasts (unless all burnt cells are scatters): burnt non-scatter cells vanish, new symbols drop, the board scores again. One blast per spin, never a wild, trigger is the dead board, not a win. Meter step drops to 2.
- Feel: guaranteed fireworks, high action, lowest tail of the set (300x+ 1.13%). Today the wire pays after only 4 to 5 percent of blasts (MATH_REPORT); here it is a partial re-draw of 5 or more cells, which in the proxy triples the mean at the Briefing step (111x vs 36x raw, 6 000 bonuses). Outfit: stylish commando jumpsuit.
- Meter: x1 start, +2 per winning step; a blast that pays moves the meter like any winning step.
- Natural/door: mission weight 20%; door at 100x.
- Build: config level. `fuse_params` and `gm_step` become per-mission lookups (2 to 3 lines in `make_fuse_path` / `bump_global_mult`). Long-path retry loop needs a test (12 cells on 6 reels).
- Patent: inherits the WMS/LNW US8192275 question from 01 section 3.3; keep the dead-board trigger and no bomb badge on symbols. Claims not visible: counsel should see that a blast removes 5 or more cells here against 3 in the base game. Medium.

**M3 LOCKED CASE (bank, then multiply)**
- Rule: during a spin each winning step is paid at x1 into the attache case (the mascot's drum case); the meter still rises (+7 per winning step, start x1). When the board is dead and the wire has resolved, the case opens: bank x current meter is paid. Per spin, not per bonus.
- Feel: one big beat per spin instead of many small pops; fewer duds (median 23x). The first winning spin of the bonus pays at x8 instead of x1, so the ladder is shorter. Rules text must say "paid when the case opens". Outfit: evening sheath dress (casino lobby handoff).
- Meter: global gauge only (not per symbol); persists through the bonus and retriggers.
- Natural/door: weight 15%; door at 100x, best "fewer duds" door.
- Build: the SDK already has `WinManager.set_spin_win` ("end-of-sequence win modification"). Override `bump`/pay timing in `cascade`, emit `caseOpen {bank, mult, win}`; per-step `winInfo` shows meter 1. Check that `setWin`/`setTotalWin` still reconcile.
- Patent: no patent found for a global gauge applied at sequence end (negative result only). Nearest: IGT US20250265904A1 (symbol-specific multipliers accumulated, then used in a later sequence; active est. 2044, claims not visible) [P9]; keep the gauge global. Commercial reference S7 (weak). Medium, unknown.

**M4 SEARCHLIGHT (telegraphed overlay)**
- Rule: at reveal the book announces the beam route for the spin: a 2x2 lit window that bounces diagonally across the board, one position per evaluation step (same idea as the wire path, so `make_fuse_path` style code is reused). A winning cluster that touches the lit window pays x4 on top of the meter (integer only). The beam is a board overlay, not a symbol attribute, and does not persist between spins.
- Feel: the player sees the beam before any outcome and watches whether a cluster lands in it; highest spectacle per line of math. Meter step 3 (peak about 11), the lens carries the payout. Outfit: trench coat and fedora (stakeout at night).
- Meter: ratchet as Briefing, lower step; lens multiplies the cluster win, meter multiplies as today; wincap check stays in the loop.
- Natural/door: weight 20%; door at 100x.
- Build: 4 to 6 h. Route generator, `evaluate_clusters_with_grid` override (lit flag in `meta`), events `lightRoute` at reveal and the lit flag in `winInfo.meta`; visible rows (unpadded) like the fuse events. Format check: x4 on 0.1 steps stays a multiple of 0.1.
- Patent: nearest moving-indicator art is SVE US8597100 (moving border indicator applies a multiplier through the nearest symbol; claims visible, marker tied to symbols; Google: expired for fees, lapse 2026-01-05) [P6] and a moving-wild-with-die patent US6419579 (status not read). Ours is not tied to a symbol or wild. Low to medium. Do not use a full-column lens: Hand of Anubis shows column multipliers [S2].

**M5 COVER BLOWN (symbol pool shrinks as the meter climbs) - promising, NOT quick**
- Rule: meter ratchet as Briefing, but every N meter points one low symbol (L4, then L3, L2, L1) leaves the refill pool for the rest of the bonus; board symbols already down stay. Cards of the "agent files" are crossed out one by one.
- Feel: slow burn, then a snowball; the clearest progress bar in the set. Heaviest tail (1000x+ 0.13%) and weakest middle (median 7x).
- The catch (proxy, 20 000 bonuses per setting): each removed low symbol is a very strong lever. Step 4 with an unmask every 8 points gives a post-floor mean of 1 305x (13x the price) and 81% of bonuses unmask once; step 2 every 4 points gives 1 325x. To sit at about 100x the first unmask must be rare: step 4 every 32 points (104x) is reached by 6.5% of bonuses, a second one by 0.3%; step 2 every 16 points (97x) 6.5%; step 1 every 8 points (100x) 6.4%. So either the progress is almost never seen, or the stage strips must start WEAKER than FR0 (denser lows) and climb to FR0: strip design plus paytable work, days not hours.
- Natural/door: weight 10% (rarest, fattest tail) once tuned; door at 100x.
- Build: strip generator in `tools/make_reels.py` (stage strips), `draw_board` and mid-cascade `reelstrip` switch, event `coverBlown {stage, symbol}`; reweight for a tail 3x as heavy.
- Patent: closest hit of the whole study. IGT US7749063B2 "free spin mode with symbol elimination": priority 2004-09-29, granted 2010-07-06, Google "active", est. expiry 2028-08-29; executor symbols raise a "guillotine" meter, one symbol of the free-spin set is eliminated (generation blocked), meter resets, order alphabetical, predetermined or random; claims NOT visible. Continuation US8251798B2 is expired (fee related, 2025-07-13); US8668567 status not read [P5]. Ours is fed by the global meter, not executor symbols, with no reset, but this needs counsel first. Design-around candidates (non-legal): schedule-driven "acts" (stage changes at fixed spin numbers, no meter), or promote high symbols instead of eliminating low ones. Medium to high.

### 4.3 Considered and not proposed
- Cold Trail (meter halves on a dead spin): proxy cv 0.93 and tail down, but about 70 percent of spins are dead, so the meter is punished all the time; contradicts the design bible ("never drops") and the attraction brief. Related art: IGT US8021224 expired (streak, reset) and a reset-on-win trail CA2981881A1 (weak). Rejected.
- Twin boards / split arenas with a wall: 02 measured a partition wall at -62 percent hit rate and rates twin boards HIGH patent proximity (crowded 2025-26 releases). Dropped.
- Best-of-N bonus (highest of three rounds pays): a named competitor's mechanic [S4]; not copied.
- Per-family or per-symbol meters (two competing gauges): IGT US20250265904A1 shape. Keep one global meter.
- "One ladder bonus" instead of five: Briefing whose meter thresholds switch on the other layers (lens at x25, pool shrink at x49). One mode, no door menu, cheaper to review for books, but all layers and all patent flags stack in one bonus and RTP tuning couples. Keep as a fallback if the 7-mode book size is refused.

## 5. Trigger, reveal and entry structure
### 5.1 Natural trigger
- One scatter type (Classified Dossier) as today. Scatter count keeps setting the spins (10/12/15/18/20). The mission is drawn at trigger from weights in the distribution conditions, proposed start 35 Briefing / 20 Demolition Run / 20 Searchlight / 15 Locked Case / 10 Cover Blown (Cover Blown only after the strip work, else 0 and renormalise). Pin shares with `record({"mission": ...})`; the rules page prints the FINAL weighted shares [266].
- Optional tier 0, 3 scatters: a short "Wiretap" run (3 spins, Demolition engine, no retrigger). Natural odds 1 in 112 for exactly 3 on the BR0 initial board. It would turn the present 3-scatter tease into a real award but takes RTP from the main bonus (frequency x mean, for example 0.9% x 6x = 5 points). Product call; not required.
- Do NOT add trigger symbols per bonus (section 3).

### 5.2 Secret Entrance doors (modes)
| Mode name in index.json | Cost | What it starts | Notes |
|---|---|---|---|
| base | 1x | natural triggers, mission by weights | unchanged |
| bonus (existing, keep the name) | 100x | mission by the same weights ("surprise door") | existing 30x floor and tier shares |
| entrance_briefing | 100x | Briefing | existing weights |
| entrance_demolition | 100x | Demolition Run | |
| entrance_case | 100x | Locked Case | |
| entrance_searchlight | 100x | Searchlight | |
| entrance_cover | 100x | Cover Blown | after strip work |
Total 7 of 20. Same price for every door: the 5000x cap equals 50x the price at 100x and only 20x at 250x, so a dearer door starves its own tail; each door keeps the 30x floor, the 50-unit minimum round price and the confirm dialog. Differences between doors are shape, not EV: show honest facts from the final weighted tables (typical result, share above 100x), never "better odds". Phase 2 only: four extra 1x "operation" base modes (11 modes).

### 5.3 Reveal and honesty rules
- After the scatters fly in, the folder opens and a stamp names the mission; the mascot changes outfit behind a screen (directive 2). No pick, no "choose your mission". Skippable, turbo 0.4 s. UK RTS 7 (read by 02): no false near-miss display, so the reveal must not tease a mission it will not give.
- Celebrations scale to the PRICE paid: a 30x payout from a 100x door is a net loss and gets no win fanfare (no loss disguised as a win).
- Buy doors behind one jurisdiction flag; autoplay and turbo behave as today; social wording uses "play" and "win" in every new string [225].

## 6. SDK build estimate (engineering estimate from reading the code, not measured)
| Item | Code and tests | Then | Front-end events |
|---|---|---|---|
| Shared plumbing: `MISSIONS` dict, mission draw with `get_random_outcome` from distribution conditions, per-mission params for `gm_*`, `fuse_params`, spin table, `record({"mission"})`, tests | about 3 h | | `missionAssigned {mission, spins}` |
| Generalise `tools/reweight_bonus.py` from tier to (mission, tier); extend `tests/test_math.py` (0.1x payouts, cap, shares) | about 3 to 4 h | | |
| Door modes: per-door BetMode and criteria with `mission_weights` conditions (7 modes), fixtures | about 2 h | | |
| Demolition Run | 1 to 2 h | tuning step vs wire | reuse fuse events, longer path |
| Locked Case | 2 to 4 h | tune step, floors | `caseOpen`, bank counter |
| Searchlight | 4 to 6 h | tune lens x and step | `lightRoute`, lit flag |
| Cover Blown | 6 to 10 h plus strip design | days of tuning, counsel | `coverBlown` |
Simulation: the repo's two-mode run takes about 35 min; allow about 10 to 25 min per extra mode on 4 threads (extrapolated), longer for Cover Blown (18 percent acceptance at the 30x floor), plus 3 to 5 tuning loops per mission. Memory: keep batching 6250. Each mission needs its own check that RTP lands at 96.000 percent after the tilt (one tilt per mode as in `reweight_bonus.py`), P(5000x) pinned, and that the sum over missions of the natural-trigger RTP leaves the base mode in range (the optimizer re-fits base).

## 7. Patent proximity (screening; tags say how soon to show counsel)
| Element | Nearest art found | Status and claims seen | Tag |
|---|---|---|---|
| Symbol type fixes free games and multiplier (distinct trigger symbols) | IGT US9098976 [P1] | Active est. 2033-06-27; claim 1 visible | Avoid (we use one scatter) |
| Player picks feature or volatility after a trigger | IGT US8876590, US9299220 (litigation flag); Aristocrat US20240105019 / US12700286 [P2, P3] | Active est. 2028 / 2040; claims not visible | Avoid any pick screen |
| Levels that add rows when symbols are collected | LNW US11893862 [P4] | Active est. 2042-02-20; claims not visible | None used here; 02 concept C2 |
| Symbol elimination in free spins | IGT US7749063, US8251798, US8668567 [P5] | 7749063 active est. 2028-08-29; 8251798 expired; claims not visible | Cover Blown: MEDIUM-HIGH |
| Moving indicator or region multiplier | SVE US8597100 [P6]; US6419579 (weak) | Expired for fees (lapse 2026-01-05); claims visible | Searchlight: LOW-MEDIUM |
| Bank then multiply at sequence end | No patent found; IGT US20250265904A1 [P9] nearest | Active est. 2044; claims not visible | Locked Case: MEDIUM, unknown |
| Blast on dead board, removal of non-winning symbols | WMS/LNW US8192275 (01 section 3.3) | Active est. 2029-07-13; claims not visible | Demolition Run: MEDIUM (cell count) |
| Free-game multiplier changing each play | IGT US7258611, US8029358 [P7] | Expired 2022 / 2024; claims visible | Briefing: LOW |
| Multi-level bonus, higher level pays more | WMS/LNW US8535143 [P8] | Google: expired (fee related); claims not visible | Low |
| Sticky winning symbols for a duration | IGT US8371930 [P10] | Active est. 2031-09-19; claims not visible | Do not keep winners in place |
| Buy menus | Aristocrat US8475256, US8562408 (expired); WMS US20130288782A1, US20050215311A1 (side-bet menus, status not read, weak) | see 01 section 3.11 | Doors are direct and guaranteed: LOW-MEDIUM |
| Hold-and-spin and respin reset | Aristocrat family (01 section 3.7) | Active to 2038-2041 | Not used |
| Cluster pays, tumble | 01 sections 3.1, 3.2 | | Inherited, ATTORNEY HIGH |
Search-only (weak, not read): US7922575B2 (per-line multiplier resets), US7722457B1 (3/4/5 scatters award 5/9/15 spins), US9159201 (reel strips swapped between base and free), US20080081687 (lowest symbols converted).

## 8. Risks, open questions
1. Stake (not found in public docs): maximum book size and total upload per game; acceptance of 7 modes at about 316 MB each (fallback: 50k books per door, or the one-ladder bonus of 4.3); whether the 0.5-point RTP spread is official; whether `name` in index.json is shown to players.
2. IP attorney: US7749063 and family vs Cover Blown; US9098976 vs any future second scatter; whether a 5-cell dead-board blast (Demolition Run) changes the US8192275 picture; whether the lens (Searchlight) reads on moving-region multiplier claims; the post-trigger-choice families vs a reveal that looks like a pick; trademark checks for all five names (a search found no slot bonus called Demolition Run, Locked Case or Searchlight, but the search tool is weak; an earlier working name "Suspect Line-Up" collides with the line-up scene in S6, hence COVER BLOWN).
3. Product: mission weights, whether to ship Cover Blown, whether tier 0 exists, door price (100x for all).
4. Math caveats: proxy under-counts winning steps; equal post-floor mean is a buy-mode device, natural-trigger RTP per mission differs (raw means 25 to 49x in the proxy), so mission weights and the base optimizer must be re-fitted together.
5. Animation cost is the real budget: five mission intros, five outfits, lens, case, stage cards. Every sequence needs skip and turbo variants.
6. Not done: no SDK run, no claim text for most patents, no non-US families, no trademark database query, no check of Stake's size limits.

## 9. Sources
Slots and press: S1 https://www.casinos.com/slots/thunderstruck-ii (medium) ; S2 https://slotcatalog.com/en/slots/Hand-of-Anubis (medium) ; S3 https://slotcatalog.com/en/slots/Wanted-Dead-or-a-Wild (medium) ; S4 https://slotcatalog.com/en/slots/Chaos-Crew-2 (medium) ; S5 https://igamingbusiness.com/casino-games/slots/money-train-3-by-relax-gaming/ (medium; the sibling title claim is a search snippet, weak) ; S6 https://igamingbusiness.com/company-news/games-global-and-northern-lights-gaming-unlock-more-unusual-suspects (medium) ; S7 https://www.gambling.com/news/slot-game-of-the-week (weak, snippet) ; S8 https://slotcatalog.com/fr/slots/sweet-bonanza-2500 (weak, snippet).
Patents: P1 https://patents.google.com/patent/US9098976 (strong) ; P2 https://patents.google.com/patent/US8876590B2/en and https://patents.google.com/patent/US9299220B2/en (medium) ; P3 https://patents.google.com/patent/US20240105019A1 (medium) ; P4 https://patents.google.com/patent/US11893862B2/en (medium) ; P5 https://patents.google.com/patent/US7749063B2/en , https://patents.google.com/patent/US8251798 (medium), US8668567 only via https://patents.justia.com/patent/8668567 search result (weak) ; P6 https://patents.google.com/patent/US8597100B2/en (strong) ; P7 https://patents.google.com/patent/US7258611 and https://patents.google.com/patent/US8029358 (strong) ; P8 https://patents.google.com/patent/US8535143B2/en (medium) ; P9 https://patents.google.com/patent/US20250265904A1/en (medium) ; P10 https://patents.google.com/patent/US8371930 (medium) ; also read: https://patents.google.com/patent/US7494413 (expired 2026-03-18, claims not visible). Weak search hits: https://patents.google.com/patent/US7922575B2/en , /CA2981881A1/en , /US6419579 , /US20130288782A1/en , /US20050215311A1/en , /US7722457 , /US20080081687.
Repo (platform and math facts): C1 docs/STAKE_COMPLIANCE.md ; docs/research2/00_ENGINE_SELFCHECK_PROMPT.md ; 00_USER_DIRECTIVES.md ; 01_patent_zones.md ; 02_variable_grids.md ; math/games/agent_mambo/{game_config,game_executables,gamestate,game_override}.py ; MATH_REPORT.md ; math/src/{state/state.py,wins/win_manager.py,calculations/statistics.py,events/events.py} ; math/docs (bet modes, distribution conditions) ; docs/mambo/DESIGN.md.
