# Agent Mambo v2: SYNTHESIS (decision-ready design spec for the build team)

Date 2026-10-26, branch `claude/elegant-bell-5q79k8`. Screening aid, NOT legal advice, NOT a clearance: nothing here is "patent-free" or compliant until a human IP attorney and the Stake Studio review say so; "found nothing" is never "free". Reddit was not reachable and is not cited. Built from reports 00-09, gap_01 (claims of the Aristocrat cluster family) and gap_02 (cost of a fallback pay rule). Evidence tags carried from them: strong / medium / weak. All art and sound hand-built in code, adult heroine only, no deceptive design.

## 0. Binding decisions and how conflicts were resolved
### 0.1 Orchestrator rules applied (one line each)

| ID | Decision | Consequence |
|---|---|---|
| a | ONE grid direction: the 6x5 frame stays; per-spin masks only block cells or set column heights, fixed for the whole spin; no growth, no 7-column, no 42/49-cell board; 4 variants | Section 3. Layouts live in the BASE game; free spins always play on the home 6x5 (bonus layouts = backlog, they would multiply calibration) |
| b | Min-5 orthogonal cluster rule unchanged | Attorney flag + costless fallback as a NOTE only (section 10). Nothing built |
| c | 3 missions max, visibly distinct in 10 s; rest = backlog; a mission seen less than once per 500 spins gets its own door; 100x doors <= 4 | Section 2: Briefing 1 in 500 spins, Sealed Orders 1 in 667, Ballroom Blackout 1 in 667, so all three get a door: 3 doors |
| d | Metric = P(return > stake) per spin and per door; celebrate only above the stake; pre-result sequences obey RTS 14E/14G; no fake near-miss | Section 4 (targets), Rule P below |
| e | One owner per hot file; one shared motion and flash store | Section 9 |
| f | ~8 h wall clock, 4 CPU, 15 GB; serial math; shippable at every milestone | Section 9 schedule and cut line |
| g | Hand-drawn vector heroine (rig in `docs/research2/art/`) stands LEFT of the grid | WP3 + shell CSS in WP1 |
| h | Defaults: books ~0.7 GB total, zstd level 15, per-spin rows only if encoded in the reveal shape | Section 7 and the Stake questions in section 10 |

Rule P (pre-result sequences, our reading of UKGC RTS 14E/14G; the clause numbers differ between UKGC pages, so cite the current RTS text; strong text, interpretation for counsel): each pre-result sequence is short (layout draw-on <= 0.5 s, door transition <= 1.2 s), never advertises a result, counts toward the >= 2.5 s cycle, is NOT shortened by turbo where `disabledTurbo` or `minimumRoundDuration` applies, and tap-to-skip exists only for sequences that start after a result is already on screen (dossier cutscene after the scatters landed, costume change, big-win count-up).

### 0.2 Report conflicts, pick and one-line reason

| Conflict | Pick | Why |
|---|---|---|
| Mid-round growth (01 forbids, 02 C2 ranks it 2nd, 03 puts a lens/pool ladder in, 08 proves it) | None in v2; Skyscraper Floors deferred | "Expand" element of US10964173 and LNW growth families (gap_01 3d); books 1.9-4.9x bigger; couples RTP tuning |
| Per-spin layout (02, 08) vs one grid per mode (01) | Per-spin pick from 4 fixed masks, base game only | Orchestrator (a); costless fallback = `layout_weights={mezzanine:1}`; attorney flag kept |
| Hit rate toward 42% (07) vs P(return > stake) (04) | P(return > stake) | Sub-stake hits cannot be celebrated (UKGC 14F); 69% of paying base spins return <= stake |
| Sliders: 4 incl. Ambient (04) vs 3 (06) | Master, Music, Effects + Mute | No ambient bus exists; adding one later is ~10 lines |
| Ledger P0 (04) vs P1 (06) | Ships in milestone 1, default on, locked on by flags | Small; UKGC 2E/13C (medium) and a fined operator |
| Two preference stores (05 `motion.js`, 06 `settings.js`) | `src/settings.js` is the only store; `render/motion.js` is a read-only subscriber | Orchestrator (e) |
| Names (02/03 vs 09/07) | Player-facing: "Clearance Dial" (was Mission Meter), "The Briefing", Sealed Orders, Ballroom Blackout, doors Stage Door / Coat Check / Service Stairs, floor plans Mezzanine / Atrium / Lobby / Annex. Code keys keep `mission`, `updateGlobalMult`. "paid" -> "won" | Engine [253] vs Mission X, social word list [225]; Penthouse is a magazine brand |
| 5 extra doors (03/08) vs single gate (07) | ONE Secret Entrance button; inside the confirm a picker of 3 doors; one flag (`disabledBuyFeature`) hides it all | Orchestrator (c); [31] confirm shows the real cost |
| `tests/e2e` empty (05 "extend") | WP10 creates it; flash check = own 60 fps luminance script (PEAT licence unchecked) | Harness did not exist |
| All numbers conditional on the cluster rule (critic 1) | Rule stays; layout thresholds and pay evaluation stay behind one function (`get_clusters_update_wins`) | Free to do; switching later costs 5-8 working days (gap_02) |
| Pre-result intros (04 ritual, 05 cutscene, 02 draw-on) vs RTS 14E/G | Rule P | See above |

### 0.3 Corrections carried into this spec
1. gap_01 7: US9542808B2 (IGT/PTT, same 2001 family as the expired US7357713) is ACTIVE to about 2027-10-18 and claims pay, remove, refill, repeat (claim text strong, status medium-strong). 01's "tumble anchor expired" is wrong for the whole family: the tumble loop is attorney territory too.
2. gap_02: Aristocrat US9558634 / US9886816 (priority 2012-08-08, active to 2033-08-07): a group of >= 3 same symbols sharing borders is paid. Every adjacency rule is in range (medium: summariser text). Not a design-around: shapes, paths, flat award all keep adjacency.
3. gap_01 3: literal reads on a size-paid cluster are US12094305 cl. 1/11 and US12536877 cl. 1/7/16 (medium); US10964173 and US11468746 need span-based pay and are not literally read (strong text).
4. The critic's recollection that Aristocrat bought BTG is contradicted: Evolution completed the BTG purchase 2021-06-30 (gap_01 6, strong). The Megaways patent number is still unknown.

## 1. Pillars
Agent Mambo is a top-secret office run from a jazz club: a hand-drawn 1962 rubber-hose inspector stands left of the board, reacts to every event and changes costume for each mission. Every bonus changes how the same board is read, and you can name which one is playing within ten seconds with the sound off (a climbing dial, a sealed envelope, a spotlight in the dark); each has its own door. The board changes shape by named floor plan, drawn once and shown before any result. Attractiveness means a play often returns more than it cost, and only those rounds are celebrated; everything else gets a quiet ledger tick, a wire gag or a shrug. The player controls sound (three sliders), motion and flashes, sees a session ledger, and every figure on screen comes from the final tables at one RTP of 96.00% in every mode.

## 2. Bonus modes (3, mechanically distinct rule layers on one cluster-tumble core)
Honest limit: all three share the cluster-tumble-dial core; distinctness comes from a different rule layer (pay timing, board overlay) and is a perceptual claim. 03's proxy shows structure moves the distribution only modestly (post-floor cv 1.05-1.16); variety is felt through rules, pace and animation, volatility is set by spins and dial step. Acceptance = the 10-second test in WP6 (5 viewers, sound off).

**M1 THE BRIEFING** (key `briefing`, exists as Mission Briefing, outfit `lab`)
- Rules: unchanged. 4-8 scatters give 10/12/15/18/20 spins; retrigger on 3+ gives 5/8/10/12/15/18; wire 8 cells, 1 burnt, +1 per winning step, blast at >= 3 burnt, cells vanish, no wild.
- Dial (Clearance Dial): x1, +8 per winning step, cap x100, never drops, persists through retriggers; a step is paid at the current value, then the dial rises.
- Trigger: natural weight 40% of the 1-in-200 trigger = 1 in 500 spins. Door: existing mode `bonus` (100x), the 100k books already built stay valid (no re-simulation).
- Volatility/RTP shape (weighted v1 tables, M): median 64.1x, 46% of buys at 30-60x, P(> price) 28.8%, 78.7% of RTP paid at dial >= x20.
- Patent proximity: LOW-MEDIUM for the dial (anchors IGT US7258611, US8029358 expired); inherits the cluster/tumble/wire flags of section 10.

**M2 SEALED ORDERS** (key `orders`, outfit `trench`; was Locked Case)
- Rules: during a spin winning steps are NOT paid; each is filed into the orders envelope at x1 ("banked", neutral colour, never shown as a win). The dial still rises. When the board is dead and the wire has resolved, the envelope opens: spin win = bank x dial (dial after that spin's steps). One payout beat per spin. Spins and retrigger as the Briefing.
- Dial: x1, +7 per winning step (1, 8, 15 ... 99, 100), cap 100, persists. Visible in 10 s: envelope fills, SEALED then OPENED stamp, no per-step win count.
- Trigger: weight 30% = 1 in 667 spins, so door `entrance_orders` (100x), 50k books.
- Volatility: the "fewest duds" door. Proxy (pre-weighting, direction only): post-floor median 23.1x vs 13.1x, below 30x 57% vs 69%, 100x+ 13.1% vs 9.3%. Targets on the FINAL table: median >= 64x, P(> price) >= 30%.
- Patent proximity: MEDIUM, unknown. No patent found for a global gauge applied at sequence end (negative, weak); nearest IGT US20250265904A1 (symbol-specific multipliers carried to a later sequence, claims unread). Keep the gauge global, never per symbol.

**M3 BALLROOM BLACKOUT** (key `blackout`, outfit `casino`; was Searchlight)
- Rules: every free-spin board opens in the dark; the book announces a route of a 2x2 spotlight window (`lightRoute`) BEFORE any outcome. Window k is used at evaluation step k (each tumble step and each post-blast evaluation advances it). A winning cluster that touches the window pays x4 on top of the dial (integer only). The beam is a board overlay, never a symbol attribute, never persists between spins; unlit symbols are dimmed but stay readable.
- Dial: x1, +3 per winning step (1, 4, 7 ... 100), cap 100. The lens, not the dial, does the work (proxy peak dial 11).
- Trigger: weight 30% = 1 in 667 spins, door `entrance_blackout` (100x), 50k books. Volatility: keeps the Briefing tail (proxy 300x+ 1.59% vs 1.47%), median about equal (12.5x vs 13.1x).
- Patent proximity: LOW-MEDIUM (moving-region art US8597100 expired for fees; US6419579 unread). No full-column lens (rival column multipliers).
- Risk: only mission without an SDK proof of concept (proxy only). Gate T+2:00: 300-book SDK run, mean post-floor 70-140x and 0 reconcile errors. Fail = FALLBACK THE LONG FUSE (Demolition Run, outfit `vault`): config-level, PoC exists (mean 91x, 24 blasts/book, books x1.8, ~49 ms/book).

**RTP shape (all doors).** Each door is exactly 96.000% (one reweighter lambda per mode, spread 0, P(5000x) pinned to 1/50 000, 30x floor kept). The natural-trigger RTP of each mission differs (proxy raw means 25-49x), so mission weights and the base fences are fitted together; the share of RTP paid at dial >= x20 is 78.7% for the Briefing and is measured for the others by WP9. Orders pays in one beat per spin (more mid-size results); Blackout carries its tail on lens x dial.

**Natural exposure (computed, trigger 1 in 200).** P(seen at least once in N plays): Briefing 18% (100), 45% (300), 63% (500); Orders and Blackout 14% / 36% / 53%. Every mission is below once per 500 spins, hence a door each. Mission mix is drawn at the trigger with `get_random_outcome(mission_weights)` (40/30/30), recorded with `record({"mission":id})`, pinned by a base fence, and printed on the rules screen from the final tables. The Registrar stamp is a reveal, never a pick.

**How bought.** One SECRET ENTRANCE button (100x the play amount, 50-unit minimum round price, confirm showing the real cost [31]). The confirm contains three door cards (Stage Door = Briefing, Coat Check = Sealed Orders, Service Stairs = Ballroom Blackout) with facts from `shares.json` (RTP 96.00%, max 5000x, median, share of rounds returning more than the price). No "better odds" wording, nothing pre-selected, focus on Cancel. `disabledBuyFeature` hides button and dialog. Social wording: "get the feature", "play".

**Backlog (not built):** Cover Blown (IGT US7749063, active to about 2028-08-29, MEDIUM-HIGH), The Long Fuse as a third door, Skyscraper Floors, Pneumatic Post, Breach, Dumbwaiter Gravity, Honeycomb, Double Agent, Cloakroom Caper, Cipher Salon, Night Beat, 3-spin Wiretap tier, 6x7/7x7 boards, mission-specific bonus layouts, odds-enhancer mode.

## 3. Variable grid system (4 floor plans, base game)

| id | Name | Frame rows | Present rows per reel (geometric, 0 = top) | Cells | Nominal draw | Natural mean vs 6x5 (02, M) |
|---|---|---|---|---|---|---|
| `mezzanine` | Mezzanine (home) | 5 | 0-4 on all six reels | 30 | 50% | 1.00 |
| `atrium` | Atrium (4 corners cut) | 5 | reels 0 and 5: 1-3; reels 1-4: 0-4 | 26 | 22% | 0.84 |
| `lobby` | Lobby (low ceiling, 6x4) | 5 | 1-4 on all reels (bottom aligned) | 24 | 14% | 0.69 |
| `annex` | Annex (6x6) | 6 | 0-5 on all reels | 36 | 14% | 1.32 |

- **When:** drawn once per base spin by the book (seeded `random`, `layout_weights`), fixed for the whole spin: reveal, all tumbles, the blast. Free spins are always Mezzanine in v2.0 (the `missionAssigned.layout` field is reserved).
- **Mass neutrality:** nominal mix 50/22/14/14 gives mean cells 29.1 and natural mean win -3.4% vs all-Mezzanine (02 method, computed here). Final per-layout shares are OUTPUTS of the weighted table: pin with `record({"layout":id})`, print from `shares.json`, never claim a layout changes the odds.
- **Gate (T+1:00, WP10):** proposed pass criterion (our choice, measured by the baseline): Annex cells >= 24 px at 400x225 (the WCAG 2.5.8 target floor reused as a legibility floor) and readable symbols at 425x812. If it fails, drop Annex before any simulation: mix 56/26/18 (mean win about -10%, absorbed by the optimizer).
- **Clusters and tumbles:** adjacency is geometric (same geometric row in the neighbouring reel must exist); min cluster 5; wild substitution unchanged; gravity inside each reel's present cells; refill from the reel strip as now; scatters 4+ trigger as now; wire path generated on geometry from reel 0, length 8; blast removes burnt non-scatter cells. Validator: connected, >= 24 cells, holes only at column ends (interior holes cost -60% mass and 15 attempts per book).
- **Encoding:** `layout` event before `reveal` (section 8); `reveal.board[r]` has `len(cells[r])+2` symbols; positions in `winInfo`/`tumbleBoard`/trigger events stay compact-padded (SDK emitters untouched), the renderer maps through `geo.js`; fuse and new events use geometric rows. Config `numRows` stays `[5]*6` and is NOT authoritative.
- **Presentation:** a cyanotype blueprint inks the real outline once (<= 0.5 s, turbo 0.2 s), the frame morphs 5 <-> 6 rows with `transform`, a small name stamp. No cycling through other shapes, no near-miss use (RTS 7C).
- **Patent proximity:** MEDIUM-HIGH unresolved. A per-spin pick from fixed masks may still be read against IGT US8012011 / US8562416 / US11954977 (random active positions), BTG Megaways (number not found), Aristocrat US11151842 (counts differ between modes). Attorney before launch; fallback is a single weight.
- **Dropped:** growth, 7x7/6x7, tubes, Breach, gravity directions, hex, twin boards, rotation, 4x8/8x4 mission-select grids.

## 4. Base-game attractiveness levers (priority order, compliance tag)
Metric: P(return > stake) = P(R > C), C = bet x mode cost, R = running return of the round. v1 base: 8.88% (hit 29.07%, 18.3% sub-stake wins carrying 9.3 RTP points, 70.9% dead). Ceiling at 0.1x granularity is 0.96/1.1 = 87% (meaningless); with the >= 5x tail pinned (71.9 RTP points) the ceiling is 16.5-24.5% (all remaining RTP as 1.2-2.0x wins, zero sub-stake wins, computed here). Keeping 55% of the sub-stake wins and paying the freed RTP as 1.1-2x wins (mean 1.5x) gives P(R > 1) 11.7% with hit 23.6% (S1); keeping 30% gives 13.2% with hit 20.6% (S2). These are thought experiments on the weighted table: the optimizer can only reweight books already in the pool (natural P(R > 1) is 4.33%). **Targets:** base P(R > 1x) >= 11.5% with hit >= 23% (stretch 13%); each 100x door P(R > price) >= 30% (v1: 28.8%; envelope with the 30x floor 39% at a conditional mean of 200x). Hard floor everywhere: not worse than v1. Go/no-go at T+4:30: base optimizer within 3 loops, else keep v1 shares.

| # | Lever | Tag | Milestone |
|---|---|---|---|
| 1 | L1 Celebration gate by level of R/C: L0 R <= C quiet ledger tick; L1 (C,5C) wink; L2 [5C,15C); L3 >= 15C staircase; the first crossing of C plays one "in the black" beat. Strict reading: running round return, per cascade step | RTS 14F strong; reading of "return" for bonus/steps = open question for Stake | M1 |
| 2 | L6 + L4 + L5 Pacing flags (all 12 `jurisdiction` flags), sliders, session ledger (net position, elapsed time) | RTS 14D/E/G, 2E/13C (medium); WCAG 1.4.2 | M1 |
| 3 | L3 Honest anticipation: slow-roll only while the book still allows a trigger, max 2 columns, no shake/shock, neutral release; kill switch `capabilities.anticipation` | RTS 7C (open reading) | M1 |
| 4 | L2 Dead-spin delight: wire burn/fizzle, heroine idle gags, landing choreography (non-money events) | none | M1 |
| 5 | L11 Heroine reaction map keyed to R/C and real events; sober wink/raised brow only | Engine [217] human review | M1 |
| 6 | L9 Tier staircase (fixes the 46 ms tier pile-up) and L15 dial bands Largo / Andante / Allegro / Presto at <17 / <41 / <81 / >=81 (derived from `gm_cap`, a readout, never odds) | RTS 14F, 7E | M1 |
| 7 | L14 Reshape sub-stake share (math, base optimizer fence) | [266] shares printed from final tables | M2 |
| 8 | L8 First-spin briefing card (once, skippable, replayable in Info) and L19 blueprint morph | none | M2 |
| 9 | L12 Secret Entrance picker with honest per-door facts; neutral Debrief when R <= C (L20) | [31], [266], RTS 14A; no countdown, no default | M3 |
| 10 | L10 Layered audio stems per tier, `winLike` flag on every sound | RTS 14F sound clause | M3 |
Deferred: L17 scenery picker, L18 stamp album (statelessness), L21 snapshot, L22 attract mode, mascot lines "Next one's the one." and "Same time tomorrow?" are replaced (09 4.3).

## 5. Animation spec, top 20 (ids J = 05; levels L0-L3 from lever 1; all honour turbo `T()`, skip and the motion store)

| # | Animation | Trigger event | Key numbers and gates | WP |
|---|---|---|---|---|
| 1 | Heroine reaction map (`mascot.react`) | reveal, winInfo, fuseBlast, fuseFizzle, freeSpinTrigger, setWin | wind-up 83 ms, accents layered; clip whitelist (no hairFlip); no shock without a real trigger | 3 |
| 2 | Reveal drop-in + landing squash (J01-J03) | reveal | columns 110 ms apart; t = sqrt(2d/g), g = 55 cells/s2; bounce <= 8%; squash 125 ms; one 0.6% thump | 4 |
| 3 | Pop + gravity refill + hole beat (J04-J06) | tumbleBoard, fuseBlast | pop 250 ms (overlay, no `filter`); refill bottom-first 14 ms/row; hole 250 ms | 4 |
| 4 | Quiet result (J09) | winInfo with R <= C | lemon outline, neutral number, one `ledgerTick`; no sparks, shake, win sound, happy pose | 4,2 |
| 5 | Ripple + number pop (J08, J10) | winInfo L1+ | stagger 45 ms x distance (cap 270); amplitude 1.08/1.14/1.20; count 420-700 ms | 4 |
| 6 | "In the black" beat (J11) | R first exceeds C | chip turns lemon, 167 ms stamp, soft chime, once per round | 4 |
| 7 | Tier staircase (J18-J20) | setWin, freeSpinEnd, wincap at L3 | thresholds 15/30/50/100x cost; 0.85 s/segment + 0.55 s beat; hit-stop 83/100/125 ms; 5000x <= 7.3 s; tap jumps to final | 4,5 |
| 8 | Max-win stamp (J21) | wincap | freeze 125 ms; one whiteout <= 0.5 for 200 ms; confetti <= 60; skip after 1.5 s | 5 |
| 9 | Wire draw, burn, spark (J23) | fusePath, fuseBurn | draw 450 ms stepped 12 fps; spark 300 ms/hop | 5 |
| 10 | Blast + fizzle (J24, J25) | fuseBlast, fuseFizzle | tick ramp 600 ms; hit-stop 100; flash <= 0.6 for 200 ms; no win sound unless the re-evaluation pays (4%) | 5 |
| 11 | Dial step + band stamp (J26) | updateGlobalMult | "+N" chip 520 ms with N = `missionAssigned.dialStep`; band stamp 167 ms; digit flip 130 ms | 5 |
| 12 | Honest slow-roll + neutral release (J14-J16) | reveal.anticipation[c] | +520 ms per flagged column (max 2); 1.6 Hz; release 167 ms | 4 |
| 13 | Dossier cutscene + mission stamp (J17) | freeSpinTrigger, missionAssigned | arc 417 ms, stamp 125 ms + hit-stop 100, folder opens; 2.6-3.4 s; skip after 1.2 s (Rule P) | 6 |
| 14 | Costume change behind a folding screen (J28) | missionAssigned | OPAQUE screen 250 ms in/out, poof 83 ms; outfit `lab`/`trench`/`casino`; never a silhouette | 6,3 |
| 15 | Blueprint floor-plan draw-on | layout | <= 0.5 s (turbo 0.2), frame morph 417 ms, name stamp; final shape drawn once | 6 |
| 16 | Secret Entrance transition | confirmed door play | door + keyhole iris <= 1.2 s; cost stays visible; no countdown | 6 |
| 17 | Sealed Orders envelope | winInfo.meta.banked, caseOpen | filing chip 300 ms in neutral colour; SEALED stamp; open: flap 167 ms, OPENED, count-up bank x dial 420-700 ms; celebration only if R > C | 6 |
| 18 | Ballroom Blackout spotlight | lightRoute, winInfo.meta.lit | dim overlay (opacity) 300 ms; window steps 250 ms stepped 12 fps; x4 tag 125 ms; symbols stay readable at rest | 6 |
| 19 | Retrigger tickets (J31) | freeSpinRetrigger | <= 5 tickets, 1.2 s, hit-stop 83 | 5 |
| 20 | Neutral Debrief + stamps (J22) | freeSpinEnd, finalWin | R <= C: card 250 ms, count 600 ms, stamp FILED, no rays/coins/cheer; R > C: DECLASSIFIED + staircase | 4,6 |
Systems (built once, owners in section 9): motion store consumer (Full/Calm/Still), trauma camera (MAX 1.6% of short side, rot 0.8 deg), hit-stop via `document.getAnimations()`, flash governor (<= 2 flashes per second, <= 0.5 peak, cream/lemon, red treated as saturated), quality governor (EMA > 24 ms: fewer particles; > 40 ms: Calm), fx engine rewrite (cut candidate).

## 6. Menu and audio settings
- **Entry:** new gear `#btn-settings` after `#btn-sound` (inside `#btn-menu` at height <= 360 px); also in replay (fixes the portrait replay with no sound control). Dialog `#modal-settings` (`role=dialog`, `aria-modal`, focus in/out, Escape, internal scroll only), 4 tabs via one APG tabs helper (also used by rules). Space inside a modal toggles the control, not a spin.

| Tab | Control | Default | Storage | Note |
|---|---|---|---|---|
| Sound | Mute all (switch, mirrors `#btn-sound`, label "Mute sound") | off | `am_muted` | one source of truth in `audio.js` |
| Sound | Master / Music / Effects (range 0-100, readout, `aria-valuetext`) | 75 / 75 / 75 | `am_vol_master`, `am_vol_music`, `am_vol_sfx` | taper: 0 dB at 75, +3 dB at 100, about -44 dB at 1; preview `settingsTest` (neutral bongo + vibraphone note) on `change`, <= 1 per 250 ms, never win-like |
| Display | Motion Auto/Full/Calm/Still; Screen flash effects; High contrast; Session summary | Auto; off (on if reduced motion); `prefers-contrast`; on | `am_settings` JSON `{v:1,...}` | summary locked on when `displayNetPosition` or `displaySessionTimer`; Calm/Still never shorten the round |
| Play | Turbo, Autoplay panel, (cut: break reminder) | off | NOT stored | hidden by `disabledTurbo` / `disabledAutoplay` |
| Info | Rules, Win table, Controls, Modes and RTP, RTP line, session summary, version | - | - | text from `rules_data.json`; "Win table" in social |
- **Storage:** every access in try/catch, in-memory fallback, clamp and whitelist on read, debounce 200 ms, flush on `pagehide`; never store turbo, autoplay, bet, `lang`, flags.
- **Flags (all 12):** `socialCasino`, `disabledFullscreen`, `disabledTurbo`, `disabledSuperTurbo` (replay skip factor), `disabledAutoplay`, `disabledSlamstop` (no banner skip before the count-up ends), `disabledSpacebar`, `disabledBuyFeature`, `displayNetPosition`, `displayRTP`, `displaySessionTimer`, `minimumRoundDuration` (assumed ms; next round not before t0+min, also in turbo and autoplay). Exact official names beyond the first three are unconfirmed (RGS.md elides them).
- **Audio graph:** `sfxBus` and `musicBus` feed `master -> compressor -> limiter`; music gets its own reverb return (otherwise 3% of every bed note leaks into the Effects slider); targets by `setTargetAtTime(g, t, 0.03)`; music or sfx at 0 stops queuing; optional duck -6 dB under big-win stingers; the free-spin bed moves off an E-tonic twang (09 5), human ear check needed.
- **Tests:** U1 taper (0 -> 0, 75 -> 1, strictly increasing, 100 = +3 dB); U2 corrupt/clamped stored values; U3 throwing `localStorage`; U4 each of 12 flags alone changes only its capability; U5 `remainingRoundMs`. A1 music 0 silences the bed only, sfx 0 the inverse; A2 two reverb returns; A3 all sliders 100 post-limiter peak <= 0.97; A4 defaults within 0.1 dB of today's render; A5 voice cap. L1-L7 live Playwright (persist, invalid values, blocked storage, mute vs slider, music 0, master 0 restores last level, preview rate limit). G1-G9 guideline runner (settings in every screen scan, 4 viewports, >= 24 px targets, focus return, no wallet call while open, all flags, replay gear, motion Auto follows `emulateMedia`, keyboard, social scan with XSC, screenshots). Static: no `localStorage` outside try, no external fetch.

## 7. Mode list for the math (4 of 20)

| # | `index.json` name | Cost | RTP / max | Books | Content | Sim wall (4 thr) | zstd3 -> zstd15 |
|---|---|---|---|---|---|---|---|
| 1 | `base` | 1x | 96.000% / 5000x | 100k | 4 floor plans, mission drawn at trigger 40/30/30 | 1-1.5 min + optimizer 1.2-4 min | ~45 -> ~25 MB |
| 2 | `bonus` | 100x | 96.000% / 5000x | 100k (existing) | The Briefing door | 0 (reuse) + recompress 2.5 min | 317 -> ~130 MB |
| 3 | `entrance_orders` | 100x | 96.000% / 5000x | 50k | Sealed Orders | ~4-8 min (~20 ms/book) | ~150 -> ~65 MB |
| 4 | `entrance_blackout` | 100x | 96.000% / 5000x | 50k | Ballroom Blackout (fallback `entrance_fuse`: ~11 min, 280 -> 115 MB) | ~6-12 min (~28 ms/book) | ~165 -> ~70 MB |
- Total about 0.68 GB at level 3 (at the 0.7 GB default) and about 0.29 GB at level 15. Serial CPU for one v2 rebuild (computed from 08's ms/book): simulation about 12 min (base 1.5 + Orders 4.2 + Blackout 5.8; 23 min if `bonus` is re-simulated) + optimizer 4 + reweight 6 s + recompress 8 + tests 5 = ~30 min (~41 min with `bonus`), plus ~20 min of calibration loops (3-5 samples of 2000 books, ~15 s each, per mission) and the base is simulated twice (M2 and M3). The 80-120 min figure is the worst case (re-simulating `bonus`, 100k books everywhere, tuning loops).
- Display names (i18n `mode.*`, word screen passes per 09): `bonus` = "Secret Entrance: Stage Door", `entrance_orders` = "Secret Entrance: Coat Check", `entrance_blackout` = "Secret Entrance: Service Stairs". Index names contain no "buy"/"super"/"bet" words [225].
- RAM: ~270 KB per 30 KB book; batch 6250 (books <= 30 KB), 3125 (>= 60 KB), 4 threads x 6250 = 6.7 GB peak. Call `create_books` once per mode. Run new modes in one invocation (`generate_configs` hashes every mode's files), counts multiples of threads x batch, seed offset per mode.
- Flags: doors `is_feature=False, is_buybonus=True` (SDK docs sample; ask Stake), base unchanged. Every mode needs an `opt_params` entry. One reweighter lambda per mode gives exactly 96.000% (spread 0). Wincap criterion 0.001 per door (50 books at 50k) must be tested per mission with the WCAP strip.
- **Ask Stake later:** max size per book file and per game; accepted zstd levels and minimum books per mode; whether config `numRows` must match per-spin shapes and whether review accepts a per-spin `layout`; whether `name` in `index.json` is shown to players; official RTP spread tolerance across modes (0.5 point is unofficial) and `is_feature`/`is_buybonus` semantics incl. how buy modes are hidden per jurisdiction. Fallbacks: zstd 3 (still ~0.68 GB), 50k -> 25k books on the niche doors, drop Annex, `layout_weights={mezzanine:1}`.

## 8. EVENT CONTRACT delta (math emits, front end replays)
General: all amounts are integers in 1/100 x of the bet (multiples of 10). Unknown event types are ignored by the v1 renderer (`default: return null`). Old books (no `layout`, no `missionAssigned`) must play as Mezzanine and `briefing` with step 8. `event_config_<mode>.json` lists every emitted type: CI asserts the renderer handles each.
**1. `layout` NEW**, at most once per book, index 0, directly before the base `reveal`; absent = Mezzanine. `rows` is the frame height (5|6); `cells[r]` = sorted geometric visible rows present in reel r; `links` reserved (empty).
```json
{"index":0,"type":"layout","id":"atrium","name":"Atrium","cols":6,"rows":5,"cells":[[1,2,3],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[1,2,3]],"cellCount":26,"links":[]}
```
**2. `reveal` CHANGED:** `board[r]` has `len(cells[r])+2` symbols (top and bottom pad); `anticipation` and `paddingPositions` keep 6 entries. Atrium: reel 0 and 5 have 5 symbols, reels 1-4 have 7.
**3. Position conventions.** `winInfo`, `tumbleBoard.explodingSymbols`, `freeSpinTrigger/Retrigger.positions` stay COMPACT-PADDED (`padded = compactIndex+1`); geometric row = `cells[reel][padded-1]`. Atrium: `{"reel":0,"row":2}` is geometric row 2, `{"reel":1,"row":2}` is geometric row 1. `fuse*` and `lightRoute` use geometric visible rows (never padded). One helper, `geo.js`, owns the mapping; a golden fixture per layout tests it.
**4. `missionAssigned` NEW**, after `freeSpinTrigger`, before the first `updateGlobalMult`. `mission` in `briefing|orders|blackout` (reserved `fuse`); `payTiming` in `step|spinEnd`; `lens` only for `blackout`; `fuseLen` is also the length of every `fusePath.cells` (do not hard-code 8).
```json
{"index":5,"type":"missionAssigned","mission":"blackout","totalFs":12,"dialStart":1,"dialStep":3,"dialCap":100,"payTiming":"step","lens":{"w":2,"h":2,"mult":4},"layout":"mezzanine","fuseLen":8}
```
**5. `updateGlobalMult` UNCHANGED** (`{"index":6,"type":"updateGlobalMult","globalMult":4}`); the "+N" chip reads `dialStep` from `missionAssigned` (v1 tests assert +8: update them).
**6. `lightRoute` NEW** (blackout), once per free spin right after `reveal`, before `fusePath`. `route[k]` = top-left geometric cell of the window at evaluation step k; after the last entry the window stays on it; the window always fits the board.
```json
{"index":8,"type":"lightRoute","w":2,"h":2,"lensMult":4,"route":[{"reel":1,"row":0},{"reel":2,"row":1},{"reel":3,"row":2},{"reel":4,"row":1},{"reel":3,"row":0},{"reel":2,"row":1}]}
```
`winInfo.wins[].meta` gains `lit` (any cluster cell inside the window) and `lensMult` (4|1); `win == winWithoutMult x globalMult x lensMult`:
```json
{"index":14,"type":"winInfo","totalWin":320,"wins":[{"symbol":"L3","clusterSize":5,"win":320,"positions":[{"reel":0,"row":2},{"reel":1,"row":2},{"reel":2,"row":2},{"reel":2,"row":3},{"reel":3,"row":3}],"meta":{"globalMult":4,"clusterMult":1,"winWithoutMult":20,"overlay":{"reel":1,"row":2},"lit":true,"lensMult":4}}]}
```
**7. Orders (`payTiming:"spinEnd"`):** `winInfo.wins[].meta.banked=true`, `win == winWithoutMult` (x1), `updateTumbleWin.amount` carries the running BANK; the renderer must not add banked amounts to the WIN counter or celebrate them. **`caseOpen` NEW**, after the last tumble/blast of a spin with bank > 0, before `setWin`; `win == bank x mult`, `setWin.amount == caseOpen.win`; on the cap `capped:true` and `wincap` follows; no `caseOpen` after `wincap`.
```json
{"index":31,"type":"caseOpen","bank":120,"mult":22,"win":2640,"capped":false}
```
Orders spin order: `reveal, fusePath, winInfo(banked), updateTumbleWin, updateGlobalMult, tumbleBoard, fuseBurn, ..., fuseFizzle|fuseBlast(+tumble cascade), caseOpen, setWin, setTotalWin, updateFreeSpin`. Blackout: `reveal, lightRoute, fusePath, winInfo(lit), ...` (unchanged afterwards).
**8. UNCHANGED:** `freeSpinTrigger`, `freeSpinRetrigger`, `freeSpinEnd`, `setWin`/`setTotalWin`, `wincap`, `finalWin`. Staging never reads `winLevel`; the front end uses payout / (bet x mode cost).
**9. Replay and mock:** `replay=true&mode=entrance_orders` plays the same events and still shows the play amount and, for cost 100, the multiplier and real cost [174]; the mock RGS (WP10) serves the new modes with `costMultiplier` 100.
**10. Not events:** `library/shares.json` (not uploaded): `{"base":{"layout":{"mezzanine":0.51,...},"mission":{"briefing":0.40,...},"pGtStake":0.117,"hit":0.236},"entrance_orders":{"medianX":..,"pGtPrice":..,"rtp":0.96,"maxWin":5000}}`, copied by `gen_rules_data.mjs` into `data/rules_data.json`; the Info tab and the entrance dialog print only these.

## 9. Work packages (11, disjoint file ownership; paths relative to `frontend_mambo/` unless `math/`)

| WP | Scope | Owns (exclusively) | Depends | Acceptance tests |
|---|---|---|---|---|
| 1 SHELL | menu, settings store, ledger, entrance picker, flags, replay gear, i18n merge | `index.html`, `styles.css`, `src/main.js`, `src/settings.js`*, `src/ui/**`*, `src/replay.js`, `src/bet.js`, `src/input.js`, `src/i18n/{index,en,social,en_ui}.js` | step 0 | U2-U5, G1-G8; no scroll at 4 viewports; heroine box never overlaps grid or buttons; all 12 flags; Space guard; social scan of dialog |
| 2 AUDIO | buses, sliders, taper, preview, cues (`ledgerTick`, `settingsTest`, `stamp`, `caseSeal`, `caseOpen`, `lightsOut`, `spotlightStep`, `layoutDraw`, `doorCreak`, `dialStep`), `winLike` flag | `src/audio.js`, `tests/audio/**` | step 0 | A1-A5, L1-L7, U1; unknown ids are no-ops; no `winLike` sound at R <= C |
| 3 HEROINE | rig integration behind the v1 `createMascot` API, `react(kind,info)`, outfits, reduced motion; `en_hero.js` overrides `mascot.*` keys (carries the five reworded lines of 09 4.3) | `src/render/mascot.js`, `mascot.css`, `src/render/heroine/**`*, `src/i18n/en_hero.js`*, `tests/heroine/**`* | step 0 | <= 2 ms/frame over 600 frames (rig_test --perf); 10 reaction kinds map to clips; static pose when Still; static SVG fallback if the rig throws; bbox test at 4 viewports |
| 4 RENDER-CORE | event player, celebration gate, staircase, shape-driven board, layer dispatcher | `src/render/index.js`, `devbooks.js`, `motion.js`*, `camera.js`*, `celebrate.js`*, `geo.js`* | 1 (settings API) | gate test (0.4x/1.0x/1.2x/15x/100x at cost 1 and 100: no celebratory call at R <= C); staircase tiers >= 0.5 s, 5000x <= 7.5 s; 4 floor plans x 4 viewports no overflow; v1 books pixel-near identical |
| 5 FX-WIRE | fx engine, wire/fuse, scene, dial, logo, flash and quality governors | `src/render/{fx,wire,fuse,scene,meter,logo,symbols}.js`, `fuse.css`, `wire.css`, `meter.css`, `flash.js`*, `quality.js`* | step 0 | <= 2 flashes/s in any 1 s window; p95 frame <= 16.6 ms at 4x CPU throttle on a 30-cell tumble step 8+; <= 45 promoted layers; touch canvas <= 96 MB |
| 6 LAYERS | blueprint, Orders envelope, Blackout spotlight, dossier cutscene, costume screen, entrance transition | `src/render/layers/**`*, `src/i18n/en_layers.js`* | 4 (geo, dispatcher) | layout outline cells == `cellCount`; envelope never touches WIN before `caseOpen`; `meta.lit` matches the beam; skip only after 1.2 s; 10-second test: 5 viewers, sound off, name the mission >= 4/5 |
| 7 MATH-GEO | layouts, geometry-aware clusters, wire path, `draw_board` mixin that also emits the `layout` event | `math/games/agent_mambo/{layouts.py*,game_geometry.py*,game_calculations.py}`, `tests/test_layouts.py`*, `tools/layout_bench.py`* | none | 0 mismatches vs stock clusters on 300 random 6x5 boards; no IndexError on 4 plans x 100k boards; tumble conserves cell count; validator; deterministic draw |
| 8 MATH-MISSIONS | `MISSIONS`, mission draw, Orders bank, Blackout lens, modes, optimizer fences | `math/games/agent_mambo/{missions.py*,game_override.py,game_executables.py,gamestate.py,game_events.py,game_config.py,game_optimization.py}`, `tests/test_missions.py`* | 7 mixin at T+2:00 | payouts multiples of 0.1x; `evaluate_wincap()` after every multiplication; `finalWin == payoutMultiplier`; `caseOpen.win == bank x mult`; route inside board; 5k-book smoke per mode |
| 9 MATH-PIPELINE | the single CPU queue, calibration, reweight, recompress, shares, report; owns the tunables (`calib_params.py`*: dial steps, lens mult, wild count, paytable scale, mission weights, imported by `game_config.py`) so calibration loops never wait for WP8 | `math/games/agent_mambo/{run.py,calib_params.py*,reels/**,tools/**,tests/test_math.py,MATH_REPORT.md,PROGRESS.md,library/**}` | 7, 8 | each mode RTP 96.000% +-0.0005; P(5000x) = 1/50k per door; `shares.json`; hashes valid (`rgs_verification`); total <= 0.7 GB; `final_checks` pass; P(R > stake) report vs targets |
| 10 QA | e2e harness, baseline, guideline runner, mock RGS | `tests/e2e/**`*, `tests/guidelines/**`, `tests/core/**`, `tests/text/**`, `tools/mock-rgs/**`, `package.json`, `tests/shots/**` | step 0 | 60 fps capture + flash/luminance script; baseline at 30 and 36 cells, 4 viewports, 4x CPU; G1-G9 plus scripted subset of Engine [181]-[275]; zero console errors incl. replay |
| 11 CONTENT-RELEASE | rules text and data, fixtures, contract docs, store art, build | `src/rules.js`, `src/i18n/en_rules.js`*, `data/rules_data.json`, `tools/gen_rules_data.mjs`, `fixtures/**`, `CONTRACT.md`, `tools/build/**`, `tools/art/**`, `dist/**`, `VERSION`, `docs/v2/**`* | 9 (shares) | RTP and max win per mode, every layout and mission with final shares, [185] verbatim, word screen pass, sober tile and cover, `verify:build` green |
(* = new file; `src/i18n/index.js` merges the partials after `en.js`, so a partial wins.) **Art inventory (all new art drawn in code, owner WP6 unless noted; heroine rig and 5 outfits already exist in `docs/research2/art/`, v2 uses `inspectrice` base + `lab`, `trench`, `casino`; `vault` reserved for The Long Fuse):** orders envelope with flap + SEALED/OPENED stamps; spotlight cone + dim overlay + x4 tag; folding costume screen + poof; blueprint grid + four outlines + name stamp; dossier folder + TOP SECRET stamp; door + keyhole iris; FILED / DECLASSIFIED stamps and Debrief card; per-mission palette tokens (lair, hat-check, ballroom) swapped under the wipe by WP5's scene.js. About 10 props, no new character art.
Interfaces frozen in step 0: `settings.get/set/on`, `settings.capabilities`; `audio.setVolume(kind,pct)/getVolume/preview/onChange/setMuted/play(id)`; `mascot.react(kind,info)` (+ legacy `pose/say`); `LAYERS=[{id,onEvent(ev,ctx),reset()}]` in `layers/index.js`; `geo.setLayout/toGeo/toPadded`; `celebrate.level(R,C)`.
**Schedule (T = start, 8 h):** T+0:00-0:25 step 0 (WP1/4/6 create stubs, `<link>` tags, i18n partials, API skeletons; nobody else touches shared files). T+0:25-1:00 baseline (WP10) then Annex gate at 1:00. **M1** T+0:25-3:00, gate G1 at 3:00 (hard stop 3:30): menu + sliders + heroine + gate on v1 books, `npm run qa` green = SHIPPABLE. **M2**: WP7 from 0:25 (done 2:30), renderer shape work 2:00-4:30 against hand-made devbooks, base smoke 3:00, go/no-go L14 at 4:30, 100k base + optimizer, gate G2 at 5:30 (hard stop 6:00) = SHIPPABLE. **M3**: WP8 from 0:25; Blackout SDK gate 2:00; calibration 2:30-6:00; door sims 6:00-6:30; base final + optimizer 6:30-6:45; reweight + recompress + tests to 7:30; G3 at 7:30; final zip 7:30-8:00. CPU queue order (single owner WP9): layout smoke, Orders calib, Blackout calib, base 100k + optimizer (M2), Orders 50k, Blackout 50k, base final + optimizer, reweight, recompress, tests.
**Cut line (always shippable):** states S1 = v1 books + v2 front end; S2 + floor plans; S3 + Sealed Orders; S4 + Ballroom Blackout. Cut order: Blackout first (not converged at 6:30 -> weight 0 and renormalise, or The Long Fuse if its config calibration converges in 40 min), then Orders, then floor plans (`layout_weights={mezzanine:1}`), never M1. Cut at M1 if late: fx typed-array rewrite, camera push-in, hit-stop, logo stamp, ripple, text size, break reminder, ducking.

## 10. Honest risks and what remains for a human
**Top risks**
1. Cluster rule (b): US12094305 / US12536877 read on size-paid clusters; US9558634 / US9886816 read on any adjacency group; US9542808 on the tumble loop; the built v1 already uses all three. Note only: costless fallback = flat award per tier (`c_flat`, paytable edit, k 1.69, smallest pay 0.17x, dial step 9.3, ~1 day, a textual argument vs US12094305 only, none vs US9558634); non-adjacency fallback = pay-anywhere with per-symbol minimums (`scatter_ps5`, k about 0.43, 5-8 days, kills tubes/hex, per-layout thresholds). Flip only if counsel says a claim reads AND no licence or invalidity route exists (leads: US2003/0157981, US2003/0045345, US2015/0379804). Not built; gap_02's 0.5-day evaluator switch is NOT adopted.
2. Floor plans: attorney on IGT US8012011 / US8562416 / US11954977, BTG Megaways (number unknown), Aristocrat US11151842; possible Stake review objection to per-spin shapes.
3. Calibration is the schedule risk (natural mean moves 0.6x-14x with shape or mission; a tilt cannot repair a far pool); mitigated by one layout set in base only, 3 missions, 15 s samples, Blackout gate, Long Fuse fallback.
4. P(R > stake) targets are unproven until the base optimizer runs; lowering hit rate to ~23% makes the game feel drier (dead 76% vs 71%). Stop-loss: keep v1 shares.
5. Performance is unmeasured (about 60 promoted layers today; 5 rAF loops); 6-row Annex at 400x225 untested. First hour of WP10 decides.
6. Compliance readings open: "return" per cascade step and for bought rounds, slow-roll under RTS 7C, non-skippable intros (Rule P), neutral staging for ~70% of door rounds (accepted: the door's appeal is the ritual and the three missions, not fanfare).
7. Distinctness [253]: shared core (cluster, tumble, global dial, 4+ scatters) with Hacksaw, Twist and Pragmatic titles; the 6x5 field is crowded; we rely on theme, heroine, wire, overlays and presentation; "Mission" words removed because of Mission X.
8. Platform unknowns (section 7 list); book size and `is_buybonus` semantics.
9. Heroine and [217]: glamour only; whitelist of clips; sober tile and cover; the casino gown is the most fitted costume (fallback: trench cut).
10. Book/SDK pitfalls: jagged `IndexError`, `numRows` leak, missing `opt_params`, `generate_configs` needing every mode's files, silent drop of sims when counts are not multiples, same seeds across modes.
**For a human:** IP attorney (items 1-2 above, the mission proximity notes in section 2, the lists in 01 section 6 and 03 section 7, non-US families EP/AU/GB/CA and trademark class 9/28/41 searches in USPTO, EUIPO, WIPO, UKIPO for Agent Mambo, Mambo Star, Clearance Dial, Sealed Orders, Ballroom Blackout, Secret Entrance); listening test of the mix, loudness on speakers and Bluetooth, the new bed against reference tracks; real-device performance and touch drag on sliders (iOS silent switch); screen-reader pass; flash analysis on a recorded run with PEAT or equivalent; Mission X side-by-side screenshots; Stake Studio upload and review ([217], [253]); answers to the Stake questions; native-speaker read of names (French, Spanish); the 10-second test with real viewers.

## Sources (load-bearing; quality in brackets)
- UKGC RTS 14 (14F celebration, 14E skip after result, 14G 2.5 s) https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-14-responsible-product-design [strong]; RTS 7C near-miss https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes [strong]; WCAG 2.3.1 https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html [strong]; WCAG 1.4.2 https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html [strong].
- Claim text of the cluster family and the tumble family: USPTO PDFs and Lens, via gap_01 (`image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/{12094305,12536877,10964173,11468746}`) [strong text, medium reading]; US9558634 / US9886816 and the ways families via Google Patents summaries in gap_02 [medium]; BTG purchase by Evolution https://news.cision.com/evolution/r/evolution-completes-acquisition-of-big-time-gaming-and-issues-shares-to-the-sellers,c3377463 [strong].
- Mission and layout patents, rival titles and Mission X: 01, 02, 03, 07 (Mission X facts from search summaries after 403: medium; popularity data weak). Engine rule ids come from the user-supplied `00_ENGINE_SELFCHECK_PROMPT.md` (the official page returned a header only).
- Numbers computed here from `math/games/agent_mambo/library/publish_files/lookUpTable_{base,bonus}_0.csv` (100k books each: base P(R > 1) 8.883%, door P(R > price) 28.77%), the 02 shape table and the 03 proxy. No Stake limits were found anywhere (negative result). Reddit not reachable.
