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
    assert [r[0] for r in rows] == list(range(len(rows)))  # SDK ids start at 0


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
    # measured 43.6x on 1e5 books; gate at 40% of the 100x price
    assert median >= 40, median
    assert mean / median <= 3, mean / median


def _bonus_spin_shares():
    """Weighted share of purchases per starting free-spin count (books weighted by the lookup table)."""
    import collections
    import io
    import json
    import zstandard

    weights = {i: w for i, w, _ in load("bonus")}
    total = sum(weights.values())
    dist = collections.Counter()
    with open(os.path.join(PUB, "books_bonus.jsonl.zst"), "rb") as fh:
        rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
        for line in rd:
            b = json.loads(line)
            spins = next(e.get("totalFs") for e in b["events"] if e.get("type") == "freeSpinTrigger")
            dist[spins] += weights[b["id"]]
    return {k: v / total for k, v in dist.items()}


def test_bonus_scatter_tiers():
    """UNLEASH: the minimum scatter count (10 spins) is the usual outcome, more scatters are rare."""
    sh = _bonus_spin_shares()
    assert set(sh) <= {10, 12, 15, 18, 20}
    assert 0.85 <= sh.get(10, 0) <= 0.90, sh
    assert 0.08 <= sh.get(12, 0) <= 0.12, sh
    assert 0.01 <= sh.get(15, 0) <= 0.025, sh
    assert 0.0005 <= sh.get(18, 0) + sh.get(20, 0) <= 0.003, sh
    assert all(sh.get(k, 0) > 0 for k in (10, 12, 15)) and sh.get(18, 0) + sh.get(20, 0) > 0
