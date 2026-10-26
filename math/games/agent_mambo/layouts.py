"""Floor plans of Agent Mambo v2 (SYNTHESIS section 3): data, validator and the weighted pick.

Pure Python, no SDK import, so the front-end golden fixtures and the tests can load it on its own.

Model. A floor plan is the frame (6 reels x `rows` geometric rows, row 0 = top) plus, for every reel, the sorted GEOMETRIC
rows that are present (`cells[r]`). The SDK board column of reel r is the COMPACT list of those cells (index 0 = topmost
present cell), so reveal / padding / tumble / refill code of the SDK stays stock. Only two things know about geometry:
  * adjacency: (reel, geo row) touches (reel +- 1, same geo row) when that cell exists, and the cell above / below it;
  * the events: the `layout` event announces `cells`; fuse* / lightRoute speak geometric rows, winInfo / tumbleBoard /
    freeSpin* positions stay compact-padded (padded = compact index + 1), see docs/research2/SYNTHESIS.md section 8.

Validator rules (SYNTHESIS section 3): connected, >= 24 cells, holes only at column ends (every reel is one contiguous run
of rows: interior holes cost -60 % win mass and 15 attempts per book), every reel non-empty, frame rows 5 or 6.
"""

from __future__ import annotations

COLS = 6
HOME = "mezzanine"
MIN_CELLS = 24
FRAME_ROWS = (5, 6)


class LayoutError(ValueError):
    """Bad floor plan, bad weights or unknown layout id."""


def validate_cells(cells, rows, cols=COLS, min_cells=MIN_CELLS, frame_rows=FRAME_ROWS):
    """Return the list of problems of a mask (empty list = valid). Never raises on malformed input."""
    problems = []
    if rows not in frame_rows or isinstance(rows, bool):
        problems.append(f"frame rows must be one of {tuple(frame_rows)}, got {rows!r}")
    if not isinstance(cells, (list, tuple)) or len(cells) != cols:
        got = len(cells) if isinstance(cells, (list, tuple)) else type(cells).__name__
        problems.append(f"need exactly {cols} reels, got {got}")
        return problems
    shape_ok = True
    for r, col in enumerate(cells):
        if not isinstance(col, (list, tuple)) or len(col) == 0:
            problems.append(f"reel {r} has no cell")
            shape_ok = False
            continue
        if any((not isinstance(g, int)) or isinstance(g, bool) for g in col):
            problems.append(f"reel {r} has a non-integer row")
            shape_ok = False
            continue
        if any(b <= a for a, b in zip(col, col[1:])):
            problems.append(f"reel {r} rows are not strictly increasing: {list(col)}")
            shape_ok = False
            continue
        if col[0] < 0 or (rows in frame_rows and col[-1] >= rows):
            problems.append(f"reel {r} rows {list(col)} leave the frame 0..{rows - 1}")
            shape_ok = False
            continue
        if col[-1] - col[0] + 1 != len(col):
            problems.append(f"reel {r} has an interior hole {list(col)} (holes are allowed at column ends only)")
            shape_ok = False
    if not shape_ok:
        return problems
    total = sum(len(c) for c in cells)
    if total < min_cells:
        problems.append(f"{total} cells, need at least {min_cells}")
    present = {(r, g) for r, col in enumerate(cells) for g in col}
    start = next(iter(present))
    seen, todo = {start}, [start]
    while todo:
        r, g = todo.pop()
        for nb in ((r - 1, g), (r + 1, g), (r, g - 1), (r, g + 1)):
            if nb in present and nb not in seen:
                seen.add(nb)
                todo.append(nb)
    if len(seen) != len(present):
        problems.append(f"not connected: {len(present) - len(seen)} cells cannot be reached from reel {start[0]}")
    return problems


def check_cells(cells, rows, **kw):
    """Raise LayoutError listing every problem; return None when valid."""
    problems = validate_cells(cells, rows, **kw)
    if problems:
        raise LayoutError("; ".join(problems))


class Layout:
    """One floor plan with everything the hot loops need precomputed. Immutable by convention.

    cells[r]        sorted geometric rows present in reel r (tuple of tuples)
    heights[r]      len(cells[r]) = rows of the SDK board column = config.num_rows[r] for the spin
    compact_of[r]   {geometric row: compact index}
    adj_ids[i]      flat cell ids touching cell i, in the order of the stock SDK function
                    (left, right, up, down); flat id = offsets[r] + compact index, scanned reel by reel, top to bottom
    pos[i]          (reel, compact index) of flat id i
    """

    __slots__ = ("id", "name", "rows", "cols", "cells", "heights", "cell_count", "compact_of", "offsets", "adj_ids", "pos")

    def __init__(self, layout_id, name, rows, cells, **validate_kw):
        check_cells(cells, rows, **validate_kw)
        self.id = layout_id
        self.name = name
        self.rows = rows
        self.cells = tuple(tuple(c) for c in cells)
        self.cols = len(self.cells)
        self.heights = tuple(len(c) for c in self.cells)
        self.cell_count = sum(self.heights)
        self.compact_of = tuple({g: i for i, g in enumerate(col)} for col in self.cells)
        offsets, acc = [], 0
        for h in self.heights:
            offsets.append(acc)
            acc += h
        self.offsets = tuple(offsets)
        self.pos = tuple((r, i) for r, h in enumerate(self.heights) for i in range(h))
        adj = []
        for r, i in self.pos:
            g = self.cells[r][i]
            ids = []
            for nr, ng in ((r - 1, g), (r + 1, g), (r, g - 1), (r, g + 1)):  # stock order: left, right, up, down
                j = self.neighbour_compact(nr, ng)
                if j is not None:
                    ids.append(self.offsets[nr] + j)
            adj.append(tuple(ids))
        self.adj_ids = tuple(adj)

    # ------------------------------------------------------------------ geometry helpers
    def neighbour_compact(self, reel, geo_row):
        """Compact index of the cell (reel, geo_row), or None when the plan has no such cell."""
        if reel < 0 or reel >= self.cols:
            return None
        return self.compact_of[reel].get(geo_row)

    def geo_row(self, reel, compact_row):
        return self.cells[reel][compact_row]

    def window_fits(self, reel, geo_row, w, h):
        """True when the w x h window whose TOP-LEFT cell is (reel, geo_row) lies entirely on cells of this plan
        (for lightRoute: 'the window always fits the board')."""
        return all(self.neighbour_compact(reel + i, geo_row + j) is not None for i in range(w) for j in range(h))

    def windows(self, w, h):
        """All top-left cells (reel, geo_row) where a w x h window fits, in reading order (reel, then row)."""
        return [(r, g) for r in range(self.cols) for g in self.cells[r] if self.window_fits(r, g, w, h)]

    def row_counts(self):
        """Fresh list for config.num_rows."""
        return list(self.heights)

    def to_event(self, index):
        """Exact JSON of the `layout` event (SYNTHESIS section 8 item 1); `links` is reserved."""
        return {
            "index": index,
            "type": "layout",
            "id": self.id,
            "name": self.name,
            "cols": self.cols,
            "rows": self.rows,
            "cells": [list(c) for c in self.cells],
            "cellCount": self.cell_count,
            "links": [],
        }

    def __repr__(self):
        return f"Layout({self.id!r}, {self.cell_count} cells, frame rows {self.rows})"


def _plan(layout_id, name, rows, cells):
    return Layout(layout_id, name, rows, cells)


_FULL5 = tuple(range(5))
_MID3 = (1, 2, 3)
_LOW4 = (1, 2, 3, 4)
_FULL6 = tuple(range(6))

LAYOUTS = {
    "mezzanine": _plan("mezzanine", "Mezzanine", 5, [_FULL5] * 6),  # 30 cells, home
    "atrium": _plan("atrium", "Atrium", 5, [_MID3, _FULL5, _FULL5, _FULL5, _FULL5, _MID3]),  # 26, four corners cut
    "lobby": _plan("lobby", "Lobby", 5, [_LOW4] * 6),  # 24, low ceiling (6x4, bottom aligned)
    "annex": _plan("annex", "Annex", 6, [_FULL6] * 6),  # 36, 6x6
}
LAYOUT_ORDER = tuple(LAYOUTS)

# Nominal draw (percent). Final per-layout shares are OUTPUTS of the weighted lookup table (shares.json), never claimed here.
NOMINAL_WEIGHTS = {"mezzanine": 50, "atrium": 22, "lobby": 14, "annex": 14}
HOME_ONLY = {HOME: 1}


def make_layout(layout_id, name, rows, cells, **validate_kw):
    """Build (and validate) a Layout that is not in the registry. Raises LayoutError."""
    return Layout(layout_id, name, rows, cells, **validate_kw)


def normalise_weights(weights):
    """Validate a {layout id: weight} mapping and drop zero weights. Returns a new dict (order kept).
    None or {} means 'home only'. Raises LayoutError on unknown ids, negative / non-numeric weights, or all zero."""
    if weights is None or weights == {}:
        return dict(HOME_ONLY)
    if not isinstance(weights, dict):
        raise LayoutError(f"layout_weights must be a dict, got {type(weights).__name__}")
    out = {}
    for lid, w in weights.items():
        if lid not in LAYOUTS:
            raise LayoutError(f"unknown layout id {lid!r}; known: {list(LAYOUTS)}")
        if isinstance(w, bool) or not isinstance(w, (int, float)) or w != w or w < 0 or w == float("inf"):
            raise LayoutError(f"bad weight {w!r} for layout {lid!r}")
        if w > 0:
            out[lid] = w
    if not out:
        raise LayoutError("layout_weights are all zero")
    return out


def pick_layout(weights, uniform):
    """Weighted pick of a layout id with the SDK's own recipe (`get_random_outcome`: uniform(0, total), first cumulative >= roll).
    `uniform` is `random.uniform` of the SDK-seeded module so books reproduce. A single positive weight consumes NO random
    number: layout_weights={'mezzanine': 1} therefore replays v1 books bit for bit."""
    w = normalise_weights(weights)
    if len(w) == 1:
        return next(iter(w))
    total = sum(w.values())
    roll = uniform(0, total)
    cumulative = 0.0
    chosen = None
    for lid, weight in w.items():
        chosen = lid
        cumulative += weight
        if cumulative >= roll:
            break
    return chosen
