# Patent landscape for slot mechanics: screening only (NOT legal advice, NOT a clearance)

Date: 2026-10-26. Angle: families around variable reel heights / ways, cluster pays, tumble, persistent multipliers, wilds, hold-and-spin, pick bonuses, collection meters, grid growth, bonus buy. Screening for "Agent Mambo" (6x5 cluster, tumbles, Mission Meter global multiplier, bomb-timer wire that blasts and removes cells, Secret Entrance buy at 100x, several bonuses, variable grids per mode).

Nothing below says any mechanic is free to use or safe. A human IP attorney must review before launch. "Found nothing" is never "free". Reddit was not used (403 from this sandbox).

## 0. Method, limits, legend
- Tools: WebSearch (US-only) and WebFetch on patents.google.com. WebFetch returns a small-model summary of a page that is usually truncated after ~100k characters. Claims sit at the END of the text and were visible only for a few documents. Where claims were not visible I say so; "claim gist (summary)" means a summarizer's paraphrase, to be checked against the official text.
- Google's "Active / Expired / adjusted expiration" labels are Google's own assumption (the page says so), ignoring fees, terminal disclaimers, continuations. Dates are Google's unless stated. A US utility patent normally runs 20 years from earliest non-provisional filing (+ any adjustment); treat that as a rule of thumb only.
- Not queried or not reachable: Espacenet, EUIPO, WIPO, USPTO Patent Center, Lens. Justia and several trade sites returned 403. Non-US counterparts (EP, AU, GB, CA) were NOT checked, and the target markets decide which matter.
- Tags: [V] page fetched this session. [S] seen only in a search-result snippet. [C] carried from earlier repo notes (docs/PATENT_SCREEN.md, docs/PATENT_BRIEF.md, docs/research/3_patents_free_space.md) and not re-fetched. Sources are listed at the end as S1..S43.
- Evidence quality: strong = primary patent page read, bibliographic data AND claim text visible; medium = primary page read for bibliographic data, claim gist only from a summary or description; weak = snippet, press, or affiliate page only.

## 1. Bottom line
1. NEW and important: Aristocrat owns a family titled "Gaming method and apparatus using cluster based awards" (priority 2014-09-29; four US grants 2021 to 2026; Google: active, expiring 2035). One independent claim, as summarized, reads close to a plain cluster rule (same symbol, edge-adjacent positions, award from the count). This overturns the earlier "cluster pays: nothing found" note. Tag: ATTORNEY, HIGH (section 2). Evidence: medium.
2. Basic tumble (remove winners, drop, refill, repeat) has an expired anchor (IGT/PTT US7357713, priority 2001) [V]. Refinements are active: IGT cascades with wilds / stacked reels (to 2029) and WMS/LNW removal of NON-winning symbols with a "bomb" marker (US8192275, to 2029-07-13) [V]. Our bomb-timer blast is nearest to the latter (section 3).
3. A global meter multiplier that rises per winning step has several expired anchors [V][C]. The active multiplier art found is tied to a HELD symbol or a per-position state, which we do not use. Comparatively open, with a shallow-search caveat.
4. Megaways: BTG calls it "US patented" in press, but NO patent number, claims or expiry were found. The only BTG patent document found (US20210241570A1) is abandoned and is a different mechanic [V]. Treat variable per-spin reel height as attorney-only.
5. Hold-and-spin and its sub-features (value symbols that stay, respin counter reset, free-game count from held symbols, expansion tied to held symbols, player option menu) are the most actively licensed family (Aristocrat, active to 2038-2041, AU$8.5m licence signed 2026-08-14). Do not build a bonus on that skeleton.
6. Pick-a-bonus, fixed/directional wilds and chance-based bonus buy are mostly old, with the anchors found expired. They are the most open ground, still unverified for the exact shapes.
7. Aristocrat is the common holder across cluster, hold-and-spin, collection meter, reel expansion and buy-feature families. IGT/PTT and WMS/LNW hold the cascade and wild art. One company's enforcement signal is strongest (trade-secret win 2024, licence deal 2026).

## 2. Master table (risk tag = how soon to show an attorney, not a legal opinion)
| # | Family | Best anchors | Holder / priority / Google status | Exposure for Agent Mambo | Tag |
|---|---|---|---|---|---|
| 1 | Cluster pays | US12094305, US10964173, US11468746, US12536877 [V] | Aristocrat; 2014-09-29; active, exp. 2035-09 to 2035-12 | Min-5 orthogonal cluster paid by size is the core of our base game | ATTORNEY HIGH |
| 2 | Tumble / cascade | US7357713 [V] expired; US8105151, US9437084 [V]; US8574059, US8690660, US10607448 [C] | IGT (2001 expired; 2008-2012 families active to 2029-2036) | Plain tumble: low. Wild-on-refill, stacked reels, multi-sided: avoided | LOW to MEDIUM |
| 3 | Removal of non-winning symbols / bomb | US8192275 [V], US20120238348 [V] | WMS now LNW; 2006-05-04; US8192275 active, exp. 2029-07-13; the application is abandoned | Our wire blast removes burnt cells | ATTORNEY MEDIUM |
| 4 | Variable reel height, ways | BTG Megaways (number NOT found); IGT US8012011, US8562416 [V]; Reel Power [S] | BTG/Evolution (press); IGT 2005-08-26, active to 2028 and 2032 | Fixed grid: low. Brief asks for variable grids: see section 4 | ATTORNEY if per-spin random heights |
| 5 | Persistent multipliers | US8021224 [V] expired; US7147559 [C] expired; US8197328, US7695365 [C] active | PTT, IGT, WMS; 2001 to 2008 | Global meter: low to medium. Per-cell or held-symbol: avoid | LOW to MEDIUM |
| 6 | Wilds: sticky, expanding, walking | US8277307 [V]; US7758414B1 [V]; US20130184058 [V] | IGT 2006 (exp. 2026-11-08); IGT/PTT 2002 expired; Aristocrat 2000 expired | We create no wilds from blasts; wild substitution only | LOW |
| 7 | Hold-and-spin / respin | US10629030, US11551509, US11625982, US11798368 [V] | Aristocrat; 2017 to 2020; active to 2038-2041 | None today. Avoid for any new bonus | AVOID |
| 8 | Pick-a-bonus | US7959508, US7867074 [V] | IGT/Atronic; 2001-2002; expired 2023-2024 | Only a cosmetic reveal fits the platform | LOW |
| 9 | Symbol-collection meters | US12437612 [V] | Aristocrat; 2021-11-17; active, exp. 2043-06-23 | Mission Meter is fed by win steps, not collected symbols | LOW to MEDIUM |
| 10 | Grid / row / column growth | US8602868 [V], US11625982 [V], US10964173 claim 15 [V] | Everi (to 2031); Aristocrat (to 2040, 2035) | Only if a bonus grows mid-round | MEDIUM if used |
| 11 | Bonus buy | US8475256, US8562408 [V] expired; US9685046, US8038524 [C] | Aristocrat; 1999 priority; two expired, one active to 2033 | Direct, guaranteed buy at 100x, no extra wager tier | LOW to MEDIUM |

## 3. Family detail

### 3.1 Cluster pays (largest new finding)
- Claimed, in broad terms: Aristocrat family from AU2014903909. US10964173B2 (granted 2021-03-30, adj. exp. 2035-12-08), US11468746B2 (2022-10-11, 2035-09-29), US12094305B2 (2024-09-17, 2035-09-29), US12536877B2 (2026-01-27, 2035-10-14), one more US continuation listed as pending. All "active" per Google [S1-S4, V].
- Claim gists (summary, medium): US10964173 claim 15 (visible): cluster = group where every symbol touches another along an edge AND the group spans at least two columns; base award depends on the number of columns spanned; final award = base x number of positions in the cluster; the display area expands from a first to a larger second number of positions; dependent claim 20 recites at least thirteen rows. US12094305 claim 1 (as summarized): same symbol at every position of a cluster, each position adjacent to at least one other, no display position shared by multiple winning clusters, award based on the quantity of matching symbols; NO minimum size and NO column-span limit in claim 1; claim 2 orthogonal adjacency; claim 16 base award x positions. US11468746: only dependent claims 19-20 (span-based base award) were visible.
- Other: LNW US20250078626A1 (pending, priority 2023-09-01) concerns reel symbols that are clusters of cash-value symbols that disband into the grid; different mechanic [S5, V].
- Why it matters: our rule (5+ same symbols, orthogonal adjacency, award from size, wild substitution) maps onto the shape of US12094305 claim 1 as summarized. Validity vs earlier art (Power Pays adjacency awards, IGT priority 2000, expired per Google [S11, V]; marketed cluster games) and claim scope are attorney questions, not ours.
- Design-arounds (non-legal opinion, each changes math and needs the optimizer): (a) pay by SHAPE or PATTERN (L, T, plus, row of 4) rather than by the count of matching positions; (b) pay along a connected PATH or "wire run" from an anchor (fits the bomb-wire theme), award from run length; (c) let a position count in more than one winning group (e.g. wild or linked cells), which literally departs from "no position shared by multiple clusters" but does not remove the "adjacent same symbols, award from quantity" shape; (d) keep the award flat per symbol tier and use size only as a gate. None is a claimed safe harbor.

### 3.2 Tumble / cascade
- Anchor: US7357713B2, IGT/PTT, priority 2001-11-06, Google "expired", adj. exp. 2023-11-17 [S6, V]. Claim 1 (visible gist): matrix of at least 3x3, check winning patterns, award, remove winning symbols, replace, repeat until no winning outcome. This is the generic tumble loop, now old. Medium-strong for the bibliographic data; claim gist medium.
- Active refinements: IGT US8105151B2 (priority 2008-07-02, exp. 2029-04-28): empty positions can be filled with a designated special symbol such as a wild [S7, V]; IGT US9437084B2 (priority 2008-11-14, exp. 2029-04-30): cascading with stacked symbols on independent reels [S8, V; claims not visible]. US8574059, US8690660, US10607448 (multi-sided symbols): [C], titles only. US10410463 (special-symbol removal in cascade) and US12288440 (cascade feature): [S], not read.
- Our design avoids wild creation on refill (the case of US8105151). Plain refill from the top looks like the expired anchor, but claims of the active families were not read.
- Design-arounds (non-legal): keep refill symbols from the normal pool; avoid stacked independent reels and multi-sided symbols; consider refilling by sliding in from a side, or leaving holes, instead of gravity from the top.

### 3.3 Removal of non-winning symbols / "bomb" (relevant to the bomb-timer wire)
- US8192275B2, WMS now LNW, priority 2006-05-04, filed 2007-05-03, granted 2012-06-05, Google active, adj. exp. 2029-07-13 [S9, V]. Abstract: when the outcome includes a winning combination, at least one symbol NOT part of it is removed and remaining symbols move to the vacated position. Description embodiment: a bomb marker on a symbol explodes it. Claims not visible.
- Related application US20120238348A1 (abandoned): claim 1 (summary): in response to a winning combination, remove a non-winning symbol; the others move in; the removed symbol is marked by a subscript symbol; dependent claim 9 says new symbols enter [S10, V].
- Difference we can state: our blast is triggered when the board is DEAD (no win), removes cells along a pre-displayed wire, and does not create anything. The summarized claims are conditioned on a winning outcome. Whether that distinction holds is for the attorney.
- Design-arounds (non-legal): keep the trigger as a dead board plus a timer, never as a consequence of a win; do not mark individual symbols with a bomb badge (the wire is a board overlay, not a symbol attribute); keep removal separate from the win-removal step.

### 3.4 Variable reel height, ways to win, Megaways-like
- BTG: press says the Megaways "random reel modifier" is "US patented" and trademarked, licensed to Red Tiger, Blueprint, iSoftBet, Storm Gaming, Playzido [S17, weak]. No patent number, claims, filing date, family or expiry found; sources conflict on Evolution's acquisition date (2021 vs 2022). Press places debut c.2015 (Dragon Born). Do not infer expiry.
- US20210241570A1 (BTG, inventor N. Robinson, priority 2020-01-31, ABANDONED after an office action): large cells subdivide into smaller cells as matches clear (4x4 to 8x8), cited by Push Gaming, IGT, LNW, Double D Holdco [S16, V]. Not Megaways.
- Neighbour art, all by others: IGT US8012011B2 (priority 2005-08-26, adj. exp. 2028-12-02) and US8562416B2 (adj. exp. 2032-04-21): independent reels, ways = product of active positions per column; description says the number of active positions can be predetermined, RANDOMLY determined, wager-based or status-based [S12-S13, V; claims not visible]. US8721428 (number of positions per column varies with wager) [S40]. Aristocrat Reel Power family (US9558634 etc., 243 ways, player picks reels) [S39]. Aristocrat US11151842 "switchable gaming states" (priority 2019-08-30, exp. 2040-01-30): description lets symbol-position counts differ per reel and between base and bonus [S15, V; claims not seen]. Konami US12211342 (blocks of variable positions, oversized symbol) [S41].
- Nolimit City xWays/xNudge: press says "trademarked", one Swedish article says "patented"; no number found [S38, weak].
- Design-arounds (non-legal): fixed shape per MODE (set by the mode, same every round); heights that change only as a deterministic consequence of removals, never a random per-spin modifier; pay by cluster, never by "ways"; do not use the word Megaways or xWays.

### 3.5 Persistent multipliers (global and per position)
- Expired anchors: US8021224B2 (PTT, priority 2001-05-09, Google "expired" 2023-05-11): free-spin streak multiplier starting at 1, rising per consecutive win, reset after the streak; snippet says it caps at 100 [S18, V; cap is snippet-only]. US7147559B2 multi-spin win multiplier [C, S43]; US7666083 IGT expired 2025-10-01 [C]; US6004207A incremental pay-off multiplier [S43]. US7258611B2 / US8029358B2 free-game multiplier that changes each game: status not checked [S].
- Active art tied to a held or per-position state: US8197328B2 (Atronic/IGT, priority 2008-09-25, adj. exp. 2031-04-13): special symbol stays until used in a win, award multiplier rises per game it is held [C; US20100075737 seen in snippet, S19]. US7695365B2 (WMS, priority 2004-09-10, adj. exp. 2027-03-22): a symbol keeps a changed function for several arrays [C, S19].
- Our Mission Meter: global, x1 start, +8 per winning step, cap x100, persists through the bonus, no symbol is held. Closest shapes found are expired. No modern studio-specific patent (Pragmatic, Push, Hacksaw) on global multipliers was found; absence proves nothing.
- Design-arounds (non-legal): keep the multiplier a board-level counter drawn as a gauge, not attached to a symbol; avoid per-position multipliers and multipliers that grow because a symbol is held; avoid random conversion of a symbol into a persistent multiplier; step and cap are free to tune.

### 3.6 Wilds: sticky, expanding, walking
- IGT US8277307B2 expanding and rolling wilds: priority 2006-11-08, Google "active", anticipated expiry 2026-11-08 (about two weeks from today; verify) [S20, V]. Disclosure: wild plus a trigger symbol on one reel expands; trigger sets the number of moves to random reels. Claims not visible.
- Expired per Google: IGT/PTT US7758414B1 "Directional Wilds" (priority 2002-09-20, exp. 2025-08-06; claim 1 gist: wild expands in marked directions, pay after all wilds finish) [S21, V]; Aristocrat fixed-wild family US20130184058A1 / US9858762B2 (priority 2000-03-31, exp. 2021-03-23, lapse 2022) [S22, V]. Older roaming-wild WO1997032285A1 and US6311976B1 [S]. Re-spin and re-pay US7252589B1 [S], status unchecked. Held-wild reels US11741786B2 [S], status unchecked.
- NetEnt Starburst-style expanding wild with respin: no patent found (weak).
- Design-arounds (non-legal): wilds that exist for one evaluation and do not persist, move or trigger a respin; avoid "wild + trigger symbol sets number of moves"; prefer substitution-only wilds.

### 3.7 Hold-and-spin / respin (highest enforcement signal)
- Aristocrat: US10629030B2 "with mystery symbols" (priority 2017-08-09, exp. 2038-08-09) [S23, V]; US11551509B2 (priority 2020-02-11, exp. 2040-05-23): description: configurable symbols stay, spin counter resets when a new one lands, free-game count depends on how many were held; dependent claims 17-20 mention a modifier adding rows, columns or a second matrix [S24, V]; US11625982B2 "with reel expansion" (priority 2019-08-22, exp. 2040-02-28), claim 15 (summary): value-carrying configurable symbols, threshold starts the feature, symbols stay, a trigger symbol expands the active area by one row or column, repeat [S25, V]; US11798368B2 (priority 2020-02-19, exp. 2041-02-10): player chooses an option that sets free games and the threshold of configurable symbols [S26, V]. Also US12236754, US11551508, US12424064 [C].
- Enforcement signals: Aristocrat won a preliminary injunction on TRADE-SECRET claims (not patents) against L&W over Dragon Train on 2024-09-23 [S28, V]; a press snippet reports a later settlement (LNW pays $127.5m, stops two games) [S29, weak]. Ainsworth signed a royalty-bearing licence to Aristocrat gameplay patents including the Hold and Spin family on 2026-08-14, AU$8.5m over 3.5 years, Australia [S27, V]. Australian press describes a long fight over whether Lightning Link claims are patentable subject matter; two snippets describe the outcome inconsistently [S42, weak].
- Others: symbol-locking and respin patents US10217316, US10872500, US10304290 [S], not read.
- Design-arounds (non-legal) if a "collect" bonus is wanted at all: no respin counter that resets; announce a fixed number of steps; value fixed per symbol, no mystery value revealed later; free-game count not derived from held symbols; no pre-bonus option menu linking free games to a symbol threshold; state lives on a board overlay, not on symbols that "stay". Even so, attorney first.

### 3.8 Pick-a-bonus / selection screens
- Expired anchors: US7959508B2 Atronic/IGT (priority 2002-05-14, exp. 2024-01-05): concealed values, limited picks, shuffled value list [S31, V]; US7867074B2 IGT (priority 2001-03-30, exp. 2023-11-01) [S32, V]. IGT "The Munsters" pick game is described as earlier art inside US6852028 [S].
- Newer shapes seen only in snippets: US8465362B2 (time-limited choice among free-spin/multiplier offers that change over time) [S33], US6561904B2 (free spins by masked selection) [S], US8690664B2 [S]. Status not checked.
- Platform fit: the outcome is pre-computed, so a pick screen is cosmetic (reveal of a predetermined prize) or a set of separate modes. A cosmetic reveal must not imply skill or a real choice (responsible-gaming rule). The risky variant is a real option menu that sets free games vs threshold (US11798368).
- Design-arounds (non-legal): separate modes for separate bonuses (each a distinct buy), cosmetic "briefing" reveals, no time-limited offers.

### 3.9 Symbol-collection meters
- Aristocrat US12437612B2 "Persistent collection feature" (priority 2021-11-17, granted 2025-10-07, exp. 2043-06-23): scatters increment a per-reel counter; at a threshold the reel turns into a wild reel [S34, V; claims not visible]. WMS US7695365 persistent symbol function [C]. Persistent-meter and collect-cards patents US11043082, US8030078 [S].
- Our Mission Meter counts winning steps. Closest overlap would be a meter fed by scatters or collected symbols per reel, or a meter whose threshold converts a reel or cell.
- Design-arounds (non-legal): feed meters from events (steps, cascades), not from symbols; no per-reel counters; no threshold that converts a reel to wild.

### 3.10 Grid growth, row/column expansion, grid changes per mode
- Everi (ex Multimedia Games) US8602868B2 (priority 2011-09-13, granted 2013-12-10, exp. 2031-09-25): claim 1 (summary): base grid with paylines; processor decides to expand; reels expand outward while spinning; new paylines for added positions; repeated expansions [S14, V]. Aristocrat US11625982 claim 15 (above) and US10964173 claim 15 (cluster plus expansion of display positions) [V]. US11551509 dependent claims add rows, columns or a second matrix [V].
- Different from our need: a grid chosen per mode and fixed for the round. Aristocrat US11151842 (active to 2040-01-30) describes different position counts in base vs bonus game; its claims were not seen [S15].
- Design-arounds (non-legal): choose each mode's grid at mode level, declared once at the start of the book and never changed in the round; avoid growth triggered by a symbol landing; avoid "new paylines for added positions"; if growth is wanted, make it a visible, deterministic consequence of a meter step rather than a symbol trigger.

### 3.11 Bonus buy / direct entry
- Aristocrat "Gaming machine with buy feature games" US8475256B2 (priority 1999-08-25, expired 2022-07-19) and US8562408B2 (expired 2020-08-23): claim 1 (summary): selector for base wager plus additional wager component, feature eligible but NOT guaranteed, benefit scales with overall wager; free games count depends on the base component [S35-S36, V]. US8038524 (expired 2024-10-18) and US9685046 (priority 2011-02-03, active to 2033-01-31) [C]. US20130288782A1 purchase price unlocks a bonus function [S].
- Secret Entrance is a direct, guaranteed entry at 100x with a 50-unit minimum and a confirm dialog, with no chance-bearing extra wager and no tiered wager. That differs from the summarized claim shape. Keep it that way: do not add a chance element or wager tiers without counsel.
- Jurisdiction flags on buy are a compliance question handled elsewhere (docs/STAKE_COMPLIANCE.md).

## 4. Application to the new brief (several bonuses, varied grids, original mechanics)
| Brief item | Patent view | Suggestion |
|---|---|---|
| Several bonuses | Fine if each is a separate mode or a separate trigger, not a player menu that sets spins vs threshold (US11798368 shape) | One mode per bonus, each with its own buy price and RTP-equal tuning |
| Different grid per bonus | Mode-level fixed grids look most conventional; mid-round growth tied to symbols is where Everi/Aristocrat claims sit | Declare grid in the first book event; no mid-round growth |
| Irregular grid (holes, columns of different height) | Random per-spin heights approach the Megaways description (claims unknown) | Keep irregular shapes static per mode or caused by removal only |
| Bomb / wire effects | Nearest is US8192275 family; our trigger and removal rule differ | Keep dead-board trigger and board-level wire overlay |
| Cluster base game | Aristocrat cluster family is the main open question | Show it to counsel FIRST; prepare a shape- or path-based fallback paytable |
| Multipliers | Global meter looks comparatively open | Keep global; no per-cell; no held symbols |
| "Original" mechanics | Any mechanic with a held symbol, a counter reset, a collection counter per reel, or a random modifier on reel size sits near active claims | Prefer board overlays and event-driven state to symbol-attached state |

## 5. Mechanics that look comparatively open (relative only, not cleared)
1. Generic tumble with normal-pool refill (expired anchor 2001; refinements avoided).
2. Global multiplier meter rising per winning step, persisting through free spins, no held symbol (several expired anchors; shallow search).
3. Scatter-count free spins with a fixed ladder of spin counts and retrigger (no specific patent found; weak).
4. Cosmetic pick or reveal of a predetermined prize (expired anchors 2023-2024), with separate modes instead of a real player menu.
5. Static per-mode grid shapes (market practice; confirm against US11151842).
6. Substitution-only or single-evaluation wilds (directional and fixed-wild anchors expired; IGT expanding-rolling wild due to lapse about 2026-11-08 per Google).
7. Direct guaranteed bonus purchase at a fixed price (claim shapes found rely on a chance-bearing extra wager; two anchors expired).
8. Board-overlay effects that are drawn ahead of time (telegraphed wire path): no patent found, a negative result only.

## 6. Must go to an attorney
1. Cluster pays vs Aristocrat's cluster family (US10964173, US11468746, US12094305, US12536877, pending continuation): do the independent claims read on min-5 orthogonal clusters paid by size, with wild substitution? Validity and prior art (Power Pays, marketed cluster games), and licensing options.
2. Bomb-timer blast vs US8192275B2 and its family, and the IGT cascade families (US8105151, US9437084, US8574059, US8690660, US10607448, US10410463, US12288440). Claim text not read.
3. Any hold-and-spin, locked-value, respin-counter or option-menu bonus (Aristocrat US10629030, US11551509, US11551508, US11625982, US11798368, US12236754, US12424064). Recommend not building one.
4. BTG Megaways: obtain the patent number(s), claims, expiry and non-US family (EP/AU), and decide if any static irregular grid is acceptable. Same for IGT US8012011 / US8562416 ("randomly determined" active positions).
5. Mid-round grid growth (Everi US8602868; Aristocrat US11625982, US10964173) and per-mode grid changes (Aristocrat US11151842).
6. Per-reel collection counters and wild-reel conversion (US12437612).
7. Per-position or held-symbol multipliers (US8197328, US7695365).
8. Feature-buy variants if any chance element or wager tier is added (US9685046).
9. Non-US counterparts (EP, AU, GB, CA), trademarks ("Megaways", "xWays", "xNudge", "Cluster Pays", "Avalanche", "Tumble", "Lightning Link"), and Section 101 style invalidity arguments. For context only: the Federal Circuit affirmed ineligibility of casino-game rule claims in Savvy Dog v. Pennsylvania Coin (2024-03-21) [S30, V], which suggests rule-only claims are exposed to challenge, but that is not a clearance and does not bind other countries.

## 7. What was NOT done
- No reading of the official claims for most families (summaries only). No Espacenet, no EP/AU/GB/CA search, no litigation docket search, no assignment or maintenance-fee check.
- The BTG Megaways patent could not be identified.
- No search for Pragmatic Play, Push Gaming, Hacksaw, Relax patents beyond one query returning nothing; absence is not evidence.
- Search tool results often included low-quality affiliate sites; only patent pages, USPTO PDFs and trade press were used for claims.

## 8. Sources
Patent pages (patents.google.com), all fetched this session unless marked:
- S1 https://patents.google.com/patent/US12094305
- S2 https://patents.google.com/patent/US10964173B2/en
- S3 https://patents.google.com/patent/US11468746B2/en
- S4 https://patents.google.com/patent/US12536877B2/en
- S5 https://patents.google.com/patent/US20250078626A1/en
- S6 https://patents.google.com/patent/US7357713B2/en
- S7 https://patents.google.com/patent/US8105151
- S8 https://patents.google.com/patent/US9437084
- S9 https://patents.google.com/patent/US8192275B2/en
- S10 https://patents.google.com/patent/US20120238348
- S11 https://patents.google.com/patent/US7744458
- S12 https://patents.google.com/patent/US8012011B2/en
- S13 https://patents.google.com/patent/US8562416
- S14 https://patents.google.com/patent/US8602868B2/en and https://patents.google.com/patent/US20130065663
- S15 https://patents.google.com/patent/US11151842B2/en
- S16 https://patents.google.com/patent/US20210241570A1/en
- S18 https://patents.google.com/patent/US8021224
- S20 https://patents.google.com/patent/US8277307
- S21 https://patents.google.com/patent/US7758414B1/en
- S22 https://patents.google.com/patent/US20130184058A1/en
- S23 https://patents.google.com/patent/US10629030B2/en
- S24 https://patents.google.com/patent/US11551509
- S25 https://patents.google.com/patent/US11625982
- S26 https://patents.google.com/patent/US11798368
- S31 https://patents.google.com/patent/US7959508
- S32 https://patents.google.com/patent/US7867074B2/en
- S34 https://patents.google.com/patent/US12437612
- S35 https://patents.google.com/patent/US8475256 ; S36 https://patents.google.com/patent/US8562408
News, law, snippets:
- S17 BTG Megaways press (no patent number given): https://casinobeats.com/2018/10/08/btg-licenses-us-patented-megaways-to-red-tiger/ ; https://www.intergameonline.com/igaming/news/big-time-gaming-licenses-megaways-to-isoftbet ; https://www.gamblinginsider.com/press/6028/btg-licenses-its-u-s-patented-mechanic-and-megaways-trademark-to-fellow-supplier (403 on fetch; search snippet only)
- S19 https://patents.google.com/patent/US20100075737 and https://patents.google.com/patent/US20060068881A1/en (search snippets; status in [C])
- S27 https://www.intergameonline.com/land-based-gaming/news/aristocrat-and-ainsworth-forge-patent-licence-agreement
- S28 https://ggbmagazine.com/article/weekly-feature-aristocrat-secures-preliminary-injunction-against-lw-over-dragon-train
- S29 https://www.gamblinginsider.com/news/102862/aristocrat-light-wonder-settle-dragon-train-lawsuit (403 on fetch; search snippet only)
- S30 https://www.stoneslaw.net/federal-circuit-affirms-section-101-invalidity-of-tic/
- S33 https://patents.google.com/patent/US8465362B2/en (snippet only)
- S38 https://www.esports.net/se/casino/nolimit-city-licensierar-ut-xmechanics-till-nya-studion-sneaky-slots/ ; https://casinobeats.com/2020/08/21/spearhead-studios-to-licence-nolimit-city-mechanics/ (snippets)
- S39 https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9558634 (snippet, Reel Power)
- S40 https://patents.google.com/patent/US8721428 (snippet)
- S41 https://patents.google.com/patent/US12211342 (snippet)
- S42 https://www.lawyerly.com.au/aristocrats-gaming-patent-win-stands-after-high-court-denies-special-leave/ (snippet title only)
- S43 https://patents.google.com/patent/US7147559B2/en ; https://patents.google.com/patent/US6004207 (snippets)
- Carried [C] from repo: docs/PATENT_SCREEN.md, docs/PATENT_BRIEF.md, docs/research/3_patents_free_space.md
