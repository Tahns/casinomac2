"""WP7 MATH-GEO bench and proof tool (run with the repo env python from anywhere):

  math/env/bin/python math/games/agent_mambo/tools/layout_bench.py bench  --boards 100000        # 4 plans x N SDK boards, full cascades
  math/env/bin/python math/games/agent_mambo/tools/layout_bench.py spins  --n 3000               # full books (wire, events) per plan
  math/env/bin/python math/games/agent_mambo/tools/layout_bench.py v1equiv --mode base --n 1000  # replay v1 library books bit for bit
  math/env/bin/python math/games/agent_mambo/tools/layout_bench.py mix    --n 20000              # nominal 50/22/14/14 draw: shares, hit rate
  math/env/bin/python math/games/agent_mambo/tools/layout_bench.py golden                        # rewrite tests/golden/*.json

`bench` draws real SDK boards (reel strips BR0, the plan's column heights), finds geometric clusters, pays them exactly as the
game does (cluster size + symbol in the paytable), tumbles with the SDK until the board is dead and asserts after every step that
the cell count is conserved. It also builds a wire path and the overlay of every win. Any IndexError / GeometryError aborts.
Uses at most --procs processes (default 1, hard cap 3).
"""

import argparse
import collections
import io
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
MATH = os.path.abspath(os.path.join(GAME, "..", ".."))
for _p in (MATH, GAME):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from layouts import LAYOUT_ORDER, LAYOUTS, NOMINAL_WEIGHTS  # noqa: E402

GOLDEN_DIR = os.path.join(GAME, "tests", "golden")
V1_BOOKS = os.path.join(GAME, "library", "publish_files_v1")


UNSET = object()


def new_state(mode="base", weights=UNSET, layout_event=UNSET):
    """GameState on the singleton config. weights: dict = config.layout_weights; None = nothing configured (v1 behaviour);
    UNSET = leave the game config as it is. layout_event: None/True/False as config.layout_event, UNSET = untouched."""
    from gamestate import GameState
    from game_config import GameConfig
    from src.wins.win_manager import WinManager

    cfg = GameConfig()  # NB: every GameConfig() call re-runs __init__ on the singleton
    cfg.wincap = 5000
    if weights is not UNSET:
        cfg.layout_weights = weights
    if layout_event is not UNSET:
        cfg.layout_event = layout_event
    gs = GameState(cfg)
    gs.betmode = mode
    gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, 5000)
    gs.library = {}
    gs.recorded_events = {}
    return cfg, gs


# --------------------------------------------------------------------------------------------------------------- bench
def run_board(gs, seed, layout):
    """One SDK board on `layout` cascaded to the end. Returns (tumble steps, paying clusters, cells)."""
    gs.reset_seed(seed)
    gs.criteria = "basegame"
    gs.reset_book()
    gs.draw_board(emit_event=False)
    assert gs.layout.id == layout.id, (gs.layout.id, layout.id)
    cfg = gs.config
    assert cfg.num_rows == list(layout.heights)
    steps = pays = 0
    while True:
        gs.check_board_shape()
        clusters = gs.find_clusters("wild")
        hit = False
        for sym, lst in clusters.items():
            for cl in lst:
                if (len(cl), sym) in cfg.paytable:
                    hit = True
                    pays += 1
                    gs.cluster_overlay(cl)
                    for r, c in cl:
                        gs.board[r][c].explode = True
        if not hit:
            break
        gs.tumble_board()
        steps += 1
        n = sum(len(col) for col in gs.board)
        assert n == layout.cell_count, f"tumble changed the cell count: {n} != {layout.cell_count}"
        if steps > 200:
            raise AssertionError("cascade does not end")
    path = gs.generate_wire_path(8)
    assert len(path) == 8 and len(set(path)) == 8
    gs.geo_cells(path)
    return steps, pays, layout.cell_count


def _bench_worker(args):
    lid, lo, hi = args
    cfg, gs = new_state("base", {lid: 1})
    layout = LAYOUTS[lid]
    steps = pays = 0
    t0 = time.time()
    for seed in range(lo, hi):
        s, p, _ = run_board(gs, seed, layout)
        steps += s
        pays += p
    return lid, hi - lo, time.time() - t0, steps, pays


def cmd_bench(a):
    from multiprocessing import Pool

    procs = max(1, min(a.procs, 3))
    ids = a.layouts.split(",") if a.layouts != "all" else list(LAYOUT_ORDER)
    out = {}
    for lid in ids:
        chunk = a.boards // procs
        jobs = [(lid, p * chunk, (p + 1) * chunk if p < procs - 1 else a.boards) for p in range(procs)]
        t0 = time.time()
        if procs == 1:
            res = [_bench_worker(jobs[0])]
        else:
            with Pool(procs) as pool:
                res = pool.map(_bench_worker, jobs)
        wall = time.time() - t0
        n = sum(r[1] for r in res)
        steps = sum(r[3] for r in res)
        pays = sum(r[4] for r in res)
        out[lid] = dict(boards=n, wall_s=round(wall, 1), boards_per_s=round(n / wall), tumble_steps_per_board=round(steps / n, 3),
                        paying_clusters_per_board=round(pays / n, 3), cells=LAYOUTS[lid].cell_count)
        print(lid, out[lid], flush=True)
    print("BENCH OK: no IndexError / GeometryError, cell count conserved on every tumble step")
    return out


# --------------------------------------------------------------------------------------------------------------- spins
def check_book(book, lid):
    """Light reconciliation of a book: layout event first, positions inside the plan (the plan of the base spin until
    freeSpinTrigger, Mezzanine afterwards: free spins are always on the home plan), finalWin == payoutMultiplier."""
    ev = book["events"]
    layout = LAYOUTS[lid]
    home = LAYOUTS["mezzanine"]
    types = [e["type"] for e in ev]
    if lid != "mezzanine" or ev[0]["type"] == "layout":
        assert ev[0]["type"] == "layout" and ev[0]["index"] == 0 and ev[1]["type"] == "reveal", types[:3]
        assert ev[0]["id"] == lid and ev[0]["cells"] == [list(c) for c in layout.cells]
    assert types.count("layout") <= 1
    cur = layout
    for e in ev:
        t = e["type"]
        if t == "freeSpinTrigger":
            for p in e["positions"]:  # still the base board
                assert 1 <= p["row"] <= layout.heights[p["reel"]], p
            cur = home
            continue
        if t == "reveal":
            assert [len(c) for c in e["board"]] == [h + 2 for h in cur.heights], (e["gameType"], cur.id)
            assert len(e["anticipation"]) == 6 and len(e["paddingPositions"]) == 6
        elif t in ("fusePath", "fuseBurn", "fuseBlast"):
            for c in e.get("cells") or e.get("newCells"):
                assert c["row"] in cur.cells[c["reel"]], (t, c, cur.id)
        elif t == "winInfo":
            for w in e["wins"]:
                for p in w["positions"]:
                    assert 1 <= p["row"] <= cur.heights[p["reel"]], p
                o = w["meta"]["overlay"]
                assert 1 <= o["row"] <= cur.heights[o["reel"]], o
        elif t == "tumbleBoard":
            for p in e["explodingSymbols"]:
                assert 1 <= p["row"] <= cur.heights[p["reel"]], p
            for r, syms in enumerate(e["newSymbols"]):
                assert len(syms) <= cur.heights[r] + 1
    fw = [e for e in ev if e["type"] == "finalWin"]
    assert len(fw) == 1 and fw[0]["amount"] == book["payoutMultiplier"]


def cmd_spins(a):
    ids = a.layouts.split(",") if a.layouts != "all" else list(LAYOUT_ORDER)
    for lid in ids:
        cfg, gs = new_state("base", {lid: 1})
        for crit, share in (("0", 0.4), ("basegame", 0.5), ("freegame", 0.1)):
            n = max(int(a.n * share), 1)
            if crit == "freegame":
                n = max(n // 4, 1)
            gs.library, gs.recorded_events = {}, {}
            t0 = time.time()
            for i in range(n):
                gs.criteria = crit
                gs.run_spin(i)
            dt = time.time() - t0
            for b in gs.library.values():
                check_book(b, lid)
            ev = collections.Counter(e["type"] for b in gs.library.values() for e in b["events"])
            print(dict(layout=lid, criteria=crit, books=n, ms_per_book=round(1000 * dt / n, 2),
                       events_per_book=round(sum(ev.values()) / n, 1), layoutEvents=ev["layout"], winInfo=ev["winInfo"],
                       fuseBlast=ev["fuseBlast"], freeSpinTrigger=ev["freeSpinTrigger"]), flush=True)
            assert cfg.num_rows == [5] * 6, "config.num_rows leaked out of the book"
    print("SPINS OK: events reconcile on every book")


# --------------------------------------------------------------------------------------------------------------- v1 replay
def cmd_v1equiv(a):
    import zstandard

    # default: the explicit v1 switch; "config" = leave the game config as it is; "none" = nothing configured
    raw = a.weights if a.weights is not None else '{"mezzanine": 1}'
    weights = UNSET if raw == "config" else (None if raw == "none" else json.loads(raw))
    fh = open(os.path.join(V1_BOOKS, f"books_{a.mode}.jsonl.zst"), "rb")
    rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
    books = []
    for line in rd:
        books.append(json.loads(line))
        if len(books) >= a.n:
            break
    cfg, gs = new_state(a.mode, weights)
    bad = 0
    t0 = time.time()
    for b in books:
        gs.criteria = b["criteria"]
        gs.run_spin(b["id"])
        nb = gs.library[b["id"] + 1]
        if json.dumps(nb["events"]) != json.dumps(b["events"]) or nb["payoutMultiplier"] != b["payoutMultiplier"]:
            bad += 1
            if bad <= 3:
                print("MISMATCH book", b["id"], b["criteria"])
    print(f"V1EQUIV mode={a.mode} weights={weights} books={len(books)} mismatches={bad} sec={time.time() - t0:.1f}")
    return bad


# --------------------------------------------------------------------------------------------------------------- mix
def cmd_mix(a):
    """Natural (unfiltered) non-triggering base spins per plan, strips BR0 and the real paytable: hit rate, mean win, and the
    nominal-mix aggregate vs all-Mezzanine. Excludes the free-game share (trigger spins are not drawn here)."""
    per = {}
    for lid in LAYOUT_ORDER:
        cfg, gs = new_state("base", {lid: 1})
        gs.check_repeat = lambda: None  # accept every spin: no criteria filter, so the sample is the natural draw
        t0 = time.time()
        wins = []
        for i in range(a.n):
            gs.criteria = "basegame"
            gs.run_spin(i + a.seed)
            wins.append(gs.library[i + a.seed + 1]["payoutMultiplier"] / 100)
            gs.library.clear()
        mean = sum(wins) / a.n
        hit = sum(1 for w in wins if w > 0) / a.n
        per[lid] = dict(n=a.n, cells=LAYOUTS[lid].cell_count, hit=round(hit, 4), mean_win_x=round(mean, 4),
                        gt1x=round(sum(1 for w in wins if w > 1) / a.n, 4), sec=round(time.time() - t0, 1))
        print(lid, per[lid], flush=True)
    tot = sum(NOMINAL_WEIGHTS.values())
    mix_mean = sum(NOMINAL_WEIGHTS[k] / tot * per[k]["mean_win_x"] for k in per)
    mix_hit = sum(NOMINAL_WEIGHTS[k] / tot * per[k]["hit"] for k in per)
    mix_cells = sum(NOMINAL_WEIGHTS[k] / tot * per[k]["cells"] for k in per)
    base = per["mezzanine"]["mean_win_x"]
    print(f"nominal mix {NOMINAL_WEIGHTS}: mean cells {mix_cells:.2f}, hit {mix_hit:.4f}, mean win {mix_mean:.4f}x "
          f"= {100 * (mix_mean / base - 1):+.1f}% vs all-Mezzanine ({base:.4f}x)")


# --------------------------------------------------------------------------------------------------------------- golden
def first_spin_with(lid, want_blast=False):
    """Deterministic search for a base book on `lid` whose events contain a winInfo followed by a tumbleBoard (and a fuse path)."""
    cfg, gs = new_state("base", {lid: 1}, layout_event=True)
    for seed in range(5000):
        gs.library, gs.recorded_events = {}, {}
        gs.criteria = "basegame"
        gs.run_spin(seed)
        book = gs.library[seed + 1]
        types = [e["type"] for e in book["events"]]
        if "winInfo" in types and "tumbleBoard" in types and "fuseBurn" in types and (not want_blast or "fuseBlast" in types):
            multi = [e for e in book["events"] if e["type"] == "winInfo" and len(e["wins"]) >= 1]
            if multi and max(len(w["positions"]) for e in multi for w in e["wins"]) >= 6:
                return seed, book
    raise RuntimeError("no suitable book found for " + lid)


def build_golden(lid):
    seed, book = first_spin_with(lid)
    layout = LAYOUTS[lid]
    ev = book["events"]
    reveal = next(e for e in ev if e["type"] == "reveal")
    win_i = next(i for i, e in enumerate(ev) if e["type"] == "winInfo")
    win = ev[win_i]
    tumble = next(e for e in ev[win_i:] if e["type"] == "tumbleBoard")
    fuse_path = next(e for e in ev if e["type"] == "fusePath")
    fuse_burn = next(e for e in ev if e["type"] == "fuseBurn")
    layout_ev = layout.to_event(0)
    cells = layout.cells

    def geo(p):
        return {"reel": p["reel"], "row": cells[p["reel"]][p["row"] - 1]}

    # independent derivation: geometric picture of the reveal (rows x cols, null = no cell), top pad / bottom pad dropped
    grid = [[None] * 6 for _ in range(layout.rows)]
    for r, col in enumerate(reveal["board"]):
        assert len(col) == len(cells[r]) + 2
        for ci, sym in enumerate(col[1:-1]):
            grid[cells[r][ci]][r] = sym["name"]
    return {
        "_doc": "Golden fixture for frontend geo.js (WP7 MATH-GEO). events = the first events of one real base book "
                "(layout, reveal, fusePath, winInfo, tumbleBoard, fuseBurn) exactly as the math emits them. winInfo positions, "
                "winInfo overlay and tumbleBoard.explodingSymbols are COMPACT-PADDED (padded = compactIndex + 1, geometric = "
                "cells[reel][padded-1]); fusePath / fuseBurn cells are GEOMETRIC. expect.* is derived on the math side from "
                "the layout cells and is what geo.toGeo / toPadded must reproduce.",
        "layoutId": lid,
        "seed": seed,
        "criteria": "basegame",
        "events": [layout_ev, reveal, fuse_path, win, tumble, fuse_burn],
        "expect": {
            "cellCount": layout.cell_count,
            "revealColumnLengths": [len(c) for c in reveal["board"]],
            "geoGrid": grid,
            "winGeoPositions": [[geo(p) for p in w["positions"]] for w in win["wins"]],
            "winOverlayGeo": [geo(w["meta"]["overlay"]) for w in win["wins"]],
            "tumbleExplodingGeo": [geo(p) for p in tumble["explodingSymbols"]],
            "paddedToGeo": [[cells[r][p - 1] for p in range(1, len(cells[r]) + 1)] for r in range(6)],
            "geoToPadded": [{str(g): i + 1 for i, g in enumerate(cells[r])} for r in range(6)],
        },
    }


def cmd_golden(a):
    os.makedirs(GOLDEN_DIR, exist_ok=True)
    for lid in LAYOUT_ORDER:
        g = build_golden(lid)
        path = os.path.join(GOLDEN_DIR, f"layout_{lid}.json")
        with open(path, "w") as f:
            json.dump(g, f, indent=1)
            f.write("\n")
        print("wrote", os.path.relpath(path, GAME), "seed", g["seed"])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("bench")
    b.add_argument("--boards", type=int, default=100000)
    b.add_argument("--layouts", default="all")
    b.add_argument("--procs", type=int, default=1)
    s = sub.add_parser("spins")
    s.add_argument("--n", type=int, default=2000)
    s.add_argument("--layouts", default="all")
    v = sub.add_parser("v1equiv")
    v.add_argument("--mode", default="base", choices=["base", "bonus"])
    v.add_argument("--n", type=int, default=1000)
    v.add_argument("--weights", default=None, help='JSON dict, "none" or "config"; default {"mezzanine": 1}')
    m = sub.add_parser("mix")
    m.add_argument("--n", type=int, default=20000)
    m.add_argument("--seed", type=int, default=0)
    sub.add_parser("golden")
    a = ap.parse_args()
    {"bench": cmd_bench, "spins": cmd_spins, "v1equiv": cmd_v1equiv, "mix": cmd_mix, "golden": cmd_golden}[a.cmd](a)


if __name__ == "__main__":
    main()
