"""Split the RTP of the published books by component (weighted by the lookup tables).

Usage (from math/):  env/bin/python games/stellar_vigil/tools/rtp_breakdown.py
Components: ways wins, base-game star prizes, bonus nights (stars), zone multipliers, wager-saver top-ups.
"""

import collections
import csv
import io
import json
import os

import zstandard

PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library", "publish_files")


def _costs():
    with open(os.path.join(PUB, "index.json")) as f:
        return {m["name"]: float(m["cost"]) for m in json.load(f)["modes"]}


COST = _costs()


def breakdown(mode: str) -> dict:
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as f:
        lines = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f)).read().splitlines()
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        weights = [int(r[1]) for r in csv.reader(f)]
    total_w = sum(weights)
    acc = collections.defaultdict(float)
    for line, w in zip(lines, weights):
        b = json.loads(line)
        ev = b["events"]
        zone = sum(z["win"] for e in ev if e["type"] == "zonesComplete" for z in e["zones"])
        parts = {
            "ways": sum(e["totalWin"] for e in ev if e["type"] == "winInfo"),
            "stars_base": sum(e["total"] for e in ev if e["type"] == "starPrizes"),
            "bonus_nights": sum(e["amount"] for e in ev if e["type"] == "nightPayout") - zone,
            "zones": zone,
            "saver_topup": sum(e["topUp"] for e in ev if e["type"] == "saverWheel"),
            "TOTAL": b["payoutMultiplier"],
        }
        for k, v in parts.items():
            acc[k] += w * v / 100
        acc["p_bonus"] += w * any(e["type"] == "freeSpinTrigger" for e in ev)
        acc["p_wheel"] += w * any(e["type"] == "saverWheel" for e in ev)
        acc["p_win"] += w * (b["payoutMultiplier"] > 0)
        acc["p_cap"] += w * (b["payoutMultiplier"] >= 1_000_000)
    return {k: v / total_w for k, v in acc.items()}


if __name__ == "__main__":
    for mode in ("base", "bonus"):
        r = breakdown(mode)
        print(f"\n== {mode} (cost {COST[mode]}x): share of the amount staked")
        for k in ("ways", "stars_base", "bonus_nights", "zones", "saver_topup", "TOTAL"):
            print(f"  {k:14s} {r[k] / COST[mode] * 100:7.2f} %   ({r[k]:.3f}x)")
        for k in ("p_bonus", "p_wheel", "p_win", "p_cap"):
            print(f"  {k:14s} {r[k] * 100:8.4f} %" + (f"   (1 in {1 / r[k]:,.0f})" if r[k] else ""))
