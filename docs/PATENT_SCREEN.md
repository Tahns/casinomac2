# Prior-art screening: The Unleashed Mine (research aid, NOT legal advice)

Date: 2026-10-23. Method: WebSearch plus WebFetch on patents.google.com. The fetch tool returns small-model summaries of truncated pages. Independent claims were usually NOT visible, so claim gists below are marked "(page)" when read from a page and "(not read)" when only the description or title was seen. Legal-status and expiry lines are Google's own "assumption, not a legal conclusion" labels. Nothing here says any mechanic is free to use. This is not an exhaustive search: Espacenet, EUIPO and USPTO Patent Center were not queried, and no search was done outside the US-centric results the tool returned. NetEnt, Pragmatic Play and BTG were not located in Google Patents by this search.

## Mechanics used (from code)
Source: math/games/the_unleashed_mine/MATH_REPORT.md, game_config.py, game_executables.py, game_calculations.py, frontend/src/rules.js. The grid is 6 reels x 5 rows.
1. Cluster pays: 5 or more same symbols, orthogonal adjacency, wild substitutes, scatter excluded.
2. Cascade/tumble: winning symbols removed, others fall, new symbols drop in, repeat.
3. Free spins: 4+ scatters give 10/12/15/18/20 spins. Retrigger with 3+ scatters gives 5 to 18 spins.
4. Per-cell multipliers: all cells start at 4x in free spins only. Each cell in a winning cluster gets +6, cap 512. They persist across tumbles and spins of the feature. Cluster win = pay x SUM of its cells' multipliers.
5. Feature buy "UNLEASH" at 100x, direct entry into the free spins. 6. Win cap 5000x. 7. Stateless rounds.

## Findings per mechanic

| Mechanic | Best-known related patents (URL) | Assignee / priority / status | Claim gist | Ours vs theirs |
|---|---|---|---|---|
| Per-cell persistent multiplier that grows on wins | US8197328B2 (pub. as US20100075737): https://patents.google.com/patent/US20100075737 | Atronic, now IGT Germany. Priority 2008-09-25. Google: active, adj. expiry 2031-04-13 | (page) A special symbol that is shown but not used in a win stays in place for the next game while other positions re-spin, while an enabling condition holds. Description: a held symbol raises the award multiplier each game it is held | Resembles: persistent, position-bound, growing multiplier. Differs: ours is a multiplier on EVERY grid cell, there are no held symbols, nothing re-spins, and cells grow by being in a winning cluster |
| Same | US7695365B2 (pub. as US20060068881): https://patents.google.com/patent/US20060068881A1/en | WMS, now LNW Gaming. Priority 2004-09-10. Google: active, adj. expiry 2027-03-22 | (page) A random event changes one symbol's function so it keeps that function for several later symbol arrays (one embodiment: payout multiplier) | Resembles in "persists across several arrays". Differs: ours is per position not per symbol, and no random conversion event |
| Accumulated modifier in free spins | US7666083B2: https://patents.google.com/patent/US7666083 | IGT. Priority 2002-09-11. Google: expired, adj. expiry 2025-10-01 | (not read) Free-spin game, modifier (e.g. multiplier) incremented per occurrence of a selected symbol on non-locked reels | Older concept of a multiplier accumulating through free spins. Expired per Google, so useful mainly as prior art |
| Cascade / tumble | IGT cascading family, e.g. US9437084 (Google: active, adj. 2029-04-30, priority 2008-11-14): https://patents.google.com/patent/US9437084 ; US8574059 (priority 2008-11-14, adj. 2031-11-07): https://patents.google.com/patent/US8574059 ; US8105151 (priority 2008-07-02, adj. 2029-04-28): https://patents.google.com/patent/US8105151 ; US8690660 (priority 2011-07-21, adj. 2031-07-21): https://patents.google.com/patent/US8690660 ; US10607448B2 (priority 2012-09-27, adj. 2036-02-28): https://patents.google.com/patent/US10607448B2/en | All IGT per Google. | (not read) Titles and snippets: cascading symbol games with stacked independent reels, wilds, multiple grid depths, multi-sided symbols. Snippet: winning symbols removed, remaining shift down, new symbols fill | Our basic tumble resembles the descriptions. The claims narrow to specific features (stacked symbols, wild handling, depth grids, multi-sided symbols), which we do not use. Attorney should read claims against our wild-in-cascade behavior (US8105151) |
| Cluster pays (min 5, orthogonal) | No patent found. A search for cluster-pays patents returned only explainer pages. Generic description: minimum group of adjacent identical symbols, https://www.casinos.com/slots/cluster-pays | Unknown | n/a | Result is "not found", not "none exists". NetEnt/Aloha marketing history only. Trademark issues for the term "Cluster Pays" are outside this search |
| Avalanche (NetEnt) | No NetEnt patent located. Cross-license with IGT reported: https://www.gamingintelligence.com/markets/24619-netent-seals-us-patent-cross-licensing-agreement-with-igt/?amp=1 | Unknown | n/a | Do not infer anything from the cross-license; it does not name patents |
| Free spins by scatter count + retrigger | Not specifically searched beyond the families above (generic, long-standing feature) | Unknown | n/a | Scatter-count-dependent spin awards are widespread; no specific patent identified |
| Hold-and-spin family (Aristocrat Lightning Link) | US11551509 (priority 2020-02-11, Google: active, adj. 2040-05-23): https://patents.google.com/patent/US11551509 ; US12424064: https://patents.google.com/patent/US12424064 ; other family members listed in docs/PATENT_BRIEF.md | Aristocrat Technologies, Inc. | (not read) hold-and-spin stage plus a free game stage. Gist from docs/PATENT_BRIEF.md, an earlier paraphrase to verify | We have no respin, no locked cash symbols and no respin counter. Related only in that we have persistent state that grows. Low overlap |
| Megaways / dynamic reel height | BTG (now Evolution) "random reel modifier" patent, number NOT found. Trade press: https://www.gamblinginsider.com/press/6028/btg-licenses-its-u-s-patented-mechanic-and-megaways-trademark-to-fellow-supplier ; trademark record https://uspto.report/TM/88593115 | Big Time Gaming Pty Ltd; status unknown | n/a | Our grid is fixed 6x5, so no resemblance |
| Feature buy | US8038524 (Aristocrat, priority 1999-08-25): https://patents.google.com/patent/US8038524 ; US9685046 (Aristocrat, priority 2011-02-03): https://patents.google.com/patent/US9685046 ; US9092930 (purchasable bonus opportunities): https://patents.google.com/patent/US9092930 | 8038524: Google "expired", adj. 2024-10-18. 9685046: Google "active", adj. 2033-01-31. 9092930: unknown | 8038524 (page): extra wager chosen independently of base game makes a feature eligible, with no guarantee it occurs. 9685046 (page): base wager plus two enhanced wagers, the higher ratio gets a greater bonus when a shared trigger event occurs | Our UNLEASH is a direct, guaranteed entry (100x) with a 30x floor, not an extra wager with a chance of occurring. This differs from the claim gists as read, but the claims were only seen via summary |

## Risk tags (meaning: worth showing to an IP attorney)

| Mechanic | Tag | Reason |
|---|---|---|
| Per-cell growing multiplier, persistent through free spins, summed per cluster | MEDIUM | Closest hits are position-bound or persistent multipliers (US8197328, US7695365), both listed active; the exact combination was not found but the search was shallow |
| Cascade / tumble | MEDIUM | Several active IGT cascading families; claim text not read |
| Cluster pays | UNKNOWN | Nothing found; weak search coverage |
| Wild substitution in cascade | LOW to MEDIUM | US8105151 title mentions cascading with wilds; claims not read |
| Free spins by scatter count, retrigger | LOW | Generic feature; no specific patent identified |
| Hold-and-spin family | LOW | No respin or locking in our design |
| Megaways | LOW | Fixed grid |
| Feature buy | LOW to MEDIUM | Aristocrat family expired or active depending on member; ours is direct purchase, not an extra wager |
| Win cap, stateless rounds | LOW | Back-end behavior; nothing specific found |

## Design-around options (math effect: all require re-running the optimizer, 96.0% RTP target and 5000x cap unchanged)
1. Global multiplier instead of per-cell: one counter that grows by a step per winning cluster or per tumble. Removes the position-bound claim language. Effect: variance drops; with +6 per cell the current top end (512 per cell, sums over many cells) cannot be matched, so tune the step and cap, and expect the hit rate of 1000x+ to fall.
2. Multiplier by cascade depth: multiplier = f(tumble index in the current spin), reset each spin. Nothing persists between spins. Effect: much lower mean multiplier and lower volatility; raise the base pays or the step to hold RTP. It removes the "persists through the feature" element.
3. Reset on each spin, per cell: the cells grow within the tumble chain only. Keeps the visual identity. Effect: lower peak than the persistent grid; the feature gets less snowball, the 5000x cap is reached more rarely.
4. Trigger changes (less important): change scatter counts or spin awards, or use a fixed spin count; this affects hit frequency only and is unlikely to matter for the multiplier question.
5. Feature buy: keep as is, or add a chance element only if counsel advises (this would move it toward the wager-with-no-guarantee claim shape, so it is not recommended without advice).

## Questions for an IP attorney
1. Do the claims of US8197328 and US7695365 read on a multiplier attached to every grid position that grows when the position is in a winning cluster, with no held symbol and no random conversion event?
2. Do any claims of the IGT cascading families (US9437084, US8574059, US8105151, US8690660, US10607448) cover plain tumbles with wild substitution on a 6x5 cluster grid?
3. Is there a BTG/Evolution, NetEnt, Pragmatic Play or Light & Wonder patent or pending application on persistent position multipliers? (Not found here; please run a professional search including Espacenet and EUIPO.)
4. Is a guaranteed direct-entry purchase at 100x within or outside US9685046 and its family?
5. Which jurisdictions matter for launch, and are there non-US patents (EP/AU) on these mechanics?
6. Is "Cluster Pays" or "Avalanche" a trademark risk for our rules text?
