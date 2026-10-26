# WP8 (MATH-MISSIONS) to the front end: what the books now say (events emitted by the math)

Source of truth: `docs/research2/SYNTHESIS.md` section 8 (items 4 to 7) and the emitters in `math/games/agent_mambo/{game_events.py,game_executables.py,game_override.py}`.
Every amount is an integer in 1/100 x of the bet, a multiple of 10. Unknown event types are ignored by the v1 renderer. All of this is
checked event by event by `math/games/agent_mambo/tools/mission_smoke.py::reconcile_book` (5000 books per mode, 0 errors, see PROGRESS.md);
the `tests/test_missions.py` suite builds corrupted books to prove that the check catches a wrong event.

## 1. Which mode shows what
| mode (index.json) | cost | free spins play | `missionAssigned` | other new events |
|---|---|---|---|---|
| `base` | 1 | the mission drawn at the trigger (about 40 % Briefing / 30 % Orders / 30 % Blackout; the final shares are printed from `shares.json`) | yes, every trigger | `layout` at index 0 (WP7) |
| `bonus` (Stage Door) | 100 | The Briefing, always | NO: the 100k published books are the v1 books and stay valid. Absent = Briefing, dial 1 / +8 / cap 100, `payTiming` step, wire length 8 | none |
| `entrance_orders` (Coat Check) | 100 | Sealed Orders | yes | `caseOpen` |
| `entrance_blackout` (Service Stairs) | 100 | Ballroom Blackout | yes | `lightRoute` |
Doors never carry a `layout` event (Mezzanine). If the Blackout gate had failed the third door would be `entrance_fuse` (mission `fuse`,
"The Long Fuse"): it is NOT in the current mode list (config switch `THIRD_MISSION`), but the renderer should treat an unknown mission id as the Briefing look.

## 2. `missionAssigned` (after `freeSpinTrigger`, directly before the first `updateGlobalMult`)
```json
{"index":5,"type":"missionAssigned","mission":"blackout","totalFs":12,"dialStart":1,"dialStep":3,"dialCap":100,"payTiming":"step","lens":{"w":2,"h":2,"mult":4},"layout":"mezzanine","fuseLen":8}
```
`mission` briefing | orders | blackout (| fuse reserved). `dialStep` is the number in the "+N" chip: Briefing 8 (1, 9, 17 ... 97, 100), Orders 7 (1, 8, 15 ... 99, 100),
Blackout 3 (1, 4, 7 ... 100). `lens` only for blackout. `payTiming` is `spinEnd` only for Orders. `fuseLen` is the length of every free-spin `fusePath.cells`
(8 today; the base spin before the trigger always uses 8). Key order is fixed as above.

## 3. Sealed Orders (`payTiming: "spinEnd"`)
Per free spin: `reveal, fusePath, winInfo(banked), updateTumbleWin, updateGlobalMult, tumbleBoard, fuseBurn, ..., fuseFizzle | fuseBlast + tumbleBoard (+ more winInfo), caseOpen, setWin, setTotalWin`.
* `winInfo.wins[].meta.banked == true`, `meta.globalMult == 1`, `win == winWithoutMult` (x1). NEVER add these to the WIN counter, never celebrate them.
* `updateTumbleWin.amount` = the running BANK of the spin (sum of the `winInfo.totalWin` since the `reveal`).
* `updateGlobalMult` still arrives after every winning step (+7): the dial rises while the envelope fills.
* `caseOpen {"bank":120,"mult":22,"win":2640,"capped":false}`: after the last tumble / blast of a spin with bank > 0, before `setWin`. `bank` = sum of the banked steps,
  `mult` = the dial AFTER that spin's steps (so a spin with one winning step already opens at x8), `win == bank x mult`, and `setWin.amount == caseOpen.win`.
* The cap: if `bank x mult` reaches the win cap, `caseOpen.capped == true`, `caseOpen.win` is clipped to the cap (5000x = 500000), and `wincap` follows
  INSTEAD of `setWin` (the SDK emits no `setWin` after the cap). Rarely (about 1 book in 100 of the cap books) the cap is already reached by the banked amounts at x1: then `wincap` follows the
  `updateTumbleWin` and there is NO `caseOpen`. There is never a `caseOpen` after `wincap`. Remaining free spins after the cap are listed as today.
* A spin without a winning step has no `caseOpen` and no `setWin` (as before). Base-game spins of any mode pay per step as always.

## 4. Ballroom Blackout (`lens` in `missionAssigned`)
Per free spin: `reveal, lightRoute, fusePath, winInfo(lit), ...` (unchanged afterwards).
```json
{"index":8,"type":"lightRoute","w":2,"h":2,"lensMult":4,"route":[{"reel":1,"row":0},{"reel":2,"row":1},{"reel":3,"row":2},{"reel":4,"row":1},{"reel":3,"row":0},{"reel":2,"row":1}]}
```
* Emitted for EVERY free spin, right after its `reveal`, before any outcome. `route[k]` = top-left GEOMETRIC cell (free spins are Mezzanine: geometric = compact row) of the 2x2 window
  at evaluation step k. Step k = the number of `tumbleBoard` events (tumbles AND the post-blast refill) since this spin's `reveal`; after the last entry the window stays on it.
  Route length is 6 today (read `route.length`, do not hard-code). The window always fits the 6x5 board (reel 0..4, row 0..3 for a 2x2).
* `winInfo.wins[].meta` gains `lit` (any cluster cell inside the window) and `lensMult` (4 when lit, else 1): `win == winWithoutMult x globalMult x lensMult`. The base game and the other missions
  have neither key. `positions` of a win are still compact-padded (row - 1 = geometric row on Mezzanine).
* The beam is an overlay only; the dial rises +3 per winning step, paid at the current value (like the Briefing).

## 5. The Briefing and the dial (unchanged)
`updateGlobalMult {globalMult}`: x1 after `missionAssigned` (or after `freeSpinTrigger` in a v1 book), then after each winning step (after `winInfo` + `updateTumbleWin`, before `tumbleBoard`).
The "+N" chip must read `dialStep` from `missionAssigned` (default 8 when the event is absent). The dial persists through retriggers and never drops.

## 6. Reading rules that follow
* Payout shown = `finalWin / 100` x bet; `winLevel` fields are in multiples of the bet and say nothing about a 100x door: use payout / (bet x mode cost) (SYNTHESIS 8 item 8).
* Door books start with one ordinary base spin (a `reveal`, usually without a win, played at x1 like any base spin), then `freeSpinTrigger`.
* `event_config_<mode>.json` lists exactly the event types present in that mode's books (checked); base: 21 types, bonus: 17, entrance_orders: 19 (+ missionAssigned, caseOpen), entrance_blackout: 19 (+ missionAssigned, lightRoute).
