"""Volatility of every mode from the FINAL lookup tables (WP9). Replaces the v1 library/stats_summary.json in MATH_REPORT.md.

  math/env/bin/python math/games/agent_mambo/tools/volatility_v2.py [--out library/volatility_v2.json]

Per mode, R = payout / cost (return in multiples of the round price), weighted by the integer table weights:
std, skew, excess kurtosis of R, P(R >= 5000x of the bet) (the max-win probability, required < 1 %), P(R < 1) (round loses money),
P(R > 1), hit (payout > 0), mean and the 99th / 99.9th percentiles of R.
"""
import argparse
import csv
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.abspath(os.path.join(HERE, "..", "library"))
PUB = os.path.join(LIB, "publish_files")
COST = {"base": 1.0, "bonus": 100.0, "entrance_orders": 100.0, "entrance_blackout": 100.0}


def wq(x, w, q):
    o = np.argsort(x, kind="stable")
    c = np.cumsum(w[o]) / w.sum()
    return float(x[o][np.searchsorted(c, q)])


def mode_stats(mode):
    rows = list(csv.reader(open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv"))))
    w = np.array([float(r[1]) for r in rows])
    pay = np.array([int(r[2]) for r in rows], float) / 100.0  # x of the bet
    w = w / w.sum()
    r = pay / COST[mode]
    mean = float((w * r).sum())
    var = float((w * (r - mean) ** 2).sum())
    sd = var ** 0.5
    return {
        "books": len(rows),
        "meanR": mean,
        "stdR": sd,
        "skew": float((w * (r - mean) ** 3).sum() / sd ** 3),
        "excessKurtosis": float((w * (r - mean) ** 4).sum() / var ** 2 - 3),
        "pMaxWin": float(w[pay >= 5000 - 1e-9].sum()),
        "pLoss": float(w[r < 1 - 1e-12].sum()),
        "pGtCost": float(w[r > 1 + 1e-12].sum()),
        "hit": float(w[pay > 0].sum()),
        "p99R": wq(r, w, 0.99),
        "p999R": wq(r, w, 0.999),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(LIB, "volatility_v2.json"))
    a = ap.parse_args()
    out = {m: mode_stats(m) for m in COST if os.path.exists(os.path.join(PUB, f"lookUpTable_{m}_0.csv"))}
    for m, s in out.items():
        assert s["pMaxWin"] < 0.01, (m, s["pMaxWin"])
        print(f"{m}: std {s['stdR']:.3f} skew {s['skew']:.2f} exkurt {s['excessKurtosis']:.1f} P(5000x) {s['pMaxWin']:.3g} (1/{1 / s['pMaxWin']:,.0f}) "
              f"P(R<cost) {s['pLoss'] * 100:.2f}% P(R>cost) {s['pGtCost'] * 100:.2f}% p99 {s['p99R']:.2f} p99.9 {s['p999R']:.2f}")
    json.dump(out, open(a.out, "w"), indent=1)


if __name__ == "__main__":
    main()
