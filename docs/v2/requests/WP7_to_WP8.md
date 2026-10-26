# WP7 (MATH-GEO) to WP8 (MATH-MISSIONS): three edits already made in your files, and what to add

## 1. Edits WP7 made in files WP8 owns (please KEEP them)
The spec puts "geometry-aware clusters" and "wire path generated on the geometry" in WP7, but the call sites live in your files.
Each edit is behaviour-neutral on Mezzanine (20 000 base books and 1 500 bonus books of the v1 library replay bit for bit with them).
If one is removed, `tests/test_layouts.py` fails loudly (IndexError / GeometryError on Atrium, Lobby, Annex).

```python
# game_executables.py  get_clusters_update_wins
-        clusters = Cluster.get_clusters(self.board, "wild")
+        clusters = self.find_clusters("wild")  # geometry-aware (game_geometry.py)

# game_executables.py  make_fuse_path: the whole `while True: path = [...]` loop is replaced by
+        path = self.generate_wire_path(cfg["len"])  # COMPACT (reel, row) cells on the floor plan; same random draws as v1
         self.fuse = {"path": path, "burn": ..., "cfg": cfg, "spent": False}

# game_events.py  _cells(cells) -> _cells(gamestate, cells), the three callers pass `gamestate`
+def _cells(gamestate, cells):
+    return gamestate.geo_cells(cells)     # compact (reel, row) -> GEOMETRIC {"reel","row"} (identity on Mezzanine)
```
`game_calculations.py` (mine) now derives from `GeometryMixin` and places the win overlay with `self.cluster_overlay(cluster)`.

## 2. What to add in `game_config.py` (not done, it is yours)
```python
from layouts import NOMINAL_WEIGHTS               # {'mezzanine': 50, 'atrium': 22, 'lobby': 14, 'annex': 14}
self.layout_weights = {"base": NOMINAL_WEIGHTS}   # PER BET MODE: the doors must stay Mezzanine
```
Do NOT use the flat form `self.layout_weights = NOMINAL_WEIGHTS`: a flat dict applies to every mode, including `bonus`, and the
100k reused Briefing books would no longer be reproducible. Nothing configured = Mezzanine only = v1. Alternatives with the same
meaning: `conditions["layout_weights"] = {"basegame": {...}}` in a `Distribution` (beats the config), or the run-level env switch
`AM_LAYOUT_WEIGHTS='{"mezzanine":1}'` (beats everything; per mode form also accepted). `config.layout_event = True/False` forces the
`layout` event on/off (default: announced when the weights have more than one plan or a plan other than Mezzanine).

## 3. Mixin interface (all on the gamestate; `game_geometry.py`)
| name | use |
|---|---|
| `self.layout` | `Layout` of the CURRENT spin (`.id .name .rows .cells .heights .cell_count .windows(w,h) .window_fits(reel,geoRow,w,h)`); free spins: Mezzanine |
| `self.config.num_rows` | LIVE column heights of the current spin (SDK reads it dynamically); restored to `[5]*6` per book. Never cache it across spins |
| `self.find_clusters("wild")` | geometry-aware `Cluster.get_clusters`; clusters are lists of COMPACT `(reel, row)` |
| `self.generate_wire_path(n)` | seeded wire path, COMPACT cells, any length (8, 12 ...); `fuse["path"]` stays compact |
| `self.geo_cells(cells)` | COMPACT cells -> GEOMETRIC `{"reel","row"}` dicts: use it for every NEW event that speaks geometric rows (`fuse*`, `lightRoute`) |
| `self.geo_row(reel, compact)`, `self.layout.compact_of[reel][geoRow]` | single cell conversions |
| `self.cluster_overlay(cluster)` | overlay cell, COMPACT (SDK emitters add the +1 pad) |
| `self.layout.windows(2, 2)` | all top-left `(reel, geoRow)` where the Blackout window fits (Mezzanine: 20); `lightRoute.route` entries are geometric |
| `self.layout.id` | for `missionAssigned.layout` (free spins: `"mezzanine"`) |

Emission: the mixin's `draw_board` adds the `layout` event (index 0, before the base `reveal`; `self.record({"layout": id})` force key;
none in free spins). SDK emitters are untouched: `winInfo`, `tumbleBoard`, `freeSpinTrigger|Retrigger` keep COMPACT-PADDED positions.
Your own new events: `lightRoute` and `fuse*` GEOMETRIC; anything built from `win_data` positions COMPACT then padded by the emitter.

## 4. Traps
* `force_special_board` in `game_override.py` (7-8 scatters) reads `config.num_rows[r]`: correct as written because the value is per spin.
* `GameConfig()` re-runs `__init__` on the singleton every time it is called (it resets `num_rows`, `bet_modes`, anything defined there).
* Free spins never emit `layout`; if a mission wants its own bonus layout later, `free-spin layouts are reserved` (LayoutError) guards it.
* Same seed + same weights = same book: the plan draw is the first random number of the base spin, and a single positive weight draws none.
