# Agent Mambo: event schema of the books (math game `agent_mambo`)

Books are the SDK format: `{id, payoutMultiplier, events[]}`. In `*.jsonl` `payoutMultiplier` is an integer in 1/100 x of the bet (like the SDK books); in `*.json` it is in x of the bet. Every `amount`, `win`, `totalWin` inside events is an integer in 1/100 x of the bet (`finalWin.amount == payoutMultiplier` of the `.jsonl`).

Grid: 6 reels x 5 visible rows. Two row conventions coexist (same as the mining game):
- PADDED rows 1..5 (row 0 and row 6 are the half-visible top/bottom symbols): `reveal.board` (7 rows per reel), `winInfo.wins[].positions`, `winInfo...meta.overlay`, `tumbleBoard.explodingSymbols`, `freeSpinTrigger/Retrigger.positions`.
- VISIBLE rows 0..4: every `fuse*` event (`cells`, `newCells`). Never padded. Conversion: padded = visible + 1.

## Ordinary events (unchanged SDK events)
| type | fields |
|---|---|
| `reveal` | `board` (6 x 7 `{name, scatter?, wild?}`), `paddingPositions`, `gameType` ("basegame" / "freegame"), `anticipation[6]` |
| `winInfo` | `totalWin`, `wins[]` = `{symbol, clusterSize, win, positions[{reel,row}] (padded), meta:{globalMult, clusterMult (always 1), winWithoutMult, overlay:{reel,row}}}`. `win == winWithoutMult x globalMult` (capped at 500000 on the cap step) |
| `updateTumbleWin` | `amount` (running win of the spin) |
| `tumbleBoard` | `explodingSymbols[{reel,row}]` (padded, sorted by reel), `newSymbols[reel][]` (top to bottom). For a reel that loses k symbols, `newSymbols[reel]` has k entries: k-1 new visible symbols plus the new top padding symbol as FIRST entry; the old top padding symbol drops into row 1. Rebuild: remove the exploding rows of the 7-row column, then prepend `newSymbols[reel]` |
| `setWin` / `setTotalWin` | `amount` (and `winLevel` on setWin) at the end of every spin |
| `freeSpinTrigger` | `totalFs` (10/12/15/18/20), `positions` (scatters, padded) |
| `updateFreeSpin` | `amount` (spin number), `total` |
| `freeSpinRetrigger` | `totalFs` (new total), `positions` |
| `freeSpinEnd` | `amount` (free-spin total), `winLevel` |
| `wincap` | `amount` = 500000 (5000x). After it the remaining free spins are still listed (each with reveal, fusePath, capped winInfo, no tumbles): the front end skips from `wincap` to `freeSpinEnd` |
| `finalWin` | `amount` = payout |

## NEW: global multiplier meter (free spins only)
`{index, type:"updateGlobalMult", globalMult:int}` (SDK event, reused)
- Emitted once at the start of the feature, right after `freeSpinTrigger` and before the first `updateFreeSpin`: `globalMult` = 1.
- Then once after each WINNING step of a free spin, after that step's `winInfo` and `updateTumbleWin`, before the `tumbleBoard`: `globalMult` = min(previous + 8, 100). So the step itself is paid with the PREVIOUS value (see `winInfo...meta.globalMult`), the new value applies to the next step.
- The wire's blast re-evaluation counts as a step: its `winInfo` is paid with the current value and is followed by a new `updateGlobalMult`.
- It persists through the whole feature: not reset at `updateFreeSpin`, kept after `freeSpinRetrigger`. Starting value x1, step +8 (x1, x9, x17, ... , x97, x100), cap x100.
- Base game: never emitted, `meta.globalMult` is always 1 (no multiplier). A base book that triggers free spins emits the first `updateGlobalMult` only at feature start.
- Not emitted after `wincap`.

## Bomb-timer wire (events keep the old fuse names)
One wire per spin (base and every free spin). All cells are VISIBLE rows 0..4.
1. `{index, type:"fusePath", cells:[{reel,row} x8], burned:1}`: emitted right after `reveal` (index 1 of the spin). The path is self-avoiding, adjacent steps are right (weight 2), up or down (weight 1), starts on reel 0. `burned` = 1: the first cell is lit.
2. `{index, type:"fuseBurn", burned:int, newCells:[{reel,row}]}`: after each `tumbleBoard` of a winning step (+1 cell per winning step, `newCells == path[oldBurned:burned]`, `burned <= 8`). Nothing is emitted once the wire is fully burnt.
3. End of the spin (board without win, no wincap): exactly one of
   - `{index, type:"fuseFizzle", burned:int}`: `burned < 3` (or nothing removable).
   - `{index, type:"fuseBlast", cells:[{reel,row}]}`: `burned >= 3`. NEW: `cells` are the burnt cells (`path[:burned]`) that are not scatters, they VANISH. There is no `replaced` field and no wild is created. The fuse is spent afterwards.
4. Order after a blast (the board is refilled like a tumble, then evaluated again):
   `fuseBlast` -> `tumbleBoard` (`explodingSymbols` = the blast cells in PADDED rows = `row+1`, `newSymbols` as above) -> if the new board wins: `winInfo`, `updateTumbleWin`, (free spins: `updateGlobalMult`), `tumbleBoard`, ... (normal cascade, no new `fuseBurn`/`fuseBlast`/`fuseFizzle`: the wire is spent) -> `setWin`/`setTotalWin`. If the new board does not win: straight to `setWin`/`setTotalWin` (a base spin with no win overall has only `setTotalWin`).
   The scatters on the board are never removed by a blast, but a refill can bring new scatters (a base spin can then trigger free spins after the cascade).
5. Wincap in the middle of a spin: no end event (`fuseBlast`/`fuseFizzle`) is emitted.

Typical free-spin sequence with a blast:
`reveal, fusePath, winInfo, updateTumbleWin, updateGlobalMult(9), tumbleBoard, fuseBurn(2), winInfo, updateTumbleWin, updateGlobalMult(17), tumbleBoard, fuseBurn(3), fuseBlast, tumbleBoard, winInfo(meta.globalMult 17), updateTumbleWin, updateGlobalMult(25), tumbleBoard, setWin, setTotalWin, updateFreeSpin`

## What the front end must change versus the mining game
- `gridMultipliers` / `updateGrid` no longer exist (no per-cell veins). Draw the meter from `updateGlobalMult.globalMult`.
- `fuseBlast.cells[].replaced` no longer exists; do not swap cells to `W`. Play the cells vanishing, then the following `tumbleBoard`.
- The wire is only worth drawing once it has started to burn (first `fuseBurn`); spins without any `fuseBurn` end in a `fuseFizzle {burned:1}` right after `fusePath`.
