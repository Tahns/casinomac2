#!/usr/bin/env python3
"""08_poc_sdk.py - proofs of concept for docs/research2/08_sdk_feasibility.md (Agent Mambo v2).

Runs the REAL Stake math SDK + math/games/agent_mambo classes in memory (no books, lookup tables or library files are
written; python may write __pycache__). Subclasses add: variable board shape per spin (geometry map), several bonus
types ("missions") inside one mode, banked "case" pay timing, and mid-cascade row growth.

Usage (env python of the repo, one core each):
  math/env/bin/python docs/research2/08_poc_sdk.py equiv
  math/env/bin/python docs/research2/08_poc_sdk.py shapes bonus 100 open6x5,atrium,penthouse6x7
  math/env/bin/python docs/research2/08_poc_sdk.py shapes base 800 open6x5,atrium
  math/env/bin/python docs/research2/08_poc_sdk.py missions 300 briefing,demolition,case
  math/env/bin/python docs/research2/08_poc_sdk.py grow 3000
  math/env/bin/python docs/research2/08_poc_sdk.py mem 2000
Geometry model: CELLS[r] = sorted GEOMETRIC rows of reel r; the SDK board column r is the COMPACT list of those cells,
so tumble / reveal / padding code stays stock. Adjacency is overridden (Cluster.get_neighbours is not safe for jagged
boards: it raises IndexError). Numbers in the report come from this script on a 4-core, 15 GB sandbox.
"""
import collections
import gc
import json
import os
import resource
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
MATH = os.path.abspath(os.path.join(HERE, "..", "..", "math"))
sys.path.insert(0, MATH)
sys.path.insert(0, os.path.join(MATH, "games", "agent_mambo"))
from gamestate import GameState  # noqa: E402
from game_config import GameConfig  # noqa: E402
from game_events import update_global_mult_event  # noqa: E402
from src.calculations.cluster import Cluster  # noqa: E402
from src.calculations.statistics import get_random_outcome  # noqa: E402
from src.wins.win_manager import WinManager  # noqa: E402

R = range
SHAPES = {
    "open6x5": [list(R(5)) for _ in R(6)],
    "atrium": [[1, 2, 3]] + [list(R(5)) for _ in R(4)] + [[1, 2, 3]],  # 4 corners cut (26 cells)
    "lobby6x4": [list(R(4)) for _ in R(6)],
    "annex6x6": [list(R(6)) for _ in R(6)],
    "penthouse6x7": [list(R(7)) for _ in R(6)],
    "skyline": [[1, 2, 3], [0, 1, 2, 3], list(R(5)), list(R(5)), [0, 1, 2, 3], [1, 2, 3]],
    "pyramid_c": [[2, 3], [1, 2, 3, 4], list(R(6)), list(R(6)), [1, 2, 3, 4], [2, 3]],
    "hourglass": [list(R(7)), list(R(6)), [2, 3, 4], [2, 3, 4], list(R(6)), list(R(7))],
    "pillars_holes": [list(R(5)), [0, 1, 3, 4], list(R(5)), list(R(5)), [0, 1, 3, 4], list(R(5))],  # INTERIOR holes
    "big7x7_tile": [list(R(7)) for _ in R(7)],  # 7 reels: strips are tiled from the 6 real ones (PoC only)
    "tall4x8": [list(R(8)) for _ in R(4)],
    "wide8x4": [list(R(4)) for _ in R(8)],
}
CELLS = None
POS = None


def set_geometry(cells):
    global CELLS, POS
    CELLS = cells
    POS = [{g: i for i, g in enumerate(col)} for col in cells]


def geo_neighbours(board, reel, row, local_checked):
    """Geometry-aware replacement of Cluster.get_neighbours (same signature)."""
    g = CELLS[reel][row]
    out = []
    for nr, ng in ((reel - 1, g), (reel + 1, g), (reel, g - 1), (reel, g + 1)):
        if nr < 0 or nr >= len(board):
            continue
        j = POS[nr].get(ng)
        if j is None or j >= len(board[nr]):
            continue
        if (nr, j) not in local_checked:
            out.append((nr, j))
            local_checked.append((nr, j))
    return out


_stock_get_neighbours = Cluster.get_neighbours
Cluster.get_neighbours = staticmethod(geo_neighbours)
set_geometry(SHAPES["open6x5"])  # default geometry (states without a shape draw keep the 6x5 board)


class ShapedState(GameState):
    shape_weights = {"open6x5": 1}

    def draw_board(self, emit_event=True, trigger_symbol="scatter"):
        sid = get_random_outcome(self.shape_weights)
        cells = SHAPES[sid]
        set_geometry(cells)
        self.config.num_rows = [len(c) for c in cells]  # config is a process-local singleton: restore after the spin
        self.config.num_reels = len(cells)
        self.shape_id = sid
        if emit_event:
            self.book.add_event({"index": len(self.book.events), "type": "layout", "id": sid, "cells": cells})
        super().draw_board(emit_event, trigger_symbol)


def tile_strips(config, n):
    for strips in config.reels.values():
        while len(strips) < n:
            strips.append(list(strips[len(strips) % 6]))


# ----------------------------------------------------------------------------------------------- missions
MISSIONS = {
    "briefing": dict(gm_step=8, fuse=dict(len=8, b0=1, adv=1, detmin=3), pay="live"),
    "demolition": dict(gm_step=2, fuse=dict(len=12, b0=5, adv=2, detmin=3), pay="live"),
    "case": dict(gm_step=7, fuse=dict(len=8, b0=1, adv=1, detmin=3), pay="bank"),
}
FORCED = {"m": None}


class MissionState(GameState):
    def run_freespin_from_base(self, scatter_key="scatter"):
        w = self.get_current_distribution_conditions().get("mission_weights", {"briefing": 1})
        self.mission = FORCED["m"] or get_random_outcome(w)
        self.record({"mission": self.mission})  # force-record key the optimizer / reweighter can pin
        self.config.fuse_params[self.config.freegame_type] = dict(MISSIONS[self.mission]["fuse"])
        super().run_freespin_from_base(scatter_key)
        self.config.fuse_params[self.config.freegame_type] = dict(MISSIONS["briefing"]["fuse"])

    def update_freespin_amount(self, scatter_key="scatter"):
        super().update_freespin_amount(scatter_key)
        if self.gametype == self.config.basegame_type:
            self.book.add_event({"index": len(self.book.events), "type": "missionAssigned",
                                 "mission": self.mission, "totalFs": self.tot_fs})

    def bump_global_mult(self):
        if self.gametype != self.config.freegame_type or self.wincap_triggered or self.win_data["totalWin"] <= 0:
            return
        step = MISSIONS[self.mission]["gm_step"]
        self.global_multiplier = min(self.global_multiplier + step, self.config.gm_cap)
        update_global_mult_event(self)

    def evaluate_clusters_with_grid(self, config, board, clusters, pos_mult_grid=None, global_multiplier=1,
                                    return_data=None):
        pay = global_multiplier
        if self.gametype == config.freegame_type and MISSIONS[self.mission]["pay"] == "bank":
            pay = 1  # banked at x1, multiplied when the case opens
        return super().evaluate_clusters_with_grid(config, board, clusters, pos_mult_grid, pay, return_data)

    def cascade(self, freegame=False):
        super().cascade(freegame)
        if freegame and MISSIONS[self.mission]["pay"] == "bank" and not self.wincap_triggered:
            bank = self.win_manager.spin_win
            if bank > 0:
                paid = round(bank * self.global_multiplier, 2)
                self.win_manager.set_spin_win(paid)
                self.book.add_event({"index": len(self.book.events), "type": "caseOpen", "bank": int(round(bank * 100)),
                                     "mult": int(self.global_multiplier), "win": int(round(paid * 100))})
                self.evaluate_wincap()


# ----------------------------------------------------------------------------------------------- growth
class GrowState(ShapedState):
    def grow_row(self):
        """Add one row on top of every reel in the middle of a cascade (stock tumble keeps working afterwards)."""
        c = self.config
        for r in range(c.num_reels):
            strip, pos = self.reelstrip[r], self.reel_positions[r]
            self.board[r].insert(0, self.top_symbols[r])
            self.reel_positions[r] = (pos - 1) % len(strip)
            self.top_symbols[r] = self.create_symbol(strip[(pos - 2) % len(strip)])
            c.num_rows[r] += 1
        set_geometry([[0] + [g + 1 for g in col] for col in CELLS])
        self.get_special_symbols_on_board()
        self.book.add_event({"index": len(self.book.events), "type": "gridGrow", "rows": c.num_rows[0], "cells": CELLS})

    def cascade(self, freegame=False):
        self.get_clusters_update_wins()
        self.emit_tumble_win_events()
        did = False
        while True:
            while self.win_data["totalWin"] > 0 and not self.wincap_triggered:
                self.tumble_game_board()
                self.advance_fuse()
                if not did and self.config.num_rows[0] < 7:
                    self.grow_row()
                    did = True
                self.get_clusters_update_wins()
                self.emit_tumble_win_events()
            if self.wincap_triggered or not self.resolve_fuse():
                break
            self.get_clusters_update_wins()
            self.emit_tumble_win_events()


# ----------------------------------------------------------------------------------------------- harness
def rss_mb():
    return int(open("/proc/self/statm").read().split()[1]) * 4096 / 1e6


def make(state_cls):
    cfg = GameConfig()
    tile_strips(cfg, 8)
    gs = state_cls(cfg)
    cnt = {"n": 0}
    orig = gs.reset_book

    def counting():
        cnt["n"] += 1
        orig()

    gs.reset_book = counting
    return cfg, gs, cnt


def prepare(cfg, gs, cnt, mode):
    gs.betmode = mode
    cfg.wincap = 5000
    gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, 5000)
    gs.library = {}
    gs.recorded_events = {}
    cnt["n"] = 0


def cmd_equiv(trials=300):
    import random
    set_geometry(SHAPES["open6x5"])

    class S:
        def __init__(self, n):
            self.name = n

        def check_attribute(self, k):
            return k == "wild" and self.name == "W"

    def norm(d):
        return sorted((k, tuple(sorted(cl))) for k, v in d.items() for cl in v)

    bad = 0
    for _ in range(trials):
        b = [[S(random.choice(["H1", "H2", "H3", "L1", "L2", "W"])) for _ in R(5)] for _ in R(6)]
        Cluster.get_neighbours = staticmethod(geo_neighbours)
        a = norm(Cluster.get_clusters(b, "wild"))
        Cluster.get_neighbours = staticmethod(_stock_get_neighbours)
        c = norm(Cluster.get_clusters(b, "wild"))
        Cluster.get_neighbours = staticmethod(geo_neighbours)
        bad += a != c
    print("open6x5 geometric adjacency vs stock Cluster, mismatches in", trials, "random boards:", bad)
    jag = [[S("H1") for _ in R(5)], [S("H1") for _ in R(3)], [S("H1") for _ in R(5)]]
    Cluster.get_neighbours = staticmethod(_stock_get_neighbours)
    try:
        Cluster.get_clusters(jag)
        print("stock Cluster on a jagged board: no error")
    except Exception as e:  # noqa: BLE001
        print("stock Cluster on a jagged board:", type(e).__name__, e)
    Cluster.get_neighbours = staticmethod(geo_neighbours)


def cmd_shapes(mode, n, names):
    cfg, gs, cnt = make(ShapedState)
    for s in names:
        gs.shape_weights = {s: 1}
        crits = ["basegame", "freegame"] if mode == "base" else ["fgfloor4"]
        for crit in crits:
            nn = n if crit != "freegame" else max(n // 15, 20)
            prepare(cfg, gs, cnt, mode)
            t0 = time.time()
            for i in range(nn):
                gs.criteria = crit
                gs.run_spin(i, i)
            dt = time.time() - t0
            cfg.num_rows, cfg.num_reels = [5] * 6, 6
            ev = sum(len(b["events"]) for b in gs.library.values()) / nn
            kb = sum(len(json.dumps(b)) for b in gs.library.values()) / nn / 1024
            print(dict(shape=s, mode=mode, crit=crit, n=nn, ms_per_book=round(1000 * dt / nn, 1),
                       attempts_per_book=round(cnt["n"] / nn, 2), events=round(ev, 1), json_kb=round(kb, 1)), flush=True)


def cmd_missions(n, names):
    cfg, gs, cnt = make(MissionState)
    for m in names:
        FORCED["m"] = m
        prepare(cfg, gs, cnt, "bonus")
        t0 = time.time()
        for i in range(n):
            gs.criteria = "fgfloor4"
            gs.run_spin(i, i)
        dt = time.time() - t0
        wins = sorted(b["payoutMultiplier"] / 100 for b in gs.library.values())
        types = collections.Counter(e["type"] for b in gs.library.values() for e in b["events"])
        bad = sum(1 for b in gs.library.values()
                  if [e for e in b["events"] if e["type"] == "finalWin"][0]["amount"] != b["payoutMultiplier"])
        print(dict(mission=m, n=n, ms_per_book=round(1000 * dt / n, 1), attempts=round(cnt["n"] / n, 2),
                   mean=round(sum(wins) / n, 1), median=wins[n // 2], p90=wins[int(n * .9)], max=wins[-1],
                   events=round(sum(types.values()) / n, 1), blasts=round(types["fuseBlast"] / n, 2),
                   reconcile_errors=bad, caseOpen=types["caseOpen"], missionAssigned=types["missionAssigned"],
                   force_keys=sorted(k for r in gs.recorded_events for k in r if k[0] == "mission")[:3]), flush=True)


def cmd_grow(n):
    cfg, gs, cnt = make(GrowState)
    gs.shape_weights = {"open6x5": 1}
    prepare(cfg, gs, cnt, "base")
    t0 = time.time()
    for i in range(n):
        gs.criteria = "basegame"
        gs.run_spin(i, i)
    ev = collections.Counter(e["type"] for b in gs.library.values() for e in b["events"])
    print("books", n, "ms/book", round(1000 * (time.time() - t0) / n, 2), "gridGrow", ev["gridGrow"], "tumbleBoard", ev["tumbleBoard"])


def cmd_mem(n):
    cfg, gs, cnt = make(GameState)
    prepare(cfg, gs, cnt, "bonus")
    r0 = rss_mb()
    for i in range(n):
        gs.criteria = "fgfloor4"
        gs.run_spin(i, i)
        if (i + 1) % (n // 4) == 0:
            gc.collect()
            print(i + 1, "books, RSS MB", round(rss_mb()), "KB per book in RAM", round((rss_mb() - r0) * 1000 / (i + 1), 1), flush=True)
    raw = sum(len(json.dumps(b)) for b in gs.library.values()) / n / 1024
    print("raw json KB per book", round(raw, 1))


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "equiv":
        cmd_equiv()
    elif cmd == "shapes":
        cmd_shapes(sys.argv[2], int(sys.argv[3]), sys.argv[4].split(","))
    elif cmd == "missions":
        cmd_missions(int(sys.argv[2]), sys.argv[3].split(","))
    elif cmd == "grow":
        cmd_grow(int(sys.argv[2]))
    elif cmd == "mem":
        cmd_mem(int(sys.argv[2]))
    print("maxrss MB", resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024)
