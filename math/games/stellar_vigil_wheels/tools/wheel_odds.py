"""Measure the REAL odds of the two pre-bonus wheels (and per-variant bonus value) on the final library.

Usage (from math/):  env/bin/python games/stellar_vigil_wheels/tools/wheel_odds.py
"""

import csv
import io
import json
import os
from collections import defaultdict

import zstandard

KINDS = ["constellation", "comet", "nova", "cross", "rain", "eclipse", "galaxy"]
PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library", "publish_files")


def load(mode):
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as f:
        lines = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f)).read().splitlines()
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        rows = [(int(r[1]), int(r[2]) / 100) for r in csv.reader(f)]
    return lines, rows


def measure(mode):
    lines, rows = load(mode)
    total_w = sum(w for w, _ in rows)
    per = defaultdict(lambda: [0, 0.0])
    for line, (w, pay) in zip(lines, rows):
        sw = [e for e in json.loads(line)["events"] if e["type"] == "seasonWheel"]
        if sw:
            per[sw[0]["variant"]][0] += w
            per[sw[0]["variant"]][1] += w * pay
    bonus_w = sum(v[0] for v in per.values())
    out = {"p_bonus": bonus_w / total_w, "rtp": sum(w * p for w, p in rows) / total_w, "variants": {}}
    for k, (w, pw) in per.items():
        out["variants"][k] = {"share": w / bonus_w, "mean_win": pw / w, "rtp_part": pw / total_w}
    # roue des Bonus (7 segments) et roue des Phases (3 segments), mesurees sur la bibliotheque
    out["wheel1"] = {k: sum(v["share"] for n, v in out["variants"].items() if n.rstrip("+") == k) for k in KINDS}
    out["wheel2"] = {t: sum(v["share"] for n, v in out["variants"].items() if len(n) - len(n.rstrip("+")) == t - 1) for t in (1, 2, 3)}
    return out


if __name__ == "__main__":
    for mode in ("base", "bonus"):
        m = measure(mode)
        print(f"== {mode}: bonus freq 1/{1/m['p_bonus']:.0f} | RTP {m["rtp"] / (80 if mode == "bonus" else 1):.4f}" if m["p_bonus"] else mode)
        print("  Roue des Bonus:", {k: f"{v:.1%}" for k, v in m["wheel1"].items()})
        print("  Roue des Phases:", {k: f"{v:.1%}" for k, v in m["wheel2"].items()})
        for k, v in sorted(m["variants"].items()):
            print(f"  {k:16s} share {v['share']:.1%} mean {v['mean_win']:.1f}x rtp {v['rtp_part']:.3f}")
