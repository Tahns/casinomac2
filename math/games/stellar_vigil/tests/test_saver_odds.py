"""The published wheel odds must exist and belong to the current library (the front-end draws the wheel from them)."""

import hashlib
import json
import os

import pytest

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")
ODDS = os.path.join(GAME_DIR, "library", "configs", "saver_odds.json")

pytestmark = pytest.mark.skipif(not os.path.isdir(PUB), reason="library not generated (run run.py)")


def test_odds_file_exists_and_is_fresh():
    assert os.path.exists(ODDS), "run tools/saver_odds.py (reoptimize.py does it when a run is accepted)"
    with open(ODDS) as f:
        data = json.load(f)
    h = hashlib.sha256()
    for mode in ("base", "bonus"):
        with open(os.path.join(PUB, f"lookUpTable_{mode}_0.csv"), "rb") as f:
            h.update(f.read())
    assert data["lut_sha256"] == h.hexdigest(), "odds belong to another library: rerun tools/saver_odds.py"


def test_odds_are_probabilities():
    with open(ODDS) as f:
        data = json.load(f)
    for mode in ("base", "bonus"):
        for key in ("p_spin_given_bonus", "p_save_given_spin"):
            assert 0.0 <= data[mode][key] <= 1.0
        assert data[mode]["floor"] is not None
