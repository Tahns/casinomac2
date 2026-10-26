# gap_01_Q1: Cluster-pays patent family at claim level (Aristocrat "cluster based awards")

Date: 2026-10-26. Answers critic question Q1. SCREENING ONLY. Nothing here says the game is free to use, safe, or infringing. A human IP attorney must read the file wrappers and decide. "Not found" is never "free".
Method: claim text read from primary or non-summarising sources (USPTO PDF images read by eye and OCR, Google Patents HTML parsed locally, Lens JSON from USPTO XML). No small-model summaries were used for any claim quoted below. Evidence tags: strong / medium / weak.

## 0. Bottom line

1. Claims are now verified verbatim. The four granted US patents plus the as-filed claims of every other family member were triangulated across 2 to 3 independent sources (word similarity 99.8 to 99.96 percent between Google HTML and Lens USPTO XML; USPTO PDF OCR matched the key phrases) [strong].
2. The family has 13 members (Lens simple family, size 13): 4 US grants, 1 PENDING US continuation (App 19/437,931, filed 2025-12-31, published US 2026/0127949 A1 on 2026-05-07, docketed 2026-01-29, no action on record), and 4 AU documents of which one is granted (AU2018278994B2). No EP, WO or CA member [strong for what Lens and Google list; unpublished continuations would be invisible].
3. Literal read on a "min-5 orthogonal same-symbol cluster, wild substitution, award from size, 6 columns by 4 to 7 rows, fixed grid, online book replay" rule (AMR, defined in section 3):
   - US 10,964,173 (all 3 independents) and US 11,468,746 (all 3): NO literal read. Each needs a pay formula tied to cluster span (columns or rows) multiplied by cluster size; 10,964,173 also needs a display-area expansion and a credit input mechanism taking a physical item. 11,468,746 also needs a matrix of at least 6 columns and 5 rows, which 6x5, 6x6 and 6x7 satisfy but 6x4 does not [strong on text, medium on reading].
   - US 12,094,305 claims 1 and 11 and US 12,536,877 claims 1, 7 and 16: these are the ones that can read on a plain size-paid cluster rule. No minimum size, no grid size, no span, no expansion. Two outcome-level conditions are the only fences ("same symbol at each position", "no position shared by multiple winning clusters") and neither is a reliable design-around [medium].
   - US 12,094,305 claim 16 needs "base award multiplied by quantity of display positions": a size-tier table lookup is not that literally (equivalents are an attorney question).
   - Pending US 2026/0127949 A1 claims 1, 7, 16 as filed drop adjacency and the non-sharing clause. They would cover almost any count-based pay on a grid (scatter pays included) if issued as filed. Unexamined; expect rejection or narrowing [medium].
4. Aristocrat narrowed three of the four grants after rejections (section 4). US 12,536,877 issued with claims text-identical to the as-filed claims and no rejection on record [strong that texts differ or match; weak to medium on why].
5. Validity leads dated before 2014-09-29 exist and are stronger than the earlier summary suggested (section 5): US 2003/0157981 A1 (High 5 Games / IGT, priority 2001-11-06; pays contiguous same-symbol groups, L-shaped included, by count, with wild, remove and refill), US 2003/0045345 A1 (King Show Games, priority 2001-09-06), and US 2015/0379804 A1 (Multimedia Games, filed 2014-06-26, a 102(a)(2)-type reference). The first and third are not on the cited-references lists of the four patents (checked). No pre-priority commercial cluster-pays slot was found [strong on documents, weak on absence of games].
6. Ownership: Aristocrat holds the cluster family and the hold-and-spin families (Lens owner fields). Aristocrat did NOT acquire BTG/Megaways: Evolution AB completed the Big Time Gaming purchase on 2021-06-30 (Evolution press release). The earlier premise is contradicted [strong]. Aristocrat's iGaming purchase was NeoGames (completed April 2024).
7. Side finding that matters more than the cluster family for our tumble loop: US 9,542,808 B2 (IGT/PTT, priority 2001-11-06) is ACTIVE to about 2027-10-18 and claims a generic pay, remove, refill, repeat loop (section 7). This contradicts the "tumble anchor expired" statement in docs/research2/01_patent_zones.md section 3.2 [claim text strong; status medium to strong, two sources].
8. Not obtainable here: file-wrapper texts (office actions, amendments, reasons for allowance), AusPat records. See section 1.

## 1. Access log (what worked, what did not)

| Source | Result | Used for |
|---|---|---|
| image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/{no.} | 200, full PDF (image-only, no text layer) for 4 grants, 4 pre-grant publications | primary claim pages (read by eye, OCR via rapidocr), face pages (references cited, terminal disclaimer, examiner, office-action list) |
| patents.google.com/patent/{no}/en via curl | intermittent 503 (rate limit), works after retries | verbatim claims, legal events, citations, family |
| lens.org/lens/patent/{key} via curl | 200 JSON (USPTO XML claims, legal status, family, cited-by) | claims cross-check, term, terminal disclaimer flag, ownership |
| Patent Center, ODP API (api.uspto.gov), PatentsView | SPA shell, 401/403/405; legacy PatentsView API returns the ODP shell; new API unreachable | NOT available: file wrapper |
| Espacenet 403; PatentScope 403; Justia 403; freepatentsonline unreachable | blocked | not used |
| AusPat (pericles.ipaustralia.gov.au) | JS shell; API answers "JWT Token is required" | NOT available; AU status taken from Google data derived from AusPat [medium] |
| WebFetch summaries | used only for discovery leads, never for claim text | leads |

## 2. Family map

| Document | Application | Filed | Published / granted | Status (source) | Notes |
|---|---|---|---|---|---|
| AU 2014903909 | provisional | 2014-09-29 | not published | priority only | named as foreign priority on every US face |
| US 2016/0093153 A1 | 14/869,660 | 2015-09-29 | 2016-03-31 | became US 10,964,173 | as-filed claims |
| US 10,964,173 B2 | same | | 2021-03-30 | Active; no terminal disclaimer; PTA 70 d; term 2035-12-08 (Lens, Google) | claims 1, 10, 15 independent |
| US 2021/0201629 A1 / US 11,468,746 B2 | 17/201,137 | 2021-03-15 | 2021-07-01 / 2022-10-11 | Active; terminal disclaimer; 2035-09-29 | 3 independents (1, 13, 17) |
| US 2023/0021862 A1 / US 12,094,305 B2 | 17/953,781 | 2022-09-27 | 2023-01-26 / 2024-09-17 | Active; terminal disclaimer; PTA 0; 2035-09-29 | 3 independents (1, 11, 16); assignee on face: Aristocrat Technologies Australia Pty Limited |
| US 2024/0404373 A1 / US 12,536,877 B2 | 18/799,032 | 2024-08-09 | 2024-12-05 / 2026-01-27 | Active; terminal disclaimer; PTA 15 d; 2035-10-14 | 3 independents (1, 7, 16); assignee on face: Aristocrat Technologies, Inc. (Las Vegas) |
| US 2026/0127949 A1 | 19/437,931 | 2025-12-31 | 2026-05-07 | PENDING, docketed 2026-01-29, no action on record (Google, today) | 3 independents (1, 7, 16) as filed |
| AU 2015230784 A1 | AU | 2015-09-24 | 2016-04-14 | lapsed 2017-06-15, s142(2)(e), request not accepted (Google page read via a summariser; Google then blocked re-fetch) [medium] | column-span claims |
| AU 2017203303 A1 | AU | 2017-05-17 | 2017-06-08 | lapsed 2019-01-17, s142(2)(e) (Google) | column-span claims; examination report 2017-12-13 (face) |
| AU 2018278994 A1 / B2 | AU | 2018-12-13 | 2019-01-17 / 2021-02-18 | granted standard patent, letters patent sealed 2021-06-17 (Google) | examination report 2020-02-11 (face) |

Pattern worth noting (dates are facts, the reading is inference): each US continuation was filed before its parent granted (2021-03-15 vs 2021-03-30; 2022-09-27 vs 2022-10-11; 2024-08-09 vs 2024-09-17; 2025-12-31 vs 2026-01-27). The chain is being kept open [medium]. Assignee wording differs between faces while terminal disclaimers are in force; ownership alignment is an attorney item [weak].
Sister family, same-day priority, different claims: US 2016/0093151 A1 (parent US 10,395,475 B2, continuation US 11,151,840 B2), claim 1 as published: a "game area expander" that expands the game area on a triggering criterion. Granted claims not read. Relevant to any mid-round grid growth [weak to medium].

## 3. Claim-by-claim literal-read screen

AMR (the test rule, from math/src/calculations/cluster.py and games/agent_mambo/game_config.py, read this session): 6 columns, 4 to 7 rows, fixed per mode; cluster = edge-adjacent (up, down, left, right) cells of one symbol; minimum size 5; wild W joins any cluster and a wild cell next to two different-symbol clusters is counted in both (shared position); award = paytable lookup by (size tier, symbol) times the global multiplier, no column-span input; tumble: remove, refill, repeat; outcome computed server side (book), front end replays events; no coin or bill input.
"Literal" here means every limitation is met; one missing limitation means no literal read (equivalents are separate and for the attorney).

| Claim | Limitations that decide it (verbatim fragments) | AMR literal? | Why | Text / reading |
|---|---|---|---|---|
| US 10,964,173 cl. 1 machine | "expand a display area ... first quantity ... to an expanded display area ... second quantity ... larger"; "plurality of winning clusters"; group "contiguous ... along at least one edge, and the respective group spans at least two columns"; "base award ... depends on a number of columns spanned"; "final award ... multiplying the base award by a number of symbol positions"; "establish a credit balance in response to receipt of a physical item by the credit input mechanism" | NO | no expansion in a fixed grid; no column-span pay; no base-times-count; online play has no physical item. The 2-column span geometry is met by most clusters, the pay formula is not | strong / medium |
| cl. 10 machine with reels | "expand a first reel area ... to a second reel area"; same cluster and pay formula; RNG; reels stop | NO | same three gaps | strong / medium |
| cl. 15 method | same as cl. 1 in method form (expansion, span-based base award times positions, credit balance from physical item) | NO | same | strong / medium |
| US 11,468,746 cl. 1 machine | "matrix having at least six columns and at least five rows"; "base award that is based on a span of the respective winning cluster across the plurality of display positions"; award "by multiplying the base award ... by an overall number of symbols"; "group of at least two symbols ... contiguous ... along at least one display position edge"; "at least one winning cluster spans a plurality of the rows" | NO | grid element met by 6x5, 6x6, 6x7 (not 6x4); contiguity met; base-by-span and multiply-by-count missing. Dependent cl. 2 and 3 equate "span" to rows or columns spanned | strong / medium |
| cl. 13 method, cl. 17 media | same elements | NO | same | strong / medium |
| US 12,094,305 cl. 1 machine | "present ... each winning symbol cluster ... a respective same symbol at each display position ... each display position ... adjacent to at least one other ... and wherein no display position ... is shared by multiple winning symbol clusters; ... a respective cluster award that is based on a quantity of the respective same symbol" | YES for pure clusters on outcomes without sharing | no minimum size (min-5 sits inside), no grid size, no span, award from quantity = size-tiered paytable. Fences: a cluster containing a wild shows a different symbol in that cell; SDK-style evaluators let a wild belong to two clusters. Both are outcome-dependent, so a patentee will say the system practises the claim on the other outcomes | strong / medium |
| cl. 11 method | same elements, "identifying, with a game controller" | YES (same) | same | strong / medium |
| cl. 16 media | "calculate a cluster award ... by multiply a base award ... by a quantity of display positions" plus same cluster clauses | NO literal | table lookup is not literally base times count; equivalents open | strong / medium |
| US 12,536,877 cl. 1 game server | "transmit one or more signals ... that cause a computing device to: present ... a game outcome ... wherein each winning symbol cluster ... same symbol ... adjacent ... no display position ... shared ...; and present, for each winning symbol cluster, a respective cluster award that is based on a quantity of the respective same symbol" | YES (same conditions) | server and client form is how the Stake book model works: RGS returns the outcome, front end presents it | strong / medium |
| cl. 7 method of a computing device | "receiving, from a game server, a game outcome ...; presenting ... at a plurality of display positions; and presenting ... a respective cluster award ... based on a quantity" with the same cluster clauses | YES (same) | reads almost like a book-replay front end; who infringes (operator, player device) is divided-infringement and territorial law, attorney | strong / medium |
| cl. 16 media for a game server | like cl. 1 but with NO "based on a quantity" language | YES (same, broadest of the three) | | strong / medium |
| Pending US 2026/0127949 A1 cl. 1, 7, 16 (as filed, unexamined) | "winning symbol clusters each comprising a subset of the display positions and a respective same symbol at each of the subset"; award "based on a quantity of the respective same symbol". Adjacency and non-sharing only in dependent cl. 15 and 17 | YES if issued as filed | covers any count-based pay on a grid, scatter pays included; scatter pays are old art (e.g. EP 2202703 A1, 2008-12-29) so expect rejection or narrowing | strong / medium |
| AU 2018278994 B2 cl. 1, 6, 12 | coin chute or bill collector or card reader, meters, buttons, RNG, "base award depending on the number of columns spanned ... multiplying the base award times the number of symbol positions" | NO | AU only; physical hardware and span-based pay | strong / medium |

Reading notes. (a) "No minimum size" in US 12,094,305 cl. 1 is confirmed: adjacency to at least one other position implies two or more, and nothing else is recited, so a higher minimum does not avoid the claim. (b) The column-span element the critic named sits in all three independents of US 10,964,173 (cl. 1, 10, 15), not only 15, and is coupled to expansion and the pay formula. (c) Wild substitution is neither required nor excluded by any independent claim; US 11,468,746 dependent cl. 7 and 8 cover "a same symbol" and "a predetermined set of symbols". Wild substitution is therefore not a design-around [medium]. (d) Mid-round row growth (for example 4 rows growing to 7) would satisfy the "expand" element of US 10,964,173, so that family becomes closer if grids grow during a round; the span-based pay still would not be met [medium].

## 4. Prosecution history and narrowing amendments

Method: as-filed claims = the pre-grant publication of each application (printed claims, unless a preliminary amendment preceded publication) compared with granted claims. Reasons and arguments are in the file wrappers, which were NOT accessible [section 1].

| Patent | As-filed claim 1 (publication) | Granted claim 1 adds | Events on record (face of US 12,536,877 lists office-action dates; Google legal events differ by a few days) | Reading |
|---|---|---|---|---|
| US 10,964,173 (US 2016/0093153 A1) | gaming machine, display, controller; cluster contiguous along an edge, group spans at least two columns; award depends on number of columns spanned and number of positions; as-filed dep. cl. 5 multiplies | display-area EXPANSION first to larger second quantity (cl. 1, 10, 15); credit input mechanism with physical item; plural clusters concurrently displayed (cl. 1); explicit base times positions | final rejection 2019-01-28; advisory action 2019-04-22; RCE-type docketing 2019-05-01; non-final 2019-06-19; response 2019-09-13; final rejection 2019-11-01; docketed 2020-06-22; non-final 2020-07-22 (OA dated 2020-07-24); notice of allowance 2021-01-29; earlier actions 2015 to 2018 not shown | narrowed; expansion limitation came in during prosecution [strong that text differs; medium that amendment added it] |
| US 11,468,746 (US 2021/0201629 A1) | "group of at least two symbols" contiguous along a display position edge; at least one cluster spans a plurality of rows; cluster award per cluster | matrix of at least six columns and five rows (was dep. cl. 14); base award based on span (was dep. cl. 2 to 6); award = base times overall number of symbols | non-final 2022-02-03; response 2022-05-07; notice of allowance 2022-06-23; terminal disclaimer | narrowed by importing dependent claims [strong / medium]. Typical consequence: limited room for equivalents on the added limits (attorney) |
| US 12,094,305 (US 2023/0021862 A1) | "present a cluster award for a winning symbol cluster" with same symbol at each position and adjacency; no non-sharing clause; no "based on a quantity" | each winning cluster plural; "no display position ... shared by multiple winning symbol clusters"; award "based on a quantity of the respective same symbol" | non-final 2023-06-29; response 2023-09-29; FINAL rejection 2024-01-22; docketed (RCE-type) 2024-04-23; notice of allowance 2024-06-10; terminal disclaimer | narrowed after a final rejection; the non-sharing clause is the likely hook [strong / medium]. Matters for the shared-wild question (section 3) |
| US 12,536,877 (US 2024/0404373 A1) | game server, client and media claims | nothing: the claims text (8,200 characters) is identical to the grant | docketed 2024-08-27; notice of allowance 2025-10-23; no rejection recorded; terminal disclaimer; PTA 15 d | no narrowing on record; examiner-cited (asterisked) on the face: US 11,887,434 B2 (Berman, King Show Games, "Incrementing feature in gaming device"), US 2024/0169797 A1 (Berman), US 12,094,305 and US 2024/0404373 A1 [strong / medium] |
| US 2026/0127949 A1 | broadest wording of the family (section 3) | n/a | docketed 2026-01-29; nothing since | continuation chain may be recapturing scope; examiner will likely cite the art that narrowed the parents [weak inference] |

Face data of US 12,094,305 (primary, read from the PDF): terminal disclaimer; PTA 0 days; primary examiner William H. McCulloch Jr.; firm McAndrews, Held and Malloy; other publications list AU examination reports for AU2017203303 (2017-12-13) and AU2018278994 (2020-02-11), office action 2020-07-24 and notice of allowance 2021-01-29 in 14/869,660, and office action 2022-02-03 and notice of allowance 2022-06-23 in 17/201,137. US 12,536,877 is prosecuted by Greenberg Traurig and cites the later office actions of 17/953,781 (2023-06-29, final 2024-01-22, allowance 2024-06-10).
Counsel should pull: 14/869,660 (all actions, the 2019 and 2020 responses), 17/201,137 (response 2022-05-07), 17/953,781 (final rejection and the post-final amendment, allowance reasons), 18/799,032 (allowance reasons), 19/437,931 (watch).

## 5. Public art before the 2014-09-29 priority date (validity leads, not conclusions)

Legal frame for the attorney: publications before 2014-09-29 count as 102(a)(1) art; a US application filed earlier and published later counts as 102(a)(2) art from its filing date. Whether any element is missing is the attorney's call.

| # | Document | Date facts | What it teaches (text read) | On the 4 patents' cited lists? | Tag |
|---|---|---|---|---|---|
| A | US 2003/0157981 A1, issued as US 6,910,962 B2 and US 7,357,713 B2 (PTT LLC dba High 5 Games, later IGT; Marks, Marks, Singer) | priority 2001-11-06; published 2003-08-21; 6,910,962 expired (term 2023-12-27) | matrix with C and R of at least 3; award when 3 or more like symbols are "arranged adjacently in vertical, horizontal or L-shaped directions or combinations thereof ... starting in any column or row ... using any number of symbols per column"; pay table by contiguous count 3 to 10 (Table 3); worked example pays 48 credits per credit for six contiguous Y symbols "anywhere in the symbol matrix"; winning symbols removed, rest slide, new symbols drop in, repeat; wild, multiplier and scatter symbols as embodiments. Claim 1 requires winning patterns "in a column, row or L-shaped pattern" | NO (0 hits in all four patents' citation tables; not on the printed face of US 12,094,305 or 12,536,877) | content strong; fit to claims medium |
| B | US 2003/0045345 A1, issued as US 6,896,615 B2 and US 7,874,910 B2 (King Show Games, B. Berman) | priority 2001-09-06; published 2003-03-06; 6,896,615 expired 2022-07-14 | FIG. 10 "adjacent, free-forming paylines" on a 10x6 grid: adjacent = vertical, horizontal or diagonal; "a minimum of 'x' adjacent star symbols"; "five adjacent star symbols provides a payout of ten times the wager ... each additional adjacent star symbol doubles"; different minimums per symbol | YES (printed as 2003/0045345 Berman on the face of US 12,094,305); how it was applied is unknown | content strong; "string" wording leaves shape unclear (medium) |
| C | US 2015/0379804 A1 (Multimedia Games, now Everi; M. Casey) | filed and priority 2014-06-26; published 2015-12-31; abandoned 2017-10-16 for no reply to an office action | claim 1: groups of "horizontally or vertically contiguous symbols of designated types", count size, minimum size, "a prize ... based directly upon the size of the group"; claim 10: a wild counts in "every group to which it is horizontally or vertically contiguous" and joins two groups (shared wild); description: "connected paygroups", minimum group size, wild enlarging groups | NO (0 hits) | 102(a)(2) only, not public before the priority date; content strong; closest match to the AMR including wild sharing (medium) |
| D | Power Pays family US 7,785,191, 7,744,458 (PTT/IGT) | priority 2000-08-28; 7,785,191 expired 2025-06-14 | "contiguous" = adjacent in horizontal, vertical or diagonal directions, but chains start in the left-most column and use one symbol per column: a path, not a cluster | cited by neighbours, not needed | background, medium |
| E | US 8,113,941 B2 (WMS / Miller, "Chain reaction game") | priority 2002-08-30; expired | contiguous matches in a row or column, wild transformation, elimination, repeat | no | background (tumble, wild) medium |
| F | SameGame / Chain Shot! (K. Moribe) | 1985 (Wikipedia; one article section says 1987) | removing groups of adjoining same-colour blocks, score about (n minus k) squared | not applicable | non-gambling; strong on date, weak on legal weight |

Commercial games before the priority date: none with a cluster-adjacency pay was found [weak, absence]. Dates found: Gemix (Play'n GO) 2014-12-02 (SlotCatalog; review sites agree, 7x7, 5+ clusters) is AFTER the priority date; Aloha! Cluster Pays 2016-03-25 (OLBG); an affiliate site claims IGT "Pixies of the Forest" 2005 was the first cluster game, but review pages date that game 2012 with 99 paylines and cascades, so the claim is unsupported. Affiliate sources are weak; no operator or regulator release record was found for any earlier cluster-adjacency slot.
Play'n GO's EP 4210008 A1 and CA 3191104 A1 (priority 2022) cite this family, showing the industry reads it [medium].

## 6. Ownership check (BTG/Megaways versus hold-and-spin)

| Question | Finding | Source / tag |
|---|---|---|
| Did Aristocrat acquire BTG? | NOT FOUND, contradicted. Evolution AB bought 100 percent of Big Time Gaming Pty Ltd and "has today completed the Transaction" on 2021-06-30; 1,105,032 Evolution shares issued at EUR 126.72 to the sellers (earn-out up to EUR 230m is from trade press only) | Evolution / Cision press release, PRNewswire, MarketScreener [strong]. No later sale by Evolution found in searches [weak, absence] |
| What did Aristocrat buy in iGaming? | NeoGames, completed April 2024 and merged with Anaxi into Aristocrat Interactive; Plarium was sold in February 2025 | aristocrat.com, iGB [medium to strong] |
| Who holds Megaways? | BTG's own press describes a "U.S. patented mechanic" and the MegaWays trademark; licensed to Red Tiger, iSoftBet, Blueprint, Storm and others; the patent number was NOT identified this session | gamblinginsider, casinobeats [medium; patent number open] |
| Same owner for cluster and hold-and-spin? | YES, Aristocrat: US 10,629,030 (Aristocrat Technologies Australia, priority 2017-08-09, active to 2038), US 11,551,509 (Aristocrat Technologies Inc, 2020-02-11, to 2040), US 11,798,368 (2020-02-19, to 2041) | Lens owner fields [strong] |
| Who holds "random quantity of ways" (variable rows per reel)? | IGT: US 11,954,977 (priority 2021-09-20, to 2041), US 12,562,031 (to 2041), US 12,424,059 (hold-and-spin ways modifier, priority 2022-11-01, to 2043). Not BTG, not Aristocrat | Lens [strong on owner; claims 1 read from Lens, scope for attorney] |

## 7. Adjacent findings the orchestrator should not lose

1. US 9,542,808 B2 (App 11/951,060, filed 2007-12-05; same family as the expired US 7,357,713 B2, priority 2001-11-06; IGT / PTT; granted 2017-01-10). Google: "Active, expires 2027-10-18"; Lens: ACTIVE, PTA 1,878 days; 8th-year fee paid 2024-06-20. Claim 1 (verbatim core): wager; randomly select symbols; display; determine winning combinations; if formed, "(i) provide the player the monetary award ..., (ii) remove each of the displayed symbols which form any winning symbol combination, (iii) for each removed symbol, randomly select and display one of said symbols, and (iv) repeat (d) to (e)(iii) at least once, wherein each removal ... is independent of any player input". That is the pay, remove, refill, repeat loop of every Agent Mambo mode. Siblings US 8,083,581, 10,115,272 and 10,417,870 are expired; US 7,357,713 expired. Tag: claim text strong; status medium to strong; reading is for the attorney, but this is a higher-priority item than the cluster family for the tumble loop and expires in about 12 months.
2. LNW US 12,725,489 B2 ("symbol cluster feature", granted 2026-09-01, priority 2023-09-01) cites this family; it claims value-symbol clusters inside one position that disband into the grid, a different mechanic [strong on text].
3. Everi/Multimedia Games lead C above also supports the wild-linking idea; it is abandoned, so no enforcement from that file, but it can serve as art.

## 8. What this implies for design (non-legal inputs, no safe harbor)

| Lever | Effect on literal claim language | Cost |
|---|---|---|
| Keep pay as a size-tier lookup per symbol; never define a base award by columns or rows spanned; never multiply a base by cluster size | keeps 10,964,173 and 11,468,746 outside; 12,094,305 cl. 16 outside literally | none today; a re-tuned paytable that looks like base times count invites an equivalents argument |
| Fixed grid per mode, declared in the first event; no mid-round growth | keeps the "expand" element of 10,964,173 and the sister family out | limits the variable-grid brief to per-mode grids |
| 4-row mode | avoids only the "at least six columns and five rows" element of 11,468,746 | does nothing for 12,094,305 / 12,536,877 |
| Pay clusters by SHAPE or PATH instead of count of same symbols | would move away from "award based on a quantity of the respective same symbol" | new math, optimizer, art |
| Rely on wild sharing or on wild cells to escape "same symbol" and "no shared position" | outcome-dependent, narrow, and prosecution amendments make these the live limits | not a design-around; pure clusters still read |
| Record the invalidity leads A to C and a licence option for counsel | independent of design | counsel time |
None of these is a clearance. They only change which claim words are present.

## 9. Questions for the attorney

1. Does claim 1 of US 12,094,305 or claim 7 of US 12,536,877 read on a server-computed, client-replayed cluster outcome, given the outcome-dependent clauses and wild cells (apparatus capability versus actual outcomes; divided infringement; US territorial scope)?
2. Are the file-history amendments that added the non-sharing clause (12,094,305) and the span/matrix/multiply limits (11,468,746) estoppel-relevant to a tiered paytable and shared wilds?
3. Do A (US 2003/0157981 A1), B and C anticipate or render obvious claims 1, 11 and 16 of US 12,094,305 and the family; was A or C ever before the examiner; is an IPR or ex parte reexamination worth it versus a licence?
4. With terminal disclaimers in force and different assignee names on the faces, is common ownership intact for enforcement?
5. How should the pending 19/437,931 claims be watched, and does any third-party submission window remain?
6. US 9,542,808 B2: does claim 1 read on a cluster tumble; licence or wait to 2027-10-18; US sales footprint of the target platform.
7. Section 101 (rule-only casino-game claims) as an additional argument for the attorney.

## 10. Sources

Primary or non-summarising:
- USPTO PDFs: https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10964173 , /11468746 , /12094305 , /12536877 , /20160093153 , /20210201629 , /20230021862 , /20240404373 , /20260127949 [strong]
- Google Patents (HTML parsed locally): US10964173B2, US11468746B2, US12094305B2, US12536877B2, US20160093153A1, US20240404373A1, US20260127949A1, AU2017203303A1, AU2018278994B2, US6896615B2, US6910962B2, US9542808B2, US20150379804A1, US20160093151A1, US8113941B2, US20100304833A1, US20040033829A1, all at https://patents.google.com/patent/{number}/en [strong for text, medium for status]
- Lens JSON (USPTO XML claims, legal status): https://www.lens.org/lens/patent/US_10964173_B2 and the same pattern for US_11468746_B2, US_12094305_B2, US_12536877_B2, US_12725489_B2, US_6910962_B2, US_7357713_B2, US_9542808_B2, US_10629030_B2, US_11551509_B2, US_11798368_B2, US_11954977_B2, US_12562031_B2, US_12424059_B2 [strong for claims, medium for status]
- Evolution completion release: https://news.cision.com/evolution/r/evolution-completes-acquisition-of-big-time-gaming-and-issues-shares-to-the-sellers,c3377463 ; https://www.evolution.com/investors/financial-publications/press-releases/evolution-completes-acquisition-of-big-time-gaming-and-issues-shares-to-the-sellers-05c4b3e2 ; https://www.prnewswire.com/news-releases/evolution-completes-acquisition-of-big-time-gaming-and-issues-shares-to-the-sellers-301323385.html [strong]
Secondary (leads, medium or weak):
- Aristocrat NeoGames: https://www.aristocrat.com/aristocrats-acquisition-of-neogames-completes/
- BTG licensing: https://www.gamblinginsider.com/press/6028/btg-licenses-its-us-patented-mechanic-and-megaways-trademark-to-fellow-supplier
- Cluster game dates: https://slotcatalog.com/en/slot-features/cluster-pays ; https://www.casinos.com/slots/gemix ; https://www.olbg.com/slots/games/aloha-cluster-pays ; https://www.gambling.com/uk/online-casinos/slots/games/pixies-of-the-forest [weak, affiliate sites]
- SameGame: https://en.wikipedia.org/wiki/SameGame [medium]
- EP 2202703 A1 (scatter and row adjacency, priority 2008-12-29): https://patents.google.com/patent/EP2202703A1/en
Screening only. A human IP attorney must review before any decision. No claim here means "patent-free".
