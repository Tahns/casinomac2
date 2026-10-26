"""WP8 MATH-MISSIONS smoke and reconcile tool (run with the repo env python from anywhere).

  math/env/bin/python math/games/agent_mambo/tools/mission_smoke.py smoke --mode entrance_blackout --n 5000 --procs 3
  math/env/bin/python math/games/agent_mambo/tools/mission_smoke.py gate  --mission blackout --n 300        # T+2:00 Blackout gate
  math/env/bin/python math/games/agent_mambo/tools/mission_smoke.py v1equiv --mode bonus --n 300             # replay v1 books

`smoke` plays n books of one bet mode in-process (SDK criteria split, SDK seeds, per-mode seed offset, real GameConfig) and reconciles
EVERY book against its own events (`reconcile_book`): events reproduce payoutMultiplier, payouts are multiples of 0.1x, the mission
rules of SYNTHESIS sections 2 and 8 hold event by event. It prints mean / median / post-floor statistics, attempts per book and ms per
book. `gate` forces one mission in a floor-guarded fgfloor4 run (the Blackout gate: mean post-floor 70-140x and 0 reconcile errors).
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

V1_BOOKS = os.path.join(GAME, "library", "publish_files_v1")
FLOOR = 30.0


# --------------------------------------------------------------------------------------------------------------- state
def new_state(mode, mission_weights=None, layout_weights=None):
    """GameState on the singleton config. mission_weights / layout_weights: None = leave the game config as it is."""
    from gamestate import GameState
    from game_config import GameConfig
    from src.wins.win_manager import WinManager

    cfg = GameConfig()  # NB: every GameConfig() call re-runs __init__ on the singleton
    cap = [b for b in cfg.bet_modes if b.get_name() == mode][0].get_wincap()
    cfg.wincap = cap
    if mission_weights is not None:
        cfg.mission_weights = {mode: mission_weights}
    if layout_weights is not None:
        cfg.layout_weights = {mode: layout_weights}
    gs = GameState(cfg)
    gs.betmode = mode
    gs.win_manager = WinManager(cfg.basegame_type, cfg.freegame_type, cap)
    gs.library = {}
    gs.recorded_events = {}
    return cfg, gs


def criteria_plan(gs, mode, n):
    """SDK criteria split and assignment (same recipe as create_books) for n books."""
    from src.state.run_sims import assign_sim_criteria, get_sim_splits

    splits = get_sim_splits(gs, n, mode)
    return assign_sim_criteria(splits, n)


# --------------------------------------------------------------------------------------------------------------- reconcile
class ReconcileError(AssertionError):
    pass


def _fail(book, msg):
    raise ReconcileError(f"book {book['id']} ({book['criteria']}): {msg}")


def reconcile_book(book, wincap_x100=500000, expect_mission=None):
    """Replay the events of one book and assert every rule of the contract (SYNTHESIS 8). Returns a dict of facts about the book.
    expect_mission: required mission id of the feature ('briefing' also accepts a book without missionAssigned = v1)."""
    ev = book["events"]
    types = [e["type"] for e in ev]
    for i, e in enumerate(ev):
        if e["index"] != i:
            _fail(book, f"event {i} has index {e['index']}")
    fw = [e for e in ev if e["type"] == "finalWin"]
    if len(fw) != 1 or ev[-1]["type"] != "finalWin":
        _fail(book, "exactly one finalWin, and it is last")
    if fw[0]["amount"] != book["payoutMultiplier"]:
        _fail(book, f"finalWin {fw[0]['amount']} != payoutMultiplier {book['payoutMultiplier']}")
    if book["payoutMultiplier"] % 10 or book["payoutMultiplier"] > wincap_x100:
        _fail(book, f"payout {book['payoutMultiplier']} is not a multiple of 0.1x or exceeds the cap")

    facts = {"mission": None, "spins": 0, "caseOpen": 0, "banked_steps": 0, "lit_steps": 0, "steps": 0, "capped": False,
             "route_len": None, "max_dial": 1}
    mission, assigned = None, None
    in_free = False
    capped = False
    dial = 1
    dial_step = None
    # per spin state
    bank = 0
    tumbles = 0
    route = None
    after_reveal = False
    spin_win_total = 0  # sum of the amounts credited by spins (x100), reproduces the payout
    last_set_total = 0
    bank_open_pending = False
    first_gm_seen = False
    got_trigger = False
    for i, e in enumerate(ev):
        t = e["type"]
        if t == "freeSpinTrigger":
            got_trigger = True
            nxt = ev[i + 1] if i + 1 < len(ev) else {}
            if nxt.get("type") == "missionAssigned":
                assigned = nxt
                mission = nxt["mission"]
                if nxt["totalFs"] != e["totalFs"]:
                    _fail(book, "missionAssigned.totalFs != freeSpinTrigger.totalFs")
                if nxt["payTiming"] not in ("step", "spinEnd") or nxt["dialStart"] < 1 or nxt["dialStep"] < 1:
                    _fail(book, f"bad missionAssigned {nxt}")
                if (nxt["mission"] == "blackout") != ("lens" in nxt):
                    _fail(book, "lens only for blackout")
                if (nxt["payTiming"] == "spinEnd") != (nxt["mission"] == "orders"):
                    _fail(book, "payTiming spinEnd only for orders")
                dial_step = nxt["dialStep"]
            else:
                mission = "briefing"  # v1 book: no missionAssigned, the Briefing with the config step
            if expect_mission and mission != expect_mission:
                _fail(book, f"mission {mission} != expected {expect_mission}")
            facts["mission"] = mission
        if t == "missionAssigned":
            if ev[i - 1]["type"] != "freeSpinTrigger":
                _fail(book, "missionAssigned must directly follow freeSpinTrigger")
            if ev[i + 1]["type"] != "updateGlobalMult":
                _fail(book, "missionAssigned must be followed by the first updateGlobalMult")
        if t == "wincap":
            capped = True
            facts["capped"] = True
        if t == "updateGlobalMult":
            if not first_gm_seen:
                first_gm_seen = True
                dial = e["globalMult"]
                if assigned and dial != assigned["dialStart"]:
                    _fail(book, "first updateGlobalMult != dialStart")
            else:
                step = dial_step if dial_step is not None else 8
                cap = assigned["dialCap"] if assigned else 100
                if e["globalMult"] != min(dial + step, cap):
                    _fail(book, f"dial {dial} -> {e['globalMult']} is not +{step} capped at {cap}")
                dial = e["globalMult"]
            facts["max_dial"] = max(facts["max_dial"], dial)
        if t == "reveal":
            in_free = e["gameType"] == "freegame"
            bank, tumbles, after_reveal, route = 0, 0, True, None
            bank_open_pending = False
            if in_free:
                facts["spins"] += 1
            if in_free and mission == "blackout":
                nxt = ev[i + 1]
                if nxt["type"] != "lightRoute":
                    _fail(book, "blackout: lightRoute must follow every free-spin reveal")
            elif i + 1 < len(ev) and ev[i + 1]["type"] == "lightRoute":
                _fail(book, "lightRoute outside blackout free spins")
        if t == "lightRoute":
            if ev[i - 1]["type"] != "reveal" or ev[i + 1]["type"] != "fusePath":
                _fail(book, "lightRoute sits between reveal and fusePath")
            if mission != "blackout" or not in_free:
                _fail(book, "lightRoute only in blackout free spins")
            lens = assigned["lens"]
            if (e["w"], e["h"], e["lensMult"]) != (lens["w"], lens["h"], lens["mult"]):
                _fail(book, "lightRoute lens != missionAssigned.lens")
            route = [(c["reel"], c["row"]) for c in e["route"]]
            if not route:
                _fail(book, "empty route")
            facts["route_len"] = len(route)
            for r, g in route:  # free spins are Mezzanine 6x5: the window must fit
                if not (0 <= r <= 6 - e["w"] and 0 <= g <= 5 - e["h"]):
                    _fail(book, f"route window ({r},{g}) outside the board")
        if t == "tumbleBoard":
            tumbles += 1
        if t == "winInfo":
            facts["steps"] += 1
            total = 0
            for w in e["wins"]:
                m = w["meta"]
                total += w["win"]
                if w["win"] % 10:
                    _fail(book, f"win {w['win']} not a multiple of 0.1x")
                if in_free and mission == "orders":
                    if m.get("banked") is not True:
                        _fail(book, "orders: free-spin wins must be banked")
                    if w["win"] != min(m["winWithoutMult"], wincap_x100) or m["globalMult"] != 1:
                        _fail(book, "orders: banked win must be x1")
                    facts["banked_steps"] += 1
                else:
                    if "banked" in m:
                        _fail(book, "banked only for orders free spins")
                    gm = dial if in_free else 1
                    if in_free and mission == "blackout":
                        window = route[min(tumbles, len(route) - 1)]
                        r0, g0 = window
                        lit = any(r0 <= p["reel"] < r0 + 2 and g0 <= p["row"] - 1 < g0 + 2 for p in w["positions"])
                        if m.get("lit") is not lit:
                            _fail(book, f"blackout: meta.lit {m.get('lit')} but the window {window} at step {tumbles} says {lit}")
                        mult = assigned["lens"]["mult"] if lit else 1
                        if m.get("lensMult") != mult:
                            _fail(book, "blackout: lensMult mismatch")
                        if w["win"] != min(m["winWithoutMult"] * gm * mult, wincap_x100):
                            _fail(book, f"blackout: win {w['win']} != {m['winWithoutMult']} x {gm} x {mult}")
                        facts["lit_steps"] += bool(lit)
                    else:
                        if "lit" in m or "lensMult" in m:
                            _fail(book, "lit / lensMult only in blackout free spins")
                        if m["globalMult"] != gm:
                            _fail(book, f"globalMult {m['globalMult']} != dial {gm}")
                        if w["win"] != min(m["winWithoutMult"] * gm, wincap_x100):
                            _fail(book, f"win {w['win']} != {m['winWithoutMult']} x {gm}")
            if e["totalWin"] != min(total, wincap_x100) and not capped:
                _fail(book, f"winInfo.totalWin {e['totalWin']} != sum of wins {total}")
            if in_free and mission == "orders":
                bank += e["totalWin"]
        if t == "updateTumbleWin" and in_free and mission == "orders" and not capped:
            if e["amount"] != min(bank, wincap_x100):
                _fail(book, f"orders: updateTumbleWin {e['amount']} must carry the running bank {bank}")
        if t == "caseOpen":
            if not (in_free and mission == "orders"):
                _fail(book, "caseOpen only in orders free spins")
            if capped:
                _fail(book, "no caseOpen after wincap")
            facts["caseOpen"] += 1
            if e["bank"] != bank:
                _fail(book, f"caseOpen.bank {e['bank']} != banked sum {bank}")
            if e["mult"] != dial:
                _fail(book, f"caseOpen.mult {e['mult']} != dial {dial}")
            if e["win"] != min(e["bank"] * e["mult"], wincap_x100) or e["win"] % 10:
                _fail(book, f"caseOpen.win {e['win']} != bank x mult")
            if e["capped"] != (last_set_total + e["bank"] * e["mult"] >= wincap_x100):
                _fail(book, f"caseOpen.capped {e['capped']} but total {last_set_total} + {e['bank'] * e['mult']} vs cap {wincap_x100}")
            nxt = ev[i + 1]
            if e["capped"]:
                if nxt["type"] != "wincap":
                    _fail(book, "capped caseOpen must be followed by wincap")
            else:
                if nxt["type"] != "setWin" or nxt["amount"] != e["win"]:
                    _fail(book, f"setWin must follow caseOpen with amount == caseOpen.win ({e['win']}), got {nxt}")
            bank_open_pending = False
        if t == "setWin":
            if in_free and mission == "orders" and bank > 0 and ev[i - 1]["type"] != "caseOpen" and not capped:
                _fail(book, "orders: setWin after a banked spin must directly follow caseOpen")
            spin_win_total += e["amount"]
        if t == "setTotalWin":
            last_set_total = e["amount"]
    if not got_trigger and any(x in types for x in ("missionAssigned", "caseOpen", "lightRoute")):
        _fail(book, "mission events without a trigger")
    # the amount credited by the spins reproduces the payout (cap applied)
    if not capped:
        if spin_win_total != book["payoutMultiplier"]:
            _fail(book, f"sum of setWin {spin_win_total} != payoutMultiplier {book['payoutMultiplier']}")
        if last_set_total != book["payoutMultiplier"]:
            _fail(book, f"last setTotalWin {last_set_total} != payoutMultiplier {book['payoutMultiplier']}")
    else:
        if book["payoutMultiplier"] != wincap_x100 and book["payoutMultiplier"] % 10:
            _fail(book, "capped payout must be the cap")
        wc = [e for e in ev if e["type"] == "wincap"][0]
        if wc["amount"] != wincap_x100 or book["payoutMultiplier"] != wincap_x100:
            _fail(book, "wincap amount / payout must equal the cap")
    return facts


# --------------------------------------------------------------------------------------------------------------- runner
def _worker(args):
    mode, lo, hi, plan_n, mission_weights, forced_criteria = args
    cfg, gs = new_state(mode, mission_weights)
    if forced_criteria is None:
        plan = criteria_plan(gs, mode, plan_n)
    attempts = {"n": 0}
    orig = gs.reset_book

    def counting():
        attempts["n"] += 1
        orig()

    gs.reset_book = counting
    gs.num_sims = plan_n
    wincap_x100 = int(round(cfg.wincap * 100))
    out = []
    t0 = time.time()
    errors = []
    types = collections.Counter()
    for sim in range(lo, hi):
        gs.criteria = forced_criteria or plan[sim]
        gs.run_spin(sim, sim)
        book = gs.library[sim + 1]
        types.update(e["type"] for e in book["events"])
        try:
            facts = reconcile_book(book, wincap_x100)
        except ReconcileError as ex:
            errors.append(str(ex))
            facts = {}
        out.append((book["id"], book["criteria"], book["payoutMultiplier"], len(book["events"]), len(json.dumps(book)), facts))
        gs.library.pop(sim + 1)
    assert cfg.num_rows == [5] * 6, "config.num_rows leaked out of the book"
    return out, attempts["n"], time.time() - t0, errors, dict(types)


def run_smoke(mode, n, procs=1, mission_weights=None, forced_criteria=None, quiet=False):
    from multiprocessing import Pool

    procs = max(1, min(procs, 3))
    chunk = n // procs
    jobs = [(mode, p * chunk, (p + 1) * chunk if p < procs - 1 else n, n, mission_weights, forced_criteria) for p in range(procs)]
    t0 = time.time()
    if procs == 1:
        res = [_worker(jobs[0])]
    else:
        with Pool(procs) as pool:
            res = pool.map(_worker, jobs)
    wall = time.time() - t0
    rows = [r for part in res for r in part[0]]
    attempts = sum(p[1] for p in res)
    errors = [e for p in res for e in p[3]]
    types = collections.Counter()
    for p in res:
        types.update(p[4])
    pay = sorted(r[2] / 100 for r in rows)
    cost = {"base": 1.0}.get(mode, 100.0)
    post = [x for x in pay if x >= FLOOR] if cost > 1 else pay
    summary = {
        "mode": mode, "books": len(rows), "wall_s": round(wall, 1), "ms_per_book_cpu": round(1000 * sum(p[2] for p in res) / len(rows), 1),
        "attempts_per_book": round(attempts / len(rows), 2), "reconcile_errors": len(errors),
        "mean_x": round(sum(pay) / len(pay), 2), "median_x": pay[len(pay) // 2], "max_x": pay[-1],
        "post_floor_mean_x": round(sum(post) / len(post), 2) if post else None,
        "post_floor_median_x": post[len(post) // 2] if post else None,
        "p_gt_price": round(sum(1 for x in pay if x > cost) / len(pay), 4),
        "events_per_book": round(sum(r[3] for r in rows) / len(rows), 1), "json_kb_per_book": round(sum(r[4] for r in rows) / len(rows) / 1024, 1),
        "event_types": dict(sorted(types.items())),
    }
    facts = [r[5] for r in rows if r[5]]
    if facts:
        summary["missions"] = dict(collections.Counter(f["mission"] for f in facts if f["mission"]))
        summary["caseOpen_per_book"] = round(sum(f["caseOpen"] for f in facts) / len(facts), 3)
        summary["lit_steps_share"] = round(sum(f["lit_steps"] for f in facts) / max(sum(f["steps"] for f in facts), 1), 3)
        summary["wincap_books"] = sum(1 for f in facts if f["capped"])
    if not quiet:
        print(json.dumps(summary, indent=1))
        for e in errors[:10]:
            print("RECONCILE ERROR:", e)
    return summary, rows, errors


def cmd_smoke(a):
    mw = json.loads(a.weights) if a.weights else None
    s, _, errors = run_smoke(a.mode, a.n, a.procs, mw, a.criteria)
    return 1 if errors else 0


def cmd_gate(a):
    """Blackout gate (SYNTHESIS 2): 300 books of the mission on fgfloor4 (floor 30x kept by the criteria); mean post-floor 70-140x, 0 reconcile errors."""
    mode = {"briefing": "bonus", "orders": "entrance_orders", "blackout": "entrance_blackout", "fuse": "entrance_fuse"}[a.mission]
    s, rows, errors = run_smoke(mode, a.n, a.procs, {a.mission: 1}, "fgfloor4", quiet=True)
    print(json.dumps({k: v for k, v in s.items() if k != "event_types"}))
    ok = not errors and s["post_floor_mean_x"] is not None and 70 <= s["post_floor_mean_x"] <= 140
    print("GATE", a.mission, "PASS" if ok else "FAIL", f"mean post-floor {s['post_floor_mean_x']}x (window 70-140), reconcile errors {len(errors)}")
    for e in errors[:10]:
        print("RECONCILE ERROR:", e)
    return 0 if ok else 1


def cmd_v1equiv(a):
    import zstandard

    fh = open(os.path.join(V1_BOOKS, f"books_{a.mode}.jsonl.zst"), "rb")
    rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
    books = []
    for line in rd:
        books.append(json.loads(line))
        if len(books) >= a.n:
            break
    # the v1 switches: Briefing only, Mezzanine only (the published `bonus` door needs neither: its config is already v1)
    cfg, gs = new_state(a.mode, {"briefing": 1}, {"mezzanine": 1})
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
    print(f"V1EQUIV mode={a.mode} books={len(books)} mismatches={bad} sec={time.time() - t0:.1f}")
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("smoke")
    s.add_argument("--mode", required=True)
    s.add_argument("--n", type=int, default=5000)
    s.add_argument("--procs", type=int, default=1)
    s.add_argument("--weights", default=None, help='mission weights JSON, e.g. \'{"orders": 1}\'')
    s.add_argument("--criteria", default=None, help="force one criterion for all books (default: SDK quota split)")
    g = sub.add_parser("gate")
    g.add_argument("--mission", required=True, choices=["briefing", "orders", "blackout", "fuse"])
    g.add_argument("--n", type=int, default=300)
    g.add_argument("--procs", type=int, default=1)
    v = sub.add_parser("v1equiv")
    v.add_argument("--mode", default="bonus")
    v.add_argument("--n", type=int, default=300)
    a = ap.parse_args()
    sys.exit({"smoke": cmd_smoke, "gate": cmd_gate, "v1equiv": cmd_v1equiv}[a.cmd](a))


if __name__ == "__main__":
    main()
