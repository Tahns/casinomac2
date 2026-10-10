"""Quality gates on the published lookup tables.

The Rust optimizer is not reproducible run to run (same settings, different weights), so every
regeneration must be checked against these gates before its files are accepted.
"""

import csv
import json
import os

import pytest

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")
COST = {m["name"]: float(m["cost"]) for m in json.load(open(os.path.join(PUB, "index.json")))["modes"]} if os.path.isdir(PUB) else {}

pytestmark = pytest.mark.skipif(not os.path.isdir(PUB), reason="library not generated (run run.py)")


def stats(mode):
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        rows = sorted(((int(w), int(m)) for _, w, m in csv.reader(f)), key=lambda r: r[1])
    total = sum(w for w, _ in rows)
    acc, median = 0, 0
    for w, m in rows:
        acc += w
        if acc / total >= 0.5:
            median = m / 100
            break
    mean = sum(w * m for w, m in rows) / total / 100
    p_win = sum(w for w, m in rows if m > 0) / total
    p_below_cost = sum(w for w, m in rows if m / 100 < COST[mode]) / total
    return {"mean": mean, "median": median, "p_win": p_win, "p_below_cost": p_below_cost}


def test_bonus_buy_median_is_close_to_price():
    s = stats("bonus")
    assert s["median"] >= 0.5 * COST["bonus"], s  # a typical purchase returns at least half its price


def test_bonus_buy_is_not_extreme_mean_to_median():
    s = stats("bonus")
    assert s["mean"] / s["median"] <= 2.0, s


def test_bonus_buy_most_purchases_do_not_lose_most_of_the_price():
    s = stats("bonus")
    assert s["p_below_cost"] <= 0.75, s


def test_base_hit_rate_is_reasonable():
    s = stats("base")
    assert 0.22 <= s["p_win"] <= 0.40, s


def test_base_game_pays_mid_sized_wins():
    """Guards against the barbell: spins without bonus must pay at least the bet often enough (>= 6 %)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("base_win_shape", os.path.join(GAME_DIR, "tools", "base_win_shape.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert mod.non_bonus_ge1() >= 0.06
