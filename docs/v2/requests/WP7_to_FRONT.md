# WP7 (MATH-GEO) to the front end (WP4 geo.js and render core, WP5 wire, WP6 layers, WP10 QA)

No front-end change is required to land the math; this is the list of facts the renderer must honour. All of them are asserted by
`math/games/agent_mambo/tests/test_layouts.py` against real books.

1. **Which spins carry a plan.** A `layout` event exists only on the BASE spin (index 0, directly before the base `reveal`). Free spins
   never emit one and are ALWAYS Mezzanine (6x5, `cells[r] = [0..4]`): after a Lobby / Atrium / Annex base spin triggers, the first
   free-spin `reveal` (`gameType: "freegame"`) has 7 symbols per column, and every later `winInfo`, `tumbleBoard`, `fusePath`,
   `fuseBurn`, `fuseBlast` of that book is on Mezzanine. Call `geo.setLayout(null)` when the first `freegame` reveal arrives, not
   earlier: `freeSpinTrigger.positions` still refer to the BASE plan (compact-padded on the plan that was playing).
2. **Old books and the v1 switch.** A book without a `layout` event is Mezzanine. With `layout_weights = {'mezzanine': 1}` the math emits
   no `layout` event at all (books are bit-identical to v1). With the 4-plan mix every base book announces its plan, Mezzanine included.
3. **Row languages.** `winInfo.wins[].positions`, `winInfo.wins[].meta.overlay`, `tumbleBoard.explodingSymbols` and
   `freeSpinTrigger|Retrigger.positions` are COMPACT-PADDED (`padded = compactIndex + 1`, geometric = `cells[reel][padded - 1]`).
   `fusePath.cells`, `fuseBurn.newCells`, `fuseBlast.cells` and the `layout` event are GEOMETRIC (never padded). After a `fuseBlast` the
   next event is a standard `tumbleBoard` whose `explodingSymbols` are the same cells, compact-padded.
4. **Overlay.** `meta.overlay` is the centroid of the cluster in geometric rows, rounded like v1 and clamped to a cell that exists in
   that reel, then expressed compact-padded. It is not guaranteed to be a cell of the cluster (an L-shaped cluster can have its centroid
   outside it), exactly as in v1.
5. **Pads.** `reveal.board[r]` = top pad + `len(cells[r])` cells + bottom pad. The pads are the symbols that sit just above / below the
   present cells of that reel; on Lobby the top pad of every reel would sit in the missing geometric row 0, on Atrium reels 0 and 5 the
   pads sit where the cut corners are. Pads are never drawn as cells (they only feed the drop-in); `tumbleBoard.newSymbols[r]` keeps the
   v1 convention (new symbols from the top, the first entry is the refreshed top pad).
6. **Golden fixtures** (one per plan, regenerated and compared by the math tests): `math/games/agent_mambo/tests/golden/layout_<id>.json`.
   `events` = real `layout, reveal, fusePath, winInfo, tumbleBoard, fuseBurn` of one base book; `expect` = what `geo.toGeo / toPadded`
   must reproduce, computed on the math side from the plan: `geoGrid` (rows x 6, `null` = no cell), `winGeoPositions`, `winOverlayGeo`,
   `tumbleExplodingGeo`, `paddedToGeo[reel][compactIndex]`, `geoToPadded[reel][String(geoRow)]`, `revealColumnLengths`, `cellCount`.
   Atrium example of the contract: padded `{reel:0,row:2}` is geometric row 2, padded `{reel:1,row:2}` is geometric row 1.
7. **Plan data** (identical to `FLOOR_PLANS` in `src/render/geo.js`, checked): Mezzanine 30 cells, Atrium 26 (reels 0 and 5 rows 1-3),
   Lobby 24 (rows 1-4 on all reels, frame 5 rows), Annex 36 (frame 6 rows). `config_fe_*.json` keeps `numRows: [5,5,5,5,5,5]`, which is
   NOT authoritative.
