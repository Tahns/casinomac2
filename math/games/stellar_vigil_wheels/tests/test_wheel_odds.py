"""The two pre-bonus wheels must show their real odds: each outcome is an optimizer criterion with its own hit rate."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import wheel_odds  # noqa: E402

TARGET1 = {"constellation": 0.35, "comet": 0.25, "nova": 0.25, "aurora": 0.15}


def test_wheel1_odds_match_design():
    for mode in ("base", "bonus"):
        m = wheel_odds.measure(mode)
        for k, p in TARGET1.items():
            assert abs(m["wheel1"][k] - p) < 0.02, (mode, k, m["wheel1"])


def test_aurora_versions_are_richer():
    m = wheel_odds.measure("base")["variants"]
    plain = sum(v["mean_win"] * v["share"] for k, v in m.items() if not k.endswith("@aurora"))
    plain /= sum(v["share"] for k, v in m.items() if not k.endswith("@aurora"))
    up = sum(v["mean_win"] * v["share"] for k, v in m.items() if k.endswith("@aurora"))
    up /= sum(v["share"] for k, v in m.items() if k.endswith("@aurora"))
    assert up > plain * 1.1, (plain, up)
