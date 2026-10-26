"""Checks on the PUBLISHED v2 library (library/publish_files + library/configs; run after run.py).

  math/env/bin/python -m pytest math/games/agent_mambo/tests/test_math.py -q        (about 1-2 minutes)

Four modes: base (cost 1) and the three 100x doors bonus (The Briefing, the 100k v1 books reused unchanged), entrance_orders (Sealed Orders),
entrance_blackout (Ballroom Blackout). Lookup tables, hashes, the event contract (tools/mission_smoke.reconcile_book on a sample of the real
books), floor-plan geometry of the base books, wire rules on geometry, shares.json against the tables. The exhaustive pass over EVERY book is
tools/verify_library.py (results in PROGRESS.md / MATH_REPORT.md).
"""
import collections
import csv
import functools
import hashlib
import io
import json
import os
import sys

import numpy as np
import pytest
import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
MATH = os.path.abspath(os.path.join(GAME, "..", ".."))
for _p in (MATH, GAME, os.path.join(GAME, "tools")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

LIB = os.path.join(GAME, "library")
PUB = os.path.join(LIB, "publish_files")
CFG = os.path.join(LIB, "configs")
COST = {"base": 1.0, "bonus": 100.0, "entrance_orders": 100.0, "entrance_blackout": 100.0}
DOORS = ["bonus", "entrance_orders", "entrance_blackout"]
MISSION_OF = {"bonus": "briefing", "entrance_orders": "orders", "entrance_blackout": "blackout"}
CAP_X100 = 500000

# Targets of the v2 plan (SYNTHESIS sections 4 and 7; WP9 task)
RTP_TOL = 0.0005
BASE_MIN_HIT = 0.23
BASE_MIN_P_GT_STAKE = 0.115
DOOR_MIN_P_GT_PRICE = 0.30
DOOR_MIN_MEDIAN = 64.0
DOOR_FLOOR = 30.0


@functools.lru_cache(maxsize=None)
def table(mode):
    with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv")) as f:
        rows = [(int(a), int(b), int(c)) for a, b, c in csv.reader(f)]
    ids = np.array([r[0] for r in rows])
    w = np.array([r[1] for r in rows], float)
    p = np.array([r[2] for r in rows], float)  # x100
    return ids, w, p


def wmedian(mode):
    _, w, p = table(mode)
    o = np.argsort(p, kind="stable")
    c = np.cumsum(w[o]) / w.sum()
    return float(p[o][np.searchsorted(c, 0.5)]) / 100


def share(mode, mask_fn):
    _, w, p = table(mode)
    return float(w[mask_fn(p)].sum() / w.sum())


@functools.lru_cache(maxsize=None)
def sample_books(mode, limit=1500, stride=11):
    """Every stride-th book of the file, in file order (the first limit of them)."""
    out = []
    with open(os.path.join(PUB, f"books_{mode}.jsonl.zst"), "rb") as fh:
        rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
        for i, line in enumerate(rd):
            if i % stride == 0:
                out.append(json.loads(line))
            if len(out) >= limit:
                break
    return out


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ------------------------------------------------------------------------------------------------------------------ files and modes
def test_mode_list_names_costs_flags():
    index = json.load(open(os.path.join(PUB, "index.json")))
    names = [m["name"] for m in index["modes"]]
    assert len(names) <= 20
    assert set(names) == set(COST) and len(names) == len(set(names))
    for n in names:  # SYNTHESIS 7: no 'buy' / 'bet' / 'super' in the player-visible names [225]
        assert not any(bad in n.lower() for bad in ("buy", "bet", "super")), n
    assert {m["name"]: float(m["cost"]) for m in index["modes"]} == COST
    be = json.load(open(os.path.join(CFG, "config.json")))
    flags = {m["name"]: (m["feature"], m["buyBonus"]) for m in be["bookShelfConfig"]}
    assert flags == {"base": (True, False), "bonus": (False, True), "entrance_orders": (False, True), "entrance_blackout": (False, True)}, flags
    assert {m["name"]: m["maxWin"] for m in be["bookShelfConfig"]} == {m: 5000 for m in COST}


@pytest.mark.parametrize("mode", list(COST))
def test_hashes_and_sidecars(mode):
    be = json.load(open(os.path.join(CFG, "config.json")))
    entry = next(m for m in be["bookShelfConfig"] if m["name"] == mode)
    books = os.path.join(PUB, f"books_{mode}.jsonl.zst")
    lut = os.path.join(PUB, f"lookUpTable_{mode}_0.csv")
    side = json.load(open(os.path.join(CFG, f"books_{mode}.verification.json")))
    file_hash = sha256_file(books)
    assert entry["booksFile"]["sha256"] == file_hash == side["file_hash"]
    assert entry["tables"][0]["sha256"] == sha256_file(lut)
    assert side["num_entries"] == entry["bookLength"] == len(table(mode)[0])
    force = os.path.join(LIB, "forces", f"force_record_{mode}.json")
    assert entry["forceFile"]["sha256"] == sha256_file(force)


@pytest.mark.parametrize("mode", list(COST))
def test_table_format_rtp_max(mode):
    ids, w, p = table(mode)
    assert list(ids) == list(range(len(ids)))  # SDK ids start at 0
    assert (w > 0).all() and (w == np.floor(w)).all()
    assert (p % 10 == 0).all() and p.max() == CAP_X100 and p.min() >= 0
    assert w.sum() < 2**63
    rtp = float((w * p / 100).sum() / w.sum() / COST[mode])
    assert abs(rtp - 0.96) <= RTP_TOL, rtp


@pytest.mark.parametrize("mode", list(COST))
def test_books_match_lookup(mode):
    ids, w, p = table(mode)
    books = sample_books(mode, 1500, 11)
    for b in books:
        assert p[b["id"]] == b["payoutMultiplier"], (mode, b["id"])
        assert b["events"][-1]["type"] == "finalWin" and b["events"][-1]["amount"] == b["payoutMultiplier"]


# ------------------------------------------------------------------------------------------------------------------ base targets
def test_base_targets():
    hit = share("base", lambda p: p > 0)
    p_gt = share("base", lambda p: p > 100)
    assert hit >= BASE_MIN_HIT, hit
    assert p_gt >= BASE_MIN_P_GT_STAKE, p_gt
    _, w, p = table("base")
    pmax = float(w[p >= CAP_X100].sum() / w.sum())
    assert 0 < pmax <= 1e-5, pmax


def test_base_trigger_rate_and_missions():
    from make_shares import base_shares, force_groups, load_table

    w, p = load_table("base")
    s = base_shares(w, p, force_groups("base"))
    assert 150 <= s["triggerOneIn"] <= 260, s["triggerOneIn"]  # about 1 spin in 200
    assert set(s["mission"]) == {"briefing", "orders", "blackout"}
    assert abs(s["mission"]["briefing"] - 0.40) < 0.02 and abs(s["mission"]["orders"] - 0.30) < 0.02 and abs(s["mission"]["blackout"] - 0.30) < 0.02, s["mission"]


def test_base_layout_shares_near_nominal():
    from layouts import NOMINAL_WEIGHTS
    from make_shares import base_shares, force_groups, load_table

    w, p = load_table("base")
    s = base_shares(w, p, force_groups("base"))
    total = sum(NOMINAL_WEIGHTS.values())
    assert set(s["layout"]) == set(NOMINAL_WEIGHTS)
    for lid, nominal in NOMINAL_WEIGHTS.items():  # outputs of the weighted table, not promises: they must stay near the draw
        assert abs(s["layout"][lid] - nominal / total) < 0.04, (lid, s["layout"])


# ------------------------------------------------------------------------------------------------------------------ door targets
@pytest.mark.parametrize("mode", DOORS)
def test_door_targets(mode):
    _, w, p = table(mode)
    assert p.min() >= DOOR_FLOOR * 100  # the 30x floor of a door
    assert share(mode, lambda x: x > 10000) >= DOOR_MIN_P_GT_PRICE, share(mode, lambda x: x > 10000)
    assert wmedian(mode) >= DOOR_MIN_MEDIAN, wmedian(mode)
    mean = float((w * p / 100).sum() / w.sum())
    assert mean / wmedian(mode) <= 3
    pmax = float(w[p >= CAP_X100].sum() / w.sum())
    assert abs(pmax * 50000 - 1) < 0.01, 1 / pmax  # P(5000x) = 1 / 50 000 per door


@pytest.mark.parametrize("mode", DOORS)
def test_door_tier_shares(mode):
    from make_shares import force_groups

    ids, w, p = table(mode)
    groups = force_groups(mode)["bonusTier"]
    tot = sum(w[g].sum() for g in groups.values())
    sh = {int(k): w[g].sum() / tot for k, g in groups.items()}
    assert abs(sh[4] - 0.88) < 0.005 and abs(sh[5] - 0.10) < 0.005 and abs(sh[6] - 0.0178) < 0.002 and 0.0005 <= sh[7] <= 0.004, sh
    # the tier of a force record is the scatter count of the trigger: book check on a sample
    spins = {4: {10}, 5: {12}, 6: {15}, 7: {18, 20}}
    want = {}
    for k, g in groups.items():
        for i in g:
            want[int(i)] = int(k)
    n = 0
    for b in sample_books(mode, 1500, 11):
        if b["id"] in want:
            fs = next(e["totalFs"] for e in b["events"] if e["type"] == "freeSpinTrigger")
            assert fs in spins[want[b["id"]]], (b["id"], fs)
            n += 1
    assert n > 1000


def test_bonus_books_are_the_v1_books():
    """The Briefing door reuses the published v1 books: same decompressed stream, same payouts, no missionAssigned / layout."""
    ref = os.path.join(LIB, "_v1_backup", "books_plain_sha256.json")
    rep = os.path.join(LIB, "wp9_recompress.json")
    if not (os.path.exists(ref) and os.path.exists(rep)):
        pytest.skip("no v1 backup or no recompress report")
    v1 = json.load(open(ref))["bonus"]
    cur = json.load(open(rep))["bonus"]
    assert cur["plain_sha256"] == v1["plain_sha256"] and cur["plain_bytes"] == v1["plain_bytes"]
    for b in sample_books("bonus", 1500, 11):
        assert not any(e["type"] in ("missionAssigned", "layout", "caseOpen", "lightRoute") for e in b["events"])
    v1_lut = os.path.join(LIB, "publish_files_v1", "lookUpTable_bonus_0.csv")
    # same payouts per id as v1 (only the weights moved)
    a = [r[2] for r in csv.reader(open(v1_lut))]
    b = [r[2] for r in csv.reader(open(os.path.join(PUB, "lookUpTable_bonus_0.csv")))]
    assert a == b


# ------------------------------------------------------------------------------------------------------------------ shares.json
def test_shares_json_matches_tables():
    sh = json.load(open(os.path.join(LIB, "shares.json")))
    for mode in DOORS:
        d = sh[mode]
        assert abs(d["medianX"] - wmedian(mode)) < 1e-9
        assert abs(d["pGtPrice"] - share(mode, lambda x: x > 10000)) < 1e-5
        assert abs(d["rtp"] - 0.96) < RTP_TOL and d["maxWin"] == 5000
    b = sh["base"]
    assert abs(b["hit"] - share("base", lambda x: x > 0)) < 1e-5
    assert abs(b["pGtStake"] - share("base", lambda x: x > 100)) < 1e-5
    assert abs(sum(b["layout"].values()) - 1) < 1e-4 and abs(sum(b["mission"].values()) - 1) < 1e-4


# ------------------------------------------------------------------------------------------------------------------ event contract
@pytest.mark.parametrize("mode", list(COST))
def test_event_contract_sample(mode):
    """The SYNTHESIS 8 contract, event by event, on a sample of the real books (tools/mission_smoke.reconcile_book)."""
    from mission_smoke import reconcile_book

    n = 0
    for b in sample_books(mode, 1500, 11):
        facts = reconcile_book(b, CAP_X100, expect_mission=MISSION_OF.get(mode))
        n += 1
    assert n >= 1000


def test_door_event_types_and_config():
    for mode, extra in (("bonus", set()), ("entrance_orders", {"missionAssigned", "caseOpen"}), ("entrance_blackout", {"missionAssigned", "lightRoute"})):
        seen = set()
        for b in sample_books(mode, 1500, 11):
            seen.update(e["type"] for e in b["events"])
        cfg = json.load(open(os.path.join(CFG, f"event_config_{mode}.json")))
        assert seen <= set(cfg)  # a sample can miss a rare type, never the reverse
        assert extra <= set(cfg), (mode, extra - set(cfg))
        if mode == "bonus":
            assert not ({"missionAssigned", "caseOpen", "lightRoute", "layout"} & set(cfg))
        else:
            assert "layout" not in cfg  # doors are Mezzanine without a layout event
    base_cfg = json.load(open(os.path.join(CFG, "event_config_base.json")))
    assert {"layout", "missionAssigned", "caseOpen", "lightRoute"} <= set(base_cfg)


def test_dial_steps_match_the_mission_table():
    from missions import mission_params

    assert mission_params("briefing")["dial_step"] == 8 and mission_params("orders")["dial_step"] == 7 and mission_params("blackout")["dial_step"] == 3
    steps = {}
    for mode in ("entrance_orders", "entrance_blackout"):
        for b in sample_books(mode, 300, 11):
            for e in b["events"]:
                if e["type"] == "missionAssigned":
                    steps[mode] = (e["dialStart"], e["dialStep"], e["dialCap"])
                    break
    assert steps == {"entrance_orders": (1, 7, 100), "entrance_blackout": (1, 3, 100)}, steps


def test_dial_never_drops_and_caps():
    for mode in DOORS:
        for b in sample_books(mode, 600, 11):
            gms = [e["globalMult"] for e in b["events"] if e["type"] == "updateGlobalMult"]
            assert gms and gms[0] == 1 and max(gms) <= 100
            assert all(a <= c for a, c in zip(gms, gms[1:]))
    # the base game before the trigger pays at x1
    for b in sample_books("base", 1500, 7):
        for e in b["events"]:
            if e["type"] == "freeSpinTrigger":
                break
            if e["type"] == "winInfo":
                assert all(w["meta"]["globalMult"] == 1 for w in e["wins"])


# ------------------------------------------------------------------------------------------------------------------ floor plans
def _spins(book):
    """[(layout id, events from the reveal on, game type)]; free spins are Mezzanine; a base spin takes the layout event before its reveal."""
    spins, cur, pending = [], None, None
    for e in book["events"]:
        if e["type"] == "layout":
            pending = e
        elif e["type"] == "reveal":
            lay = pending["id"] if (pending and e["gameType"] == "basegame") else "mezzanine"
            cur = [e]
            spins.append((lay, cur, e["gameType"], pending))
            pending = None
        elif cur is not None:
            cur.append(e)
    return spins


def test_base_layout_events_and_reveal_shapes():
    from layouts import LAYOUTS

    seen = collections.Counter()
    for b in sample_books("base", 3000, 7):
        ev = b["events"]
        assert ev[0]["type"] == "layout", "a v2 base book starts with the layout event"
        assert [e["type"] for e in ev].count("layout") == 1
        for lay, spin, gt, event in _spins(b):
            L = LAYOUTS[lay]
            if gt == "basegame":
                seen[lay] += 1
                assert event == L.to_event(0), "the layout event is the exact SYNTHESIS 8 JSON"
            rev = spin[0]
            assert [len(col) for col in rev["board"]] == [h + 2 for h in L.heights], (lay, gt)
            assert len(rev["anticipation"]) == 6 and len(rev["paddingPositions"]) == 6
    assert set(seen) == {"mezzanine", "atrium", "lobby", "annex"}, seen


def test_base_positions_stay_inside_the_plan():
    """winInfo / tumbleBoard positions are compact-padded (1..height); wire cells are geometric rows present in the plan."""
    from layouts import LAYOUTS

    n_win = n_fuse = 0
    for b in sample_books("base", 3000, 7):
        for lay, spin, gt, _ in _spins(b):
            L = LAYOUTS[lay]
            for e in spin:
                t = e["type"]
                if t == "winInfo":
                    for w in e["wins"]:
                        for pz in w["positions"]:
                            assert 1 <= pz["row"] <= L.heights[pz["reel"]], (lay, pz)
                        n_win += 1
                        assert w["clusterSize"] == len(w["positions"]) >= 5
                elif t == "tumbleBoard":
                    for pz in e["explodingSymbols"]:
                        assert 1 <= pz["row"] <= L.heights[pz["reel"]], (lay, pz)
                elif t in ("fusePath", "fuseBurn", "fuseBlast"):
                    cells = e["cells"] if t != "fuseBurn" else e["newCells"]
                    for c in cells:
                        assert c["row"] in L.cells[c["reel"]], (lay, t, c)
                        n_fuse += 1
    assert n_win > 500 and n_fuse > 500


def test_wire_rules_on_geometry():
    """Path of 8 (fuseLen) connected geometric cells from reel 0; burn extends the path in order; a blast removes burnt cells only, and the next
    event is the refill tumbleBoard of exactly these cells (padded rows); a fizzle closes a spin; Blackout puts lightRoute before fusePath."""
    from layouts import LAYOUTS

    n_spins = n_blast = n_fizzle = 0
    for mode in ("base", "bonus", "entrance_orders", "entrance_blackout"):
        for b in sample_books(mode, 600, 13):
            capped = any(e["type"] == "wincap" for e in b["events"])
            for lay, spin, gt, _ in _spins(b):
                L = LAYOUTS[lay]
                n_spins += 1
                kinds = [e["type"] for e in spin]
                i0 = kinds.index("fusePath")
                assert spin[1]["type"] in ("fusePath", "lightRoute")
                if spin[1]["type"] == "lightRoute":
                    assert mode == "entrance_blackout" and gt == "freegame" and spin[2]["type"] == "fusePath"
                path = [(c["reel"], c["row"]) for c in spin[i0]["cells"]]
                assert len(path) == 8 and len(set(path)) == 8 and path[0][0] == 0
                for (r, g) in path:
                    assert g in L.cells[r]
                for (r1, g1), (r2, g2) in zip(path, path[1:]):
                    assert (r2 - r1, g2 - g1) in ((1, 0), (0, 1), (0, -1))
                burned = spin[i0]["burned"]
                assert burned == 1
                closed = False
                for i, e in enumerate(spin):
                    t = e["type"]
                    if t == "fuseBurn":
                        assert not closed and burned < e["burned"] <= len(path)
                        assert [(c["reel"], c["row"]) for c in e["newCells"]] == path[burned : e["burned"]]
                        burned = e["burned"]
                    elif t == "fuseBlast":
                        assert not closed and burned >= 3
                        n_blast += 1
                        closed = True
                        cells = [(c["reel"], c["row"]) for c in e["cells"]]
                        assert cells and len(set(cells)) == len(cells) and set(cells) <= set(path[:burned])
                        assert all("replaced" not in c for c in e["cells"])
                        nxt = spin[i + 1]
                        assert nxt["type"] == "tumbleBoard"
                        want = sorted((r, L.compact_of[r][g] + 1) for r, g in cells)
                        assert sorted((c["reel"], c["row"]) for c in nxt["explodingSymbols"]) == want
                    elif t == "fuseFizzle":
                        assert not closed and e["burned"] == burned
                        n_fizzle += 1
                        closed = True
                if not closed:
                    assert capped, "a spin without fuseBlast / fuseFizzle must be cut by the wincap"
    assert n_spins > 2000 and n_blast > 20 and n_fizzle > 500


def _replay_blast_boards(spin, layout):
    board = [[s["name"] for s in col] for col in spin[0]["board"]]
    out = []
    for e in spin[1:]:
        if e["type"] == "fuseBlast":
            out.append(([list(c) for c in board], e))
        elif e["type"] == "tumbleBoard":
            ex = collections.defaultdict(set)
            for c in e["explodingSymbols"]:
                ex[c["reel"]].add(c["row"])
            for r in range(len(board)):
                keep = [n for i, n in enumerate(board[r]) if i not in ex.get(r, ())]
                board[r] = [s["name"] for s in e["newSymbols"][r]] + keep
                assert len(board[r]) == layout.heights[r] + 2
    return out


def test_blast_never_removes_scatters_or_makes_wilds():
    from layouts import LAYOUTS

    seen = 0
    for mode in COST:
        for b in sample_books(mode, 1500, 7):
            for lay, spin, gt, _ in _spins(b):
                L = LAYOUTS[lay]
                for board, e in _replay_blast_boards(spin, L):
                    seen += 1
                    for c in e["cells"]:
                        assert board[c["reel"]][L.compact_of[c["reel"]][c["row"]] + 1] != "S"
    assert seen > 20


def test_wire_rate_windows():
    for mode, kind, lo, hi in (("bonus", "freegame", 0.01, 0.12), ("base", "basegame", 0.003, 0.15)):
        sp = bl = 0
        for b in sample_books(mode, 1500, 11):
            for lay, spin, gt, _ in _spins(b):
                if gt == kind:
                    sp += 1
                    bl += any(e["type"] == "fuseBlast" for e in spin)
        assert lo <= bl / sp <= hi, (mode, bl / sp)


def test_blast_followed_by_reevaluation():
    seen = 0
    for b in sample_books("base", 3000, 7):
        ev = b["events"]
        for i, e in enumerate(ev):
            if e["type"] == "fuseBlast":
                seen += 1
                assert ev[i + 1]["type"] == "tumbleBoard"
                assert ev[i + 2]["type"] in ("winInfo", "setTotalWin", "setWin", "freeSpinTrigger", "wincap", "finalWin"), ev[i + 2]["type"]
    assert seen > 0


# ------------------------------------------------------------------------------------------------------------------ mission rules on the real books
def test_orders_rules_on_books():
    banked_seen = opened = 0
    for b in sample_books("entrance_orders", 1500, 11):
        ev = b["events"]
        assert not any(e["type"] == "lightRoute" for e in ev)
        for i, e in enumerate(ev):
            if e["type"] == "caseOpen":
                opened += 1
                assert e["win"] == min(e["bank"] * e["mult"], CAP_X100)
                if not e["capped"]:
                    assert ev[i + 1]["type"] == "setWin" and ev[i + 1]["amount"] == e["win"]
                else:
                    assert ev[i + 1]["type"] == "wincap"
            if e["type"] == "winInfo":
                gt_free = any(x["type"] == "freeSpinTrigger" for x in ev[:i])
                for w in e["wins"]:
                    if gt_free:
                        assert w["meta"]["banked"] is True and w["win"] == w["meta"]["winWithoutMult"]
                        banked_seen += 1
    assert banked_seen > 500 and opened > 300


def test_blackout_rules_on_books():
    lit_seen = unlit_seen = 0
    for b in sample_books("entrance_blackout", 1500, 11):
        for lay, spin, gt, _ in _spins(b):
            if gt != "freegame":
                continue
            assert spin[1]["type"] == "lightRoute"
            for e in spin:
                if e["type"] == "winInfo":
                    for w in e["wins"]:
                        m = w["meta"]
                        assert m["lensMult"] in (1, 4) and (m["lensMult"] == 4) == m["lit"]
                        assert w["win"] == min(m["winWithoutMult"] * m["globalMult"] * m["lensMult"], CAP_X100)
                        lit_seen += m["lit"]
                        unlit_seen += not m["lit"]
    assert lit_seen > 300 and unlit_seen > 300


def test_briefing_door_has_no_mission_events_and_base_missions_match_free_spins():
    seen = collections.Counter()
    for b in sample_books("base", 3000, 3):
        ev = b["events"]
        kinds = [e["type"] for e in ev]
        if "freeSpinTrigger" in kinds:
            assert kinds[kinds.index("freeSpinTrigger") + 1] == "missionAssigned"
            m = next(e for e in ev if e["type"] == "missionAssigned")
            seen[m["mission"]] += 1
            assert m["layout"] == ev[0]["id"] and m["fuseLen"] == 8
            assert (m["payTiming"] == "spinEnd") == (m["mission"] == "orders")
            if "caseOpen" in kinds:
                assert m["mission"] == "orders"
            if "lightRoute" in kinds:
                assert m["mission"] == "blackout"
        else:
            assert "missionAssigned" not in kinds
    assert set(seen) == {"briefing", "orders", "blackout"}, seen
