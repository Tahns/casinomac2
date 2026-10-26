# 04 - Attractiveness and ethical engagement design (screening, not legal advice)

Date: 2026-10-26. Angle: what makes a slot appealing at first glance and across a session, and which tricks the rules forbid. Output: 23 levers, each tagged code-only / math / compliance risk / how to stay compliant.

Nothing here says any mechanic or effect is free to use or legally safe. A human IP attorney, a compliance reviewer and the Stake Studio review must check it. "Found nothing" is never "free". Reddit was not reachable (403) and is not cited. All art and sound stay hand-built in code, adult mascot only, no deceptive design.

## 0. Method and limits
- Tools: WebSearch (US-only) and WebFetch. WebFetch returns a small-model summary, not raw text. Tags in the sources list: [F] page fetched and read this session, [S] search-result summary only, [R] read in this repo, [C] computed here from repo files.
- Primary regulator text was read for UKGC RTS 7 and RTS 14 and for two consultation responses. The RTS autoplay clause (8A or 8C), 2E and 13C came from a law-firm note and an annex summary, not from the clause text. Stake's own approval page returned only part of its content (social, stateless, content, post-approval). The user-supplied Engine self-check (docs/research2/00_ENGINE_SELFCHECK_PROMPT.md) is the source for the directive ids [104] [31] [107] [228] [185] [266]; the official URL returned only a header here.
- Evidence quality: strong = primary page read; medium = abstract or reputable secondary; weak = snippet, press, anecdote, or design practice with no study.
- Psychology papers below are mostly lab studies with small or novice samples. They show mechanisms, not guaranteed effects in our game.
- Patent angle: the levers are presentation-level, so overlap is low, but see lever notes for L13, L17, L18 and docs/research2/01_patent_zones.md. This file does not clear anything.

## 1. Bottom line
1. The biggest attractiveness risk is also the biggest compliance risk: celebrating returns at or below the stake. By our own tables, 69.4% of paying base spins return the stake or less (section 2). UKGC RTS 14F bans celebration of those, and UKGC fined a large operator (GBP 240,000, 2025) for it. A 2026 study found 17 of 26 popular UK slots still played win-associated sound after such returns.
2. In Secret Entrance (100x) the same rule bites harder: 71.2% of rounds return less than the price. The current free-spin end jingle, mascot cheer and "Mission complete" banner fire on every round (render/index.js, fsEnd, read not run).
3. So attractiveness must come from five honest sources: identity (first glance), clarity (rules you can see), legible progress that is not money (wire, Mission Meter), drama proportional to a real net win, and control and comfort (sliders, session ledger, pacing). None needs a fake cue.
4. The wire is our best asset: it burns on 28.6% of base spins (about 1 in 3.5) and blasts on 5.9% (about 1 in 17). It gives a steady stream of events that are not "wins" (dead-spin delight, L2).
5. The headline hit rate (29.07%) overstates how often a player comes out ahead (8.88%, about 1 in 11 base spins). Showing that figure on the info screen is a trust lever; it is a rules-text decision for a human.
6. Near-miss staging is the second red zone. UKGC RTS 7C: "Games may not falsely display near-miss results". Our scatter tease is tied to a real board, which is not false, but the emphasis after a non-trigger (shake, shock pose) is a judgement call. Tease only while the outcome is undecided.
7. Juice has an inverted-U: medium and high beat none and extreme in the one study found (weak-medium evidence, secondhand). Budget motion per tier, cap flashes (WCAG 2.3.1), offer reduce-motion.
8. Math changes (more bonuses, shaping the sub-stake share) must land before submission. After approval Stake allows only small visual fixes.

## 2. What our own numbers say about the felt experience [C]
Source: library/publish_files/lookUpTable_*_0.csv (weights, payout x100), MATH_REPORT.md. Script run in this session, not committed.

| Base mode (cost 1x) | Share of spins |
|---|---|
| Dead (0x) | 70.93% |
| Pays 0 < R < 1x | 18.31% |
| Pays exactly 1x | 1.87% |
| Pays more than the stake (R > 1x) | 8.88% (1 in 11.3) |
| Any payout (hit rate) | 29.07% |
| Paying spins that return the stake or less | 69.4% of paying spins |

| Secret Entrance (cost 100x) | Share of rounds |
|---|---|
| Return below the price | 71.19% |
| Return equal to the price | 0.04% |
| Return above the price | 28.77% |
| At least 2x the price / 5x the price | 9.17% / 0.92% |

Session exposure (derived): feature trigger is 1 in 200 spins, so P(at least one feature) is 11.8% in 25 spins, 22.2% in 50, 39.4% in 100. P(at least one spin returning more than the bet) is 60.5% in 10 spins, 90.2% in 25. P(no paying spin in the first 10) is 3.2%. Blast is followed by a paying re-evaluation only 4.1% of the time (MATH_REPORT), so a blast is spectacle, not a win.

Design reading: a new player sees small returns often, net-positive spins about once per 11, and a feature rarely. The honest fillers are non-monetary events (wire burn, blast, mascot, board choreography) and a Secret Entrance path with a clear price. Neither may borrow win cues.

## 3. Rules and findings that limit tricks
### 3.1 Regulation and platform
| Rule | What it says | Scope | Strength |
|---|---|---|---|
| UKGC RTS 14F [S1][S3] | "must not celebrate a return which is less than or equal to the total stake gambled". Celebrate = win-associated auditory or visual effects. Allowed: show total awarded, show winning lines briefly, a brief sound for the result that is distinguishable from the sound for wins above stake. | UK casino incl. slots (slots since 31 Oct 2021) | strong |
| UKGC RTS 7C [S2] | Designs that may mislead about outcome likelihood are not permitted, including "substituting losing events with near-miss losing events". Guidance: "Games may not falsely display near-miss results." | UK | strong |
| UKGC RTS 7E [S2] | Display the result and the gamble "clearly and accurately", for a sufficient time; artwork and text must let the player tell lost from won. | UK | strong |
| UKGC RTS 14D, 14E [S1][S4] | Slots: at least 2.5 s per cycle, fresh button action each cycle, holding a key does not start a spin. No feature that shortens time to the result (turbo, quick spin, slam stop). Skipping animation after the result is shown is permissible. Not for bonus games with no extra stake. | UK slots | strong |
| UKGC autoplay ban [S5][S6] | Customer must commit to each cycle; autoplay not permitted. Numbered 8A in a 2025 law-firm note, 8C in the 2021 annex (numbering moved between versions). | UK | medium |
| UKGC 14A [S1] | No features or information that encourage chasing losses, raising the stake, or continuing after the player wants to stop. | UK, all gambling | strong |
| UKGC 2E and 13C [S5][S6] | Show net position since session start and elapsed session time. | UK casino | medium |
| UKGC reasoning [S3] | The concern is that indicating wins more often than they occur can induce a "hot state". The Commission never proposed banning sub-stake returns, only their celebration. | UK | strong |
| Germany [S24] | Reported: minimum 5 s per spin, autoplay banned, stake cap (changing in 2026, sources conflict). | DE | medium-weak |
| Ontario [S25] | Reported: autoplay banned, fine against a supplier in 2025-26 (summary only). | Ontario | weak-medium |
| Nevada [S26] | 1989 ruling: algorithms creating many on-payline near-misses "unacceptable". Old secondary source. | NV | weak |
| Stake approval page [S27] | Strictly stateless (no jackpots, gamble, continuation, early cashout); strict wording for social and regulated markets; offensive or explicit content may be rejected; after approval only small visual fixes, no math or mode or mechanic change. | Platform | strong |
| Engine self-check [S27b] | [104] autoplay opens a settings panel; [31] any mode above 2x cost needs a confirm; [107] the visible sound control mutes everything; [228] space bar rules; [266] any displayed probability must match the math. | Platform | medium |
| Engine jurisdiction object [S28][R] | `/wallet/authenticate` returns `config.jurisdiction` (socialCasino, disabledFullscreen, disabledTurbo, "..." in the official doc). Our mock also lists disabledSuperTurbo, disabledAutoplay, disabledSlamstop, disabledSpacebar, disabledBuyFeature, displayNetPosition, displayRTP, displaySessionTimer, minimumRoundDuration. Exact official names beyond the first three are unconfirmed. | Platform | medium |

### 3.2 Research that explains why the rules exist
- Losses disguised as wins: skin conductance after LDWs matched true wins and exceeded plain losses (40 novices) [S9, medium]. Win-paired sound made players overestimate how often they won (about 24% vs 15%) [S10, medium]. Negative sound after LDWs exposed them as losses [S11, medium]. A field study of 42,669 gamblers reported larger next bets and faster play after streaks of three large LDWs [S11b, weak: summary only].
- UK compliance is still poor: 17 of 26 popular slots used win-associated sound after LDWs; 400 UK gamblers' ratings matched the authors [S8, strong-medium].
- Near-misses: less pleasant than misses but raised the wish to play, activated win circuitry (15 non-problem participants, control matters) [S12, medium]. A 54-adult EEG preprint found fastest restart after near-misses [S13, weak].
- Slot design documents show how reinforcement can rise with payback unchanged, driven by sub-stake wins [S14, medium].
- Music tempo: one roulette study found faster bets with fast music, a later 144-person study found no effect [S15, weak]. Do not rely on tempo as a lever, do not tie it to bet speed.

### 3.3 Research on appeal (use with care)
- First impression is formed very fast; the paper's abstract covers 500 ms exposures, the "50 ms" figure comes from press coverage [S16, medium-weak].
- Peak-end: retrospective evaluation tracks the peak and the end, duration barely matters (meta-analysis of 174 effect sizes, r about 0.58) [S18, strong-medium].
- Endowed progress: visible partial progress raises persistence (field figures only from secondary sources) [S19, medium]. Risky in gambling: see L18.
- Self-determination: autonomy, competence and relatedness predicted enjoyment and replay in games [S20, medium]. In a slot, competence must never be implied (no skill claims), so autonomy comes from cosmetic and comfort choices.
- Anticipation: dopamine release occurs before an expected musical peak, separately from the peak [S21, medium]. A build-up before a reveal is a normal pleasure device, but it must not simulate a result that did not happen.
- Juice: a framework from 17 developer responses [S17, medium]; the medium/high-beats-none/extreme result is secondhand [S17b, weak-medium].

## 4. Prioritized levers
Risk = exposure if done naively. "Code only" = no change to math or books. Effort S/M/L is a guess. P0 = do first (also the compliance base), P1 = main appeal, P2 = nice to have.

| # | Lever | P | Code only | Math | Risk | Effort |
|---|---|---|---|---|---|---|
| L1 | Net-aware feedback ladder + break-even cue | P0 | yes | no | high | M |
| L2 | Dead-spin delight (wire, mascot, choreography) | P0 | yes | no | low | M |
| L3 | Honest anticipation (undecided only) | P0 | yes | constraint | med | S |
| L4 | Settings panel: sliders and comfort toggles | P0 | yes | no | low | M |
| L5 | Session ledger: net position, timer, reminder | P0 | yes | no | low | S |
| L6 | Pacing profile and jurisdiction flags | P0 | yes | no | med | M |
| L7 | First-glance identity and start splash | P1 | yes | no | low | M |
| L8 | First-spin reveal choreography and briefing | P1 | yes | no | low | M |
| L9 | Big-win staging ladder | P1 | yes | no | med | M |
| L10 | Audio identity and layered mix | P1 | yes | no | med | L |
| L11 | Mascot reaction map keyed to net result | P1 | yes | no | med | S |
| L12 | Secret Entrance ritual with honest disclosure | P1 | yes | no (reads tables) | med | M |
| L13 | Several bonus missions with distinct presentation | P1 | no | yes | med | L |
| L14 | Shape the sub-stake share of payouts | P1 | no | yes | low | M |
| L15 | Mission Meter clarity | P1 | yes | no | low | S |
| L16 | Juice budget and motion language | P1 | yes | no | low | M |
| L17 | Cosmetic mission/scenery picker | P2 | yes | no | med | S |
| L18 | Dossier stamp album (client-only) | P2 | yes | no | med | M |
| L19 | Grid-frame morph and per-mode scene | P2 | partly | grids yes | low | M |
| L20 | Mission report recap (peak-end) | P2 | yes | no | low | S |
| L21 | Optional snapshot to save | P2 | yes | no | med-high | S |
| L22 | Idle attract mode, non-verbal | P2 | yes | no | med | S |
| L23 | Comfort and accessibility pass | P1 | yes | no | low | M |

### P0 - foundation
**L1 Net-aware feedback ladder + break-even cue.** Define C = bet x mode cost multiplier and R = running return of the round (all steps, all free spins). Tiers: R = 0 no win cue; 0 < R <= C "ledger" feedback only (amount shown in a neutral colour, cells outlined for one beat, one short low tick that does not share a timbre with win sounds, no coins, no shake, no pitch ladder, no happy pose, no count-up); R > C normal win staging that scales with R / C. The first time R crosses C in a round, play one small "in the black" cue (honest and satisfying). Cascades and free spins use the running R, so the cheer starts at the step that crosses C. Compliance: this is the mitigation for RTS 14F; test rule: "would this effect be fine on a 0.3x return?". Judgement call to flag: whether cluster pops and the Mission Meter ladder count as mechanic feedback or as win celebration; take the strict reading and ask Stake. Applies in replay and in every mode. Evidence: S1, S3, S7, S8, S9, S10 (strong to medium). Gaps in the build: win audio on every winInfo (render/index.js:381), fsEnd cheer unconditional (render/index.js:609-614).

**L2 Dead-spin delight.** Fill the 71% of dead spins with non-monetary motion: wire lugs lighting (28.6% of spins), a tick that is clearly not a win sound, mascot idle gags (heel tap on the beat), board landing choreography, the blast build-up (1 in 17). Compliance: wire sound and blast are not win cues; a fizzle must read as "the wire fizzled", never as "almost". Do not play win-like audio on a blast unless the re-evaluation pays (4.1%). Evidence: S9, S10 (why the substitute must be honest), S16 (weak design practice).

**L3 Honest anticipation.** Slow, dim or glow columns only while the scatter outcome is still undecided; resolve with a neutral beat when it fails; no "so close" text, no sad-trombone, no shake on a 3-scatter non-trigger. Math constraint: do not weight strips to over-produce 2-3 scatter boards. Compliance: RTS 7C, 7E; research S12, S13. The current build ties anticipation to the real board (good) but shakes and shocks the mascot on 3 scatters (render/index.js:329-336) and has an unused sad-trombone `nearmiss` sound (audio.js:239): keep it unused. Evidence: strong for rules, medium for effects.

**L4 Settings panel (user request).** Master, Music, Effects and Ambient/Voice sliders (0-100) plus one master mute that silences all (directive [107]); Reduce motion, Reduce flashes, High contrast, Large text; "Show net position and session time"; autoplay and turbo only where allowed. Values saved in localStorage inside try/catch, with defaults when blocked. Compliance: the sliders must not let a quiet setting hide the session ledger; mute must also kill bonus and big-win audio. Add a short test sound per slider. Evidence: S22 (WCAG 2.3.1 strong; audio-control rule not verified this session), S23 (audio starts only after a user gesture). Current build: one toggle (`am_muted`), no sliders.

**L5 Session ledger.** Small panel: net position since start (in the round currency), elapsed time, spins played, best moment as a fact, optional player-set reminder every N minutes. Default ON; mandatory where `displayNetPosition` or `displaySessionTimer` is set. Neutral tone, no green flash on net positive. Compliance: UKGC 2E and 13C (medium), Engine flags. Attractive angle: trust, closure (peak-end, L20). Current build: absent.

**L6 Pacing profile and flags.** Honour `disabledTurbo`, `disabledSuperTurbo`, `disabledSlamstop`, `disabledAutoplay`, `disabledSpacebar`, `disabledBuyFeature`, `minimumRoundDuration`, `displayRTP`. Base cycle comfortably above 2.5 s on dead spins; win staging adds time in proportion to R / C; a skip is offered only after the result is displayed; no slam stop; holding a key never repeats a spin. Autoplay: panel first ([104]), stop on feature, big win, balance drop and loss limit; no autoplay where flagged. Evidence: S1, S4, S5, S24, S25. Current build: `main.js:305-311` reads six flags only; `minimumRoundDuration`, `displayNetPosition`, `displaySessionTimer`, `displayRTP`, `disabledSlamstop`, `disabledSuperTurbo` are ignored; autoplay waits 500 ms (150 ms in turbo) between rounds (`main.js:179`).

### P1 - main appeal
**L7 First-glance identity.** Lobby tile and loading screen readable at 100 px: beehive silhouette, three dominant colours, thick outline, halftone offset print, one wire line. Loading screen with the burning-wire progress bar, load fast, then a "Start mission" splash that also unlocks audio (browsers block audio until a gesture). Sober tile version per the user directive 4. Do not show a prize amount or a pile of coins on the tile. Compliance: social wording, no minors, mascot adult and fully dressed. Evidence: S16 (medium-weak), S23. Tile specs from Stake: unknown.

**L8 First-spin reveal and briefing.** The first spin cannot be forced to win (books fix the outcome), so delight is in presentation: staggered column landings with a drum fill, wire lighting node 1, mascot reaction to the board. A skippable three-card briefing (clusters, wire, Secret Entrance), shown once, replayable from the Info screen. Compliance: text equals the math ([24] [26] [235]); no "easy win" claims. Evidence: S20 (medium).

**L9 Big-win staging ladder.** Tiers as multiples of C (current thresholds 15x, 30x, 50x, 100x of cost, max at wincap) with layered escalation: dim, ring, rays, coin fountain, tier stinger, count-up capped near 6-8 s, tap to jump to the final number after the final amount is on screen. Show the final figure first and unambiguously (RTS 7E), then roll. Secret Entrance: tiers are multiples of 100x the bet, so "big" there means very large; the existing bonus banner rule (`S.inFs ? 50 : 15` times cost) shows a banner only at about the 5000x cap, so mid-size bought wins get none; revisit the thresholds for mode cost. Evidence: S18, S21, S4 (skip after result allowed).

**L10 Audio identity and layered mix.** Stems that add per tier (bass, brush kit, vibraphone, brass), tempo fixed in the 118-132 bpm range of the design, combo ladder rises only while R > C, a distinct neutral "ledger tick" for returns at or below C, mix headroom so stingers do not clip, no tempo ramp tied to bet speed. Compliance: RTS 14F sound clause; the industry gets this wrong (S8). Build a unit test: every sound id has a flag `winLike`; `winLike` sounds never play when R <= C. Evidence: S8, S10, S11, S15 (weak).

**L11 Mascot reaction map.** Poses keyed to R / C and real events, not hopes: dead spin shrug or poker-face, R <= C a small nod, R > C happy, tier wins the full set, wire blast the plunger, fizzle the shrug. No "shock" on a non-trigger, no pose that says "almost". Mascot stays dressed, adult, and sober on the tile (directive 4). Speech bubbles go through the same ladder. Evidence: S1 (rule), design practice (weak).

**L12 Secret Entrance ritual.** A 3-second infiltration sequence (door, keyhole iris, costume change) after the confirm. The dialog shows the real price and one honest line from the tables, for example "About 7 in 10 rounds return less than the price; about 3 in 10 return more." (71.2% / 28.8%, [C]). No countdown, no "limited", no pre-selected highest tier, no default focus on Confirm. At the end, neutral outcome staging when R <= 100x the bet. Compliance: [31] confirm, RTS 14A (do not push a bigger stake), social wording ("instantly triggered", "play"), [266] the figure must match the final math, [25]/[27] RTP and cost in the rules. Needs the published tables only. Evidence: strong for rules, [C] for numbers.

**L13 Several bonus missions.** Each mission = its own mode or book path, with its own set, costume, music key and rule hook (variable grids and bonuses per the brief). Platform limits: at most 20 modes, same RTP in each (90-98% band, same across modes), payouts in 0.1x steps, 5000x cap, any mode above 2x cost needs a confirm and clear price, every mode described in the rules. Patent: do not build on a hold-and-spin skeleton; check cluster, grid-growth and collection families (01_patent_zones.md). Do it before submission. Evidence: S27, S27b (strong-medium).

**L14 Shape the sub-stake share of payouts.** Because celebration is capped at R > C, the experience of "I won" depends on the share of paying spins above the stake. Today it is 30.6% of paying spins (8.88 / 29.07). Trade some hit rate for more net-positive wins while holding RTP at 96% in both modes and multiples of 0.1x. Test in the SDK; report new hit rate and the share above stake honestly in the rules ([266]). Risk: low, but any math edit must precede submission. Evidence: strong for data [C], medium for the reasoning (S14).

**L15 Mission Meter clarity.** Show current value, the next step (+8), "kept across spins" and whether a step pays at the old or new value (as the math defines it). Pop and ladder sounds follow L10. Evidence: rules text must match math [26]; design practice.

**L16 Juice budget.** One motion language: limited animation (steps), squash on pops, 60-90 ms hit-stop, cut-paper pieces on blasts, shake amplitude by tier with a hard cap, particle caps for low-end phones, nothing flashes above three times per second over a large area. "Reduce motion" cuts shake, particles and parallax. Evidence: S17, S17b (weak-medium), S22 (strong).

**L23 Comfort and accessibility.** Colour-blind-safe symbol shapes (already distinct silhouettes), captions for key audio cues (blast, feature trigger, win tier), tap targets, layouts at 400x225 and 425x812 ([193] [194] [195]), text not clipped in other currencies. Evidence: S22.

### P2 - nice to have
**L17 Cosmetic mission/scenery picker.** Let the player choose the briefing room, costume colourway or music style. Label it "scenery only" and never present it as a decision that affects the result. Real choices (different volatility, grid or bonus) must be separate modes (L13). Risk: a fake choice that looks like a pick bonus; keep it outside the round and outside the reveal. Patent: pick-bonus anchors found expired [01_patent_zones], attorney still needed.

**L18 Dossier stamp album.** Per-device stamps for things seen (first 12-cell cluster, first blast, first feature, Mission Meter x25). No reward, no streak, no daily login, no counter that says "one more to complete", off in replay and in social mode by default, resets with browser data, a toggle in the menu. Risk: Stake is "strictly stateless", and endowed progress raises persistence (S19) which collides with RTS 14A; ask Stake whether purely cosmetic client memory is acceptable. Patent: symbol-collection meters (Aristocrat family) feed features; ours feeds nothing; attorney.

**L19 Grid-frame morph and per-mode scene.** When a mode uses another grid (brief: variable grids), animate the frame (iris, panels sliding, paper unfolding), swap the backdrop and music key. Rendering is code; the grids and any growth during a round are math and patent-sensitive (grid growth families, 01_patent_zones). Keep the layout safe at 400x225 and in portrait.

**L20 Mission report recap.** At feature end and on request: net position, time, best moment, mechanic stats (wire blasts seen, highest meter). Neutral tone; no "you lost" and no "you won" if R <= C. Peak-end effect (S18) makes the last screen matter; this makes it honest. Risk low.

**L21 Optional snapshot.** "Save a dossier card" renders a PNG locally (no network, no brand, no operator name), shows the multiplier by default, not currency. Only offered after R > C at tier "big" or above. Never auto-prompts, never pre-writes share text, off in replay and social, off where the jurisdiction restricts it. Risk: sharing wins can read as promotion; no regulator text was found this session, so human review is mandatory. Evidence: weak (streamer culture, docs/research/1_community.md, anecdotal).

**L22 Idle attract mode.** After about 20 s idle, the mascot taps a heel or checks a watch, the board shimmers once. No text, no countdown, no "spin now". Stops on any input. Risk: RTS 14A (do not encourage continued play); keep non-verbal.

## 5. Red lines (do not build)
- Win audio, coins, rising pitch, shake, "WIN" text or mascot cheer when R <= C (any mode, any step that does not push the running total above C).
- A fake near-miss, a "so close" bubble, sad-trombone on a failed scatter, reordering results so losses look closer, strips weighted to over-produce 2-3 scatter boards.
- Slam stop, turbo, quick spin, autoplay or space-hold repeat where the flag or the market forbids them; a spin faster than the minimum round duration.
- Hot/cold meters, "due" hints, streak counters, "x spins since a feature", countdown offers, "last chance", leave-prompts, bigger-stake nudges after a loss.
- Any claim that cosmetic choices affect the result; any display of a probability that is not the final probability (the 37.5% roulette lesson in STAKE_COMPLIANCE.md).
- Mascot poses or tile art that are sexually suggestive (Engine directive [217]); minors; real police insignia.
- Hosted fonts, analytics, or any external request (static files only); "Powered by" loader.
- Naming or copying competitors' mechanics, names, art or sounds; claiming "patent-free".

## 6. Build gaps seen in the current front end (read, not run)
1. Win sound, shake, mascot pose and long hold on every winInfo regardless of R vs C (render/index.js:379-383).
2. Free-spin end: jingle, "celebrate" pose, "Mission complete!" bubble and banner always play, even for Secret Entrance rounds under the 100x price (render/index.js:609-614).
3. 3-scatter tease with sound, shake and shock pose (render/index.js:329-336).
4. Flags `minimumRoundDuration`, `displayNetPosition`, `displaySessionTimer`, `displayRTP`, `disabledSlamstop`, `disabledSuperTurbo` not read (main.js:305-311).
5. One mute toggle only; no sliders (audio.js master gain, `am_muted`).
6. No net position or elapsed time display.
7. Bonus banner threshold `S.inFs ? 50 : 15` times cost leaves bought-round mid-size wins without staging (render/index.js:681-683).
8. `nearmiss` and `wahwah` sounds exist unused (audio.js:239-243): keep them out of the win path.

## 7. Suggested order and acceptance checks
- Wave 1 (blocks everything): L1, L6, L4, L5, L3, L11. Acceptance: automated test that plays recorded books through a headless renderer and asserts no `winLike` sound, no coins, no shake when R <= C, in base, in free spins, in Secret Entrance and in replay; flags toggled one by one; sliders persist and mute silences all; session ledger present at 1024x576, 400x225, 425x812.
- Wave 2 (appeal): L2, L7, L8, L9, L10, L12, L15, L16, L23.
- Wave 3 (variety, math first): L13, L14, then L19; L17, L18, L20-L22 only if the attorney and Stake review allow.
- Re-run the Stake self-check items [25] [27] [185] [266] after any math change.

## 8. Open questions for a human
1. Which markets are launch targets? If any of UK, Ontario or Germany, L1 and L6 are mandatory; recommended everywhere for one code path.
2. Does the Stake review treat cluster pops, the Mission Meter ladder and the end-of-feature banner as "celebration" when R <= C? Ask the Studio team in writing.
3. Is "return" per spin, per cascade step, or per whole round (feature included)? Strict reading used here: running round return.
4. Is a cosmetic, client-only stamp album acceptable under "strictly stateless"?
5. Is a local snapshot or share link acceptable in each target market and on Stake.US?
6. Exact official names of every `jurisdiction` flag (RGS.md elides them) and whether `minimumRoundDuration` is in milliseconds.
7. Should the info screen print the share of base spins that return more than the bet (8.88%) beside the hit rate? Needs a compliance decision and must match final math.
8. Lobby tile size and rules: not found.

## 9. Sources (S = source id; F fetched, S search summary, R repo, C computed)
- S1 [F, strong] UKGC RTS 14 (14A-14G, updated 12 Jan 2026): https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-14-responsible-product-design
- S2 [F, strong] UKGC RTS 7 (7B, 7C near-miss, 7E display; updated 7 May 2024): https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes
- S3 [F, strong] UKGC response, false-win effects (14F text, "hot state", sub-stake returns not banned): https://www.gamblingcommission.gov.uk/consultation-response/online-games-design-and-reverse-withdrawals/summary-of-responses-prohibiting-effects-that-give-the-illusion-of-false
- S4 [F, strong] UKGC response, spin-stop (skip after result permissible; bonus without extra stake): https://www.gamblingcommission.gov.uk/consultation-response/online-games-design-and-reverse-withdrawals/summary-of-responses-prohibiting-player-led-spin-stop-features
- S5 [F, medium] UKGC annex 1, summary of RTS changes (autoplay as 8C, 2E, 13C, 14D; 14G and 7E absent from the page): https://www.gamblingcommission.gov.uk/consultation-response/online-games-design-and-reverse-withdrawals/ogdrw-annex-1-summary-of-changes-to-rts
- S6 [F, medium] Harris Hagan note, 17 Jan 2025 changes (8A, 14C, 14E, 14F, 14G, 2E, 13C): https://www.harrishagan.com/reminder-changes-to-remote-games-design-requirements-come-into-force-on-17-january-2025/
- S7 [S, medium] Betfred operator fined GBP 240,000 (net position and celebrating losses), Oct 2025: https://sbcnews.co.uk/europe/2025/10/01/betfred-slots-ukgc/ and https://igamingexpert.com/regions/europe/ukgc-fines-betfred-operator-slots/
- S8 [F, strong-medium] Myles, Bennett, Newall, Behavioural Public Policy 2026, 26 slots, 400 raters: https://research-information.bris.ac.uk/en/publications/cue-the-sad-trombone-uk-gambling-regulations-have-not-prevented-t/
- S9 [S, medium] Dixon et al. 2010, Addiction 105(10):1819: https://uwaterloo.ca/reasoning-decision-making-lab/sites/default/files/uploads/files/DixFugetal_10c.pdf
- S10 [S, medium] Dixon et al., impact of sound (96 gamblers): https://pmc.ncbi.nlm.nih.gov/articles/PMC4225056 ; overestimation figures via https://therapytoronto.ca/news/?p=14510
- S11 [S, medium] Scarfe, Stange, Dixon 2020 (negative sound after LDWs): https://link.springer.com/10.1007/s10899-020-09976-9 ; S11b [S, weak] 2022 field study of 42,669 gamblers, DOI listed in results: https://dx.doi.org/10.1007/s10899-022-10184-w
- S12 [S, medium] Clark et al. 2009, Neuron 61:481: https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/
- S13 [S, weak] Near-miss EEG preprint (54 adults): https://www.biorxiv.org/content/10.1101/2020.10.08.330654v1
- S14 [S, medium] Harrigan and Dixon 2009, PAR sheets: https://epe.bac-lac.gc.ca/100/201/300/jrn_gambling_issues/html/2009/no23/issue23/06harrigan.html
- S15 [S, weak] Dixon, Trigg, Griffiths 2007 https://irep.ntu.ac.uk/id/eprint/3012 ; Spenwyn et al. 2010 https://link.springer.com/article/10.1007%2Fs11469-009-9226-0 ; non-replication https://journals.sagepub.com/doi/10.1177/0305735616632897
- S16 [S, medium-weak] Lindgaard et al. 2006 (50 ms claim from press): https://websiteoptimization.com/speed/tweak/blink/
- S17 [S, medium] Hicks et al., DiGRA 2018 juiciness framework: https://dl.digra.org/index.php/dl/article/view/936 ; S17b [S, weak-medium] Kao 2020 result as cited secondhand: https://arxiv.org/pdf/2208.06155 (PDF not parseable here) and https://improbable.com/tag/rpg/
- S18 [S, strong-medium] Fredrickson and Kahneman 1993 https://bear.warrington.ufl.edu/brenner/mar7588/Papers/fredr-kahneman-jpsp1993.pdf ; meta-analysis https://ideas.repec.org/a/eee/jobhdp/v170y2022ics0749597822000334.html
- S19 [S, medium] Nunes and Dreze 2006: https://ideas.repec.org/a/oup/jconrs/v32y2006i4p504-512.html
- S20 [S, medium] Ryan, Rigby, Przybylski 2006: https://acuresearchbank.acu.edu.au/item/8q128/the-motivational-pull-of-video-games-a-self-determination-theory-approach
- S21 [S, medium] Salimpoor et al. 2011: https://www.zlab.mcgill.ca/publications/docs/salimpoor_2011_nn.pdf
- S22 [S, strong for 2.3.1] WCAG 2.3.1: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html . Audio-control (1.4.2) and prefers-reduced-motion were NOT verified this session; check W3C and MDN before citing.
- S23 [S, medium] Web Audio autoplay policy: https://www.chromium.org/audio-video/autoplay
- S24 [S, medium-weak] Germany slot rules, conflicting 2026 reports: https://igamingbusiness.com/germany-operators-could-face-e1-slot-stake-limit/ and https://brightsideofnews.com/gambling/news/germany-ggl-online-slots-review-2026/
- S25 [S, weak-medium] Ontario auto-play ban and supplier penalty (summary only, page for the Booming Games case not identified): https://www.agco.ca/en/news/agco-issues-70000-monetary-penalties-three-internet-gaming-operators-offering-uncertified-slot
- S26 [S, weak] Nevada 1989 near-miss ruling: https://www.gamblingandthelaw.com/column/regulating-players/
- S27 [F, strong-medium] Stake approval guidelines (partial content): https://stakeengine.org/docs/approval-guidelines ; S27b [R, medium] user-supplied self-check: docs/research2/00_ENGINE_SELFCHECK_PROMPT.md (official URL https://studio.engine.io/docs/approval-guidelines returned a header only)
- S28 [F+R, medium] Stake web-sdk: https://github.com/StakeEngine/web-sdk ; RGS jurisdiction object: math/docs/rgs_docs/RGS.md:254 ; mock flags: frontend_mambo/tools/mock-rgs/server.mjs:100
- Repo [R/C]: math/games/agent_mambo/MATH_REPORT.md, library/publish_files/lookUpTable_base_0.csv and lookUpTable_bonus_0.csv, frontend_mambo/src/render/index.js, main.js, audio.js, docs/research/1_community.md (anecdotal), docs/STAKE_COMPLIANCE.md, docs/research2/01_patent_zones.md.
