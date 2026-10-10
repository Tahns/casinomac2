"""Weighted payout percentiles and RTP slices per mode, from the published lookup tables.

Usage (from math/):  env/bin/python games/stellar_vigil/tools/payout_distribution.py [base|bonus]
"""

import csv
import json
import os
import sys

PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library", "publish_files")


def _costs():
    with open(os.path.join(PUB, "index.json")) as f:
        return {m["name"]: float(m["cost"]) for m in json.load(f)["modes"]}


COST = _costs()
SLICES = {
    "base": [(0, 0.001), (0.001, 1), (1, 5), (5, 20), (20, 100), (100, 1000), (1000, 10001)],
    "bonus": [(0, 40), (40, 80), (80, 200), (200, 500), (500, 2000), (2000, 10001)],
}


def run(mode: str) -> None:
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        rows = sorted(((int(w), int(m)) for _, w, m in csv.reader(f)), key=lambda r: r[1])
    total = sum(w for w, _ in rows)

    def pct(p):
        acc = 0
        for w, m in rows:
            acc += w
            if acc / total >= p:
                return m / 100

    mean = sum(w * m for w, m in rows) / total / 100
    median = pct(0.5)
    print(f"\n== {mode}: mean {mean:.2f}x  median {median:.2f}x  mean/median {mean / median if median else float('inf'):.2f}")
    print("   percentiles (x bet): " + "  ".join(f"p{int(p * 1000) / 10:g} {pct(p):.1f}" for p in (0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999)))
    for lo, hi in SLICES[mode]:
        part = [(w, m) for w, m in rows if lo <= m / 100 < hi]
        prob = sum(w for w, _ in part) / total
        rtp = sum(w * m / 100 for w, m in part) / total / COST[mode]
        print(f"   {lo:>6g}-{hi:<7g}x  prob {prob * 100:7.3f} %   share of RTP {rtp * 100:6.2f} %")


if __name__ == "__main__":
    for mode in (sys.argv[1:] or ["base", "bonus"]):
        run(mode)
