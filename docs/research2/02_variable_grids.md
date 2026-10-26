# 02 Variable and dynamic grids: prior art and design space (Agent Mambo v2)

Date 2026-10-26. Screening aid, NOT legal advice. Nothing here says a mechanic is free, cleared or safe: a human IP attorney must review. "Found nothing" means exactly that. Reddit was not reachable and is not used. Evidence tags: **S** = primary page read (patent page, regulator page), **M** = trade press or search-result summary of a patent listing, **W** = affiliate/review site or second-hand. Google Patents pages come through a summariser and were often truncated; legal status and expiry dates are Google's own estimates, not legal facts.

## 0. Bottom line
- Varying the playfield is a crowded family. Plain "array gets bigger on a trigger" is old (a 2000-priority grant, ceased) but newer refinements are patented and active (2034-2043 estimates). Random per-reel heights (Megaways) is a branded, licensed, trademarked family. Rotating boards look like the densest area (several active filings plus released titles). Dual boards are common in recent releases.
- Our engine can do it cheaply if the layout is a first-class book event: a `layout` event before `reveal`, geometric rows in every event, per-layout weights pinned with a force-record key (as `bonusTier` already is).
- Measured on the real strips (proxy, section 3): cell count and connectivity decide everything. Edge cuts are cheap (-15%), interior holes are fatal (-60% or worse), one extra row is +30-35% win mass per spin, tube links +36-40%, hex adjacency +170%.
- Recommended package, in order: **Floor Plan** (base and bonus), **Skyscraper Floors** (bonus growth), **Pneumatic Post** (adjacency tubes), then **Breach** and **Dumbwaiter Gravity**. Avoid random per-reel heights, rotation, mirrored columns, cell subdivision.

## 1. What our engine and front end allow (read in the repo)
- Math (`math/games/agent_mambo`): 6x5, `num_rows=[5]*6` is a static per-reel list, also exported as `numRows` in the published index (`math/src/write_data/write_configs.py:250`). The SDK already tolerates different rows per reel (`board.py` loops `num_rows[reel]`; `reveal_event` takes column length from `len(board[reel])`), but: `tumble.py:34` raises if a column length differs from `num_rows[reel]`; `Cluster.get_neighbours` adds `(reel+-1,row)` without a bounds check against the neighbour column, so a shorter neighbour column raises IndexError; `make_fuse_path` uses `num_rows`. So per-book shapes need overrides in the game subclass (geometry-aware `get_clusters`, a per-book `num_rows`, compaction map for holes). `math/` was not edited in this phase.
- Events: `reveal.board` is padded (top pad + rows + bottom pad); `tumbleBoard.explodingSymbols` uses padded rows (row+1); fuse events use visible rows 0-4 (unpadded). Any new event should use geometric visible rows, like the fuse events.
- Hit and bonus facts to keep in mind (`MATH_REPORT.md`): base hit 29.07% (a lookup-table weighted number; the unweighted natural hit rate is lower, see section 3), free spins pay in 30.5% of spins, 78.7% of the bonus RTP is paid at meter x20 or more, wire blasts fire in 5.9% (base) / 3.7% (bonus) of spins and only 4-5% of blasts are followed by a paying re-evaluation, so the wire is mostly spectacle today.
- Front end (`frontend_mambo/src/render`): `COLS=6, ROWS=5` are hard-coded in `index.js`, `fuse.js`, `wire.js`, `devbooks.js`; the SVG outline layer uses `viewBox 0 0 COLS ROWS`. A shape-driven board is a prerequisite for every concept below. Viewports in the contract: 1024x576, 800x450, 400x225, 425x812 (touch); turbo-aware, skippable animations are mandatory.
- Platform: outcomes are pre-computed books, so a layout can only be (a) drawn by the book, or (b) a separate mode (<= 20 modes, same RTP in range 90-98%). A purely cosmetic player choice is allowed; a choice that changes odds is not, except as a mode.

## 2. Survey: how existing slots vary the playfield

### 2.1 Families, examples, status
| Family | Examples found | Ev. | Common or branded? |
|---|---|---|---|
| Random reel height per spin | Megaways (BTG): 2-7 symbols per reel per spin, described by trade press as US-patented, licensed to Red Tiger, Storm, Playzido, iSoftBet, with a MEGAWAYS trademark. Patent number NOT found (the IGT US12424059 hit is unrelated). [1][2][3][4] | M | Branded and licensed. Avoid |
| Variable height with cascades | GemPops / xPops (AvatarUX): reel height varies per spin (3 to 7 per the article), reels grow with wins, per-reel multiplier [5] | M | Branded; patent status unknown |
| Grid growth in a bonus | Fortune Globe Hold and Win (3 Oaks): 5x4 grows to 8 rows at 10/15/20/25 collected symbols, row multipliers up to 10x [6]. Pirots (ELK): grids of 6x6 to 8x8 reported only by unreliable review pages [7] | M / W | The idea is "well-known" per an AGS patent text [8]; refinements patented (2.2) |
| Shaped or non-rectangular grids | No current online slot with a fixed triangular or diamond silhouette found (negative result only). Old patent art for paylines on such arrays [9] | S | Old art, expired (est.) |
| Blocked or dead cells | No commercial slot found. A 2019-priority community-slot patent describes "barriers, holes, dead zones" and hexagonal fields in its description [10] | M | Unknown |
| Multi-board, dual or mirrored | Macaco Millionario (PopOK, Feb 2026): extra 5x3 set in bonus, x20 on double wins [11]; Stakelogic's Candy Links Bonanza follow-up (article Feb 2025): two 5x5, one plays, one collects [12]; Twin Spin style mirrored adjacent reels and Mirror Joker (Play'n GO) [13] | M / W | Common in 2025-26 releases; mirrored-column patents exist |
| Rotating boards | Gods of Giza (Genesis, June 2015): full 360 degrees, checks at each quarter turn, 32 evaluations [14]; RotoGrid (Hacksaw): 90-degree turns, release date 2024-06-27 per a catalogue site, rule details only from review snippets [15] | M / W | Branded and patent-dense (2.2) |
| Splitting symbols or cells | Temple Stacks Splitz (Yggdrasil, Jan 2020): mystery stacks split into 3-9 symbols, up to 248,832 ways [16]; BTG's own application: cleared large cells subdivide into small cells, 4x4 to 8x8 [17] | M / S | Branded; application abandoned |
| Shifting rows (nudge-like) | Earlier repo screen of "Cave-In Shear" (weak math, nudge overlap), see `docs/ORIGINAL_FEATURES.md` | n/a | Old art |

### 2.2 Patent anchors (screening only; independent claims often not visible)
| Ref | What the page says | Owner / priority / status (Google est.) | Ev. |
|---|---|---|---|
| US6544120 (reissue RE46413) [18] | Initial array of randomly selected symbols; on a trigger additional symbols join the array so combinations including them pay; claim 4 adds a separate array, claim 17 rows or columns | Ainsworth; 2000-05-22; "Ceased", est. expiry 2021-05-21 | S |
| US11798370, US12266240 [19] | Rows gain symbol positions on a triggering event; expanded grid centre-aligned, each row grows equally both ways, no row more than a set number larger than another; trigger can be a "mystery event independent of symbols" in free games. 12266240 claims NOT read | LNW Gaming; 2020-10-26; active, est. 2041-09-28 | S (11798370) |
| US10102710 [8] | Extra reel symbols reach a prize shown above the base area; text calls expanding reels well-known; claims need prize contact | AGS; 2016-09-01; active, est. 2036-11-09 | S |
| US9378628, US9542796 [20] | Top-ranked symbol of a column fills the column and is copied into other columns; variants with multiple grids. Claims NOT read | Konami; 2014-04-17; active, est. 2034-10-14 | S (abstract) |
| US6676511, EP1114404 [9] | Non-orthogonal / non-rectangular arrays with selectable paylines; claim 1 needs horizontally offset rows | Silicon Gaming, now IGT; 1998-09-16; "Expired", est. 2019-09-16; EP withdrawn | S |
| US8075392 [21] | Rotate the symbol area 90 or 180 degrees after the first payline evaluation, evaluate again | GC2; 2007-09-28; lapsed for fees 2019 | S |
| US9514600 [22] | After a non-winning matrix, rotate a rectangular subset group, evaluate again | Everi; 2014-06-27; active, est. 2035-01-05 | S (claims 1-9) |
| US12412456 [23] | N-by-N matrix rotated so a row-paired symbol becomes column-paired. Claims NOT read | IGT; 2023-06-26; active, est. 2043 | S (abstract) |
| US11138837 [10] | Community slot-style fields with barriers, holes, dead zones, hexagonal positions (description). Claims NOT read | Rspenn LLC; 2019-07-01; active, est. 2040-06-30 | S (description) |
| US20210241570A1 [17] | Large symbols cleared, each cleared cell subdivided into smaller cells; not Megaways | BTG; 2020-01-31; abandoned 2021-10-01 | S |
| US20100173694, US 2023/0290221 [24] | Two games side by side with combined bonus; two grids with a bonus pattern copied between them. Seen only as search summaries | Unknown / Konami | M |
| Aristocrat US11625982 | Hold-and-spin with reel expansion, from `docs/PATENT_BRIEF.md` (second-hand, not re-read here) | Aristocrat | W |

### 2.3 Old and common versus protected (observation, not clearance)
- Likely old or expired: array extension on a trigger (2000 filing), non-rectangular arrays for paylines (1998), area rotation after a first evaluation (2007, lapsed), vertical growth of a grid in a bonus as a general idea.
- Branded, licensed or actively held: Megaways family, rotation families (Everi, IGT, Hacksaw/Genesis titles), LNW row-expansion family, Konami column replication, Aristocrat hold-and-spin expansion.
- Unknown (nothing found): cluster adjacency through linked non-neighbour cells, hexagonal cluster boards with offset columns, per-column gravity directions, a layout list announced as blueprint masks.

## 3. Measured effect of shapes (proxy; read deltas, not absolutes)
Method: standalone Python (`docs/research2/02_gridsim.py`), real `BR0`/`FR0` strips, SDK-style stop windows and tumble refill from the strip, real paytable, wild joins any payer, scatter inert, multiplier fixed at x1, no wire, no meter. 400k spins per shape (extras 200k). Holes: symbols fall past them (column compaction), adjacency is geometric. Natural base hit rate here is 17.8% versus the published 29.07% (the published figure is after lookup-table weighting), so only the relative columns matter. "Mean" = line-pay win per spin, excluding the feature and wire effects.

| Shape (active cells) | Base hit | vs 6x5 | Base mean | vs 6x5 | Bonus hit | Bonus mean | vs 6x5 |
|---|---|---|---|---|---|---|---|
| 6x5 full (30) | 17.8% | | 0.141x | | 23.6% | 0.156x | |
| 6x4 lobby (24) | 13.2% | -26% | 0.097x | -31% | 17.7% | 0.107x | -31% |
| 6x6 (36) | 22.2% | +25% | 0.186x | +32% | 29.1% | 0.210x | +35% |
| 6x7 (42) | 26.3% | +48% | 0.232x | +65% | 34.3% | 0.262x | +68% |
| Atrium, 4 corners cut (26) | 15.2% | -15% | 0.118x | -16% | 19.6% | 0.123x | -21% |
| Pillars, 4 interior holes (26) | 6.6% | -63% | 0.049x | -65% | 7.5% | 0.035x | -78% |
| Centre vault, 2 holes (28) | 10.4% | -42% | 0.058x | -59% | 16.6% | 0.087x | -44% |
| Partition wall with 1 door (26) | 6.8% | -62% | 0.032x | -77% | 12.4% | 0.052x | -67% |
| Skyline 3-4-5-5-4-3 (24) | 13.1% | -26% | 0.100x | -29% | 16.7% | 0.099x | -37% |
| 5x5 (25) | 14.1% | -21% | 0.108x | -23% | 17.9% | 0.115x | -26% |
| 7x7 (49) | 30.9% | +74% | 0.285x | +102% | 39.8% | 0.332x | +113% |
| 4 columns x 8 rows (32) | 18.8% | +6% | 0.150x | +6% | 22.9% | 0.164x | +5% |
| 8 columns x 4 rows (32) | 18.7% | +5% | 0.139x | -1% | 26.0% | 0.176x | +13% |
| 6x5 + 2 random tube pairs | 21.9% | +23% | 0.192x | +36% | 28.1% | 0.218x | +40% |
| 6x5 hex adjacency (6 neighbours) | 34.2% | +92% | 0.379x | +169% | 40.7% | 0.416x | +167% |
| 4x5 core, 2 dark wing columns (static) | 9.9% | -44% | 0.074x | -48% | 12.8% | 0.067x | -57% |
| same, wings light after an edge win | 9.9% | -44% | 0.077x | -45% | 12.7% | 0.073x | -53% |

Reading:
1. Cell count drives mass (one extra row of 6 cells: +25% hit and +32% mean; one row fewer: -26% and -31%); connectivity drives the rest. Edge cuts are cheap, interior holes are fatal (the same 26 cells give 15.2% or 6.6% depending on where the holes are). Plans should cut edges only.
2. Natural scatter mass grows faster than cell count: in the bonus strip the share of boards with 4+ scatters is 0.24% / 0.54% / 0.97% / 1.60% for 4 / 5 / 6 / 7 rows (mean scatters 0.60 / 0.75 / 0.90 / 1.05). Trigger and retrigger odds follow the board size and must be pinned and disclosed per layout.
3. Growth that happens only after a first win barely moves anything: "wings" lift the mean by 4% (base) to 9% (bonus) over the static start and leave the hit rate unchanged. It is a spectacle lever, not a hit-rate lever. The first-board shape sets the hit rate.
4. A weighted plan mix can be neutral by construction. Example (generation weights 50% Open Plan 6x5, 20% Atrium, 12% Lobby 6x4, 12% Annex 6x6, 4% Penthouse 6x7): mean 0.137x vs 0.141x (-3%), hit 17.2% vs 17.8%, mean cells 29.1 vs 30, 4+ scatter share about 0.07% in both (noise level at this sample).
5. Because the books are weighted afterwards, these are natural masses, not final per-layout RTPs; the final layout frequencies and per-layout returns must be measured on the weighted lookup table.

## 4. Design rules for any variable grid
- **Layout is part of the book.** Draw it with the SDK's seeded `random`, emit it before `reveal`, never recompute it in the front end. Pin the share of each layout with a force-record key (`self.record({"layout": id})`, same mechanism as `bonusTier`) so the optimizer cannot drift it, and report final weighted shares.
- **Events (proposed).** `layout {index,type:"layout",id,name,cols,active:[[rows per reel]],tubes:[{a:{reel,row},b:{reel,row}}],floors}` ; `reveal.board` columns have `len(active[reel])` visible symbols plus the two pads; every position in `winInfo`, `fuse*` and new events uses geometric rows; `gridGrow {rowsFrom,rowsTo,newCells,newSymbols,reason,meter}`; `wallBreach {cells}`. The front end must size the board from `layout`, not from constants or `numRows` in the index.
- **Honest presentation.** The shape animation must draw the real layout directly, once. No cycling through other shapes before landing, no lingering on a bigger shape that then resolves smaller: the UK regulator's technical standard says games may not falsely display near-miss results and may not substitute one losing outcome for another [25] (S). The rules page lists every layout and its final weighted frequency; the UI never implies a layout changes the odds in a way the math does not. Same lesson as the roulette-wheel correction in `docs/STAKE_COMPLIANCE.md`: show final, not pre-weighting, probabilities.
- **Responsible-gaming flags.** Layout reveal and growth animations must obey turbo and skip; autoplay and the 100x entry rules stay unchanged; social-casino wording ("play", "win") in all new strings.
- **Constraints preserved.** Paytable values stay multiples of 0.1x, wincap 5000x checks stay inside every growth loop, same RTP (96%) in all modes.
- **Art.** Everything drawn in code, retro 60s cartoon look (flat fills, thick outlines, halftone dots, limited animation), per the user directives file. No generative assets.

## 5. Concepts (8), each with rule, books, visual, math, patent proximity

### C1. Floor Plan (blueprint layouts), base game and bonus
- **Rule.** Each spin, the book names one blueprint: Open Plan 6x5 (30), Atrium (6x5 minus the 4 corners, 26), Lobby (6x4, 24), Annex (6x6, 36), Penthouse (6x7, 42). Proposed generation weights 50/20/12/12/4; bonus weights skewed larger. Holes only on the outer edge (section 3: interior holes starve the game). Same layout for the whole cascade.
- **Books.** `layout` event before `reveal`; per-layout shares pinned by `record`. Needs per-book active rows, geometry-aware clusters, a layout-aware wire path.
- **Visual.** A cyanotype blueprint inks itself on the board (white lines on cobalt, halftone, stamp "FLOOR 7 - TOP SECRET" on the Penthouse), then symbols drop into the outline. One draw-on, skippable, 0.6 s turbo.
- **Math.** Neutral by construction with the example mix (section 3, point 4). Volatility rises mildly; Penthouse carries more scatter and cascade mass, so trigger share per layout must be pinned and disclosed.
- **Patent proximity.** Non-rectangular arrays are old (US6676511, expired est., payline claims). The branded neighbour is Megaways: ours is a short list of named fixed masks on a cluster-pay grid, not an independent random height per reel, but ask counsel whether a per-spin shape from a list reads on a "reel modifier" claim (number not found). Medium.

### C2. Skyscraper Floors (bonus growth)
- **Rule.** The bonus starts on the current 6x5. A new floor (row on top) unlocks when the Mission Meter reaches x25 (6 rows) and x49 (7 rows); thresholds are multiples of the +8 step. Persists for the rest of the feature, including retriggers. Variant: start on a 6x4 Lobby (more drama, weaker early spins).
- **Books.** `gridGrow {rowsFrom,rowsTo,reason:"meter",meter}` right after `updateGlobalMult`; growth between tumble steps is also possible (new top cells filled by a `tumbleBoard`-style `newSymbols`). Deterministic function of the meter: no extra randomness.
- **Visual.** An elevator dial sweeps to the new floor, a crane drops a lit floor strip on top, Mambo steps out of the lift, windows flick on. The strongest "progress you can see" hook in the set.
- **Math.** From section 3: bonus mean per spin x1.35 at 6 rows and x1.68 at 7 rows versus 5 rows; mean scatters +20% / +40%. Since 78.7% of bonus RTP is paid at meter x20 or more, most of the return would sit in grown phases, so the first-order bonus RTP rises well above +25% (estimate from the proxy, low-medium confidence). Pay it back with `gm_step` (8 toward 5-6), thresholds, or fewer FR0 wilds. A feedback loop (wins to meter to floors to wins) thickens the tail: re-fit the 100x entry distribution (30x floor, 5000x pin).
- **Patent proximity.** Trigger-based array expansion: Ainsworth (expired est.), LNW US11798370 (active est. 2041, centre-aligned symmetric row growth), AGS US10102710 (prize contact), Aristocrat reel expansion in hold-and-spin. Ours adds a full-width row on top, trigger is a deterministic meter threshold, no hold-and-spin, no centre alignment. Persistent expansion state that is not tied to symbols is a question for counsel. Medium-high.

### C3. Pneumatic Post (adjacency tubes)
- **Rule.** Each spin shows 0-2 brass tube pairs (bonus: 1-3). Cells at the two mouths of a tube count as neighbours for cluster formation (wilds too). Mouths are board coordinates, they stay for the cascade. Placement from a list of templates with a minimum distance so the link is never trivially adjacent.
- **Books.** `layout.tubes` list; cluster search uses extra edges. `winInfo` positions list the real cells; an optional `tubeUsed {a,b}` helps the renderer play the capsule.
- **Visual.** Pipes slide in with a hiss, a capsule whooshes along the pipe when a winning cluster crosses it; the cluster outline is drawn through the pipe so the rule is readable at 400x225.
- **Math.** Two random pairs: +23% hit and +36% mean (base), +19% / +40% (bonus); one pair is roughly half. A direct, tunable lever by pair count and weights. Clarity is the main risk.
- **Patent proximity.** No slot with cluster adjacency through linked non-neighbour cells was found (negative result only, not clearance). Nearest families: non-orthogonal arrays (US6676511, expired est.) and column replication / linked columns (Konami, active est. 2034). Unknown.

### C4. Breach (walls that the wire blows open)
- **Rule.** Some plans have sealed "ceiling" tiles on top of a few columns. The bomb-timer wire may end at one; when it blasts, the walls open and new symbols fall into the opened cells (the board grows from 26 to 28-30 mid-spin). Wild creation stays off.
- **Books.** Reuse `fuseBlast`; add `wallBreach {cells}` then a `tumbleBoard`-style fill. Wall cells are only ever on top of a column, so the SDK's insert-at-top tumble still works.
- **Visual.** Plaster and brick pieces in cut-paper style, a camera shake, a "KA-BLAM" balloon, light spills from the new room. Gives the wire a visible consequence.
- **Math.** Weak lever (section 3, point 3): growth after a first win moves the mean by about 4-9% and the hit rate not at all. The real levers remain wire fire rate (5.9% / 3.7%) and what the blast adds. Treat it as spectacle with a small RTP contribution; measure in the SDK.
- **Patent proximity.** Cell removal by blast exists in the repo already; expansion triggers: same flags as C2. Medium.

### C5. Mission Select (one grid per mode)
- **Rule.** The player picks a mission = a bet mode with a fixed board, same price and RTP: Embassy 6x5 (today), Tower 4x8 (32 cells, +5-6% mass), Casino Floor 8x4 (32 cells, -1% to +13%), Penthouse 7x7 (49 cells, about x2 mass, needs a re-tuned paytable). Up to 20 modes allowed; 3-4 is plenty.
- **Books.** No per-spin shape: the shape is static per mode. One lookup table, strips and optimization run per mode; the secret-entrance mode stays single.
- **Visual.** A "mission briefing" carousel with a mini blueprint per mission, then the board is drawn to that blueprint. Tower fits the portrait viewport, Casino Floor fits landscape.
- **Math.** Legit way to give real choice; each mode must hit 96% and a consistent max win. Cost: separate strips and a full optimizer pass per mode, 8-column strips for Casino Floor (a column-count change touches fuse and wire code too).
- **Patent proximity.** Player choice between modes of the same game is plain product structure; the earlier Aristocrat player-choice claim is about hold-and-spin features (PATENT_BRIEF). Low-medium.

### C6. Dumbwaiter Gravity (per-column fall direction)
- **Rule.** In some plans, alternate columns fall upward (dumbwaiter lifts) so refills enter from the bottom; chosen by the layout.
- **Books.** A `gravity` array inside `layout`; `tumbleBoard` carries `newSymbols` per column with a side flag.
- **Visual.** Mixed up/down falls, tiny lift cabins on the column rails, a satisfying zip effect on cascades.
- **Math.** Expected to be statistically neutral on i.i.d. refills (not simulated); changes only which cells touch after a tumble. Cheap variation without RTP risk.
- **Patent proximity.** Not searched specifically; reverse-direction cascades may exist in the field. Unknown.

### C7. Honeycomb Bug Sweep (hex adjacency, bonus variant)
- **Rule.** A special bonus board with offset columns so each cell has 6 neighbours. Clusters of 7+ (raise the minimum) pay on a re-cut table.
- **Books.** Geometry in `layout` (`type:"hex"`), adjacency in the cluster override, hex-aware tumble columns.
- **Visual.** Op-art honeycomb of surveillance bugs, hexagonal cells with thick outlines; very distinctive.
- **Math.** +92% hit and +169% mean at the same paytable (section 3): the table, the minimum cluster and the strips all need a rewrite; heavy.
- **Patent proximity.** Offset-row layouts for paylines are expired art (US6676511); hex fields appear in a community-slot patent description (US11138837, active est. 2040, claims unread). No hex cluster-pay slot checked. Unknown to medium.

### C8. Double Agent (twin boards, bonus)
- **Rule.** Second 6x5 board beside or under the first, one shared meter, independent draws; both boards pay.
- **Books.** Two `reveal`s, board-tagged events; book size roughly doubles.
- **Visual.** Split screen with a surveillance-monitor frame. At 400x225 each board is half-size; portrait needs a vertical stack.
- **Math.** About double the win mass per spin: paytable or strip cut needed. If the boards were mirrored or correlated, the regulator's independence language for simulated devices becomes an issue [25]; use independent draws.
- **Patent proximity.** Crowded: PopOK 2026, Stakelogic 2025, a 2010 side-by-side application, Konami grid-copy filings, mirrored-column patents. High.

## 6. Ranking and package
| Rank | Concept | Attraction | Originality | Math fit | Build cost | Patent proximity | Why |
|---|---|---|---|---|---|---|---|
| 1 | C1 Floor Plan | high | medium | neutral by mix | medium (shared infra) | medium | Exactly the "variable grids" brief, telegraphed, fits base and bonus, builds the infrastructure the others reuse |
| 2 | C2 Skyscraper Floors | highest | medium | needs rebalancing | medium | medium-high | Most visible bonus progress; strong meter synergy; tail risk to manage |
| 3 | C3 Pneumatic Post | high | high | clean lever | medium | unknown | Most original rule, small code, reads well if the cluster outline crosses the pipe |
| 4 | C4 Breach | medium-high | medium-high | weak lever | medium | medium | Gives the wire a purpose; spectacle first |
| 5 | C6 Dumbwaiter Gravity | medium | medium | neutral | low | unknown | Cheap variety, no RTP risk |
| 6 | C5 Mission Select | medium | low | good | high (per-mode math) | low-medium | Only legitimate route to player choice |
| 7 | C7 Honeycomb | high | high | rewrite | high | unknown-medium | Great look, heavy rewrite |
| 8 | C8 Double Agent | medium | low | halve the table | high | high | Crowded and a screen-space problem |

Suggested build order: (1) shape infrastructure (layout event, shape-driven renderer, geometry-aware clusters, force-record `layout`); (2) C1 content; (3) C2 in the bonus; (4) C3 tubes as a layout flag; (5) C4 and C6 as polish. C5, C7, C8 are separate projects.

Avoid: random independent height per reel each spin (Megaways family); board rotation (three active filings plus released titles); mirrored or replicated columns (Konami, Twin Spin, Mirror Joker); subdividing cleared cells (BTG application); growth of a single column after each win as the headline (GemPops family).

## 7. Open questions for an IP attorney
1. BTG's Megaways patent: number, claim scope, term; does a per-spin layout drawn from a short list of fixed masks read on it?
2. Do US11798370 / US12266240 (LNW) or any family member cover full-width row growth on a deterministic meter threshold in free games?
3. Konami US9378628 / US9542796 and the multi-grid variants: do the claims reach anything in C3 or C8?
4. Do hold-and-spin claims (Aristocrat, incl. US11625982) reach persistent board growth that is not tied to a held symbol?
5. Does any family cover cluster adjacency through linked non-neighbour cells, or hex cluster boards (US11138837 claims)?
6. Trademark checks (EUIPO, INPI, USPTO) for any layout names such as "Penthouse", "Floor Plan", "Pneumatic Post".
7. Stake side (not found in public docs): maximum book size, whether `numRows` in the index must match the shapes, and whether review accepts per-spin shapes.

## 8. Sources
[1] https://www.gamblinginsider.com/press/6028/btg-licenses-its-us-patented-mechanic-and-megaways-trademark-to-fellow-supplier (M; patent number not given)
[2] https://casinobeats.com/2018/10/08/btg-licenses-us-patented-megaways-to-red-tiger/ (M)
[3] https://europeangaming.eu/portal/press-releases/2018/09/20/28701/big-time-gaming-licences-patented-mechanic-to-storm-gaming/ and https://www.playzido.com/news/playzido-licences-big-time-gamings-patented-megaways-mechanic (M)
[4] https://uspto.report/TM/88593115 (MEGAWAYS trademark listing, seen only as a search result, M)
[5] https://www.intergameonline.com/land-based-gaming/avatarux-adds-new-mechanic-in-gempops-slot (M; Nov 2023)
[6] https://igamingbusiness.com/company-news/3-oaks-gaming-reveals-mystical-wins-in-fortune-globe-hold-and-win (M; Oct 2024)
[7] https://www.gambling.com/ca/online-casinos/slots/pirots (W; page had no mechanic text; other Pirots 3 pages contradicted each other)
[8] https://patents.google.com/patent/US10102710 (S, summary, truncated)
[9] https://patents.google.com/patent/US6676511 and https://patents.google.com/patent/EP1114404A4/de (S; EP page truncated)
[10] https://patents.google.com/patent/US11138837 (S for the description; claims and abstract not visible)
[11] https://igamingbusiness.com/company-news/meet-macaco-millionario-popok-gamings-new-dual-grid-slot/ (M; Feb 2026)
[12] https://www.intergameonline.com/igaming/stakelogic-follows-up-candy-links-bonanza-slot (M; Feb 2025)
[13] https://www.gambling.com/us/online-casinos/slots/mirror-joker and https://www.fair.org.ua/en/sloty-z-podvijnoyu-sitkoyu-yak-praczyuye-mehanika-dual-reels/ (W)
[14] https://www.intergameonline.com/igaming/products/gods-of-giza-genesis-gaming (M; June 2015)
[15] https://slotcatalog.com/en/slots/twisted-lab-rotogrid (release date, W-M); rule snippet from https://www.gambling.com/us/online-casinos/slots/twisted-lab-rotogrid (W; page text not retrievable)
[16] https://www.intergameonline.com/igaming/news/yggdrasil-releases-first-splitz-igaming-title-temple-stacks (M; Jan 2020)
[17] https://patents.google.com/patent/US20210241570A1/en (S)
[18] https://patents.google.com/patent/US6544120 (S; reissue status not checked)
[19] https://patents.google.com/patent/US11798370B2/en (S, truncated); US12266240 listed at https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12266240 (M, not read)
[20] https://patents.google.com/patent/US9378628 (S abstract; claims not visible)
[21] https://patents.google.com/patent/US8075392 (S)
[22] https://patents.google.com/patent/US9514600 (S, truncated at claim 10)
[23] https://patents.google.com/patent/US12412456 (S abstract; claims not visible)
[24] https://patents.justia.com/patent/20100173694 (page returned 403; summary from a search result, M); Konami application via https://www.verdict.co.uk/konami-group-files-patent-for-a-gaming-machine-with-bonus-pattern-copying-feature/ (M)
[25] https://www.gamblingcommission.gov.uk/manual/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes (S; RTS 7 guidance 7C: no false near-miss display; simulated devices keep real probabilities and independence)
Repo: `math/games/agent_mambo/{game_config,game_events,game_executables,gamestate}.py`, `math/src/calculations/{board,tumble,cluster}.py`, `math/games/agent_mambo/MATH_REPORT.md`, `frontend_mambo/src/render/*.js`, `frontend_mambo/CONTRACT.md`, `docs/PATENT_BRIEF.md`, `docs/research/3_patents_free_space.md`, `docs/STAKE_COMPLIANCE.md`, `docs/ORIGINAL_FEATURES.md`.
Reproduce section 3: `python3 docs/research2/02_gridsim.py 400000 BR0` (and `FR0`); optional 3rd argument filters shape names with `|`.
