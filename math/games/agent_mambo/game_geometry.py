"""Geometry layer of Agent Mambo v2 (SYNTHESIS sections 3 and 8; WP7 MATH-GEO).

What lives here
  find_clusters(board, layout)      geometry-aware replacement of `Cluster.get_clusters` (same traversal order, same output)
  generate_wire_path(layout, n)     seeded self-avoiding wire path from reel 0 on the geometry (same random draws as v1 on Mezzanine)
  GeometryMixin                     mixed into `GameCalculations`; adds the per-spin floor plan to the gamestate:
      draw_board()                  draws the plan (seeded `random`, `layout_weights`), emits the `layout` event at index 0
                                    BEFORE the base `reveal`, then lets the SDK draw the board with the plan's column heights
      find_clusters()               what `get_clusters_update_wins` must call instead of `Cluster.get_clusters`
      generate_wire_path(n)         what `make_fuse_path` must call; returns COMPACT (reel, row) cells
      geo_cells(cells)              compact cells -> geometric `{"reel","row"}` dicts for fuse* / lightRoute events
      cluster_overlay(cluster)      overlay cell of a win (compact, the SDK emitter adds the +1 pad)

Two row languages (never mix them)
  COMPACT   index inside the SDK board column of the spin (0 = topmost present cell). The gamestate, `win_data`, `special_syms_on_board`,
            `fuse["path"]`, `explode`, tumbles and every SDK emitter (`winInfo`, `tumbleBoard`, `freeSpin*` add +1 = padded) use it.
  GEOMETRIC row of the frame (0 = top). `layout.cells[reel][compact] == geometric`. Events `layout`, `fusePath`, `fuseBurn`,
            `fuseBlast`, `lightRoute` use it (never padded).
On Mezzanine the two are identical, which is why `layout_weights={'mezzanine': 1}` replays v1 books bit for bit.

Per-spin state. `config.num_rows` is the live list of column heights of the CURRENT spin (the SDK reads it dynamically in the board
draw, the tumble length check and `force_special_board`). It is set in `draw_board` and restored to [5]*6 at the start of every book
attempt and after `imprint_wins`, so the singleton config that `generate_configs` writes (`numRows`, NOT authoritative) stays [5]*6.

Selecting a layout (first match wins)
  1. distribution conditions: `conditions["layout_weights"] = {"basegame": {"atrium": 22, ...}}` (per game type) or a flat dict;
  2. `config.layout_weights`: flat `{"mezzanine": 50, "atrium": 22, "lobby": 14, "annex": 14}` for every mode, or a per bet mode
     `{"base": {...}, "bonus": {...}}` (a mode that is not listed plays Mezzanine);
  3. nothing configured: Mezzanine only (= v1).
Free spins are always Mezzanine in v2.0. `config.layout_event` (None/True/False) overrides the default of announcing the plan
only when the weights have more than one plan or a plan other than Mezzanine.
"""

import random
from collections import defaultdict

from layouts import HOME, HOME_ONLY, LAYOUTS, LayoutError, normalise_weights, pick_layout

WIRE_STEPS = ((1, 0, 2), (0, -1, 1), (0, 1, 1))  # (d reel, d geo row, weight): right 2, up 1, down 1; the wire never goes left
WIRE_MAX_TRIES = 100000


class GeometryError(RuntimeError):
    """Board and floor plan disagree (a bug, never a normal outcome)."""


# ------------------------------------------------------------------------------------------------------------ clusters
def _visit(i, adj, names, wild, sym, local, cluster, already):
    """Exact twin of `Cluster.check_all_neighbours` on flat cell ids: neighbours are marked 'seen' when the cell is entered,
    matching cells are appended and entered depth first in the stock order (left, right, up, down)."""
    nb = []
    for j in adj[i]:
        if j not in local:
            local.add(j)
            nb.append(j)
    for j in nb:
        if wild[j] or names[j] == sym:
            cluster.append(j)
            already[j] = True
            _visit(j, adj, names, wild, sym, local, cluster, already)


def find_clusters(board, layout, wild_key="wild"):
    """Same contract as `Cluster.get_clusters(board, wild_key)`: {symbol name: [cluster, ...]}, a cluster being a list of
    COMPACT (reel, row) tuples. Cells are joined when they touch GEOMETRICALLY on `layout`; wilds join any symbol and are not
    cluster starts; traversal order is identical to the stock function, so on a full 6x5 board the result is identical, order included."""
    heights = layout.heights
    if len(board) != layout.cols:
        raise GeometryError(f"board has {len(board)} reels, layout {layout.id} has {layout.cols}")
    names, wild = [], []
    for r, col in enumerate(board):
        if len(col) != heights[r]:
            raise GeometryError(f"reel {r} has {len(col)} symbols, layout {layout.id} expects {heights[r]}")
        for s in col:
            names.append(s.name)
            wild.append(bool(s.check_attribute(wild_key)))
    adj, pos = layout.adj_ids, layout.pos
    already = [False] * len(names)
    clusters = defaultdict(list)
    for start in range(len(names)):
        if already[start] or wild[start]:
            continue
        sym = names[start]
        cluster = [start]
        already[start] = True
        _visit(start, adj, names, wild, sym, {start}, cluster, already)
        clusters[sym].append([pos[i] for i in cluster])
    return clusters


# ------------------------------------------------------------------------------------------------------------ wire path
def generate_wire_path(layout, length, rng=random):
    """Self-avoiding path of `length` cells from a random cell of reel 0, built on the geometry: a step goes to the same geometric
    row of the next reel (weight 2) or to the cell above / below (weight 1 each). Returns COMPACT (reel, row) tuples.
    The random draws (start `randrange`, one `choices` per step, restart when the path gets stuck) are exactly those of the v1
    `make_fuse_path`, so on Mezzanine the path is the v1 path."""
    heights, cells, compact_of, n_reels = layout.heights, layout.cells, layout.compact_of, layout.cols
    for _ in range(WIRE_MAX_TRIES):
        path = [(0, rng.randrange(heights[0]))]
        while len(path) < length:
            reel, ci = path[-1]
            g = cells[reel][ci]
            opts, wts = [], []
            for d_reel, d_geo, w in WIRE_STEPS:
                nr = reel + d_reel
                if nr < n_reels:
                    nci = compact_of[nr].get(g + d_geo)
                    if nci is not None and (nr, nci) not in path:
                        opts.append((nr, nci))
                        wts.append(w)
            if not opts:
                break
            path.append(rng.choices(opts, weights=wts)[0])
        if len(path) == length:
            return path
    raise GeometryError(f"no wire path of {length} cells on layout {layout.id} after {WIRE_MAX_TRIES} tries")


# ------------------------------------------------------------------------------------------------------------ mixin
class GeometryMixin:
    """Per-spin floor plan for the SDK gamestate. Cooperative: every override calls `super()`."""

    layout = LAYOUTS[HOME]  # class level default: `reset_book` runs inside the SDK `__init__`
    layout_announced = False

    # ------------------------------------------------------------------ configuration
    def _weights_for_game_type(self, lw):
        """`layout_weights` of a distribution condition: per game type or flat."""
        base_t, free_t = self.config.basegame_type, self.config.freegame_type
        if isinstance(lw, dict) and lw and set(lw) <= {base_t, free_t}:
            free = lw.get(free_t)
            if free is not None and set(normalise_weights(free)) != {HOME}:
                raise LayoutError("free-spin layouts are reserved: v2.0 plays free spins on the home plan")
            return lw.get(base_t, HOME_ONLY)
        return lw

    def _condition_layout_weights(self, betmode):
        """`conditions["layout_weights"]` of the current criteria in the current bet mode, or None."""
        criteria = getattr(self, "criteria", "")
        for bm in self.config.bet_modes:
            if bm.get_name() == betmode:
                for d in bm.get_distributions():
                    if d._criteria == criteria:
                        return d._conditions.get("layout_weights")
        return None

    def current_layout_weights(self):
        """Weights of the base spin being drawn (see the module docstring for the precedence)."""
        betmode = getattr(self, "betmode", None)
        lw = self._condition_layout_weights(betmode)
        if lw is not None:
            return self._weights_for_game_type(lw)
        cfg = getattr(self.config, "layout_weights", None)
        if not cfg:
            return HOME_ONLY
        if all(isinstance(v, dict) for v in cfg.values()):  # {bet mode: weights}
            return cfg.get(betmode) or HOME_ONLY
        return cfg

    def select_layout(self):
        """Seeded draw of the spin's plan (uses the SDK-seeded `random`). Free spins: Mezzanine. A single positive weight
        consumes no random number. Sets `layout_announced`."""
        if self.gametype != self.config.basegame_type:
            self.layout_announced = False
            return LAYOUTS[HOME]
        w = normalise_weights(self.current_layout_weights())
        forced = getattr(self.config, "layout_event", None)
        self.layout_announced = (len(w) > 1 or HOME not in w) if forced is None else bool(forced)
        return LAYOUTS[pick_layout(w, random.uniform)]

    def apply_layout(self, layout):
        """Make `layout` the plan of the current spin: the SDK reads `config.num_rows` for the board draw and the tumble."""
        self.layout = layout
        self.config.num_rows = layout.row_counts()

    def restore_home_rows(self):
        self.config.num_rows = LAYOUTS[HOME].row_counts()

    # ------------------------------------------------------------------ SDK overrides
    def reset_book(self):
        self.restore_home_rows()
        self.layout = LAYOUTS[HOME]
        self.layout_announced = False
        super().reset_book()

    def imprint_wins(self):
        super().imprint_wins()
        self.restore_home_rows()  # the singleton config is written to config_fe_*.json: numRows must stay [5]*6

    def draw_board(self, emit_event=True, trigger_symbol="scatter"):
        """Draw the plan, announce it (`layout` event at index 0, before the base `reveal`), then draw the board with the SDK.
        Free spins never emit a `layout` event."""
        layout = self.select_layout()
        self.apply_layout(layout)
        if self.layout_announced:
            self.record({"layout": layout.id})  # force-record key: lets the optimizer / shares.json pin the per-layout shares
            if emit_event:
                self.book.add_event(layout.to_event(len(self.book.events)))
        super().draw_board(emit_event, trigger_symbol)
        self.check_board_shape()

    def check_board_shape(self):
        heights = self.layout.heights
        for r, col in enumerate(self.board):
            if len(col) != heights[r]:
                raise GeometryError(f"reel {r}: {len(col)} symbols on a {self.layout.id} board (expects {heights[r]})")

    # ------------------------------------------------------------------ geometry services for the game code
    def find_clusters(self, wild_key="wild"):
        return find_clusters(self.board, self.layout, wild_key)

    def generate_wire_path(self, length):
        return generate_wire_path(self.layout, length)

    def geo_row(self, reel, compact_row):
        return self.layout.cells[reel][compact_row]

    def geo_cells(self, cells):
        """Compact (reel, row) cells -> geometric `{"reel","row"}` dicts: the form of fusePath / fuseBurn / fuseBlast."""
        cells_of = self.layout.cells
        return [{"reel": r, "row": cells_of[r][c]} for r, c in cells]

    def cluster_overlay(self, cluster):
        """Cell where the win amount is shown: centroid in GEOMETRIC rows (same rounding as the stock function), clamped to the
        reel's cells, returned COMPACT (the SDK `winInfo` emitter pads it). Identical to the stock centroid on Mezzanine."""
        layout = self.layout
        n = len(cluster)
        reel = int(round(sum(p[0] for p in cluster) / n))
        geo = int(round(sum(layout.cells[p[0]][p[1]] for p in cluster) / n))
        col = layout.cells[reel]
        geo = min(max(geo, col[0]), col[-1])
        return reel, layout.compact_of[reel][geo]

    def geo_grid(self, board=None):
        """Debug / fixtures: rows x cols grid of symbol names in GEOMETRIC position, None where the plan has no cell."""
        board = self.board if board is None else board
        layout = self.layout
        grid = [[None] * layout.cols for _ in range(layout.rows)]
        for r, col in enumerate(board):
            for ci, sym in enumerate(col):
                grid[layout.cells[r][ci]][r] = sym.name
        return grid
