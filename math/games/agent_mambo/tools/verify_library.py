"""Exhaustive verification of the published books (WP9): EVERY book of EVERY mode through the event reconciler.

  math/env/bin/python math/games/agent_mambo/tools/verify_library.py [--modes ...] [--procs 3] [--limit N] [--out library/verify_v2.json]

Per book: tools/mission_smoke.reconcile_book (events reproduce payoutMultiplier, payouts are multiples of 0.1x, dial / bank / lens / route rules of
SYNTHESIS 2 and 8, setWin == caseOpen.win, finalWin == payoutMultiplier, no caseOpen after wincap ...), the book payout equals its lookup row,
the book id equals its line number, and for base books the floor-plan shape (layout event first and exact, reveal columns len(cells)+2, winInfo /
tumbleBoard positions inside the plan, wire cells on plan cells). Prints one line per mode and writes the counts as JSON.
At most --procs worker processes (cap 3); the main process only decompresses.
"""
import argparse
import collections
import io
import json
import multiprocessing as mp
import os
import sys
import time

import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
MATH = os.path.abspath(os.path.join(GAME, "..", ".."))
for _p in (MATH, GAME, HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import make_shares as ms  # noqa: E402
from layouts import LAYOUTS  # noqa: E402
from mission_smoke import ReconcileError, reconcile_book  # noqa: E402

PUB = os.path.join(GAME, "library", "publish_files")
CAP = 500000
MISSION_OF = {"bonus": "briefing", "entrance_orders": "orders", "entrance_blackout": "blackout"}
PAY = {}


def check_layouts(b):
    ev = b["events"]
    if ev[0]["type"] != "layout":
        raise ReconcileError(f"book {b['id']}: base book must start with the layout event")
    pending = None
    for e in ev:
        t = e["type"]
        if t == "layout":
            pending = LAYOUTS[e["id"]]
            if e != pending.to_event(0):
                raise ReconcileError(f"book {b['id']}: layout event differs from the plan {e['id']}")
            L = pending
        elif t == "reveal":
            if e["gameType"] == "freegame":
                L = LAYOUTS["mezzanine"]
            if [len(c) for c in e["board"]] != [h + 2 for h in L.heights]:
                raise ReconcileError(f"book {b['id']}: reveal column lengths do not match {L.id}")
            if len(e["anticipation"]) != 6 or len(e["paddingPositions"]) != 6:
                raise ReconcileError(f"book {b['id']}: anticipation / paddingPositions must keep 6 entries")
        elif t == "winInfo":
            for w in e["wins"]:
                for pz in w["positions"]:
                    if not 1 <= pz["row"] <= L.heights[pz["reel"]]:
                        raise ReconcileError(f"book {b['id']}: winInfo position {pz} outside {L.id}")
        elif t == "tumbleBoard":
            for pz in e["explodingSymbols"]:
                if not 1 <= pz["row"] <= L.heights[pz["reel"]]:
                    raise ReconcileError(f"book {b['id']}: tumble position {pz} outside {L.id}")
        elif t in ("fusePath", "fuseBurn", "fuseBlast"):
            for c in e["cells"] if t != "fuseBurn" else e["newCells"]:
                if c["row"] not in L.cells[c["reel"]]:
                    raise ReconcileError(f"book {b['id']}: wire cell {c} not on plan {L.id}")


def work(args):
    mode, lines = args
    pay = PAY[mode]
    out = collections.Counter()
    errors = []
    for line_no, line in lines:
        b = json.loads(line)
        try:
            if b["id"] != line_no:
                raise ReconcileError(f"book id {b['id']} on line {line_no}")
            if pay[b["id"]] != b["payoutMultiplier"]:
                raise ReconcileError(f"book {b['id']}: payout {b['payoutMultiplier']} != lookup {pay[b['id']]}")
            f = reconcile_book(b, CAP, expect_mission=MISSION_OF.get(mode))
            if mode == "base":
                check_layouts(b)
            elif any(e["type"] == "layout" for e in b["events"]):
                raise ReconcileError(f"book {b['id']}: a door book must not carry a layout event")
            out["books"] += 1
            out["wincap"] += f["capped"]
            out["caseOpen"] += f["caseOpen"]
            out["lit_steps"] += f["lit_steps"]
            out["banked_steps"] += f["banked_steps"]
            out["steps"] += f["steps"]
        except ReconcileError as ex:
            errors.append(str(ex))
            out["books"] += 1
    return dict(out), errors


def chunks(mode, path, size, limit):
    buf, n = [], 0
    with open(path, "rb") as fh:
        rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
        for i, line in enumerate(rd):
            if not line.strip():
                continue
            buf.append((i, line))
            n += 1
            if len(buf) >= size:
                yield (mode, buf)
                buf = []
            if limit and n >= limit:
                break
    if buf:
        yield (mode, buf)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--modes", default="base,bonus,entrance_orders,entrance_blackout")
    ap.add_argument("--procs", type=int, default=3)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--out", default=os.path.join(GAME, "library", "verify_v2.json"))
    a = ap.parse_args(argv)
    res = {}
    rc = 0
    for mode in a.modes.split(","):
        _w, p = ms.load_table(mode)
        PAY[mode] = [int(round(x * 100)) for x in p]
        t0 = time.time()
        total = collections.Counter()
        errors = []
        with mp.get_context("fork").Pool(max(1, min(a.procs, 3))) as pool:
            for counts, errs in pool.imap(work, chunks(mode, os.path.join(PUB, f"books_{mode}.jsonl.zst"), 500, a.limit)):
                total.update(counts)
                errors.extend(errs)
        res[mode] = {"books": total["books"], "errors": len(errors), "wincapBooks": total["wincap"], "caseOpens": total["caseOpen"], "firstErrors": errors[:5],
                     "litStepShare": (total["lit_steps"] / total["steps"]) if total["steps"] and mode == "entrance_blackout" else None, "seconds": round(time.time() - t0, 1)}
        print(f"VERIFY {mode}: {total['books']} books, {len(errors)} errors, {total['wincap']} wincap books, {total['caseOpen']} caseOpen events, {time.time() - t0:.0f} s", flush=True)
        for e in errors[:5]:
            print("   ", e)
        rc |= bool(errors)
        json.dump(res, open(a.out, "w"), indent=1)
    return rc


if __name__ == "__main__":
    sys.exit(main())
