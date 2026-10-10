"""What the wager-saver wheel actually changes for a player (buy mode and bonuses triggered from the base game).

For every published book that spun the wheel, compares the payout with and without the top-up, weighted by the
lookup-table weights (so rare outcomes stay rare).

Usage (from math/):  env/bin/python games/stellar_vigil/tools/wheel_effect.py
"""

import csv
import io
import json
import os

import zstandard

PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "library", "publish_files")


def report(mode: str, cost: float, floor: float) -> None:
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as f:
        lines = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f)).read().splitlines()
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        weights = [int(r[1]) for r in csv.reader(f)]
    acc = dict.fromkeys(("w", "w_all", "spun", "saved", "topup", "topup_all", "ge_floor_with", "ge_floor_without", "half_with", "half_without"), 0.0)
    for line, w in zip(lines, weights):
        b = json.loads(line)
        ev = b["events"]
        pay = b["payoutMultiplier"] / 100
        top = sum(e["topUp"] for e in ev if e["type"] == "saverWheel") / 100
        wheel = any(e["type"] == "saverWheel" for e in ev)
        bonus = any(e["type"] == "freeSpinTrigger" for e in ev) or mode == "bonus"
        acc["w_all"] += w
        acc["topup_all"] += w * top
        if not bonus:
            continue
        acc["w"] += w
        acc["spun"] += w * wheel
        acc["saved"] += w * (top > 0)
        acc["topup"] += w * top
        without = pay - top
        acc["ge_floor_with"] += w * (pay >= floor)
        acc["ge_floor_without"] += w * (without >= floor)
        acc["half_with"] += w * (pay >= floor / 2)
        acc["half_without"] += w * (without >= floor / 2)
    t = acc["w"]
    print(f"\n== {mode} ({'bonus bought' if mode == 'bonus' else 'bonus triggered from the base game'}), floor {floor:g}x")
    print(f"   wheel spins            : {acc['spun'] / t:6.1%} of bonuses")
    spun = max(acc["spun"], 1)
    print(f"   wheel saves (top-up>0) : {acc['saved'] / t:6.1%} of bonuses, average top-up {acc['topup'] / max(acc['saved'], 1) :.1f}x when it saves")
    print(f"   REAL chance of a save once the wheel spins: {acc['saved'] / spun:.1%}")
    print(f"   bonus pays >= {floor:g}x   : {acc['ge_floor_without'] / t:6.1%} without the wheel -> {acc['ge_floor_with'] / t:6.1%} with it")
    print(f"   bonus pays >= {floor / 2:g}x   : {acc['half_without'] / t:6.1%} without the wheel -> {acc['half_with'] / t:6.1%} with it")
    print(f"   RTP cost of the wheel  : {acc['topup_all'] / acc['w_all'] / cost * 100:.2f} % of the amount staked (all {mode} rounds)")


if __name__ == "__main__":
    with open(os.path.join(PUB, "index.json")) as f:
        cost = {m["name"]: float(m["cost"]) for m in json.load(f)["modes"]}
    report("bonus", cost["bonus"], cost["bonus"])
    report("base", cost["base"], 25.0)
