"""The two pre-bonus wheels must show their real odds: each outcome is an optimizer criterion with its own hit rate."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import wheel_odds  # noqa: E402

TARGET1 = {"constellation": 0.22, "comet": 0.13, "nova": 0.13, "cross": 0.11, "rain": 0.11, "eclipse": 0.09, "galaxy": 0.08, "orbit": 0.13}
TARGET2 = {1: 0.60, 2: 0.30, 3: 0.10}


def test_wheel_odds_match_design():
    for mode in ("base", "bonus"):
        m = wheel_odds.measure(mode)
        for k, p in TARGET1.items():
            assert abs(m["wheel1"][k] - p) < 0.02, (mode, k, m["wheel1"])
        for k, p in TARGET2.items():
            assert abs(m["wheel2"][k] - p) < 0.02, (mode, k, m["wheel2"])


def test_higher_phases_are_richer():
    m = wheel_odds.measure("base")["variants"]
    mean = {t: 0.0 for t in (1, 2, 3)}
    wsum = {t: 0.0 for t in (1, 2, 3)}
    for n, v in m.items():
        t = len(n) - len(n.rstrip("+")) + 1
        mean[t] += v["mean_win"] * v["share"]
        wsum[t] += v["share"]
    mean = {t: mean[t] / wsum[t] for t in mean}
    assert mean[2] > mean[1] * 1.05 and mean[3] > mean[2] * 1.05, mean
