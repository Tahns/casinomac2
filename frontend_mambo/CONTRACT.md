# Agent Mambo v2: front-end contract (what the books say, what the front end must do)

Owner: WP11 CONTENT-RELEASE. Binding design spec: `docs/research2/SYNTHESIS.md` (sections 2, 3, 7, 8, 9); user directives:
`docs/research2/00_USER_DIRECTIVES.md`; frozen module interfaces: `docs/v2/INTERFACES.md`; file ownership: SYNTHESIS section 9 (one owner per
file; a change in someone else's file goes through `docs/v2/requests/<FROM>_to_<TO>.md`). The math is FINAL and lives in
`math/games/agent_mambo` (never edited by the front end). Every JSON example below is copied from a real FINAL book in `fixtures/`
(book id and file given); `...` marks where a long array was shortened for this page.

## 1. Game in one paragraph
6 reels, cluster wins (5+ orthogonally adjacent equal symbols, wild `W` "Mambo Star" substitutes, scatter `S` "Classified Dossier"), tumbles,
a bomb-timer wire on every spin (technical event names `fuse*`, never shown to players). Base game: one of four floor plans per spin (Mezzanine,
Atrium, Lobby, Annex). 4+ scatters start free spins (10/12/15/18/20; retrigger 3+ gives 5/8/10/12/15/18), always on the Mezzanine, with one
mission drawn at the trigger: The Briefing (Clearance Dial +8 per winning step), Sealed Orders (wins banked at x1, envelope opened once per
spin at bank x dial, dial +7), Ballroom Blackout (2x2 spotlight route, lit clusters x4, dial +3). Win cap 5000x. RTP 96.00% in every mode.

## 2. Modes (`fixtures/index.json` = the published `index.json`)
| `index.json` name | cost | player name | free spins play | `missionAssigned` | other new events |
|---|---|---|---|---|---|
| `base` | 1 | Base Game | the mission drawn at the trigger (final shares: Briefing 40.0 %, Orders 30.0 %, Blackout 30.0 %) | yes, every trigger | `layout` at index 0 of EVERY base book |
| `bonus` | 100 | SECRET ENTRANCE: Stage Door | The Briefing | NO (these are the v1 books): absent = Briefing, dial 1 / +8 / cap 100, `payTiming` step, wire 8 | none |
| `entrance_orders` | 100 | SECRET ENTRANCE: Coat Check | Sealed Orders | yes | `caseOpen` |
| `entrance_blackout` | 100 | SECRET ENTRANCE: Service Stairs | Ballroom Blackout | yes | `lightRoute` |

Event types present (FINAL fixtures, checked): base `caseOpen finalWin freeSpinEnd freeSpinRetrigger freeSpinTrigger fuseBlast fuseBurn
fuseFizzle fusePath layout lightRoute missionAssigned reveal setTotalWin setWin tumbleBoard updateFreeSpin updateGlobalMult updateTumbleWin winInfo
wincap`; `bonus` = base minus `layout missionAssigned caseOpen lightRoute`; `entrance_orders` adds `missionAssigned caseOpen`;
`entrance_blackout` adds `missionAssigned lightRoute`. Unknown event types must be ignored (`default: return null`), an unknown mission id plays
with the Briefing look. Door books start with one ordinary base spin (Mezzanine, no `layout`), then `freeSpinTrigger`.

Amounts: every `amount`, `win`, `totalWin`, `bank` is an integer in 1/100 x of the play amount, a multiple of 10. `payoutMultiplier` in the
`.jsonl` books is the same unit (`finalWin.amount == payoutMultiplier`); the RGS serves `round.payoutMultiplier` as a plain multiple. Staging never
reads `winLevel`: the level of a result is payout / (play amount x mode cost) (`src/render/celebrate.js`).

## 3. Events the front end consumes (v2 additions and changes)

### 3.1 `layout` (NEW, base only, index 0, directly before the base `reveal`)
Consumer: `src/render/geo.js` (`geo.setLayout(ev)`), the blueprint layer (`src/render/layers/`), the board shape (`src/render/index.js`).
`rows` = frame height (5 or 6); `cells[r]` = sorted GEOMETRIC rows present in reel r (0 = top); `cellCount`; `links` reserved (empty).
A book without `layout` is Mezzanine. Free spins never carry one and are ALWAYS Mezzanine: call `geo.setLayout(null)` when the first `reveal`
with `gameType: "freegame"` arrives (not earlier: `freeSpinTrigger.positions` still refer to the base plan).
```json
{"index":0,"type":"layout","id":"atrium","name":"Atrium","cols":6,"rows":5,"cells":[[1,2,3],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[1,2,3]],"cellCount":26,"links":[]}
```
(base book 29564). The four plans as the books announce them (final share of base spins from `library/shares.json`):

| id | name | frame rows | cells | share | example book |
|---|---|---|---|---|---|
| `mezzanine` | Mezzanine | 5 | 30, rows 0-4 on all reels | 50.2 % | 5314 |
| `atrium` | Atrium | 5 | 26, reels 0 and 5 rows 1-3 | 21.4 % | 29564 |
| `lobby` | Lobby | 5 | 24, rows 1-4 on all reels | 13.8 % | 10199 |
| `annex` | Annex | 6 | 36, rows 0-5 on all reels | 14.6 % | 25532 |

### 3.2 `reveal` (CHANGED shape)
`board[r]` has `len(cells[r]) + 2` symbols (top pad, the present cells top to bottom, bottom pad). Pads are never drawn as cells.
`anticipation` and `paddingPositions` keep 6 entries. Atrium book 29564: column lengths `5,7,7,7,7,5`; its first free-spin reveal: `7,7,7,7,7,7`.

### 3.3 Row languages (unchanged SDK emitters, mapped by `geo.js`)
* COMPACT-PADDED (`padded = compactIndex + 1`; geometric row = `cells[reel][padded - 1]`): `winInfo.wins[].positions`, `winInfo.wins[].meta.overlay`,
  `tumbleBoard.explodingSymbols`, `freeSpinTrigger|Retrigger.positions`.
* GEOMETRIC (never padded): `fusePath.cells`, `fuseBurn.newCells`, `fuseBlast.cells`, `lightRoute.route`, the `layout` event.
Atrium book 29564, step 1 (padded `{reel:0,row:2}` is geometric row 2 on reel 0 = cells `[1,2,3]`; padded `{reel:1,row:3}` is geometric row 2 on reel 1):
```json
{"index":3,"type":"winInfo","totalWin":130,"wins":[{"symbol":"H3","clusterSize":5,"win":130,"positions":[{"reel":1,"row":3},{"reel":0,"row":2},{"reel":2,"row":3},{"reel":3,"row":3},{"reel":3,"row":4}],"meta":{"globalMult":1,"clusterMult":1,"winWithoutMult":130,"overlay":{"reel":2,"row":3}}}]}
```

### 3.4 `missionAssigned` (NEW: after `freeSpinTrigger`, directly before the first `updateGlobalMult`)
Consumer: `src/render/index.js` (dial step chip, mission look), layers (dossier cutscene, costume change), heroine (`outfit`). Key order is fixed.
`dialStep` is the "+N" chip; `payTiming` is `spinEnd` only for Orders; `lens` only for Blackout; `fuseLen` = length of every free-spin
`fusePath.cells` (do not hard-code 8); `layout` reserved (always `mezzanine`).
```json
{"index":6,"type":"missionAssigned","mission":"briefing","totalFs":10,"dialStart":1,"dialStep":8,"dialCap":100,"payTiming":"step","layout":"mezzanine","fuseLen":8}
{"index":6,"type":"missionAssigned","mission":"orders","totalFs":12,"dialStart":1,"dialStep":7,"dialCap":100,"payTiming":"spinEnd","layout":"mezzanine","fuseLen":8}
{"index":6,"type":"missionAssigned","mission":"blackout","totalFs":12,"dialStart":1,"dialStep":3,"dialCap":100,"payTiming":"step","lens":{"w":2,"h":2,"mult":4},"layout":"mezzanine","fuseLen":8}
```
(base books 5259, 5483, 2344; each is preceded by `freeSpinTrigger` and followed by `{"type":"updateGlobalMult","globalMult":1}` then `updateFreeSpin`.)

### 3.5 `updateGlobalMult` (UNCHANGED event, per-mission step)
x1 after `missionAssigned` (or after `freeSpinTrigger` in a `bonus` book), then after each winning step (after `winInfo` + `updateTumbleWin`, before
`tumbleBoard`). Briefing 1, 9, 17 ... 97, 100; Orders 1, 8, 15 ... 99, 100; Blackout 1, 4, 7 ... 100. Persists through retriggers, never drops.
Not emitted after `wincap`. Dial bands (Largo / Andante / Allegro / Presto at < 17 / < 41 / < 81 / >= 81 of cap 100) are a readout, never odds.

### 3.6 Sealed Orders: banked `winInfo` and `caseOpen` (NEW)
Per free spin: `reveal, fusePath, winInfo(banked), updateTumbleWin, updateGlobalMult, tumbleBoard, fuseBurn, ..., fuseFizzle | fuseBlast (+ tumbleBoard,
winInfo ...), caseOpen, setWin, setTotalWin, updateFreeSpin`.
* `winInfo.wins[].meta.banked == true`, `meta.globalMult == 1`, `win == winWithoutMult` (x1). NEVER add these to the WIN counter, never celebrate them.
* `updateTumbleWin.amount` = the running BANK of the spin.
* `caseOpen {bank, mult, win, capped}`: `mult` = the dial after that spin's steps, `win == bank x mult`, `setWin.amount == caseOpen.win`. A spin without
  a winning step has no `caseOpen` and no `setWin`.
Orders book 5797, one whole free spin (positions shortened):
```json
{"index":14,"type":"fusePath","cells":[{"reel":0,"row":0},{"reel":1,"row":0},{"reel":1,"row":1},{"reel":2,"row":1},{"reel":3,"row":1},{"reel":3,"row":0},{"reel":4,"row":0},{"reel":4,"row":1}],"burned":1}
{"index":15,"type":"winInfo","totalWin":10,"wins":[{"symbol":"L4","clusterSize":5,"win":10,"positions":[{"reel":0,"row":4},{"reel":1,"row":4},...],"meta":{"globalMult":1,"clusterMult":1,"winWithoutMult":10,"overlay":{"reel":1,"row":4},"banked":true}}]}
{"index":16,"type":"updateTumbleWin","amount":10}
{"index":17,"type":"updateGlobalMult","globalMult":8}
{"index":18,"type":"tumbleBoard","newSymbols":[...],"explodingSymbols":[{"reel":0,"row":4},{"reel":0,"row":5},{"reel":1,"row":4},{"reel":2,"row":4},{"reel":2,"row":3}]}
{"index":19,"type":"fuseBurn","burned":2,"newCells":[{"reel":1,"row":0}]}
{"index":20,"type":"fuseFizzle","burned":2}
{"index":21,"type":"caseOpen","bank":10,"mult":8,"win":80,"capped":false}
{"index":22,"type":"setWin","amount":80,"winLevel":2}
{"index":23,"type":"setTotalWin","amount":80}
{"index":24,"type":"updateFreeSpin","amount":3,"total":12}
```
The cap: when `bank x mult` reaches 5000x, `capped` is true, `win` is clipped to 500000 and `wincap` follows INSTEAD of `setWin` (Orders book 700):
```json
{"index":43,"type":"tumbleBoard","newSymbols":[[{"name":"W","wild":true}],[{"name":"H4"},{"name":"H1"}],[{"name":"H3"}],[{"name":"H2"}],[],[]],"explodingSymbols":[{"reel":0,"row":3},{"reel":1,"row":3},{"reel":1,"row":2},{"reel":2,"row":2},{"reel":3,"row":2}]}
{"index":44,"type":"caseOpen","bank":26470,"mult":50,"win":500000,"capped":true}
{"index":45,"type":"wincap","amount":500000}
{"index":46,"type":"setTotalWin","amount":500000}
```
Rarely the banked amounts alone reach the cap at x1: then `wincap` follows `updateTumbleWin` and there is NO `caseOpen` (0 such books in the
published `entrance_orders` table). There is never a `caseOpen` after `wincap`.

### 3.7 Ballroom Blackout: `lightRoute` (NEW) and lit `winInfo`
Emitted for EVERY free spin right after its `reveal`, before `fusePath`. `route[k]` = top-left GEOMETRIC cell of the `w x h` window at evaluation
step k; step k = the number of `tumbleBoard` events (tumbles AND the post-blast refill) since this spin's `reveal`; after the last entry the window
stays on it. Read `route.length` (6 today). The window always fits the 6x5 board.
`winInfo.wins[].meta` gains `lit` and `lensMult` (4 when lit, else 1): `win == winWithoutMult x globalMult x lensMult`. Positions stay compact-padded.
Blackout book 1459 (first free spin; `{reel:3,row:1}` is the window of step 0, covering reels 3-4, geometric rows 1-2):
```json
{"index":9,"type":"lightRoute","w":2,"h":2,"lensMult":4,"route":[{"reel":3,"row":1},{"reel":2,"row":2},{"reel":1,"row":3},{"reel":0,"row":2},{"reel":1,"row":1},{"reel":2,"row":0}]}
{"index":11,"type":"winInfo","totalWin":24500,"wins":[{"symbol":"H1","clusterSize":18,"win":24000,"positions":[{"reel":0,"row":3},{"reel":1,"row":3},...],"meta":{"globalMult":1,"clusterMult":1,"winWithoutMult":6000,"overlay":{"reel":3,"row":3},"lit":true,"lensMult":4}},{"symbol":"H2","clusterSize":6,"win":500,"positions":[{"reel":1,"row":4},{"reel":2,"row":4},...],"meta":{"globalMult":1,"clusterMult":1,"winWithoutMult":500,"overlay":{"reel":2,"row":3},"lit":false,"lensMult":1}}]}
```

### 3.8 Unchanged
`freeSpinTrigger`, `freeSpinRetrigger`, `updateFreeSpin`, `freeSpinEnd`, `setWin`, `setTotalWin`, `wincap`, `finalWin`, `fusePath`, `fuseBurn`,
`fuseFizzle`, `fuseBlast` (blast cells VANISH, then a standard `tumbleBoard` whose `explodingSymbols` are the same cells, compact-padded, then the
board is evaluated again). Full v1 schema: `fixtures/v1/EVENTS.md`.

## 4. Data files the front end reads (not events)
* `data/rules_data.json` (generated by `node tools/gen_rules_data.mjs`; `--check` fails when stale): paytable, tiers, free-spin awards, dial
  start/step/cap, wire parameters, `modes[] {name, cost, rtp, maxWin}` recomputed from the published lookup tables, `shares` (door facts
  `{medianX, pGtPrice, rtp, maxWin}` per door mode), `layouts[] {id, name, rows, cells, cellCount, share}`, `missions[] {id, name, door, mode, share,
  dialStart, dialStep, dialCap, payTiming, lens?}`, `base {hit, pGtStake, triggerOneIn}`. The rules screen and the door cards print only these
  numbers (Engine [266]); nothing is rounded into a claim, no door or plan is called better.
* `fixtures/` (dev and tests only, never shipped): `index.json`, small FINAL samples `books_<mode>_sample.jsonl`, the matching lookup rows, `PICKS.md`
  (ids per category), `SOURCE.json` (hashes); regenerate with `node tools/build/make_fixtures.mjs`. v1 books in `fixtures/v1/`.

## 5. Platform rules (Engine approval guidelines; must hold)
Money is micro-units (1_000_000 = 1.00). `rgs_url` may come without `https://`. `/wallet/authenticate` on load; bet configuration entirely from the
response; if `round.active` the amount becomes `round.amount`. `/wallet/end-round` only for rounds with payoutMultiplier > 0. No `/wallet/play` when
balance < amount x mode cost (covers space bar, autoplay, the SECRET ENTRANCE). Space bar = the main button. Autoplay opens a settings panel.
A mode costing more than 2x needs a confirmation stating the cost [31]; the door picker has nothing pre-selected and focus on Cancel. One sound
control mutes everything; sliders Master / Music / Effects. Replay (`replay=true`): GET `{rgs_url}/bet/replay/{game}/{version}/{mode}/{event}`, no
wallet calls, shows the amount and, for cost > 1x, the multiplier and real cost [174]. Social mode (`social=true`): no restricted word (list in
`tests/text/restricted.mjs`), "Win table", "play amount". Rules state RTP and max win per mode, every symbol value, win formation, every mode with
its cost, free spins and retrigger, every control [235], and the disclaimer [185] verbatim (`DISCLAIMER` in `src/rules.js`). No generative AI for
art or sound; nothing is ever called patent-free. Viewports: 1280x720, 1024x576, 425x812, 400x225.

## 6. Upload sets
* Front end: `npm run build` writes `dist/front/` and `dist/agent_mambo_front_v<VERSION>.zip` (only files reachable from `index.html`).
* Math: `npm run pack:math` validates `library/publish_files` (index.json strict form, per-mode RTP / max from the CSVs, sha256 against the SDK
  `config.json` and the `books_<mode>.verification.json` sidecars, payout hash through the SDK's own `verify_lookup_format`) and writes
  `dist/math_upload/` + `dist/agent_mambo_math_v<VERSION>.zip` (exactly `index.json`, `books_<mode>.jsonl.zst`, `lookUpTable_<mode>_0.csv`).
