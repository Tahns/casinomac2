"""The generated library must come from the current configuration (guards against stale or experimental runs)."""

import json
import os

import pytest

from game_config import GameConfig

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")

pytestmark = pytest.mark.skipif(not os.path.isdir(PUB), reason="library not generated (run run.py)")


def test_mode_costs_match_config():
    with open(os.path.join(PUB, "index.json")) as f:
        published = {m["name"]: float(m["cost"]) for m in json.load(f)["modes"]}
    configured = {bm._name: float(bm._cost) for bm in GameConfig().bet_modes}
    assert published == configured, "library was generated with a different configuration: rerun run.py"


def test_buy_mode_saver_floor_equals_purchase_price():
    config = GameConfig()
    price = next(float(bm._cost) for bm in config.bet_modes if bm._name == "bonus")
    assert config.saver_floor["bonus"] == price


def test_tools_read_the_same_costs():
    import importlib.util

    for name in ("rtp_breakdown", "payout_distribution"):
        spec = importlib.util.spec_from_file_location(name, os.path.join(GAME_DIR, "tools", f"{name}.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        assert mod.COST == {bm._name: float(bm._cost) for bm in GameConfig().bet_modes}
