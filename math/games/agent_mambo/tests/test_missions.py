"""WP8 MATH-MISSIONS tests: mission table, draw, Sealed Orders bank, Ballroom Blackout lens, modes, optimizer entries, v1 safety.

Run: math/env/bin/pytest math/games/agent_mambo/tests/test_missions.py
Every book played here is reconciled against its own events by `tools/mission_smoke.py::reconcile_book` (the same code as the 5k-book
smoke per mode); the negative tests prove that the reconciliation has teeth. The 5k-book smoke numbers are in PROGRESS.md.
"""

import collections
import copy
import importlib.util
import json
import os
import random
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
MATH = os.path.abspath(os.path.join(GAME, "..", ".."))
for _p in (MATH, GAME):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import missions as M  # noqa: E402
from layouts import LAYOUTS, NOMINAL_WEIGHTS  # noqa: E402

V1_BOOKS = os.path.join(GAME, "library", "publish_files_v1")


def _load_smoke():
    spec = importlib.util.spec_from_file_location("mission_smoke", os.path.join(GAME, "tools", "mission_smoke.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


smoke = _load_smoke()
CAP = 500000


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for k in (M.ENV_CALIB, M.ENV_MISSION_WEIGHTS, "AM_LAYOUT_WEIGHTS"):
        monkeypatch.delenv(k, raising=False)
    yield


def play(mode, criteria, sims, mission_weights=None, layout_weights=None):
    """Books of `sims` (iterable of sim indexes) with the real GameState; returns the list of books."""
    cfg, gs = smoke.new_state(mode, mission_weights, layout_weights)
    out = []
    for sim in sims:
        gs.criteria = criteria
        gs.run_spin(sim, sim)
        out.append(gs.library.pop(sim + 1))
    assert cfg.num_rows == [5] * 6
    return out, gs


def types_of(book):
    return [e["type"] for e in book["events"]]


# --------------------------------------------------------------------------------------------------- the table
def test_missions_table_defaults():
    from game_config import GameConfig

    cfg = GameConfig()
    p = {k: M.mission_params(k, cfg) for k in M.MISSIONS}
    assert list(M.MISSIONS) == ["briefing", "orders", "blackout", "fuse"]
    assert (p["briefing"]["dial_start"], p["briefing"]["dial_step"], p["briefing"]["dial_cap"]) == (1, 8, 100)
    assert (p["orders"]["dial_start"], p["orders"]["dial_step"], p["orders"]["dial_cap"]) == (1, 7, 100)
    assert (p["blackout"]["dial_start"], p["blackout"]["dial_step"], p["blackout"]["dial_cap"]) == (1, 3, 100)
    assert (p["fuse"]["dial_step"], p["fuse"]["fuse"]) == (2, {"len": 12, "b0": 5, "adv": 2, "detmin": 3})
    assert [p[k]["pay"] for k in M.MISSIONS] == ["step", "spinEnd", "step", "step"]
    assert p["blackout"]["lens"] == {"w": 2, "h": 2, "mult": 4, "route_len": 6}
    assert all(p[k]["lens"] is None for k in ("briefing", "orders", "fuse"))
    assert all(p[k]["fuse"] is None for k in ("briefing", "orders", "blackout"))  # the v1 wire of config.fuse_params
    assert [p[k]["outfit"] for k in M.MISSIONS] == ["lab", "trench", "casino", "vault"]
    assert (cfg.gm_start, cfg.gm_step, cfg.gm_cap) == (1, 8, 100)  # v1 knobs still drive the Briefing


def test_orders_dial_ladder_is_1_8_15_to_100():
    cfg = smoke.new_state("entrance_orders")[0]
    p = M.mission_params("orders", cfg)
    d, seen = p["dial_start"], [1]
    while d < p["dial_cap"]:
        d = min(d + p["dial_step"], p["dial_cap"])
        seen.append(d)
    assert seen[:3] == [1, 8, 15] and seen[-2:] == [99, 100]


def test_calibration_knobs_via_env(monkeypatch):
    monkeypatch.setenv(M.ENV_CALIB, json.dumps({"DIAL_STEP": {"blackout": 5}, "LENS_MULT": 3, "ROUTE_LEN": 9, "DIAL_CAP": 80}))
    from game_config import GameConfig

    cfg = GameConfig()
    p = M.mission_params("blackout", cfg)
    assert (p["dial_step"], p["lens"]["mult"], p["lens"]["route_len"], p["dial_cap"]) == (5, 3, 9, 80)
    assert M.mission_params("orders", cfg)["dial_step"] == 7  # a partial DIAL_STEP keeps the other missions
    assert M.mission_params("briefing", cfg)["dial_step"] == 8


def test_calibration_knobs_validated(monkeypatch):
    from game_config import GameConfig

    cfg = GameConfig()
    for bad in ({"LENS_MULT": 2.5}, {"LENS_MULT": 1}, {"DIAL_STEP": {"orders": 0}}, {"DIAL_CAP": 0}, {"ROUTE_LEN": 0}):
        monkeypatch.setenv(M.ENV_CALIB, json.dumps(bad))
        with pytest.raises(M.MissionError):
            for k in M.MISSIONS:
                M.mission_params(k, cfg)
    monkeypatch.setenv(M.ENV_CALIB, "not json")
    with pytest.raises(M.MissionError):
        M.calib("DIAL_STEP")


def test_calib_params_is_optional():
    """The game must not need WP9's calib_params.py: every knob has a default."""
    assert M.calib("NO_SUCH_KNOB", 7) == 7
    assert M.calib("MISSION_WEIGHTS", M.DEFAULT_MISSION_WEIGHTS) == M.DEFAULT_MISSION_WEIGHTS or M._calib_params is not None


# --------------------------------------------------------------------------------------------------- the draw
def test_mission_mix_is_40_30_30_through_the_sdk_recipe():
    from src.calculations.statistics import get_random_outcome

    w = {"briefing": 40, "orders": 30, "blackout": 30}
    random.seed(11)
    mine = [M.draw_mission(w) for _ in range(30000)]
    random.seed(11)
    sdk = [get_random_outcome(w) for _ in range(30000)]
    assert mine == sdk  # same recipe, same random numbers
    c = collections.Counter(mine)
    for k, share in (("briefing", 0.4), ("orders", 0.3), ("blackout", 0.3)):
        assert abs(c[k] / 30000 - share) < 0.01, c


def test_single_weight_draws_no_random_number():
    random.seed(5)
    state = random.getstate()
    assert M.draw_mission({"briefing": 1}) == "briefing"
    assert M.draw_mission({"orders": 7, "blackout": 0}) == "orders"
    assert random.getstate() == state


def test_weights_validation_and_precedence(monkeypatch):
    from game_config import GameConfig

    cfg = GameConfig()
    assert M.resolve_mission_weights(cfg, "base") == {"briefing": 40, "orders": 30, "blackout": 30}
    assert M.resolve_mission_weights(cfg, "bonus") == {"briefing": 1}
    assert M.resolve_mission_weights(cfg, "entrance_orders") == {"orders": 1}
    assert M.resolve_mission_weights(cfg, "entrance_blackout") == {"blackout": 1}
    assert M.resolve_mission_weights(cfg, "unknown_mode") == {"briefing": 1}  # per-mode form: unlisted = the Briefing (v1)
    cfg.mission_weights = {"orders": 1, "briefing": 3}  # flat form applies to every mode
    assert M.resolve_mission_weights(cfg, "bonus") == {"orders": 1, "briefing": 3}
    assert M.resolve_mission_weights(cfg, "bonus", {"mission_weights": {"blackout": 2}}) == {"blackout": 2}  # conditions beat config
    monkeypatch.setenv(M.ENV_MISSION_WEIGHTS, '{"blackout": 1}')
    assert M.resolve_mission_weights(cfg, "bonus", {"mission_weights": {"orders": 2}}) == {"blackout": 1}  # env beats everything
    monkeypatch.setenv(M.ENV_MISSION_WEIGHTS, '{"base": {"orders": 1}}')
    assert M.resolve_mission_weights(cfg, "base") == {"orders": 1}
    assert M.resolve_mission_weights(cfg, "bonus") == {"briefing": 1}
    for bad in ({"nope": 1}, {"orders": -1}, {"orders": 0}, {"orders": True}, {"orders": float("nan")}, [1, 2]):
        with pytest.raises(M.MissionError):
            M.normalise_mission_weights(bad)


def test_mission_announced_rule():
    assert M.announce_mission({"briefing": 1}) is False  # the published `bonus` books carry no missionAssigned
    assert M.announce_mission({"orders": 1}) is True
    assert M.announce_mission({"briefing": 40, "orders": 30}) is True
    assert M.announce_mission({"briefing": 1}, forced=True) is True
    assert M.announce_mission({"orders": 1}, forced=False) is False


# --------------------------------------------------------------------------------------------------- modes and config
def test_modes_flags_names_and_costs():
    from game_config import GameConfig

    cfg = GameConfig()
    modes = {b.get_name(): b for b in cfg.bet_modes}
    assert list(modes) == ["base", "bonus", "entrance_orders", "entrance_blackout"]
    assert len(modes) <= 20
    assert [modes[m].get_cost() for m in modes] == [1.0, 100, 100, 100]
    assert all(b.get_wincap() == 5000 and b.get_rtp() == 0.96 for b in modes.values())
    for name, b in modes.items():
        assert not any(w in name for w in ("buy", "bet", "super")), name  # Engine [225]
        if name != "base":
            assert (b.get_feature(), b.get_buybonus()) == (False, True), name
    assert (modes["base"].get_feature(), modes["base"].get_buybonus()) == (True, False)
    for name in ("bonus", "entrance_orders", "entrance_blackout"):
        d = {x.get_criteria(): x for x in modes[name].get_distributions()}
        assert list(d) == ["wincap", "fgfloor4", "fgfloor5", "fgfloor6", "fgfloor7"]
        assert [x.get_quota() for x in d.values()] == [0.001, 0.55, 0.25, 0.12, 0.079]
        assert d["wincap"].get_win_criteria() == 5000
        wc = d["wincap"]._conditions
        assert wc["reel_weights"]["freegame"] == {"WCAP": 1} and wc["force_wincap"] is True  # wincap criterion on the WCAP strip
    assert M.DOOR_MODES["bonus"] == ("briefing", 100000)
    assert M.DOOR_MODES["entrance_orders"] == ("orders", 50000) and M.DOOR_MODES["entrance_blackout"] == ("blackout", 50000)


def test_layout_weights_are_per_mode_so_the_doors_stay_mezzanine():
    from game_config import GameConfig

    cfg = GameConfig()
    assert cfg.layout_weights == {"base": NOMINAL_WEIGHTS}
    assert all(isinstance(v, dict) for v in cfg.layout_weights.values())  # NOT the flat form


def test_third_door_falls_back_to_the_long_fuse(monkeypatch):
    monkeypatch.setenv(M.ENV_CALIB, json.dumps({"THIRD_MISSION": "fuse"}))
    from game_config import GameConfig

    cfg = GameConfig()
    assert [b.get_name() for b in cfg.bet_modes] == ["base", "bonus", "entrance_orders", "entrance_fuse"]
    assert cfg.mission_weights["base"] == {"briefing": 40, "orders": 30, "fuse": 30}
    books, _ = play("entrance_fuse", "fgfloor4", range(8))
    for b in books:
        f = smoke.reconcile_book(b, CAP, expect_mission="fuse")
        ma = next(e for e in b["events"] if e["type"] == "missionAssigned")
        assert (ma["dialStep"], ma["fuseLen"], ma["payTiming"]) == (2, 12, "step") and "lens" not in ma
        free = b["events"][[e["type"] for e in b["events"]].index("missionAssigned"):]
        paths = [e for e in free if e["type"] == "fusePath"]
        assert paths and all(len(e["cells"]) == 12 and e["burned"] == 5 for e in paths)  # the base spin before it keeps the 8-cell wire


def test_opt_params_for_every_mode():
    from game_config import GameConfig
    from game_optimization import OptimizationSetup

    cfg = GameConfig()
    OptimizationSetup(cfg)  # runs verify_optimization_input
    assert set(cfg.opt_params) == {b.get_name() for b in cfg.bet_modes}
    for name, p in cfg.opt_params.items():
        assert set(p) >= {"conditions", "scaling", "parameters"}
        assert abs(sum(c["rtp"] for c in p["conditions"].values()) - 0.96) < 1e-9, name
        first = next(iter(p["conditions"]))
        assert first == "wincap"  # exclusive id pool: wincap first
    for name in ("bonus", "entrance_orders", "entrance_blackout"):
        assert list(cfg.opt_params[name]["conditions"]) == ["wincap", "fgfloor4", "fgfloor5", "fgfloor6", "fgfloor7"]


def test_seed_offsets_are_per_mode_and_bonus_is_v1():
    from game_config import GameConfig

    cfg = GameConfig()
    assert cfg.seed_offsets["bonus"] == 0 and cfg.seed_offsets["base"] == 0  # the published books are defined by it
    assert len(set(cfg.seed_offsets[m] for m in ("bonus", "entrance_orders", "entrance_blackout", "entrance_fuse"))) == 4
    a, _ = play("entrance_orders", "fgfloor4", range(3))
    cfg2, gs = smoke.new_state("entrance_orders")
    gs.betmode = "entrance_blackout"
    gs.criteria = "fgfloor4"
    gs.run_spin(0, 0)
    assert json.dumps(a[0]["events"]) != json.dumps(gs.library[1]["events"])  # same sim, other mode -> other stream


def test_paytable_scale_keeps_multiples_of_a_tenth(monkeypatch):
    from game_config import GameConfig

    base = GameConfig().paytable
    assert M.scale_paytable(base) == base  # default scale 1.0 leaves the table untouched
    monkeypatch.setenv(M.ENV_CALIB, json.dumps({"PAYTABLE_SCALE": 1.13}))
    scaled = GameConfig().paytable
    assert set(scaled) == set(base)
    for k, v in scaled.items():
        assert v >= 0.1 and int(v * 100) == round(v * 100) and abs(v * 10 - round(v * 10)) < 1e-6, (k, v)
    monkeypatch.setenv(M.ENV_CALIB, json.dumps({"PAYTABLE_SCALE": {"H1": 2.0}}))
    sc = GameConfig().paytable
    assert sc[(5, "H1")] == 10.0 and sc[(5, "L4")] == base[(5, "L4")]


# --------------------------------------------------------------------------------------------------- v1 safety
@pytest.mark.skipif(not os.path.exists(os.path.join(V1_BOOKS, "books_bonus.jsonl.zst")), reason="v1 snapshot not present")
def test_published_bonus_books_replay_bit_for_bit_with_the_default_config():
    import io
    import zstandard

    fh = open(os.path.join(V1_BOOKS, "books_bonus.jsonl.zst"), "rb")
    rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
    books = [json.loads(next(rd)) for _ in range(120)]
    cfg, gs = smoke.new_state("bonus")  # nothing forced: the shipped config of the `bonus` door
    for b in books:
        gs.criteria = b["criteria"]
        gs.run_spin(b["id"])
        nb = gs.library[b["id"] + 1]
        assert json.dumps(nb["events"]) == json.dumps(b["events"]) and nb["payoutMultiplier"] == b["payoutMultiplier"], b["id"]
        assert "missionAssigned" not in types_of(nb) and "layout" not in types_of(nb)


@pytest.mark.skipif(not os.path.exists(os.path.join(V1_BOOKS, "books_base.jsonl.zst")), reason="v1 snapshot not present")
def test_published_base_books_replay_with_the_v1_switches():
    import io
    import zstandard

    fh = open(os.path.join(V1_BOOKS, "books_base.jsonl.zst"), "rb")
    rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
    books = [json.loads(next(rd)) for _ in range(500)]
    cfg, gs = smoke.new_state("base", {"briefing": 1}, {"mezzanine": 1})
    assert any(b["criteria"] in ("freegame", "wincap") for b in books)
    for b in books:
        gs.criteria = b["criteria"]
        gs.run_spin(b["id"])
        nb = gs.library[b["id"] + 1]
        assert json.dumps(nb["events"]) == json.dumps(b["events"]), b["id"]


@pytest.mark.skipif(not os.path.exists(os.path.join(V1_BOOKS, "books_bonus.jsonl.zst")), reason="v1 snapshot not present")
def test_old_books_reconcile_as_the_briefing():
    """Old books (no layout, no missionAssigned) are valid v2 input: Mezzanine and the Briefing with step 8."""
    import io
    import zstandard

    fh = open(os.path.join(V1_BOOKS, "books_bonus.jsonl.zst"), "rb")
    rd = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh), encoding="utf-8")
    for _ in range(150):
        b = json.loads(next(rd))
        facts = smoke.reconcile_book(b, CAP, expect_mission="briefing")
        assert facts["mission"] == "briefing"


# --------------------------------------------------------------------------------------------------- missionAssigned
def test_mission_assigned_is_the_exact_contract_json():
    books, _ = play("entrance_blackout", "fgfloor4", range(2))
    ev = books[0]["events"]
    i = [e["type"] for e in ev].index("missionAssigned")
    ma = ev[i]
    assert ev[i - 1]["type"] == "freeSpinTrigger" and ev[i + 1] == {"index": i + 1, "type": "updateGlobalMult", "globalMult": 1}
    assert list(ma) == ["index", "type", "mission", "totalFs", "dialStart", "dialStep", "dialCap", "payTiming", "lens", "layout", "fuseLen"]
    assert ma == {
        "index": i, "type": "missionAssigned", "mission": "blackout", "totalFs": ev[i - 1]["totalFs"], "dialStart": 1, "dialStep": 3,
        "dialCap": 100, "payTiming": "step", "lens": {"w": 2, "h": 2, "mult": 4}, "layout": "mezzanine", "fuseLen": 8,
    }
    books, _ = play("entrance_orders", "fgfloor4", range(2))
    ma = next(e for e in books[0]["events"] if e["type"] == "missionAssigned")
    assert list(ma) == ["index", "type", "mission", "totalFs", "dialStart", "dialStep", "dialCap", "payTiming", "layout", "fuseLen"]
    assert (ma["mission"], ma["dialStep"], ma["payTiming"], ma["fuseLen"]) == ("orders", 7, "spinEnd", 8)


# --------------------------------------------------------------------------------------------------- Sealed Orders
def test_orders_books_reconcile_and_follow_the_spin_order():
    books, _ = play("entrance_orders", "fgfloor4", range(120))
    opened = 0
    for b in books:
        facts = smoke.reconcile_book(b, CAP, expect_mission="orders")
        opened += facts["caseOpen"]
        ts = types_of(b)
        for i, t in enumerate(ts):
            if t == "caseOpen":
                assert ts[i - 1] in ("fuseFizzle", "tumbleBoard")  # after the last tumble / blast of the spin
                assert ts[i + 1] in ("setWin", "wincap")
    assert opened > 150  # the feature really banks and opens


def test_orders_numbers_by_hand():
    """Pick a spin with 2+ winning steps and recompute bank x dial from the events alone."""
    books, _ = play("entrance_orders", "fgfloor4", range(200))
    checked = 0
    for b in books:
        ev = b["events"]
        for i, e in enumerate(ev):
            if e["type"] != "caseOpen" or e["capped"]:
                continue
            j = i
            while ev[j]["type"] != "reveal":
                j -= 1
            steps = [x for x in ev[j:i] if x["type"] == "winInfo"]
            dials = [x["globalMult"] for x in ev[j:i] if x["type"] == "updateGlobalMult"]
            assert e["bank"] == sum(s["totalWin"] for s in steps) and len(steps) == len(dials)
            before = [x["globalMult"] for x in ev[:j] if x["type"] == "updateGlobalMult"][-1]
            assert e["mult"] == dials[-1] and dials[0] == min(before + 7, 100)  # +7 per winning step, the dial AFTER the steps
            assert e["win"] == e["bank"] * e["mult"]
            for s in steps:
                assert all(w["meta"]["banked"] is True and w["win"] == w["meta"]["winWithoutMult"] for w in s["wins"])
            running = [x["amount"] for x in ev[j:i] if x["type"] == "updateTumbleWin"]
            assert running[-1] == e["bank"] and running == sorted(running)  # updateTumbleWin carries the running bank
            checked += len(steps) > 1
    assert checked > 5


def test_orders_nothing_opens_after_wincap_and_both_cap_paths_reconcile():
    books, _ = play("entrance_orders", "wincap", range(300))
    via_open = via_bank = 0
    for b in books:
        smoke.reconcile_book(b, CAP, expect_mission="orders")
        ts = types_of(b)
        k = ts.index("wincap")
        assert "caseOpen" not in ts[k:]
        assert b["payoutMultiplier"] == CAP
        if ts[k - 1] == "caseOpen":
            via_open += 1
            co = [e for e in b["events"] if e["type"] == "caseOpen"][-1]
            assert co["capped"] is True and co["win"] <= CAP and ts[k + 1] != "setWin"
        else:
            via_bank += 1
    assert via_open > 100 and via_bank >= 0  # the cap is normally reached when an envelope opens; the banked-x1 path is rare


def test_orders_in_base_game_is_plain():
    """In the base game the dial is x1 and wins are paid per step; the mission only exists in the free spins."""
    books, _ = play("base", "freegame", range(40), {"orders": 1}, {"mezzanine": 1})
    for b in books:
        smoke.reconcile_book(b, CAP, expect_mission="orders")
        ts = types_of(b)
        k = ts.index("freeSpinTrigger")
        base_wins = [w for e in b["events"][:k] if e["type"] == "winInfo" for w in e["wins"]]
        assert all("banked" not in w["meta"] and w["meta"]["globalMult"] == 1 for w in base_wins)
        assert "caseOpen" not in ts[:k]


# --------------------------------------------------------------------------------------------------- Ballroom Blackout
def test_blackout_books_reconcile_lens_and_route():
    books, _ = play("entrance_blackout", "fgfloor4", range(120))
    lit = unlit = routes = 0
    for b in books:
        smoke.reconcile_book(b, CAP, expect_mission="blackout")
        ev = b["events"]
        start = types_of(b).index("missionAssigned")  # the base spin before the trigger has no lens
        for i, e in enumerate(ev):
            if i < start:
                assert e["type"] != "lightRoute" and not (e["type"] == "winInfo" and "lit" in e["wins"][0]["meta"])
                continue
            if e["type"] == "lightRoute":
                routes += 1
                assert ev[i - 1]["type"] == "reveal" and ev[i + 1]["type"] == "fusePath"
                assert (e["w"], e["h"], e["lensMult"], len(e["route"])) == (2, 2, 4, 6)
                for c in e["route"]:  # the window always fits the board (6 reels x 5 rows)
                    assert 0 <= c["reel"] <= 4 and 0 <= c["row"] <= 3
            if e["type"] == "winInfo":
                for w in e["wins"]:
                    assert w["meta"]["lensMult"] in (1, 4) and isinstance(w["meta"]["lit"], bool)
                    assert w["win"] == w["meta"]["winWithoutMult"] * w["meta"]["globalMult"] * w["meta"]["lensMult"] or e["totalWin"] >= CAP
                    assert w["win"] % 10 == 0
                    lit += w["meta"]["lit"]
                    unlit += not w["meta"]["lit"]
    assert routes > 800 and lit > 50 and unlit > 50  # one route per free spin; both lit and unlit clusters occur


def test_blackout_route_comes_before_any_outcome_and_is_deterministic():
    a, _ = play("entrance_blackout", "fgfloor4", [3])
    b, _ = play("entrance_blackout", "fgfloor4", [3])
    assert json.dumps(a[0]["events"]) == json.dumps(b[0]["events"])
    ev = a[0]["events"]
    for i, e in enumerate(ev):
        if e["type"] == "lightRoute":
            assert ev[i - 1]["type"] == "reveal"
            assert not any(x["type"] in ("winInfo", "setWin") for x in ev[i - 1 : i + 1])


def test_blackout_window_steps_with_every_evaluation():
    """Window k is used at evaluation step k: tumble steps AND post-blast evaluations advance it; the last entry stays."""
    books, _ = play("entrance_blackout", "fgfloor4", range(250))
    multi = blast = 0
    for b in books:
        ev = b["events"]
        route, k = None, 0
        for e in ev:
            if e["type"] == "reveal":
                route, k = None, 0
            elif e["type"] == "lightRoute":
                route = [(c["reel"], c["row"]) for c in e["route"]]
            elif e["type"] == "tumbleBoard":
                k += 1
            elif e["type"] == "fuseBlast":
                blast += 1
            elif e["type"] == "winInfo" and route:
                multi += k > 0
                r0, g0 = route[min(k, len(route) - 1)]
                for w in e["wins"]:
                    lit = any(r0 <= p["reel"] < r0 + 2 and g0 <= p["row"] - 1 < g0 + 2 for p in w["positions"])
                    assert w["meta"]["lit"] is lit
    assert multi > 20 and blast > 0


def test_blackout_light_route_generator_all_plans():
    for lay in LAYOUTS.values():
        rng = random.Random(4)
        fits = set(lay.windows(2, 2))
        for _ in range(200):
            route = M.make_light_route(lay, 2, 2, 12, rng)
            assert len(route) == 12 and all(c in fits for c in route)
    with pytest.raises(M.MissionError):
        M.make_light_route(LAYOUTS["mezzanine"], 7, 2, 3)
    assert M.window_at([(1, 1), (2, 2)], 0) == (1, 1) and M.window_at([(1, 1), (2, 2)], 5) == (2, 2)


def test_blackout_integers_only_whatever_the_knob(monkeypatch):
    monkeypatch.setenv(M.ENV_CALIB, json.dumps({"LENS_MULT": 3}))
    books, _ = play("entrance_blackout", "fgfloor4", range(30))
    for b in books:
        smoke.reconcile_book(b, CAP)
        assert b["payoutMultiplier"] % 10 == 0
        for e in b["events"]:
            if e["type"] == "lightRoute":
                assert e["lensMult"] == 3


def test_blackout_wincap_books():
    books, _ = play("entrance_blackout", "wincap", range(60))
    for b in books:
        smoke.reconcile_book(b, CAP, expect_mission="blackout")
        assert b["payoutMultiplier"] == CAP


# --------------------------------------------------------------------------------------------------- the base mix
def test_base_trigger_draws_the_mix_and_records_it():
    cfg, gs = smoke.new_state("base", layout_weights={"mezzanine": 1})
    got = collections.Counter()
    for sim in range(240):
        gs.criteria = "freegame"
        gs.run_spin(sim, sim)
        b = gs.library.pop(sim + 1)
        facts = smoke.reconcile_book(b, CAP)
        got[facts["mission"]] += 1
        assert any(e["type"] == "missionAssigned" for e in b["events"])  # every base trigger announces its mission
    assert set(got) == {"briefing", "orders", "blackout"} and min(got.values()) > 40, got
    keys = {k for rec in gs.recorded_events for k in rec if k[0] == "mission"}
    assert keys == {("mission", "briefing"), ("mission", "orders"), ("mission", "blackout")}
    assert "mission" in "".join(gs.get_current_betmode().get_force_keys())


def test_base_books_with_layouts_and_missions_reconcile():
    books, gs = play("base", "basegame", range(200))
    assert collections.Counter(json.loads(json.dumps(b["events"][0]))["type"] for b in books)["layout"] == 200
    for b in books:
        smoke.reconcile_book(b, CAP)
    free, _ = play("base", "freegame", range(150))
    layouts = collections.Counter(b["events"][0]["id"] for b in free)
    assert len(layouts) >= 3  # the four plans are drawn at the base spin; free spins are always Mezzanine
    for b in free:
        smoke.reconcile_book(b, CAP)
        assert [e["type"] for e in b["events"]].count("layout") == 1


# --------------------------------------------------------------------------------------------------- the reconciliation has teeth
def _book(mode, crit, want, sims=range(300)):
    cfg, gs = smoke.new_state(mode)
    for sim in sims:
        gs.criteria = crit
        gs.run_spin(sim, sim)
        b = gs.library[sim + 1]
        if want in types_of(b):
            return copy.deepcopy(b)
    raise AssertionError("no such book")


@pytest.mark.parametrize(
    "mode,want,mutate",
    [
        ("entrance_orders", "caseOpen", lambda b: next(e for e in b["events"] if e["type"] == "caseOpen").update(win=10)),
        ("entrance_orders", "caseOpen", lambda b: next(e for e in b["events"] if e["type"] == "caseOpen").update(bank=10)),
        ("entrance_orders", "caseOpen", lambda b: next(e for e in b["events"] if e["type"] == "caseOpen").update(mult=1)),
        ("entrance_orders", "caseOpen", lambda b: next(e for e in b["events"] if e["type"] == "setWin").update(amount=10)),
        ("entrance_orders", "winInfo", lambda b: next(e for e in b["events"] if e["type"] == "winInfo" and e["wins"][0]["meta"].get("banked"))["wins"][0]["meta"].pop("banked")),
        ("entrance_orders", "caseOpen", lambda b: b.update(payoutMultiplier=b["payoutMultiplier"] + 10)),
        ("entrance_blackout", "lightRoute", lambda b: next(e for e in b["events"] if e["type"] == "lightRoute")["route"][0].update(row=4)),
        ("entrance_blackout", "winInfo", lambda b: next(e for e in b["events"] if e["type"] == "winInfo")["wins"][0]["meta"].update(lit=not next(e for e in b["events"] if e["type"] == "winInfo")["wins"][0]["meta"]["lit"])),
        ("entrance_blackout", "winInfo", lambda b: next(e for e in b["events"] if e["type"] == "winInfo")["wins"][0].update(win=10)),
        ("entrance_blackout", "missionAssigned", lambda b: next(e for e in b["events"] if e["type"] == "missionAssigned").update(payTiming="spinEnd")),
        ("entrance_blackout", "lightRoute", lambda b: b["events"].remove(next(e for e in b["events"] if e["type"] == "lightRoute"))),
        ("bonus", "winInfo", lambda b: next(e for e in b["events"] if e["type"] == "winInfo")["wins"][0]["meta"].update(globalMult=2)),
    ],
)
def test_reconcile_catches_corruption(mode, want, mutate):
    crit = "fgfloor4"
    b = _book(mode, crit, want)
    smoke.reconcile_book(b, CAP)  # the untouched book is fine
    mutate(b)
    for i, e in enumerate(b["events"]):
        e["index"] = i
    with pytest.raises(smoke.ReconcileError):
        smoke.reconcile_book(b, CAP)
