"""WP7 MATH-GEO tests: floor plans, validator, geometry-aware clusters, tumble, wire path, layout/reveal events, golden fixtures.

Run: math/env/bin/pytest math/games/agent_mambo/tests/test_layouts.py
The 100k-boards-per-plan run is `tools/layout_bench.py bench` (too slow for a unit test; the numbers are in PROGRESS.md).
"""

import importlib.util
import json
import os
import random
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
MATH = os.path.abspath(os.path.join(GAME, "..", ".."))
for _p in (MATH, GAME):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from layouts import (  # noqa: E402
    HOME,
    LAYOUT_ORDER,
    LAYOUTS,
    NOMINAL_WEIGHTS,
    LayoutError,
    make_layout,
    normalise_weights,
    pick_layout,
    validate_cells,
)
from game_geometry import GeometryError, find_clusters, generate_wire_path  # noqa: E402
from src.calculations.cluster import Cluster  # noqa: E402

GOLDEN = os.path.join(HERE, "golden")
V1_BOOKS = os.path.join(GAME, "library", "publish_files_v1")


def _load_bench():
    spec = importlib.util.spec_from_file_location("layout_bench", os.path.join(GAME, "tools", "layout_bench.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


bench = _load_bench()


@pytest.fixture
def make_state():
    """GameState factory (config = process singleton, re-initialised by every GameConfig() call). weights=None means 'nothing
    configured' = v1 behaviour, so a later default in game_config.py cannot change what these tests prove."""
    from game_config import GameConfig

    def factory(weights=None, mode="base", layout_event=None):
        _, gs = bench.new_state(mode, weights, layout_event)
        return gs

    yield factory
    GameConfig().num_rows = [5] * 6
    for k in ("layout_weights", "layout_event"):
        cfg = GameConfig()
        if hasattr(cfg, k):
            delattr(cfg, k)


def spin(gs, seed, criteria="basegame"):
    gs.criteria = criteria
    gs.run_spin(seed)
    return gs.library[seed + 1]


# ---------------------------------------------------------------------------------------------------- the four plans
def test_four_plans_match_the_spec():
    assert list(LAYOUTS) == ["mezzanine", "atrium", "lobby", "annex"] == list(LAYOUT_ORDER)
    spec = {
        "mezzanine": (30, 5, [list(range(5))] * 6),
        "atrium": (26, 5, [[1, 2, 3]] + [list(range(5))] * 4 + [[1, 2, 3]]),
        "lobby": (24, 5, [[1, 2, 3, 4]] * 6),
        "annex": (36, 6, [list(range(6))] * 6),
    }
    for lid, (n, rows, cells) in spec.items():
        lay = LAYOUTS[lid]
        assert lay.cell_count == n and lay.rows == rows and [list(c) for c in lay.cells] == cells, lid
        assert lay.cols == 6
        assert validate_cells(lay.cells, lay.rows) == []
    assert LAYOUTS["mezzanine"].name == "Mezzanine" and LAYOUTS["annex"].name == "Annex"
    assert NOMINAL_WEIGHTS == {"mezzanine": 50, "atrium": 22, "lobby": 14, "annex": 14}
    assert sum(NOMINAL_WEIGHTS.values()) == 100
    mean_cells = sum(NOMINAL_WEIGHTS[k] * LAYOUTS[k].cell_count for k in NOMINAL_WEIGHTS) / 100
    assert abs(mean_cells - 29.12) < 1e-9  # SYNTHESIS: mean cells 29.1


def test_layout_event_is_the_exact_json_of_the_contract():
    ev = LAYOUTS["atrium"].to_event(0)
    assert ev == {
        "index": 0, "type": "layout", "id": "atrium", "name": "Atrium", "cols": 6, "rows": 5,
        "cells": [[1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]],
        "cellCount": 26, "links": [],
    }
    assert list(ev) == ["index", "type", "id", "name", "cols", "rows", "cells", "cellCount", "links"]
    assert json.dumps(ev) == (
        '{"index": 0, "type": "layout", "id": "atrium", "name": "Atrium", "cols": 6, "rows": 5, "cells": '
        '[[1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]], "cellCount": 26, "links": []}'
    )


# ---------------------------------------------------------------------------------------------------- validator
FULL5 = list(range(5))
BAD_MASKS = {
    "interior hole": ([[0, 1, 3, 4]] + [FULL5] * 5, 5),
    "disconnected halves": ([list(range(6))] * 2 + [[0, 1]] + [[2, 3, 4, 5]] + [list(range(6))] * 2, 6),
    "too few cells (18)": ([[0, 1, 2]] * 6, 5),
    "23 cells": ([[2, 3]] + [FULL5] * 4 + [[2]], 5),
    "five reels": ([FULL5] * 5, 5),
    "seven reels": ([FULL5] * 7, 5),
    "empty reel": ([FULL5, FULL5, [], FULL5, FULL5, FULL5], 5),
    "row outside the frame": ([[0, 1, 2, 3, 4, 5]] + [FULL5] * 5, 5),
    "negative row": ([[-1, 0, 1, 2, 3]] + [FULL5] * 5, 5),
    "unsorted rows": ([[1, 0, 2, 3, 4]] + [FULL5] * 5, 5),
    "duplicate rows": ([[0, 1, 1, 2, 3, 4]] + [FULL5] * 5, 5),
    "frame of 7 rows": ([list(range(7))] * 6, 7),
    "frame of 4 rows": ([list(range(4))] * 6, 4),
    "non-integer row": ([[0.5, 1.5, 2.5, 3.5, 4.5]] + [FULL5] * 5, 5),
    "bool row": ([[True, 2, 3, 4]] + [FULL5] * 5, 5),
    "not a list": ("nope", 5),
}


@pytest.mark.parametrize("name", list(BAD_MASKS))
def test_validator_rejects_bad_masks(name):
    cells, rows = BAD_MASKS[name]
    problems = validate_cells(cells, rows)
    assert problems, name
    with pytest.raises(LayoutError):
        make_layout("bad", "Bad", rows, cells)


def test_validator_message_names_the_problem():
    assert any("interior hole" in p for p in validate_cells(*BAD_MASKS["interior hole"]))
    assert any("not connected" in p for p in validate_cells(*BAD_MASKS["disconnected halves"]))
    assert any("at least 24" in p for p in validate_cells(*BAD_MASKS["too few cells (18)"]))


def test_validator_accepts_new_valid_plans():
    # a 'skyline' with cut corners that is still >= 24 cells, connected, holes at column ends only
    cells = [[1, 2, 3, 4], FULL5, FULL5, FULL5, FULL5, [0, 1, 2, 3]]
    assert validate_cells(cells, 5) == []
    lay = make_layout("skyline", "Skyline", 5, cells)
    assert lay.cell_count == 4 + 20 + 4 == 28


def test_weights_validation():
    assert normalise_weights(None) == {HOME: 1} and normalise_weights({}) == {HOME: 1}
    assert normalise_weights({"mezzanine": 3, "atrium": 0}) == {"mezzanine": 3}
    for bad in ({"penthouse": 1}, {"atrium": -1}, {"atrium": "x"}, {"atrium": True}, {"atrium": 0}, [1, 2], {"atrium": float("nan")}):
        with pytest.raises(LayoutError):
            normalise_weights(bad)


# ---------------------------------------------------------------------------------------------------- the seeded draw
def test_pick_is_deterministic_and_single_weight_uses_no_random_number():
    rng1, rng2 = random.Random(7), random.Random(7)
    a = [pick_layout(NOMINAL_WEIGHTS, rng1.uniform) for _ in range(200)]
    b = [pick_layout(NOMINAL_WEIGHTS, rng2.uniform) for _ in range(200)]
    assert a == b and len(set(a)) == 4
    state = random.getstate()
    random.seed(5)
    s0 = random.getstate()
    assert pick_layout({"mezzanine": 1}, random.uniform) == "mezzanine"
    assert pick_layout({"annex": 9}, random.uniform) == "annex"
    assert random.getstate() == s0, "a single positive weight must not consume a random number"
    random.setstate(state)


def test_pick_follows_the_nominal_weights():
    rng = random.Random(1)
    n = 40000
    cnt = {k: 0 for k in NOMINAL_WEIGHTS}
    for _ in range(n):
        cnt[pick_layout(NOMINAL_WEIGHTS, rng.uniform)] += 1
    for k, w in NOMINAL_WEIGHTS.items():
        assert abs(cnt[k] / n - w / 100) < 0.012, (k, cnt[k] / n)


# ---------------------------------------------------------------------------------------------------- clusters
POOL = ["H1", "H2", "H3", "L1", "L2", "L3", "W", "S"]
POOL_W = [3, 3, 2, 4, 4, 3, 1, 1]


def random_board(gs, heights, rng, pool=POOL, weights=POOL_W):
    return [[gs.create_symbol(rng.choices(pool, weights)[0]) for _ in range(h)] for h in heights]


def test_clusters_equal_stock_on_300_random_6x5_boards(make_state):
    gs = make_state()
    rng = random.Random(2026)
    mezz = LAYOUTS["mezzanine"]
    for i in range(300):
        board = random_board(gs, [5] * 6, rng)
        stock = {k: [list(c) for c in v] for k, v in Cluster.get_clusters(board, "wild").items()}
        ours = {k: [list(c) for c in v] for k, v in find_clusters(board, mezz, "wild").items()}
        assert ours == stock, f"board {i}: clusters differ from the stock SDK function"  # ordered, symbol by symbol
        assert list(ours) == list(stock)  # same symbol order too


def test_clusters_equal_stock_on_dense_boards(make_state):
    """Few symbols: huge clusters, wilds bridging several symbols (the hard case for the traversal order)."""
    gs = make_state()
    rng = random.Random(99)
    mezz = LAYOUTS["mezzanine"]
    for i in range(300):
        board = random_board(gs, [5] * 6, rng, ["H1", "H2", "W", "L1"], [4, 4, 3, 2])
        stock = {k: [list(c) for c in v] for k, v in Cluster.get_clusters(board, "wild").items()}
        ours = {k: [list(c) for c in v] for k, v in find_clusters(board, mezz, "wild").items()}
        assert ours == stock


def oracle(grid):
    """Independent reference on geometric coordinates: per symbol s, the connected components of {cells that are s or wild};
    a component with at least one real s cell is a cluster (wilds may be shared between clusters, as in the SDK)."""
    out = {}
    for s in {n for n, w in grid.values() if not w}:
        nodes = {p for p, (n, w) in grid.items() if w or n == s}
        seen, comps = set(), set()
        for p in sorted(nodes):
            if p in seen:
                continue
            comp, todo = {p}, [p]
            while todo:
                r, g = todo.pop()
                for q in ((r - 1, g), (r + 1, g), (r, g - 1), (r, g + 1)):
                    if q in nodes and q not in comp:
                        comp.add(q)
                        todo.append(q)
            seen |= comp
            if any(not grid[q][1] and grid[q][0] == s for q in comp):
                comps.add(frozenset(comp))
        out[s] = comps
    return out


@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_clusters_are_geometric_on_every_plan(make_state, lid):
    gs = make_state()
    lay = LAYOUTS[lid]
    rng = random.Random(hash(lid) & 0xFFFF)
    for _ in range(300):
        board = random_board(gs, lay.heights, rng, ["H1", "H2", "L1", "W", "S"], [4, 4, 3, 2, 1])
        grid = {(r, lay.cells[r][ci]): (s.name, bool(s.check_attribute("wild"))) for r, col in enumerate(board) for ci, s in enumerate(col)}
        ours = {}
        for sym, lst in find_clusters(board, lay, "wild").items():
            ours[sym] = {frozenset((r, lay.cells[r][ci]) for r, ci in cl) for cl in lst}
        assert ours == oracle(grid), lid
        # every non-wild cell belongs to exactly one cluster of its own symbol
        count = {}
        for sym, lst in find_clusters(board, lay, "wild").items():
            for cl in lst:
                for r, ci in cl:
                    if not board[r][ci].check_attribute("wild"):
                        count[(r, ci)] = count.get((r, ci), 0) + 1
        assert all(v == 1 for v in count.values())
        assert len(count) == sum(1 for col in board for s in col if not s.check_attribute("wild"))


def test_adjacency_is_geometric_on_the_atrium(make_state):
    gs = make_state()
    lay = LAYOUTS["atrium"]
    # reel 0 holds geometric rows 1..3 (compact 0..2), reel 1 rows 0..4 (compact 0..4): compact (0,0) is geometric row 1
    # and touches compact (1,1), NOT compact (1,0) (geometric row 0).
    heights = lay.heights
    board = [[gs.create_symbol("L1") for _ in range(h)] for h in heights]
    for r in range(6):
        for ci in range(heights[r]):
            board[r][ci] = gs.create_symbol("H1" if (r, ci) in {(0, 0), (1, 1)} else "L2")
    cl = [c for c in find_clusters(board, lay, "wild")["H1"]]
    assert sorted(cl[0]) == [(0, 0), (1, 1)], cl
    # the stock compact rule would have joined (0,0) with (1,0): make sure ours does not
    board2 = [[gs.create_symbol("L2") for _ in range(h)] for h in heights]
    board2[0][0] = gs.create_symbol("H1")
    board2[1][0] = gs.create_symbol("H1")
    parts = find_clusters(board2, lay, "wild")["H1"]
    assert sorted(map(sorted, parts)) == [[(0, 0)], [(1, 0)]]


def test_stock_cluster_function_cannot_read_a_jagged_board(make_state):
    """Why the geometry layer exists: the SDK get_neighbours adds (reel +- 1, row) without looking at the neighbour column."""
    gs = make_state()
    jag = [[gs.create_symbol("H1") for _ in range(h)] for h in LAYOUTS["atrium"].heights]
    with pytest.raises(IndexError):
        Cluster.get_clusters(jag, "wild")
    find_clusters(jag, LAYOUTS["atrium"], "wild")  # ours is fine


def test_find_clusters_refuses_a_board_of_the_wrong_shape(make_state):
    gs = make_state()
    board = [[gs.create_symbol("H1") for _ in range(5)] for _ in range(6)]
    with pytest.raises(GeometryError):
        find_clusters(board, LAYOUTS["atrium"], "wild")


# ---------------------------------------------------------------------------------------------------- tumble and refill
@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_tumble_conserves_the_cell_count_and_refills_from_the_strip(make_state, lid):
    gs = make_state({lid: 1})
    lay = LAYOUTS[lid]
    paid = 0
    for seed in range(1500):
        steps, pays, cells = bench.run_board(gs, seed, lay)  # asserts conservation after every tumble step
        paid += pays
        assert cells == lay.cell_count
    assert paid > 100  # the cascade branch really ran
    # explicit single-step check: explode one cluster, tumble, compare column heights and the strip pointer
    gs.reset_seed(3)
    gs.criteria = "basegame"
    gs.reset_book()
    gs.draw_board(emit_event=False)
    before = [len(c) for c in gs.board]
    pos = list(gs.reel_positions)
    gs.board[1][0].explode = True
    gs.board[1][1].explode = True
    gs.tumble_board()
    assert [len(c) for c in gs.board] == before == list(lay.heights)
    assert gs.reel_positions[1] == (pos[1] - 2) % len(gs.reelstrip[1])  # two refills pulled from the strip
    assert all(gs.reel_positions[r] == pos[r] for r in (0, 2, 3, 4, 5))
    assert not any(s.explode for col in gs.board for s in col)


# ---------------------------------------------------------------------------------------------------- draw and events
def test_atrium_draw_emits_layout_then_reveal(make_state):
    gs = make_state({"atrium": 1})
    book = spin(gs, 11, "0")
    ev = book["events"]
    assert ev[0] == LAYOUTS["atrium"].to_event(0)
    assert ev[1]["type"] == "reveal" and ev[1]["index"] == 1
    assert [len(c) for c in ev[1]["board"]] == [5, 7, 7, 7, 7, 5]  # SYNTHESIS: reels 0 and 5 five symbols, reels 1-4 seven
    assert len(ev[1]["anticipation"]) == 6 and len(ev[1]["paddingPositions"]) == 6
    assert [e["index"] for e in ev] == list(range(len(ev)))


@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_reveal_shape_per_plan(make_state, lid):
    gs = make_state({lid: 1})
    lay = LAYOUTS[lid]
    for seed in range(40):
        book = spin(gs, seed, "0")
        rev = next(e for e in book["events"] if e["type"] == "reveal")
        assert [len(c) for c in rev["board"]] == [h + 2 for h in lay.heights]
        assert len(rev["anticipation"]) == 6 and len(rev["paddingPositions"]) == 6
        if lid != HOME:
            assert book["events"][0]["type"] == "layout" and book["events"][0]["id"] == lid
        assert sum(1 for e in book["events"] if e["type"] == "layout") <= 1


def test_mezzanine_switch_is_v1(make_state):
    for weights in (None, {"mezzanine": 1}, {"mezzanine": 1, "atrium": 0}):
        gs = make_state(weights)
        book = spin(gs, 5)
        assert all(e["type"] != "layout" for e in book["events"])  # absent = Mezzanine
        assert not any("layout" in dict(k) for k in gs.recorded_events)  # no new force-record key either
    gs = make_state({"mezzanine": 1}, layout_event=True)
    book = spin(gs, 5)
    assert book["events"][0] == LAYOUTS["mezzanine"].to_event(0) and book["events"][1]["type"] == "reveal"
    gs = make_state(dict(NOMINAL_WEIGHTS), layout_event=False)
    assert all(e["type"] != "layout" for e in spin(gs, 5)["events"])


def test_mixed_weights_announce_every_spin_including_mezzanine_and_record_the_force_key(make_state):
    gs = make_state(dict(NOMINAL_WEIGHTS))
    seen = {}
    for seed in range(400):
        book = spin(gs, seed, "0")
        assert book["events"][0]["type"] == "layout"
        seen[book["events"][0]["id"]] = seen.get(book["events"][0]["id"], 0) + 1
    assert set(seen) == set(LAYOUT_ORDER)
    keys = {dict(k).get("layout") for k in gs.recorded_events if "layout" in dict(k)}
    assert keys == set(LAYOUT_ORDER)
    for k, rec in gs.recorded_events.items():
        d = dict(k)
        if "layout" in d:
            assert rec["timesTriggered"] == seen[d["layout"]]


def test_draw_is_deterministic_per_seed_and_varies_across_seeds(make_state):
    gs = make_state(dict(NOMINAL_WEIGHTS))
    a = [spin(gs, s, "basegame") for s in range(60)]
    gs2 = make_state(dict(NOMINAL_WEIGHTS))
    b = [spin(gs2, s, "basegame") for s in range(60)]
    assert json.dumps(a) == json.dumps(b)
    assert len({x["events"][0]["id"] for x in a}) >= 3
    # the same seed replayed later on the same object gives the same book
    again = spin(gs, 17, "basegame")
    assert json.dumps(again) == json.dumps(a[17])


def test_free_spins_are_always_mezzanine(make_state):
    gs = make_state({"atrium": 1})
    for seed in range(25):
        book = spin(gs, seed, "freegame")
        ev = book["events"]
        assert ev[0]["id"] == "atrium" and sum(1 for e in ev if e["type"] == "layout") == 1
        reveals = [e for e in ev if e["type"] == "reveal"]
        assert [len(c) for c in reveals[0]["board"]] == [5, 7, 7, 7, 7, 5]
        for r in reveals[1:]:
            assert r["gameType"] == "freegame" and [len(c) for c in r["board"]] == [7] * 6
        trig = next(e for e in ev if e["type"] == "freeSpinTrigger")
        assert all(1 <= p["row"] <= LAYOUTS["atrium"].heights[p["reel"]] for p in trig["positions"])
        i_trig = ev.index(trig)
        for e in ev[i_trig:]:
            if e["type"] in ("fusePath", "fuseBurn", "fuseBlast"):
                for c in e.get("cells") or e.get("newCells"):
                    assert c["row"] in LAYOUTS["mezzanine"].cells[c["reel"]]


def test_config_num_rows_is_restored(make_state):
    gs = make_state({"annex": 1})
    cfg = gs.config
    gs.criteria = "basegame"
    gs.reset_seed(1)
    gs.reset_book()
    gs.draw_board(emit_event=False)
    assert cfg.num_rows == [6] * 6
    gs.reset_book()
    assert cfg.num_rows == [5] * 6
    spin(gs, 2)
    assert cfg.num_rows == [5] * 6  # numRows written to config_fe_*.json stays [5]*6 (not authoritative)


def test_layout_weights_precedence(make_state):
    gs = make_state()
    cfg = gs.config
    gs.criteria = "basegame"
    gs.betmode = "base"
    assert gs.current_layout_weights() == {HOME: 1}  # nothing configured = v1
    cfg.layout_weights = {"atrium": 1}
    assert gs.current_layout_weights() == {"atrium": 1}
    cfg.layout_weights = {"base": {"annex": 1}, "bonus": {"mezzanine": 1}}  # per bet mode
    assert gs.current_layout_weights() == {"annex": 1}
    gs.betmode = "bonus"
    assert gs.current_layout_weights() == {"mezzanine": 1}
    gs.betmode = "entrance_orders"  # a mode that is not listed plays Mezzanine
    assert gs.current_layout_weights() == {HOME: 1}
    gs.betmode = "base"
    # a distribution condition wins over the config, per game type or flat
    dist = next(d for d in gs.get_betmode("base").get_distributions() if d._criteria == "basegame")
    try:
        dist._conditions["layout_weights"] = {"basegame": {"lobby": 2}}
        assert gs.current_layout_weights() == {"lobby": 2}
        dist._conditions["layout_weights"] = {"annex": 1, "lobby": 1}
        assert gs.current_layout_weights() == {"annex": 1, "lobby": 1}
        dist._conditions["layout_weights"] = {"basegame": {"annex": 1}, "freegame": {"atrium": 1}}
        with pytest.raises(LayoutError):  # free-spin layouts are reserved
            gs.current_layout_weights()
        dist._conditions["layout_weights"] = {"basegame": {"annex": 1}, "freegame": {"mezzanine": 1}}
        assert gs.current_layout_weights() == {"annex": 1}
    finally:
        dist._conditions.pop("layout_weights", None)


def test_bad_weights_fail_loudly(make_state):
    gs = make_state({"penthouse": 1})
    with pytest.raises(LayoutError):
        spin(gs, 1)
    gs.config.num_rows = [5] * 6


# ---------------------------------------------------------------------------------------------------- positions and the wire
def v1_wire_path(num_rows, rng):
    """The v1 make_fuse_path loop, verbatim, for the equivalence check."""
    n_reels = 6
    while True:
        path = [(0, rng.randrange(num_rows[0]))]
        while len(path) < 8:
            reel, row = path[-1]
            opts, wts = [], []
            for dr, dc, w in ((1, 0, 2), (0, -1, 1), (0, 1, 1)):
                nr, nc = reel + dr, row + dc
                if nr < n_reels and 0 <= nc < num_rows[nr] and (nr, nc) not in path:
                    opts.append((nr, nc))
                    wts.append(w)
            if not opts:
                break
            path.append(rng.choices(opts, weights=wts)[0])
        if len(path) == 8:
            return path


def test_wire_path_on_mezzanine_is_the_v1_path():
    for seed in range(300):
        assert generate_wire_path(LAYOUTS["mezzanine"], 8, random.Random(seed)) == v1_wire_path([5] * 6, random.Random(seed))


@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_wire_path_is_a_geometric_self_avoiding_path_from_reel_0(lid):
    lay = LAYOUTS[lid]
    rng = random.Random(42)
    for length in (8, 12):
        for _ in range(3000):
            path = generate_wire_path(lay, length, rng)
            assert len(path) == length == len(set(path))
            assert path[0][0] == 0
            geo = [(r, lay.cells[r][c]) for r, c in path]
            for (r, g), (r2, g2) in zip(geo, geo[1:]):
                assert (r2 - r, abs(g2 - g)) in ((1, 0), (0, 1)), (lid, geo)  # right, or up/down in the same reel; never left
            assert all(0 <= c < lay.heights[r] for r, c in path)


@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_wire_events_use_geometric_rows_and_blast_removes_non_scatter_burnt_cells(make_state, lid):
    gs = make_state({lid: 1})
    lay = LAYOUTS[lid]
    blasts = 0
    for seed in range(1200):
        book = spin(gs, seed, "basegame")
        ev = book["events"]
        fp = next(e for e in ev if e["type"] == "fusePath")
        assert len(fp["cells"]) == 8 and all(c["row"] in lay.cells[c["reel"]] for c in fp["cells"])
        for i, e in enumerate(ev):
            if e["type"] != "fuseBlast":
                continue
            blasts += 1
            assert {(c["reel"], c["row"]) for c in e["cells"]} <= {(c["reel"], c["row"]) for c in fp["cells"]}
            nxt = ev[i + 1]
            assert nxt["type"] == "tumbleBoard"  # blast is followed by the standard refill event
            padded = {(p["reel"], p["row"]) for p in nxt["explodingSymbols"]}
            assert len(padded) == len(e["cells"])
            geo = {(p["reel"], lay.cells[p["reel"]][p["row"] - 1]) for p in nxt["explodingSymbols"]}
            assert geo == {(c["reel"], c["row"]) for c in e["cells"]}  # compact-padded <-> geometric agree
    assert blasts >= 20, blasts


@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_win_positions_are_compact_padded_and_match_the_revealed_symbols(make_state, lid):
    """First winInfo of a book is evaluated on the revealed board: padded row p of reel r is reveal.board[r][p]."""
    gs = make_state({lid: 1})
    lay = LAYOUTS[lid]
    checked = 0
    for seed in range(400):
        book = spin(gs, seed, "basegame")
        ev = book["events"]
        rev = next(e for e in ev if e["type"] == "reveal")
        win_ev = next((e for e in ev if e["type"] == "winInfo"), None)
        if win_ev is None:
            continue
        for w in win_ev["wins"]:
            geo = set()
            for p in w["positions"]:
                assert 1 <= p["row"] <= lay.heights[p["reel"]]
                name = rev["board"][p["reel"]][p["row"]]["name"]
                assert name == w["symbol"] or rev["board"][p["reel"]][p["row"]].get("wild"), (name, w["symbol"])
                geo.add((p["reel"], lay.cells[p["reel"]][p["row"] - 1]))
            assert len(geo) == w["clusterSize"]
            # the geometric cells of a win form one connected group on the plan
            todo, comp = [next(iter(geo))], set()
            while todo:
                q = todo.pop()
                if q in comp:
                    continue
                comp.add(q)
                r, g = q
                todo += [x for x in ((r - 1, g), (r + 1, g), (r, g - 1), (r, g + 1)) if x in geo and x not in comp]
            assert comp == geo
            o = w["meta"]["overlay"]
            assert 1 <= o["row"] <= lay.heights[o["reel"]]
            checked += 1
    assert checked > 50


def test_atrium_padded_to_geometric_example_of_the_contract():
    cells = LAYOUTS["atrium"].cells
    # SYNTHESIS section 8 item 3: {"reel":0,"row":2} is geometric row 2, {"reel":1,"row":2} is geometric row 1
    assert cells[0][2 - 1] == 2 and cells[1][2 - 1] == 1


# ---------------------------------------------------------------------------------------------------- golden fixtures
@pytest.mark.parametrize("lid", LAYOUT_ORDER)
def test_golden_fixture_is_current_and_self_consistent(lid):
    path = os.path.join(GOLDEN, f"layout_{lid}.json")
    assert os.path.exists(path), "run tools/layout_bench.py golden"
    g = json.load(open(path))
    assert g == json.loads(json.dumps(bench.build_golden(lid))), "stale fixture: rerun tools/layout_bench.py golden"
    lay = LAYOUTS[lid]
    types = [e["type"] for e in g["events"]]
    assert types == ["layout", "reveal", "fusePath", "winInfo", "tumbleBoard", "fuseBurn"]
    assert g["events"][0] == lay.to_event(0)
    ex = g["expect"]
    assert ex["cellCount"] == lay.cell_count
    assert ex["revealColumnLengths"] == [h + 2 for h in lay.heights]
    assert sum(1 for row in ex["geoGrid"] for s in row if s is not None) == lay.cell_count
    for r in range(6):
        for ci, geo in enumerate(lay.cells[r]):
            assert ex["paddedToGeo"][r][ci] == geo and ex["geoToPadded"][r][str(geo)] == ci + 1
    win = g["events"][3]
    for w, geo in zip(win["wins"], ex["winGeoPositions"]):
        assert [(p["reel"], p["row"]) for p in geo] == [(p["reel"], lay.cells[p["reel"]][p["row"] - 1]) for p in w["positions"]]


# ---------------------------------------------------------------------------------------------------- v1 replay
@pytest.mark.skipif(not os.path.exists(os.path.join(V1_BOOKS, "books_base.jsonl.zst")), reason="v1 snapshot not present")
@pytest.mark.parametrize("weights", [None, {"mezzanine": 1}])
def test_v1_base_books_replay_bit_for_bit(weights):
    class A:
        mode, n = "base", 300

    A.weights = json.dumps(weights) if weights else "none"
    assert bench.cmd_v1equiv(A) == 0


@pytest.mark.skipif(not os.path.exists(os.path.join(V1_BOOKS, "books_bonus.jsonl.zst")), reason="v1 snapshot not present")
def test_v1_bonus_books_replay_bit_for_bit():
    class A:
        mode, n, weights = "bonus", 60, '{"mezzanine": 1}'

    assert bench.cmd_v1equiv(A) == 0
