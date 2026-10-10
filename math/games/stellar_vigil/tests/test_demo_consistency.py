"""The playable demo (books and rules text) must match the current library and configuration."""

import csv
import json
import os
import re

import pytest

from game_config import PROFILES, ACTIVE_PROFILE

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(GAME_DIR)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")
LIB = os.path.join(GAME_DIR, "library")
DEMO = os.path.join(REPO, "demo")

pytestmark = pytest.mark.skipif(not (os.path.isdir(PUB) and os.path.isdir(DEMO)), reason="library or demo missing")


def rules_text() -> str:
    with open(os.path.join(DEMO, "index.html"), encoding="utf-8") as f:
        return re.sub(r"\s+", " ", f.read())


def test_demo_books_come_from_the_current_library():
    with open(os.path.join(DEMO, "books.js"), encoding="utf-8") as f:
        js = f.read()
    m = re.search(r"window\.SAVER_ODDS=(\{.*?\});", js)
    assert m, "books.js has no SAVER_ODDS: rerun tools/export_demo_books.py"
    with open(os.path.join(LIB, "configs", "saver_odds.json")) as f:
        current = json.load(f)["lut_sha256"]
    assert json.loads(m.group(1))["lut_sha256"] == current, "demo/books.js is stale: rerun tools/export_demo_books.py"


def test_rules_state_the_real_win_rate_and_bonus_frequency():
    with open(os.path.join(LIB, "stats_summary.json")) as f:
        win_pct = round(100 / json.load(f)["base"]["non_zero_hr"])
    with open(os.path.join(LIB, "lookup_tables", "lookUpTableSegmented_base.csv")) as f:
        crit = [r[1] for r in csv.reader(f)]
    with open(os.path.join(PUB, "lookUpTable_base_0.csv")) as f:
        weights = [int(r[1]) for r in csv.reader(f)]
    p_bonus = sum(w for w, c in zip(weights, crit) if c == "freegame") / sum(weights)
    every = round(1 / p_bonus / 10) * 10
    text = rules_text()
    assert f"environ {win_pct} % des spins gagnent" in text
    assert f"1 spin sur {every}" in text


def test_rules_state_the_configured_number_of_nights():
    n = PROFILES[ACTIVE_PROFILE]["nights"]
    assert f"{n[3]}, {n[4]} ou {n[5]} nuits" in rules_text()


def test_rules_state_the_real_rtp_and_zone_multipliers():
    text = rules_text()
    assert "96,0 %" in text
    for label in ("20×", "100×", "1 000×", "10 000×"):
        assert label in text
