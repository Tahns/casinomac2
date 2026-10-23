# Bet levels: recommended template for The Unleashed Mine

## What a bet-level template contains

The repo documentation (`math/docs/rgs_docs/RGS.md`, section "Bet Levels", and the `/wallet/authenticate` response) does not define a separate Studio object called "betlevel template". It defines the `config` block the RGS returns to the front end:

| Field | Meaning | Rule from the docs |
|---|---|---|
| `minBet` | smallest accepted bet | a bet must be >= `minBet` |
| `maxBet` | largest accepted bet | a bet must be <= `maxBet` |
| `stepBet` | bet granularity | a bet must be divisible by `stepBet` |
| `defaultBetLevel` | bet preselected at load | should be one of `betLevels` |
| `betLevels` | the ladder shown to the player | optional but recommended |

All values are micro-units (1,000,000 = 1.00 of the currency). The debit for a round is `bet x mode cost` (base 1x, UNLEASH 100x). Assume the Studio template is these five fields, one set per currency (or one set with per-currency scaling); confirm the exact form in the dashboard.

Front-end behaviour (`frontend/src/bet.js`): the ladder comes entirely from `betLevels` (sorted, de-duplicated). If `betLevels` is absent it derives levels from `minBet`/`maxBet`/`stepBet`. `defaultBetLevel` is used if it is in the ladder, otherwise the next level up. UNLEASH is offered only when `bet x 100 >= UNLEASH_MIN_PRICE[currency]`; below that the button shows "from {min}". Math files carry no bet-level data (`library/configs/config.json` has `betDenomination: 1000`, `minDenomination: 10`, i.e. a 0.10 minimum denomination, which is why 0.10 is the floor and step below).

## Recommended ladders

Rule: every level is a multiple of `stepBet`, and every level at or above the UNLEASH minimum price produces a round UNLEASH price (the 1-2-5 style ladder times 100 gives 50, 100, 200, 300, 500, 1000 ...). Prices below the minimum show base play only.

### USD, EUR, CAD, GBP, XSC, XGC (UNLEASH_MIN_PRICE = 50)

| | micro-units |
|---|---|
| minBet | 100000 (0.10) |
| maxBet | 100000000 (100) |
| stepBet | 100000 (0.10) |
| defaultBetLevel | 1000000 (1.00) |

betLevels (units): 0.10, 0.20, 0.50, 1, 2, 3, 5, 10, 20, 50, 100
betLevels (micro): 100000, 200000, 500000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000, 50000000, 100000000

UNLEASH price for each level (verified with `bet.js`):

| bet | 0.10 | 0.20 | 0.50 | 1 | 2 | 3 | 5 | 10 | 20 | 50 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UNLEASH | n/a | n/a | 50 | 100 | 200 | 300 | 500 | 1000 | 2000 | 5000 | 10000 |

Max win at the top level is 5000x the bet = 500,000 on base play; UNLEASH at 100 costs 10,000 and also caps at 5000x of the bet (500,000). If risk wants a lower exposure, drop 100 from the ladder (maxBet 50).

### MXN (UNLEASH_MIN_PRICE = 1000)

| | micro-units |
|---|---|
| minBet | 1000000 (1) |
| maxBet | 2000000000 (2000) |
| stepBet | 1000000 (1) |
| defaultBetLevel | 10000000 (10) |

betLevels: 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000
betLevels (micro): 1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000, 200000000, 500000000, 1000000000, 2000000000
UNLEASH: n/a for 1, 2, 5; then 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000 for bets 10 ... 2000.

### JPY (UNLEASH_MIN_PRICE = 7500; no decimals)

| | micro-units |
|---|---|
| minBet | 10000000 (10) |
| maxBet | 10000000000 (10000) |
| stepBet | 10000000 (10) |
| defaultBetLevel | 100000000 (100) |

betLevels: 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000
betLevels (micro): 10000000, 20000000, 50000000, 100000000, 200000000, 500000000, 1000000000, 2000000000, 5000000000, 10000000000
UNLEASH: n/a for 10, 20, 50 (50 x 100 = 5000 < 7500); then 10000, 20000, 50000, 100000, 200000, 500000, 1000000 for bets 100 ... 10000. A bet of 75 would be the exact minimum but is not a round price, so the first UNLEASH level is 100 (10,000).

### Other currencies
Any currency not in `UNLEASH_MIN_PRICE` falls back to 50 units in `bet.js`. For a currency worth much less than 1 USD per unit, add it to the table in `src/bet.js` (front-end owner) and use a ladder shifted by a power of ten like MXN/JPY above.

## What the dashboard needs

1. One bet-level template (the five fields above) for the USD-class ladder, applied to USD, EUR, CAD, GBP, XSC, XGC. If Studio supports per-currency overrides, add MXN and JPY with the ladders above; if it allows only one template, use the USD ladder everywhere (MXN/JPY players then see UNLEASH from a smaller round multiple: the front end still enforces its own minimum price, so nothing breaks).
2. `defaultBetLevel` must be in `betLevels`; `minBet`/`maxBet` must equal the first/last level; `stepBet` must divide every level (0.10 divides all USD levels, 1 divides all MXN levels, 10 divides all JPY levels).
3. Level counts stay small (11, 11, 10), well under the front-end cap of 200.
