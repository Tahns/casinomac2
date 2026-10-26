# Least-encumbered design space (prior-art screening aid, NOT legal advice)

Date 2026-10-26. Method: WebSearch + WebFetch (Google Patents pages return small-model summaries, often truncated; independent claims were mostly NOT visible). Nothing here says any mechanic is free, cleared or safe. "Unknown" means not found by this shallow search. Espacenet, EUIPO, USPTO Patent Center and Lens were not reachable or not queried (Justia returned 403). Built on docs/PATENT_SCREEN.md, docs/PATENT_BRIEF.md, docs/ORIGINAL_FEATURES.md (cascade MEDIUM, per-cell multipliers MEDIUM, cluster UNKNOWN).

Term arithmetic (general rule, to verify per patent and country): a US utility patent usually runs 20 years from the earliest non-provisional filing date (provisionals do not count), plus any term adjustment. So filings before ~Oct 2006 are likely expired by now (2026-10), subject to fee lapses and adjustments. Google's "expired / adj. expiry" labels below are Google's own assumption, not legal fact.

## 1. Mechanic families and anchors

| Family | Anchors found (URL) | Assignee / priority / status (as stated by page) | Age and older art |
|---|---|---|---|
| Cascade / tumble | US7357713B2 https://patents.google.com/patent/US7357713B2/en ; US8192275B2 https://patents.google.com/patent/US8192275B2/en ; US8105151, US8574059, US10607448 (see PATENT_SCREEN) | 7357713: IGT/High 5, priority 2001-11-06, Google "expired", adj. 2023-11-17. 8192275: WMS (now LNW), priority 2006-05-04, Google "active", adj. 2029-07-13. IGT families 2008-2012: active per earlier screen | Basic "remove winners, slide down, refill from top" is described in a 2001 filing which itself cites an internet puzzle game "Bedazzled" as earlier art (page summary). SameGame (1985, removal of adjacent same-colour groups with falling blocks) https://en.wikipedia.org/wiki/SameGame . Newer claims narrow (wilds, stacked reels, multi-sided symbols, special-symbol removal e.g. US10410463B2 https://patents.google.com/patent/US10410463B2/en). Basic tumble looks old; refinements are not |
| Cluster / adjacency pays | "Power Pays" family US6960133, US7744458 (IGT; priority 2000-08-28, filed 2005-08-31; Google "expired", adj. 2025-03-26) https://patents.google.com/patent/US7744458 ; also US7785191, US9251667 (WYSIWYG) https://patents.google.com/patent/US9251667 ; US20080274786 https://patents.google.com/patent/US20080274786 | Abstract: wager on symbols, awards for adjacent combinations. Claims not read | Adjacency awards on a matrix are old art (2000 priority). 7744458 shown expired by Google. 9251667 status unknown. No dedicated "cluster pays" patent found (negative result only) |
| Hold-and-spin, locked symbols (Aristocrat) | US10629030B2 / US20190051097A1 https://patents.google.com/patent/US20190051097A1/en ; US11551509 etc. (PATENT_BRIEF) | Aristocrat; priority 2017-08-09; Google "active", anticipated expiry 2038-08-09. Aristocrat licenses its Australian Hold & Spin family (Ainsworth, 2026) https://www.intergameonline.com/land-based-gaming/news/aristocrat-and-ainsworth-forge-patent-licence-agreement | Active enforcement/licensing by one company. Highest risk family. Respin-with-lock-and-counter predates in fruit-machine "hold" ideas but unverified |
| Megaways / dynamic reel height | BTG "random reel modifier", US patent number NOT found; trade press says US-patented and licensed (Red Tiger, Storm, Playzido, iSoftBet) https://casinobeats.com/2018/10/08/btg-licenses-us-patented-megaways-to-red-tiger/ | BTG (Evolution group per press); status/expiry unknown. Debut c.2015-16 (press) | Enforced by licensing plus the MEGAWAYS trademark. Avoid variable symbols per reel |
| Ways / any-position payouts | "Pair 'em Up" US6935947 and the Power Pays family (above) | IGT / PTT; dates see above | Largely early-2000s |
| Free spins with growing multiplier | US7147559B2 https://patents.google.com/patent/US7147559B2/en (expired for fees, adj. 2023-04-16, priority approx. 2002-06); US6561904B2 https://patents.google.com/patent/US6561904 (expired for fees); US7666083 (IGT, expired adj. 2025-10-01); US20070281778A1 https://patents.google.com/patent/US20070281778A1/en (application) | Per pages | Strong prior-art cluster, all older. Per-cell and sticky ones: US8197328 (Atronic/IGT, 2008, active adj. 2031) and US7695365 (WMS, 2004, adj. 2027-03-22) per PATENT_SCREEN |
| Feature buy | US8038524 (priority 1999, Google expired), US9685046 (2011, active adj. 2033), US9092930 (unknown) per PATENT_SCREEN | Aristocrat | Chance-bearing extra wager is the claimed shape (page summaries). Direct purchase unverified |
| Nudge / xNudge | A 1990s EP filing describes the nudge as old fruit-machine art (end-of-losing-game reel advance, nudges awarded by ladder/trail) https://data.epo.org/publication-server/rest/v1.2/patents/EP0375190NWA2/document.html . Nolimit City patents: none found; "patented" claims only on affiliate sites | EP0375190 priority ~1988-89 (inferred from number, unverified) | Basic nudge is very old. Do not copy the xNudge wild-multiplier presentation |
| Expanding / walking / sticky wilds, wild reels | No specific patent found by this search | Unknown | Very widely implemented by unrelated providers (observation, not proof) |
| Symbol collect / trail / pick bonus / mystery symbols | Mystery with wheel-valued held symbols sits inside Aristocrat H&S (US12236754 per PATENT_BRIEF). Trail and pick bonuses: not searched | Unknown | Trail/ladder appears in the 1990s nudge text above. Mystery-reveal tied to held symbols is the risky shape |
| Progressive / gamble | Excluded by platform | n/a | n/a |

## 2. Old and widely implemented vs one-company enforcement
Signals of lower enforcement risk (not clearance): basic tumble (2001 filing expired; 1985 puzzle art), adjacency pays (2000 priority, expired per Google), free spins with an increasing multiplier (several expired grants), nudges (1990s art), wilds of all kinds (no patent found, many providers).
One-company enforcement signals: Aristocrat hold-and-spin (active to 2038, Australian licensing campaign and High Court history https://www.lawyerly.com.au/aristocrats-6-year-battle-to-patent-lightning-link-poker-machine-ends-in-defeat/ ), BTG Megaways (patent plus trademark licensing), IGT's later cascade refinements (2008-2012 families), WMS/LNW sticky-symbol and removal-with-shift claims (US7695365, US8192275).

## 3. Design-around patterns (math/feel)
1. Global or per-reel multiplier instead of per-cell. Less position-bound claim language; lower variance; peak depends on the step.
2. Multiplier as a pure function of cascade depth, reset each spin (no persistence). Removes "keeps for later arrays" language; lowers mean multiplier.
3. Reveal-then-resolve: show the full hidden layout before the spin pays (as Fuse Line does). Avoids "mystery value revealed later" shape; feel is anticipation.
4. Symbol-free state: store the state on a meter or board overlay, not on a held symbol. Avoids "symbol kept at its display position".
5. Fixed spin counts with no respin counter reset (avoids hold-and-spin counter claims).
6. Direct purchase at a fixed price, no chance element, no extra wager tier.
7. Different removal shape: remove by region/row/column pattern, not just winning symbols; refill by slide-in from a side. Moves away from "winning symbols removed, others shift down". Effect: a different cascade rhythm; needs optimizer re-fit.
All unverified against claims.

## 4. Ten cross-genre ideas (stateless round = pre-determined book events)
Common engine pattern: all dice, paths, and drops are generated in game_calculations and written to the book as events; the frontend only plays them back. Feasibility rates: optimizer sees only win totals per criteria (quotas by basegame/freegame/wincap), so any mechanic whose outcome is a function of the book works. Everything is tunable by reel weights or per-event probabilities.

| # | Idea (genre) | Book events and beat | Feasibility |
|---|---|---|---|
| 1 | Minesweeper numbers (puzzle) | `revealNumbers`: each empty cell shows count of adjacent payers; a cascade clears zero-areas | Easy: deterministic function of the board; one event; flood-fill animation |
| 2 | Plinko drop (pachinko) | `ballDrop {path[]}`: balls fall through pegs into value slots after a win | Easy: path pre-rolled; per-slot probabilities map to multipliers; high animation value |
| 3 | Pinball bumper chain (pinball) | `bumperHit {cell, mult}` list, ordered; each hit adds to a spin multiplier | Easy: sequence is just a list; cap by wincap check |
| 4 | Claw grab (claw machine) | `clawGrab {col, row, grabbed[]}`: claw lifts a cluster of the grid after the chain ends; grabbed cells pay prizes | Medium: choose grab by RNG; events carry cells |
| 5 | Mining depth meter (idle/mining) | `dig {depth, ore}` per cascade step; deeper = richer ore table | Easy: depth = tumble index; table lookup |
| 6 | Roguelike relic draft (roguelike) | `relicOffer` auto-picked by RNG (no player choice, avoids pick-bonus claims) then modifies the free-spin run | Medium: relics are rule modifiers; combinatorics increase optimizer cases |
| 7 | Dice room rooms (board game) | `diceRoll {faces[]}` moves a token along a loop; tiles award tokens/wilds; fixed N rolls | Medium: path precomputed; many tiles, many criteria |
| 8 | Tetris line clear (puzzle) | `rowClear {row}` when a whole row is winning, then rows above shift; bonus multiplier per cleared row | Easy to medium: on top of cascade |
| 9 | Chain-reaction bomb (Bomberman/puzzle) | `blast {center, radius, cells[]}` converts or removes cells; blasts chain | Medium: chained events; cap depth |
| 10 | Tower stack (Jenga/stacking) | `stackAdd {height}` per win; collapse event at fixed or probabilistic height converts the stack into a payout | Easy: scalar counter; collapse event is a pure function |

Pachinko/pinball/claw adaptations are likely old art in physical form but I did not search for patents on them. Unverified.

## 5. Avoid list
- Hold-and-spin: locked cash symbols with a respin counter, mystery values from a wheel, or free-game counts derived from collected symbols (Aristocrat, https://patents.google.com/patent/US20190051097A1/en).
- Megaways-like variable symbols per reel and the "Megaways" name; xNudge/xWays names and look.
- Persistent per-position multiplier on held symbols, and random conversion of a symbol to a persistent-function symbol (US8197328, US7695365). Also a buy that is a chance-bearing extra wager (US9685046).
- Cascade variants with wild creation, stacked independent reels, multi-sided symbols, or special-symbol removal (IGT/WMS families), until counsel reads the claims.

## Questions for an IP attorney
1. Which jurisdictions are launch targets, and do EP/AU/GB/CA counterparts exist for the families above?
2. What is the verified expiry (fees, adjustments, terminal disclaimers) of US7357713, US7744458 and US7147559, and can we rely on them as prior art?
3. Do any claims of US8192275 or the IGT cascade families cover plain tumbles with shifting and refill on a cluster grid?
4. What is the BTG Megaways patent number and claim scope, and does it reach any non-uniform reel/row-height design?
5. Do hold-and-spin family claims cover persistent state outside symbols (e.g. a board overlay)?
6. Do the Power Pays and WYSIWYG families (US9251667) cover cluster adjacency pays with no wager on symbols?
7. Are there Nolimit City, Pragmatic Play or Push Gaming patents on nudge/convert-cell mechanics (none found here)?
8. Are the names "Cluster Pays", "Avalanche", "Tumble", "Megaways", "xNudge" trademarked in our target markets?
9. Can a pre-displayed hidden layout (reveal-then-resolve) avoid "mystery symbol" claim language?
