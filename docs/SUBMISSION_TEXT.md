# Review submission text: The Unleashed Mine

(English, ready to paste. Figures measured on the published math files; see `docs/READINESS.md`.)

## Theme
The Unleashed Mine is a 6x5 cluster slot set in an old gold mine. Old Gus, an adult prospector drawn for this game, works the seam with a pickaxe and a lantern. Dynamite is the key to the big rounds. The look is a flat, 1960s-style cartoon with thick ink outlines.

## How it plays
- Grid: 6 reels x 5 rows. Wins are clusters of 5 or more matching symbols touching horizontally or vertically. Cluster size sets the pay tier (5, 6-8, 9-12, 13+).
- Symbols: four gems (Ruby, Sapphire, Emerald, Topaz) and four mining tools (Amethyst, Pickaxe, Lantern, Hard hat) pay. The Gold Nugget is wild and substitutes for any paying symbol, but not for the scatter.
- Cascades: winning symbols are removed, new symbols fall in, and the board is checked again until no cluster remains. All wins from one spin are added up and paid at the end of the round.
- Scatter: Dynamite. 4 or more Dynamite symbols start the Unleashed Mine free spins: 4 give 10 spins, 5 give 12, 6 give 15, 7 give 18, 8 give 20.
- Free spins with vein multipliers: every cell starts at x4. Each cell inside a winning cluster gains +6, up to x512 per cell, and stays upgraded for the rest of the free spins. A cluster pays its table value times the sum of the multipliers on its cells.
- Retrigger: 3 or more Dynamite during free spins add spins: 3 give 5, 4 give 8, 5 give 10, 6 give 12, 7 give 15, 8 give 18.
- UNLEASH: a second bet mode that starts the free spins directly. It costs 100x the bet and is offered only from a minimum price (50 in USD/EUR/CAD/GBP and social currencies, 1,000 MXN, 7,500 JPY), which is shown on the button. A confirmation dialog states the exact cost before anything is charged. Bet levels are set so UNLEASH lands on round prices (50, 100, 200, 300, 500, 1,000 and so on).
- The game is stateless: every round is complete after one request. There are no jackpots, no gamble feature and no early cash-out.

## Math (measured on the uploaded files, 100,000 outcomes per mode)
| Mode | Cost | RTP | Hit rate | Max win | Chance of max win |
|---|---|---|---|---|---|
| Base game | 1x | 96.00% | 29.07% | 5,000x | about 1 in 5,000,025 |
| UNLEASH | 100x | 96.00% | 100% (floor of 30x) | 5,000x | about 1 in 50,000 |

All payouts are multiples of 0.1x. Both modes carry the same 96.00% RTP. Max win is 5,000x the bet in both modes (the cap applies to the total of the round).

## Volatility
Medium-high. In the base game 70.9% of spins pay nothing, 11.2% pay under 1x, and about 14.9% pay 1x-5x; the free spins start about once per 200 spins (0.499%) and carry most of the large wins (wins of 40x and above hold about 35% of the base RTP). The standard deviation of the return is 6.73 per unit staked in the base game. UNLEASH always returns at least 30x of its 100x price; the median is 39.9x of the 100x price, 81.6% of buys return 20x-60x, about 16.6% return 100x or more, and 0.33% return 1,000x or more (standard deviation 1.61 per unit staked). In UNLEASH, most of the value comes from the less frequent large rounds, so the typical buy returns less than its price.

## Originality
- The mascot Old Gus, the symbols, the logo, the store tile and the cover art were drawn in-house as vector artwork for this game.
- No third-party artwork, no licensed characters and no generative AI were used for the artwork or the interface.
- The interface uses system fonts only. Sound effects and music are synthesised in the browser at run time; no audio files or samples are shipped.
- The title was chosen to avoid restricted wording. This statement describes how the work was made; it is not a claim of legal clearance, trademark availability or patent freedom, which we have not obtained.

## Engine guidelines addressed
Evidence and test output: `frontend/tests/guidelines/REPORT.md` (run with `node frontend/tests/guidelines/run.mjs`; at the last run 37 pass, 0 fail, 2 flagged at risk with notes).
- Wallet flow: authenticate on load, play with sessionID/amount/mode, end-round only after a win, no play on zero balance, active round restored with the original bet (checks 181, 183, 187, 221, 222).
- Bet config entirely from the RGS (minBet, maxBet, stepBet, defaultBetLevel, betLevels) (242).
- Currencies USD, EUR, CAD, MXN, JPY, XSC, XGC; social currencies never show a dollar sign; small payouts are never rounded to zero (219, 78, 273).
- Social mode (`social=true`): no restricted words in any visible text, the rules screen included (77, 225).
- UNLEASH needs a confirmation that shows the cost; autoplay opens its settings first and sends no play by itself (31, 104).
- Replay mode: no wallet calls, replay endpoint only, bet amount and mode cost shown, a Play button, no betting UI, replay again, failure message (171-174, 188, 243).
- Layout and input: viewport meta and touch-action, no scrollbars at four viewport sizes, space bar plays once without scrolling, sound toggle mutes everything (223, 227, 228, 107).
- Text: no missing keys, undefined or NaN in English or an unknown language (239, 240); in-game rules show RTP and max win per mode, symbols, modes and costs, free spins and retrigger, controls (RULES).
- No external network hosts and no console errors during launch, play and replay (EXT, CONSOLE); the built bundle was served from a sub-path and checked for absolute URLs and external hosts.
- Displayed win equals bet times payoutMultiplier/100 for every book type in both modes (WIN checks).
- Flagged by our own tests as at risk (listed openly): the word "stake" occurs only in a social-wording replacement rule that is not displayed (275); very large 7-figure balances in some currencies may clip at the smallest viewport (219b).
