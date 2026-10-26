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
    # gate at 40% of the 100x price
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


# ------------------------------------------------------------------ Global multiplier meter
GM_START, GM_STEP, GM_CAP = 1, 8, 100  # must match game_config.gm_*


def _cfg():
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from game_config import GameConfig
    return GameConfig()


def test_config_matches_test_constants():
    c = _cfg()
    assert (c.gm_start, c.gm_step, c.gm_cap) == (GM_START, GM_STEP, GM_CAP)
    assert c.game_id == "agent_mambo"
    assert not hasattr(c, "vein_step")


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


def _walk_meter(book):
    """Replay the meter: returns number of winning steps checked. Asserts the multiplier rules."""
    ev = book["events"]
    capped = False
    gm = 1
    in_free = False
    last_win_mult = None
    checked = 0
    seen_start = False
    pending_bump = False
    for e in ev:
        t = e["type"]
        if t == "wincap":
            capped = True  # after the cap the meter is frozen; remaining spins are shown capped
            pending_bump = False
        if t == "reveal":
            in_free = e["gameType"] == "freegame"
        if t == "updateGlobalMult":
            if not seen_start:
                assert e["globalMult"] == GM_START  # announced once, at free-spin start
                seen_start = True
                gm = e["globalMult"]
                pending_bump = False
                continue
            assert pending_bump, "meter moves only right after a winning step"
            assert e["globalMult"] == min(gm + GM_STEP, GM_CAP)
            assert 1 <= e["globalMult"] <= GM_CAP
            gm = e["globalMult"]
            pending_bump = False
        if t == "winInfo":
            for w in e["wins"]:
                assert w["meta"]["globalMult"] == (gm if in_free else 1), (gm, in_free)
                assert w["meta"]["clusterMult"] == 1
                # paid = table value x current meter (x100 integer units, wincap clip allowed)
                assert w["win"] == min(w["meta"]["winWithoutMult"] * w["meta"]["globalMult"], 500000)
            checked += 1
            pending_bump = in_free and not capped
        if t in ("reveal", "freeSpinEnd") and pending_bump and in_free and not capped:
            raise AssertionError("winning free-spin step without meter update")
    return checked


def test_meter_rules_bonus():
    n = 0
    for b in _sample_books("bonus", limit=1500, stride=11):
        n += _walk_meter(b)
        gms = [e["globalMult"] for e in b["events"] if e["type"] == "updateGlobalMult"]
        assert gms[0] == GM_START and max(gms) <= GM_CAP
        # persists: never goes down inside the feature, also across spins and retriggers
        assert all(a <= c for a, c in zip(gms, gms[1:]))
    assert n > 1000


def test_meter_base_is_x1():
    for b in _sample_books("base", limit=2000):
        _walk_meter(b)
        # base spins only: no globalMult above 1 before the trigger
        for e in b["events"]:
            if e["type"] == "freeSpinTrigger":
                break
            if e["type"] == "winInfo":
                assert all(w["meta"]["globalMult"] == 1 for w in e["wins"])


def test_meter_reaches_high_values_sometimes():
    top = 0
    for b in _sample_books("bonus", limit=3000, stride=5):
        top = max(top, max(e["globalMult"] for e in b["events"] if e["type"] == "updateGlobalMult"))
    assert top >= 50, top


# ------------------------------------------------------------------ Bomb-timer wire
FUSE = {"len": 8, "detmin": 3}


@pytest.mark.parametrize("mode", list(COST))
def test_wire_events_well_formed(mode):
    n_spins = n_blast = n_fizzle = 0
    for b in _sample_books(mode):
        for sp in _spins(b):
            n_spins += 1
            fz = [e for e in sp if e["type"].startswith("fuse")]
            assert fz, "every spin carries a wire"
            assert sp.index(fz[0]) == 1 and fz[0]["type"] == "fusePath"  # right after reveal
            path = [(c["reel"], c["row"]) for c in fz[0]["cells"]]
            assert len(path) == FUSE["len"] and len(set(path)) == len(path)
            assert path[0][0] == 0
            for (r, c) in path:
                assert 0 <= r < 6 and 0 <= c < 5  # visible rows 0..4
            for (r1, c1), (r2, c2) in zip(path, path[1:]):
                assert (r2 - r1, c2 - c1) in ((1, 0), (0, 1), (0, -1))
            burned = fz[0]["burned"]
            assert burned == 1
            closed = False
            for i, e in enumerate(sp):
                if not e["type"].startswith("fuse") or e["type"] == "fusePath":
                    continue
                assert not closed
                if e["type"] == "fuseBurn":
                    assert e["burned"] > burned and e["burned"] <= len(path)
                    assert [(c["reel"], c["row"]) for c in e["newCells"]] == path[burned : e["burned"]]
                    burned = e["burned"]
                elif e["type"] == "fuseBlast":
                    assert burned >= FUSE["detmin"]
                    n_blast += 1
                    closed = True
                    assert e["cells"] and all("replaced" not in c for c in e["cells"])
                    cells = [(c["reel"], c["row"]) for c in e["cells"]]
                    assert len(set(cells)) == len(cells)
                    assert set(cells) <= set(path[:burned])
                    # followed immediately by the refill tumble of exactly these cells (padded rows)
                    nxt = sp[i + 1]
                    assert nxt["type"] == "tumbleBoard"
                    assert sorted((c["reel"], c["row"] - 1) for c in nxt["explodingSymbols"]) == sorted(cells)
                    per_reel = {}
                    for r, c in cells:
                        per_reel[r] = per_reel.get(r, 0) + 1
                    for r, k in per_reel.items():
                        # SDK convention: k-1 new symbols + the new top padding symbol (the old padding drops in)
                        assert len(nxt["newSymbols"][r]) == k
                    for r in range(6):
                        if r not in per_reel:
                            assert nxt["newSymbols"][r] == []
                elif e["type"] == "fuseFizzle":
                    assert e["burned"] == burned
                    n_fizzle += 1
                    closed = True
            if not closed:
                assert any(e["type"] == "wincap" for e in b["events"])
    assert n_spins > 100 and n_blast > 0 and n_fizzle > 0


def _replay_board(spin):
    """Rebuild the visible board through the spin: reveal, tumbleBoard (padded rows). Returns list of
    (event_type, board_before_event) for blast events so we can check removed cells."""
    rev = spin[0]
    board = [[s["name"] for s in reel] for reel in rev["board"]]  # padded: rows 0..6
    out = []
    for e in spin[1:]:
        if e["type"] == "fuseBlast":
            out.append(([list(c) for c in board], e))
        if e["type"] == "tumbleBoard":
            ex = {}
            for c in e["explodingSymbols"]:
                ex.setdefault(c["reel"], set()).add(c["row"])
            for r in range(len(board)):
                keep = [n for i, n in enumerate(board[r]) if i not in ex.get(r, ())]
                new = [s["name"] for s in e["newSymbols"][r]]
                board[r] = new + keep
                assert len(board[r]) == 7
    return out


def test_blast_never_removes_scatters_and_creates_no_wild():
    seen = 0
    for mode in COST:
        for b in _sample_books(mode, limit=3000):
            for sp in _spins(b):
                for board, e in _replay_board(sp):
                    seen += 1
                    for c in e["cells"]:
                        assert board[c["reel"]][c["row"] + 1] != "S"
                    assert "replaced" not in e["cells"][0]  # nothing is converted into a wild
    assert seen > 20


def test_wire_blast_rate_windows():
    sp = bl = 0
    for b in _sample_books("bonus", limit=1500, stride=11):
        for s in _spins(b):
            if s[0]["gameType"] == "freegame":
                sp += 1
                bl += any(e["type"] == "fuseBlast" for e in s)
    assert 0.01 <= bl / sp <= 0.12, bl / sp
    sp = bl = 0
    for b in _sample_books("base", limit=3000):
        for s in _spins(b):
            if s[0]["gameType"] == "basegame":
                sp += 1
                bl += any(e["type"] == "fuseBlast" for e in s)
    assert 0.003 <= bl / sp <= 0.15, bl / sp


def test_wire_blast_followed_by_reevaluation():
    seen = 0
    for b in _sample_books("base"):
        ev = b["events"]
        for i, e in enumerate(ev):
            if e["type"] == "fuseBlast":
                seen += 1
                assert ev[i + 1]["type"] == "tumbleBoard"
                nxt = ev[i + 2]["type"]
                assert nxt in ("winInfo", "setTotalWin", "setWin", "freeSpinTrigger", "wincap", "finalWin"), nxt
    assert seen > 0


def test_final_win_matches_payout():
    for mode in COST:
        for b in _sample_books(mode, limit=500):
            fw = [e for e in b["events"] if e["type"] == "finalWin"][-1]
            assert fw["amount"] == b["payoutMultiplier"]
