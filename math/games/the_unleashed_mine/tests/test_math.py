"""Checks on the published lookup tables (run after run.py with OPT=1)."""
import csv
import os
import pytest

PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "library", "publish_files")
COST = {"base": 1.0, "bonus": 100.0}


def load(mode):
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        return [(int(a), int(b), int(c)) for a, b, c in csv.reader(f)]


def test_mode_count():
    idx = os.path.join(PUB, "index.json")
    import json
    modes = json.load(open(idx))["modes"]
    assert len(modes) <= 20
    assert {m["name"] for m in modes} == set(COST)


@pytest.mark.parametrize("mode", list(COST))
def test_rtp(mode):
    rows = load(mode)
    W = sum(w for _, w, _ in rows)
    rtp = sum(w * p / 100 for _, w, p in rows) / W / COST[mode]
    assert abs(rtp - 0.96) <= 0.001, rtp


@pytest.mark.parametrize("mode", list(COST))
def test_max_win_and_multiples(mode):
    rows = load(mode)
    assert max(p for _, _, p in rows) == 500000  # 5000.00x in 1/100 units
    assert all(p % 10 == 0 for _, _, p in rows)  # multiples of 0.1x
    assert all(w > 0 for _, w, _ in rows)
    assert [r[0] for r in rows] == list(range(1, len(rows) + 1))


def test_base_hit_rate():
    rows = load("base")
    W = sum(w for _, w, _ in rows)
    hr = sum(w for _, w, p in rows if p > 0) / W
    assert 0.25 <= hr <= 0.35, hr


def test_bonus_shape():
    rows = sorted(load("bonus"), key=lambda r: r[2])
    W = sum(w for _, w, _ in rows)
    acc = 0
    for _, w, p in rows:
        acc += w
        if acc >= W / 2:
            median = p / 100
            break
    mean = sum(w * p / 100 for _, w, p in rows) / W
    assert median >= 40, median
    assert mean / median <= 3, mean / median
