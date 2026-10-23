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


# ------------------------------------------------------------------ Fuse Line
def _sample_books(mode, limit=3000, stride=7):
    import io, json, zstandard
    out = []
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as fh:
        rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
        for i, line in enumerate(rd):
            if i % stride == 0:
                out.append(json.loads(line))
            if len(out) >= limit:
                break
    return out


def _spins(book):
    """Split a book into per-spin event lists (each starts at a reveal)."""
    spins, cur = [], None
    for e in book["events"]:
        if e["type"] == "reveal":
            cur = [e]
            spins.append(cur)
        elif cur is not None:
            cur.append(e)
    return spins


FUSE = {"len": 8, "detmin": 3}


@pytest.mark.parametrize("mode", list(COST))
def test_fuse_events_well_formed(mode):
    n_spins = n_blast = n_fizzle = 0
    for b in _sample_books(mode):
        for sp in _spins(b):
            n_spins += 1
            fz = [e for e in sp if e["type"].startswith("fuse")]
            assert fz, "every spin carries a fuse"
            assert sp.index(fz[0]) == 1 and fz[0]["type"] == "fusePath"  # right after reveal
            path = [(c["reel"], c["row"]) for c in fz[0]["cells"]]
            assert len(path) == FUSE["len"] and len(set(path)) == len(path)
            assert path[0][0] == 0
            for (r, c) in path:
                assert 0 <= r < 6 and 0 <= c < 5  # visible rows 0..4
            for (r1, c1), (r2, c2) in zip(path, path[1:]):
                assert (r2 - r1, c2 - c1) in ((1, 0), (0, 1), (0, -1))  # right / down / up only
            burned = fz[0]["burned"]
            assert burned == 1
            wins_steps = 0
            closed = False
            for e in fz[1:]:
                assert not closed
                if e["type"] == "fuseBurn":
                    assert e["burned"] > burned and e["burned"] <= len(path)
                    assert [(c["reel"], c["row"]) for c in e["newCells"]] == path[burned : e["burned"]]
                    burned = e["burned"]
                elif e["type"] == "fuseBlast":
                    assert burned >= FUSE["detmin"]
                    n_blast += 1
                    closed = True
                    assert e["cells"]
                    for c in e["cells"]:
                        assert (c["reel"], c["row"]) in path[:burned] and c["replaced"] not in ("S", "W")
                elif e["type"] == "fuseFizzle":
                    assert e["burned"] == burned
                    n_fizzle += 1
                    closed = True
                    # blast conditions not met (or nothing convertible: very rare)
            # a spin that ended without closing the fuse must be a wincap spin
            if not closed:
                # (the SDK keeps revealing the remaining free spins after the cap, without evaluating them)
                assert any(e["type"] == "wincap" for e in b["events"])
    assert n_spins > 100 and n_blast > 0 and n_fizzle > 0


def test_fuse_fire_rate_window():
    sp = bl = 0
    for b in _sample_books("bonus", limit=1500, stride=11):
        for s in _spins(b):
            if s[0]["gameType"] == "freegame":
                sp += 1
                bl += any(e["type"] == "fuseBlast" for e in s)
    rate = bl / sp
    assert 0.012 <= rate <= 0.06, rate  # measured about 2.2 % per free spin in published books


def test_fuse_blast_precedes_winning_evaluation():
    """After a blast the next event is a winInfo (re-evaluation pays) or the spin ends (no pay)."""
    seen = 0
    for b in _sample_books("base"):
        ev = b["events"]
        for i, e in enumerate(ev):
            if e["type"] == "fuseBlast":
                seen += 1
                nxt = ev[i + 1]["type"]
                assert nxt in ("winInfo", "setTotalWin", "setWin", "freeSpinTrigger", "wincap", "finalWin"), nxt
    assert seen > 0


def test_fuse_final_win_matches_payout():
    for mode in COST:
        for b in _sample_books(mode, limit=500):
            fw = [e for e in b["events"] if e["type"] == "finalWin"][-1]
            assert fw["amount"] == b["payoutMultiplier"]
