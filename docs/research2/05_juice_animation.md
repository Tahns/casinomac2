# 05 - Juice and animation: techniques, specs and performance budget (Agent Mambo v2)

Date: 2026-10-26. Angle: game feel for a vanilla JS front end (DOM + SVG + 2D canvas, no libraries, mid phone at 60 fps). Screening aid, NOT legal advice. Nothing here says an effect or sequence is patent-free or compliant: a human IP attorney, a compliance reviewer and the Stake Studio review must check it. "Found nothing" is never "free". Reddit was not reachable (403) and is not cited. All art and sound stay hand-built in code, adult mascot only, no deceptive design.

## 0. Method and limits
- Read (not run): `frontend_mambo/src/render/{index,fx,scene,wire,meter,mascot,logo}.js`, `styles.css`, `mascot.css`, `audio.js` (SOUNDS table), `render/devbooks.js` (event shapes), and the sibling files `04_attractiveness.md`, `02_variable_grids.md`, `00_USER_DIRECTIVES.md`. I did NOT open the game in a browser and measured no frame times. Every ms target below is a design value to be tuned, not a measurement.
- Tags: [F] page fetched and read this session, [S] search-result summary only, [R] read in this repo, [C] computed here (Python, throw-away scripts in the session scratchpad, not committed). Evidence: strong = primary page read; medium = reputable secondary or vendor doc; weak = blog, forum, anecdote or design habit with no study.
- WebFetch returns a small-model summary, not raw text. I could not retrieve the GDC talks themselves; game-feel numbers (hit-stop, shake) are practitioner heuristics (weak-medium), not findings.
- Slot-specific search for count-up and tier timing returned only SEO pages. The tier and dwell timings in section 4 are my design proposals and need playtests.

## 1. Bottom line
1. The renderer already has a coherent look (12 fps stepped particles, cut-paper pieces, comic bubbles, squash keyframes, iris wipe). What is missing is a SYSTEM: one camera, one trauma-based shake, hit-stop, a flash governor, a motion-settings store, a quality governor, and physically derived timings.
2. Biggest feel defect found in code: the big-win count-up is front-loaded (`1-(1-p)^2.2`). For a 5000x win the tiers 15/30/50/100x are all crossed within 46 ms; for 2000x within 106 ms [C]. So four stingers, four flashes and four shakes fire at once and the escalation is unreadable. Fix: tier staircase (J18).
3. Biggest compliance/feel overlap: win cues fire on any winning cluster (`showWins`: sparks, `win` vibraphone run, shake if total >= 2x, mascot happy), whatever the round cost. UKGC bars celebrating a return at or below the stake [S6, strong]. Gate every celebratory cue on running round win vs round cost (levels L0-L3, J09, J11, J22).
4. Shake: today two independent shake functions (`index.js:213`, `fx.js:129`), random keyframes, no cap on amplitude (fsTrigger asks 2.6 = about 3.1% of the short side plus rotation), REDUCE read once at load. Replace by one camera element with a trauma value (J-system S2).
5. Missing entirely: hit-stop, camera zoom/dolly, event-driven parallax, flash accounting. All are cheap with `document.getAnimations()` pause/play [S8] and one `#camera` transform.
6. Flash safety needs accounting, not goodwill: the 3-per-second rule and the 10-degree field area test [S1]. Today `flash()` + `iris` + `rays` + the red anticipation ring are independent.
7. Performance risks (from code, unmeasured): about 60 permanently promoted layers (`will-change` on `.cell` and `.sym-svg`), `filter: brightness()` WAAPI on up to 30 cells per pop, per-frame allocation in `fx.js` (`lobes` arrays, object literals per particle, `shift/splice`), `strokeText` per bubble per frame, 5 independent rAF loops, and scene canvases of about 18x the CSS area (334 MB RGBA on a 2560x1440 dpr-2 desktop, 129 MB on a 1024x1366 dpr-2 tablet [C]).
8. 38 concrete specs (J01-J38) follow, each tied to a book event, with duration, easing and caps. Four need NEW book events or fields proposed by sibling research (`layout`, `floorUnlock`, `tubes`, `mission`); they are marked "proposed".

## 2. What exists and what is missing (read in repo)
| Area | Exists | Gap |
|---|---|---|
| Reveal (`index.js:282-336`) | per-column stagger 120 ms, 620 ms drop, fixed bounce -9%/-2.5%, anticipation +520 ms per flagged column, heartbeat border | fixed durations (not distance-based), landing has no squash, 3-scatter tease shakes and shocks the mascot even without a trigger (L3 in 04) |
| Tumble (`388-446`) | 330 ms pop with `filter: brightness`, drop 360+70*rows ms, survivors delayed top-first (j ascending) | not gravity-derived; filter animation on up to 30 cells; no hit-stop; upper symbol can lead lower one (<=48 ms) |
| Win (`339-385`) | squash loop (infinite), sparks, popup count-up, halo outline | no ripple, no level gating (sparks/shake/sound even at <= stake), infinite loop |
| Banner (`459-532`) | rays, dim, coin fountains, tier title swap, tap-to-skip | count-up curve (finding 2), tier beats not spaced, up to about 120 live coins by my estimate |
| Shake/flash (`213-226`, `fx.js:129`) | WAAPI random keyframes, root + scene host, REDUCE x0.25 | two implementations, no cap/trauma, no flash budget |
| fx.js | one overlay canvas, MAX 240 particles, per-helper clamps, `lite` mode when EMA > 42 ms, 12 fps stepping, iris | allocation per frame/particle, text in canvas, full-size canvas at dpr 2, `lite` only drops spawns |
| scene.js | 8 canvases (sky, spark, blinds, fore, lair, lblinds, wedge, dust), 7 fps motes, CSS iris `steps(12)` on bonus, pointer parallax | no parallax on touch, no event-driven camera, lair painted in base mode, blinds canvases at 3.5x area |
| wire.js | SVG cable, spark hop 300 ms, blast stagger 55 ms, POW stars | DOM+WAAPI puffs (cap 14) and DOM paper pieces in a fallback path; no hit-stop |
| meter.js | ladder + badge, flying +1 chip, KEPT pulse | no tier-threshold re-skin beyond `data-tier` |
| mascot.js/css | 9 poses by class swap, 118 bpm idle (508 ms beat), `steps(1)` loops, bubble | instant swap (no wind-up/smear), no layered accents, SVG loops always run, no costume change |
| logo.js | static layered SVG | no intro/stamp animation |
| Reduced motion | `REDUCE` const read at load in 13 places, CSS media block | cannot change at runtime, no in-game setting (needed for the menu work) |

## 3. Evidence table (techniques and constraints)
| Claim | Source | Quality |
|---|---|---|
| Max 3 flashes per second, or below the general/red flash thresholds; 10 percent relative-luminance pair change; area test .006 sr = 25% of a 10-degree field = 341x256 px at 1024x768 (87,296 css px; quarter = 21,824 px) | WCAG 2.2 Understanding 2.3.1 [S1] | strong |
| Do not celebrate a return <= total stake; "celebrate" = win-associated sounds/visuals; effective 31 Oct 2021 | UKGC response page [S6] | strong |
| 17 of 26 popular UK slots still used win sounds after losses disguised as wins; rule wording is vague so be conservative | Myles, Bennett, Newall 2026 [S14] | medium (abstract) |
| Win sounds raise arousal and make players overestimate wins (24% vs 15%); negative sounds make LDWs read as losses | Dixon et al 2013 [S13], Scarfe et al 2020 [S15] | medium (press/abstract) |
| Only `transform` and `opacity` skip layout and paint; promote sparingly; "layer explosions" hurt | web.dev [S3] | strong |
| `filter`, `clip-path` are compositor-capable in Chromium but blur cost scales with radius; CSS variables always repaint; Safari may drop acceleration when `playbackRate` != 1 | Chromium animation README [S25], motion.dev [S7] | medium |
| Canvas: pre-render, layer canvases, integer coords, avoid `shadowBlur` and text, scale with CSS not `drawImage`, `alpha:false` where possible | MDN [S2] | strong |
| `document.getAnimations()` returns CSS animations, transitions and WAAPI; each can be paused/played; baseline since 2020 | MDN [S8] | strong |
| `contain: layout paint style` isolates subtrees but `paint` clips overflow and creates a stacking context | MDN [S9] | strong |
| `linear()` easing takes many points incl. overshoot, baseline since Dec 2023 | MDN [S4] | strong |
| `prefers-reduced-motion`: scaling/panning/zooming large objects is the vestibular trigger; replace with gentler motion (opacity), not just remove | MDN [S5] | strong |
| 0.1 s feels instant, 1 s keeps flow: acknowledge input within 100 ms | NN/g [S10] | strong |
| Disney principles: squash and stretch (volume kept), anticipation, staging, follow-through, slow in/out, timing, exaggeration, appeal | Thomas and Johnston 1981 via Wikipedia [S11] | medium |
| Limited animation: held cels, re-used cycles, flat graphic style (UPA, then Hanna-Barbera as a cost method) | Wikipedia [S12] | medium |
| Trauma-based shake: a 0-1 value that decays, visible shake = trauma raised to a power, driven by smooth noise, both translation and rotation in 2D. Squared form not confirmed from the talk | Eiserloh GDC 2016 summary [S16] | weak-medium |
| Shake as a decaying value added per event (add a few pixels, decays fast) | Nijman/Vlambeer via Infovore [S17] | weak-medium |
| Hit-stop: 50-100 ms freeze reported best by one blog; fighting games use roughly 9-13 frames at 60 fps scaled by hit strength; attacker also vibrates | [S18], [S19] | weak |
| A/V sync: audio early by > 45 ms or late by > 125 ms is detectable (ITU convention; sign conventions conflict between sources); stricter DTV guidance exists | [S20] | medium |
| Pool particles in fixed typed arrays, no allocation in the hot loop | Observable demo, O'Reilly [S21] | weak-medium |
| iOS Safari rejects canvases > 16,777,216 px and limits total canvas memory (reports 224-384 MB, conflicting) | developer posts [S22] | weak-medium |
| Name flash settings for what they do ("screen flash effects"), never "epilepsy safe"; offer a way to disable | Game Accessibility Guidelines [S23] | medium |
| Stake front end plays book events sequentially, each handler awaited; timing comes from the handlers | Web SDK mirror [S24] | medium |

## 4. Global systems (build once, used by every spec)
**S1 Motion store** (`render/motion.js`, replaces the 13 `REDUCE` consts). `{level:'full'|'calm'|'still', intensity:0..1, shake:0..1, flashes:bool}` with `subscribe()`. Default from `prefers-reduced-motion` (live `change` listener), override from the menu (sliders: Effects intensity, Screen shake, Flashes on/off, preset Full/Calm/Still), persisted in `localStorage` inside try/catch. Intensity scales particle counts, trauma gain and hit-stop; it never changes outcome, timing of the round, or what is shown (the result is always displayed in full).

**S2 Camera + trauma shake.** One wrapper `#camera` around board, scene and HUD frame; one rAF writer sets `translate/rotate/scale`. Trauma T in [0,1]; add per event, decay 1.4 per second (linear); offset = MAX * T^2 * noise, noise sampled and HELD for 83 ms steps (12 fps, matches the style). MAX_PX = 1.6% of the short side (about 6 px on 390 px, 11 px on 700 px), MAX_ROT = 0.8 degree, hard cap T <= 1, non-tier sources capped at T 0.5 together. Adds: cluster at L1+ +0.10 (+0.04 per combo step), pop of a big cluster +0.15, tier beats +0.25/.35/.45/.6, blast +0.55, wincap +0.9. Calm = MAX x0.25 and no rotation; Still = 0. Replaces `shake()` in index.js and fx.js.

**S3 Hit-stop.** `freeze(ms)`: pause `document.getAnimations()` and freeze the fx particle clock and camera, then play() after ms; audio keeps running. Values: 50 ms (cluster at L2), 83 (mega), 100 (super, blast, TOP SECRET stamp), 125 (epic, wincap); never during a spin-button response, never in Calm/Still, never more than 1 per 400 ms, scaled by T() in turbo and off in skip. 83 ms = one step of the 12 fps grid. Basis is weak (practitioner heuristics), so treat as tunable.

**S4 Flash governor.** `flashGate(areaFraction, peak)` records every luminance flash (full-screen `flash()`, iris, banner burst on/off, ring, rays toggles). Rule: at most 2 flashes in any 1000 ms (margin under the limit of 3), peak opacity <= 0.5 for areas > 25% of the screen, cream/lemon only, no saturated red full-area pulses. Coral `#F0472F` is close to the saturated-red definition; treat it as red until a tool says otherwise [S1]. Small ornaments (an LED, a sign) are under the area test but still count toward the per-second tally when they share a region. `flashes:false` turns every flash into a 167 ms opacity dissolve (MDN replace-not-remove approach [S5]).

**S5 Celebration level** (compliance gate, from `net = runningRoundWin / roundCost`, using `S.cost`): L0 net <= 1.0 (quiet result), L1 (1, 5), L2 [5, 15), L3 >= 15 (banner tiers 15/30/50/100x, existing `tierFor`). Tumble chains use the RUNNING total, so cluster 1 (0.4x) is L0 and the cluster that pushes the total over 1.0x raises the level (J11). In Secret Entrance roundCost is 100x, so most clusters are L0 and only the end-of-bonus total decides. Whether per-cluster cues inside a bonus bought at 100x may use the running total is a compliance decision for a human (open question 1).

**S6 Timing grammar.** Hero motion (falls, count-ups, camera, mascot pose changes) runs smooth on the compositor; secondary motion (smoke, stars, sparkles, rays, outlines) is stepped at 12 fps and holds on twos (24 fps) for fast moves. One smear frame (stretched, low-opacity copy) on any move faster than 2 cell widths in 83 ms. Squash keeps volume (sx*sy about 1). Anticipation (wind-up) 83-125 ms before every pop, stamp or pose change [S11]. Durations scale with the existing `T()` (turbo .42, skip .04); do not use `playbackRate` (Safari acceleration caveat [S7]).

**S7 Gravity constants.** g = 55 cells/s2, restitution e = 0.2, bounce cap 8% of a cell, rest after 2 bounces. Fall time t = sqrt(2d/g): 1 row 191 ms, 2 rows 270, 3 rows 330, 5 rows 426, 7 rows 505 [C]. Fall easing `cubic-bezier(.2,0,.55,.1)` fits t^2 within 0.003 [C]; rebound h = e^2 * d (1 row 4%, 3 rows 12% -> capped 8%, 5 rows 20% -> capped 8%). Today a one-row tumble drop spends 310 ms falling (360+70 ms, 72% fall) and a 5-row one 511 ms [C].

**S8 FX engine rewrite (spec for the existing API).** Keep helper names (`sparks, stars, shards, pieces, dust, confetti, coins, ring, glow, burstBubble, breakCell, iris`). Internals: fixed typed arrays (Float32Array x,y,vx,vy,rot,vr,age,life + Uint8Array type/colour), swap-remove instead of `splice/shift`, pre-rendered sprite sheets on an OffscreenCanvas/`canvas` per type (4-6 stepped frames each) drawn with `drawImage` at integer coordinates, bubble words pre-rendered once per i18n word, no `ctx.save/restore` per particle, one `globalAlpha` change per type batch.

## 5. Animation specs
Level words: L0-L3 from S5. "Caps" are hard limits. Event names are book events; "proposed" = needs a new field/event from sibling research.

### 5.1 Board and tumble
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J01 | `reveal` | Drop-in: columns L->R 110 ms apart (+-8 ms jitter), cells bottom-first 34 ms per row; fall time from S7 (distance d = rows + 1.3); settle bounce h = min(8%, 0.04*d) | column 0.25-0.65 s | fall `cubic-bezier(.2,0,.55,.1)`, settle ease-out | now flat 620 ms, lands at 64% (`index.js:299-307`); anticipation columns keep +520 ms (J14) |
| J02 | each cell landing | Squash/stretch on `.sym-svg` (origin 50% 92%): scale(1.10,.88) -> (.97,1.04) -> 1, amplitude x impact speed / max; dust puff only on the lowest cell of a column when d >= 3 | 125 ms, 3 steps | steps(3,end) | max 6 puffs per step; Calm: no squash, 83 ms opacity settle |
| J03 | last column of `reveal` lands | Camera thump: translateY +0.6% then 0 | 83 + 125 ms | ease-out | once per reveal; Calm/Still off |
| J04 | `tumbleBoard.explodingSymbols` | Pop: wind-up scale(.92,1.1) 83 ms, then scale 1.2 -> 0 with rotate 25 deg and opacity 0; a white overlay (opacity) replaces the `brightness` filter; stagger 28 ms x graph distance from the cluster centroid, cap 224 ms | 250 ms | wind-up ease-out, pop ease-in | 1 paper piece + 1 star per cell, cluster cap 40 particles; replaces `index.js:399` |
| J05 | `tumbleBoard` refill | Survivors and new symbols fall by S7, bottom-first 14 ms per row (so an upper symbol never overtakes), column delay 24 ms, then J02 | 190-430 ms + 83 ms | as J01 | one tumble step about 0.9 s (now about 1.2 s); worst fall d=5 is 426 ms |
| J06 | `fuseBlast` then `tumbleBoard` | Holes stay empty 250 ms with dust drifting up, cream torn-paper mark on the empty cell (fades 1 s), then J05 refill | 250 ms | n/a | uses existing `emptyCell`; marks removed at next `reveal` |
| J07 | `winInfo`, combo >= 3 | Chain push-in: `#camera` scale 1.000 -> 1.030 across combo 1..6, scene layers counter-drift 0.3x/0.5x; release on `finalWin` | 333 ms per step, release 417 ms | ease-in-out | off in Calm/Still (vestibular [S5]); banner text sits outside `#camera` |

### 5.2 Wins
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J08 | `winInfo`, L1+ | Ripple highlight: each cell's squash starts 45 ms x graph distance from the centroid (cap 270 ms), two loops of the existing squash then a static lit outline; marching dashes stepped 12 fps | 750 ms x2, hold = existing clamp(780+9*total, 780, 1500) | existing `squash` keyframes | amplitude L1 1.08 / L2 1.14 / L3 1.20; drop the infinite loop (`styles.css:267`) |
| J09 | `winInfo`, L0 | Quiet result: lemon outline, number in cream, one soft tick. NO sparks, shake, bounce, mascot happy, vibraphone run | 400 ms | linear | UKGC [S6]; today `index.js:366-382` plays all of them |
| J10 | `winInfo` overlay | Number pop: scale .4 -> 1.2 -> 1 in 3 steps, count 0 -> v in 420-700 ms, rises 12%; 5% overshoot only at L2+ | 1.2 s | `cubic-bezier(.2,.9,.3,1.3)` | exists in `popup()`; L0 uses no overshoot |
| J11 | running total crosses round cost (`winInfo` / `setTumbleWin`) | Crossing beat: `.chip.tw` turns cream -> lemon with a 167 ms stamp pulse and one soft chime; from here L1+ cues are allowed | 167 ms | steps(2) | once per round; wording key (e.g. `win.overStake`) is a human decision |
| J12 | `winInfo.wins[].meta.globalMult` | Multiplier tag "xN" slaps onto the number: scale 1.6 -> 1, hit-stop 50 ms when N >= 20 | 125 ms | easeOutBack | replaces the silent `<small>x</small>` |
| J13 | `updateTumbleWin`, L2+ | Combo chip bump 125 ms, pop pitch step (exists), coin streak from the cluster to the chip along an arc | 417 ms | ease-in-out | max 6 coins |

### 5.3 Anticipation and scatters (honest cues only)
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J14 | `reveal.anticipation[c]` true | Slow-roll on column c only (fall x1.6, +520 ms as now), other columns dim to .7, column glow pulses 1.6 Hz, coral ring opacity .25-.6 at 1.6 Hz (replaces 2.3 Hz heartbeat plus 1 Hz ring) | +520 ms per column | steps(2) | only while a trigger is still possible per the book; max 2 columns; below 3 Hz [S1] |
| J15 | each scatter lands | Stamp: scale 1.5 -> 1 plus an ink ring, dossier tab flutters 2 steps; audio `scatter` rises with n (exists) | 125 ms | steps(3,end) | no shake or mascot shock when total < trigger count (`index.js:332` shakes at 3) |
| J16 | anticipation ends without a trigger | Neutral release: glows off with a click, dim lifts, mascot back to idle/think. No sad trombone (`audio.js:239` stays unused), no "so close" text | 167 ms | ease-out | RTS 7C [R:04 L3] |
| J17 | `freeSpinTrigger` | Dossier cutscene: scatters fly an arc to centre (417 ms), TOP SECRET stamp slams (scale 3 -> 1, 125 ms, hit-stop 100 ms, trauma .6), folder opens (scaleY steps, 167 ms) onto a mission card (name, spins), one cream flash <= .5, then wipe (J27) | 2.6-3.4 s; tap skips to the card after 1.2 s | mixed | replaces fuse -> blow-away (`index.js:554-594`) |
| J31 | `freeSpinRetrigger` | "+N" tickets fly from the scatters to the FS chip along arcs, chip bump, hit-stop 83 ms | about 1.2 s | ease-in-out | max 5 tickets |

### 5.4 Count-up and big win
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J18 | `setWin`, `freeSpinEnd`, `wincap` (L3) | Tier staircase: segment k counts from theta(k-1) to theta(k) in 0.85 s (first 0.9 s), then a 0.55 s beat: title stamp 1.25 -> 1 (167 ms), stinger, hit-stop 83/100/125 ms (mega/super/epic), trauma .25/.35/.45/.6, one ring, flash only if S4 allows. Last segment 0.9 + 0.5*log10(target/theta_last) s, cap 2 s. Thresholds 15/30/50/100x cost (existing `tierFor`) | about 2.4 s @20x, 3.8 @45x, 5.1 @75x, 6.8 @500x, 7.3 @5000x (design values [C]) | easeOutQuad per segment | tap jumps to the final value and title (already supported); fixes the 46 ms tier pile-up |
| J19 | banner open | Halftone dim fade 300 ms, rays turn stepped at 12 fps (24 s per turn, 12 s at hi), opacity <= .3 | 300 ms | linear | slow turn keeps luminance change under 3 per second [S1] |
| J20 | during count-up | Coin fountains from both lower corners every 150 ms, n = 2+tier per side | continuous | physics | alive coins cap 90 (auto) / 140 (full) |
| J21 | `wincap` | Max-win: freeze 125 ms, one whiteout <= .5 for 200 ms, "MAX WIN 5000x" stamp scale 3 -> 1 (167 ms), torn-paper rim, confetti, mascot celebrate, trauma .9 decaying over 1.2 s | 3.5-4.5 s, skippable after 1.5 s | stamp easeOutBack | confetti cap 60 |
| J22 | `freeSpinEnd`, amount <= round cost (L0) | Neutral Mission Report: card slides in 250 ms, count-up 600 ms, no rays, no coins, no cheer, mascot neutral | 1.2 s | ease-out | UKGC [S6]; 04 section 1 item 2 |

### 5.5 Wire and Mission Meter
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J23 | `fusePath`, `fuseBurn` | Cable draws on (stroke-dashoffset, stepped 12 fps), bomb drops in with a squash; spark hops lug to lug (300 ms travel, exists) plus 40 ms hold with a node pop | 450 ms draw | steps | move smoke puffs from DOM+WAAPI (`wire.js:80`) to the canvas pool |
| J24 | `fuseBlast` | Tick ramp 150 -> 55 ms over 600 ms (exists), hit-stop 100 ms on the blast frame, cream flash <= .6 for 200 ms, cells white 80 ms, POW star per cell 55 ms apart (exists), trauma +.55 | about 1.1 s | steps | <= 3 pieces per cell, <= 70 particles for 8 cells |
| J25 | `fuseFizzle` | Lugs darken 70 ms each back toward the start, 3 lilac puffs, spark dies, neutral shrug | 0.5-0.9 s | linear | no failure sting |
| J26 | `updateGlobalMult` | +1 chip arc 520 ms (exists), bar pop 280, digit flip 130; at x10/x20/x50 the badge re-colours with a 167 ms stamp and `meterRise` (exists); camera kick .15 | about 0.6 s | steps(8) | thresholds from `tierOf` in meter.js |

### 5.6 Transitions, modes and variable grids
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J27 | `freeSpinTrigger.mission` (proposed) | Per-mission wipe using clip-path/transform only: Lair = iris (exists), Casino = blind slats, Tower = elevator doors, Vault = round door turn; palette tokens swapped under the wipe (scene.js CSS variables) | 800 ms | steps(12) | Still: 400 ms cross-fade |
| J28 | mission start (proposed) | Costume change: OPAQUE folding screen slides in (250 ms, easeOutBack), hat/gloves/case toss above it (arc 400 ms), poof puff hides the swap (83 ms), screen out 250 ms; outfit class set while hidden | 1.0-1.1 s | mixed | never a silhouette; directives 2 and 4 [R]; skippable |
| J29 | `layout` / `floorUnlock` (proposed, 02) | Removed corner cells tear off (paper tear 250 ms); a new row drops in with an elevator ding (333 ms, easeOutBack); board scales to fit via `transform` (417 ms), never width/height | 0.4-0.7 s | easeOutBack | needs a shape-driven board (`COLS/ROWS` are hard-coded) |
| J30 | `tubes` (proposed, 02) | Brass tube mouths glow (2 Hz max); when a cluster uses a tube a capsule runs the SVG path with 3 smear frames (`getPointAtLength` in the shared rAF) | 300 ms | linear | max 3 capsules; clarity of adjacency is the risk |

### 5.7 Mascot, logo, scene, UI
| ID | Trigger | What happens | Duration | Easing | Caps / notes |
|---|---|---|---|---|---|
| J32 | `reveal` start, L1-L3, blast, fizzle, FS idle | Reaction map: reveal -> think; undecided anticipation -> shock; L1 wink only (167 ms accent), L2 happy, L3 bigwin, wincap celebrate; blast -> plunger; fizzle -> shrug; FS idle -> dance. Accents (brow, wink, antenna) layer over the base pose loop without restarting it | per pose 0.5-1.4 s | steps(1) loops | glamour stays sober per directive 4: wink, raised brow, smirk only; say() cooldown 3.5 s (exists) |
| J33 | any `setPose` change | Wind-up 83 ms (arms down 6 deg), one smear frame (stretched arm copy at .4 opacity), then the pose; held pose ends with a 125 ms settle | 290 ms | steps(2) | replaces the instant class swap (`mascot.js:315`) |
| J34 | page load, after `freeSpinEnd` | Logo stamp: letters A-G-E-N-T then M-A-M-B-O drop 60 ms apart and squash on landing, ink misregistration offset 3 px -> 0 (167 ms), bomb-dot "O" blinks 1 Hz; idle: one shine sweep every 8 s | 900 ms intro | easeOutBack | idle motion pauses when hidden |
| J35 | continuous + J03/J07/J26 | Scene camera: far layer drifts 6 px per 10 s; kicks on landing (fore 2 px, far .6 px, factors from `data-k`); pointer parallax kept on desktop, none on touch (no motion permission prompts) | continuous | linear | off in Calm/Still |
| J36 | idle > 20 s | Attract: one symbol sweep (exists), mascot wink every 12 s, CLUB sign flicker (exists) | ambient | steps | <= 3 simultaneous ambient motions; all off when hidden or after 60 s idle |
| J37 | spin press | Button press-down 83 ms (shadow offset collapse), release overshoot 125 ms; visible response < 100 ms [S10] | 208 ms | easeOutBack | exists (`pressed`); keep |
| J38 | turbo / skip | Same sequences via `T()`; hit-stop, camera zoom and tier beats compress to 40%, not removed; skip keeps the final state and the result display | .42 / .04 | n/a | jurisdiction flags can hide turbo (04 table); UK builds must not shorten the 2.5 s cycle |

## 6. Performance budget (targets, unmeasured)
| Item | Budget | Why / how |
|---|---|---|
| Frame | <= 8 ms scripting + paint on a mid phone at 60 Hz (16.6 ms total) | headroom for GC and compositor; verify with a 4x CPU-throttle trace |
| Rendering layers | 1 static scene stack (<= 8 canvases, no per-frame redraw) + dust canvas at 7 fps + board DOM cells + 1 SVG wire layer + 1 fx canvas + 1 banner layer | MDN layering [S2]; today fx redraws the whole app canvas whenever any particle lives |
| Promoted DOM layers | <= 45 | `will-change` only on `.cell`; add it to `.sym-svg` just while animating (today about 60 permanent) [S3] |
| Canvas backing store | per canvas <= 6 Mpx, scene total <= 24 Mpx (96 MB) on touch devices, fx canvas dpr <= 1.5 | computed: phone 390x844 dpr3 = 31 MB, tablet 1024x1366 dpr2 = 129 MB, 2560x1440 dpr2 = 334 MB [C]; iOS limits are conflicting reports [S22] |
| Scene savings | draw the lair canvases on first bonus; blinds at 1.0x not 1.24x; touch `sc` = min(dpr, 1.25) | cuts about 40% of scene pixels by my estimate |
| Particles live | 160 mobile / 240 desktop (exists: 240) | per-event caps: cluster win 40, tumble pop 60, blast 70, coins 90/140, confetti 60, new spawns <= 80 per second |
| Allocation | zero in the tick loop | typed-array pool [S21], pre-rendered sprites, no `splice/shift`, no per-frame arrays |
| Canvas draw | <= 400 `drawImage` per frame, integer coords, no `shadowBlur`, no live text | MDN [S2] |
| WAAPI | <= 120 concurrent animations; `transform` and `opacity` only (no `filter` on cells) | `filter` is compositor-capable in Chromium but costly and unevenly accelerated [S7][S25] |
| Loops | one `director` rAF drives fx, camera, count-ups, wire spark; scene motes stay at 7 fps; all stop on `visibilitychange` | today 5 rAF loops run independently |
| Containment | `contain: layout style` on `.popups`, `.banner-layer`, wire layer; NOT `paint` on `.board` (cells and popups overflow it) | MDN [S9]; board is `overflow: visible` |
| Quality governor | EMA over 30 frames: > 24 ms -> fx cap 120 and fx dpr 1; > 32 ms -> camera zoom, parallax, ambient off; > 40 ms sustained -> Calm. Step back up only after 5 s under 14 ms | invisible to the player; never changes outcomes |
| Memory hygiene | on resize shrink a discarded canvas to 1x1 before dropping it | Safari retains canvases [S22] |

## 7. Reduced-motion and settings matrix
| Effect | Full | Calm (default if `prefers-reduced-motion`) | Still |
|---|---|---|---|
| Camera shake / thump | trauma, MAX 1.6% | x0.25, no rotation | off |
| Camera zoom/push, parallax | on | off | off |
| Hit-stop | on | off | off |
| Flashes (S4) | <= 2 per second, cream, <= .5 | one 167 ms dissolve, <= .25 | none |
| Particles | per section 6 caps | x0.4 (mostly stars/pieces) | none; static stamp images |
| Tumble fall/pop | physics + squash | physics, no squash, 125 ms fades | 167 ms cross-fade, same total step time |
| Count-up / tier beats | staircase | staircase, no scale pops | numbers change, title swaps |
| Mascot | loops + accents | held poses, no loops | static pose per state |
| Scene | drift + motes | motes only (6) | static |
| Wipe / iris | steps(12) clip | 400 ms cross-fade | 200 ms cross-fade |
- Calm and Still replace motion, they do not shorten the round: the result and its timing stay the same (UKGC 14D/14E concern shortened results [R:04]). MDN recommends gentler replacement over removal [S5].
- Label the flash toggle "Screen flash effects" and never write "epilepsy safe" [S23].

## 8. QA and test plan
- Extend `tests/e2e` with a frame-capture pass over every dev book in `render/devbooks.js` (tier crossing, wincap, retrigger, blast, anticipation) at 60 fps; compute per-window luminance flashes (341x256 at 1024x768 equivalent) and assert <= 3 per second and <= 2 with the governor. A recorded run through the Photosensitive Epilepsy Analysis Tool or equivalent is still needed before submission [S1].
- Unit-test the level gate: dev books with a round win of 0.4x, 1.0x, 1.2x, 15x, 100x at cost 1 and 100; assert no celebratory call (sparks, `win` sound, shake, mascot happy, rays, coins) when running total <= cost.
- Perf: trace with 4x CPU throttle on tumble step 8+ (30 pops + 30 falls + particles) and on the 5000x banner; record long tasks, layer count (DevTools Layers), canvas memory; test on at least one low-end Android and one iPhone.
- Count-up: assert that for targets 20/45/75/500/5000x each tier title is visible >= 0.5 s unless skipped.
- Audio/visual sync: schedule audio on the WebAudio clock a fixed 0-40 ms before the visual frame for stamps and blasts (early audio detectable above about 45 ms, late above about 125 ms [S20]); expose an offset constant for Bluetooth output.

## 9. Priority and effort
| P | Work | Effort | Why |
|---|---|---|---|
| P0 | Motion store (S1), flash governor (S4), celebration gate (S5, J09, J11, J22) | M | compliance first; unblocks the menu work |
| P0 | Tier staircase (J18) | S | fixes a visible defect |
| P0 | Camera + trauma (S2), remove duplicate `shake` | M | one owner of transforms |
| P1 | fx engine rewrite (S8), swap `filter` for overlay, trim `will-change`, lazy lair canvas, quality governor | L | mid-phone safety |
| P1 | Gravity drop + landing squash + hit-stop (J01-J05, S3, S7) | M | feel |
| P1 | Dossier cutscene, mission wipe, costume change (J17, J27, J28) | L | needed for several bonuses |
| P2 | Chain push-in, ripple highlight, mascot wind-up/smear, logo stamp (J07, J08, J33, J34) | M | polish |
| P2 | Layout/tube animations (J29, J30) | L | only if the math adopts those mechanics |

## 10. Risks and zones to avoid
- Celebrating returns at or below the stake (UKGC [S6], 2026 study shows regulators' wording is vague so stay conservative [S14]).
- Fake or amplified near-misses: no zoom/shake/shock on non-trigger boards, anticipation only while the book says a trigger is still possible, never invent it.
- Flash: more than 3 per second, saturated red over a large area, stacked independent pulses (heartbeat ring 2.3 Hz plus 1 Hz ring today).
- Shake/zoom on turbo or after long sessions can cause discomfort [S5]; keep caps and settings.
- Loud audio plus flash plus shake on small returns makes them feel larger (Dixon [S13]); keep L0 quiet.
- Costume change: opaque screen only, no silhouette; wink and smirk only (directive 4).
- IP: these specs come from generic principles (Disney, limited animation) and measured constraints. I did not screen presentation sequences (anticipation slow-roll, cutscene triggers, count-up rolls) against patents or trade dress; hand to `01_patent_zones.md` and an attorney. Do not copy named competitors' sequences, names, art or sound.
- Do not use `playbackRate` for turbo (Safari), `contain: paint` on `.board`, CSS-variable animation inside `transform` (repaints [S7]).

## 11. Open questions
1. Compliance: inside a bonus bought at 100x, may per-cluster celebration key to the running total vs the 100x price? Is the triggering spin's stake the reference when a free-spin bonus ends below it (J22)?
2. Which jurisdictions hide turbo/skip or require a minimum cycle, and must Calm/Still keep the cycle length (assumed yes)?
3. Real frame times: none measured. Need a device lab list and traces before locking caps.
4. Count-up dwell, hit-stop and shake values are design guesses (weak evidence); schedule a playtest.
5. Is `S.cost` always the round price in base-bet multiples in every mode (it is used that way by `tierFor`)? Confirm with the menu/bet agent.
6. Audio latency on Bluetooth: add a sync-offset control in the menu?
7. Flash audit tooling: which analyser will the team use? PEAT is the tool WCAG's techniques name; I did not check platform support or licence.

## 12. Sources
[F] fetched, [S] search summary only, [R] repo, [C] computed.
- [S1] WCAG 2.2 Understanding 2.3.1 Three Flashes - https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html [F] strong
- [S2] MDN, Optimizing canvas - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas [F] strong
- [S3] web.dev, compositor-only properties and layer count - https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count [F] strong
- [S4] MDN, linear() easing - https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear [F] strong
- [S5] MDN, prefers-reduced-motion - https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion [F] strong
- [S6] UKGC, response on prohibiting effects that give the illusion of false wins - https://www.gamblingcommission.gov.uk/manual/online-games-design-and-reverse-withdrawals/summary-of-responses-prohibiting-effects-that-give-the-illusion-of-false [F] strong
- [S7] Motion, web animation performance tier list - https://motion.dev/magazine/web-animation-performance-tier-list [F] medium (vendor)
- [S8] MDN, Document.getAnimations - https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations [F] strong
- [S9] MDN, contain - https://developer.mozilla.org/en-US/docs/Web/CSS/contain [F] strong
- [S10] NN/g, Response times: the 3 important limits - https://www.nngroup.com/articles/response-times-3-important-limits/ [F] strong
- [S11] Twelve basic principles of animation (Thomas and Johnston, 1981) - https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation [F] medium
- [S12] Limited animation - https://en.wikipedia.org/wiki/Limited_animation [S] medium
- [S13] Dixon et al 2013 on sound and slot arousal (press release) - https://uwaterloo.ca/news/news/music-gamblers-ears [S] medium
- [S14] Myles, Bennett, Newall 2026, "Cue the sad trombone" - https://research-information.bris.ac.uk/en/publications/cue-the-sad-trombone-uk-gambling-regulations-have-not-prevented-t/ [S] medium
- [S15] Scarfe, Stange, Dixon 2020, negative sounds and LDWs - https://pmc.ncbi.nlm.nih.gov/articles/PMC8144080 [S] medium
- [S16] Game Developer, Eiserloh GDC 2016 "Juicing your cameras with math" (no formula on page) - https://gamedeveloper.com/programming/video-sprucing-up-cameras-with-math [F]; trauma implementations: https://bevy.org/examples/camera/2d-screen-shake/ [S] weak-medium
- [S17] Infovore, Making game feel (Vlambeer/Nijman screenshake) - https://infovore.org/?p=5275 [S] weak-medium
- [S18] Easton, game feedback feel (hit-stop 50-100 ms, shake, Jonasson and Purho 2012 talk) - https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/ [S] weak
- [S19] SSBWiki hitlag - https://www.ssbwiki.com/Hitlag ; Source Gaming on Sakurai's hitstop column - https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/ ; impact-freeze frame counts (9/11/13 frames) - https://sonichurricane.com/?p=1043 [S] weak-medium
- [S20] A/V sync thresholds - https://arxiv.org/pdf/2212.01686 ; https://www.tvtechnology.com/opinions/av-synchronization-how-bad-is-bad [S] medium (sign conventions conflict)
- [S21] Particle pooling - https://observablehq.com/@jobleonard/precessing-particle-demo ; https://www.oreilly.com/library/view/html5-canvas-2nd/9781449335847/ch09s01s04.html [S] weak-medium
- [S22] iOS canvas limits - https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/ ; https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/ [S] weak-medium
- [S23] Game Accessibility Guidelines, flicker - https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/ [S] medium
- [S24] Stake Web SDK, book and events (third-party mirror) - https://mintlify.wiki/StakeEngine/web-sdk/concepts/book-and-events [F] medium
- [S25] Chromium animation README (compositor-capable properties) - https://chromium.googlesource.com/chromium/src/+/2f7dfeb1/third_party/blink/renderer/core/animation [S] medium
- [R] docs/research2/04_attractiveness.md, 02_variable_grids.md, 00_USER_DIRECTIVES.md; frontend_mambo/src/render/*.js, styles.css, audio.js. [C] gravity fit, count-up tier timing, canvas memory, bounce table (Python, session scratchpad).
- Not obtained: Reddit (403); the GDC talks; the UKGC RTS clause text itself (only the consultation response page); an ITU-R BT.1359 original; any slot-specific study on count-up duration.
