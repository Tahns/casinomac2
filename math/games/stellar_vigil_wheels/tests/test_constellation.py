"""Unit tests for the pure bonus logic (no SDK needed)."""

import random
import re
import os

import constellation as c

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_ladder_is_increasing():
    assert all(a < b for a, b in zip(c.LADDER, c.LADDER[1:]))


def test_isolated_star_keeps_base_value():
    s = c.Sky()
    s.add_stars([((0, 0), 2), ((4, 4), 5)])
    assert s.levels() == {(0, 0): 2, (4, 4): 5}


def test_chain_bonus_is_capped():
    s = c.Sky()
    s.add_stars([((0, k), 0) for k in range(5)])  # chain of 5 -> +4 raw, capped
    assert set(s.levels().values()) == {c.CHAIN_CAP}


def test_conjunction_adds_one_level_once():
    s = c.Sky()
    s.add_stars([((0, 0), 0), ((0, 2), 0)])
    assert s.add_stars([((0, 1), 0)]) == 1
    assert set(s.levels().values()) == {min(c.CHAIN_CAP, 2) + 1}
    # touching a single constellation is not a conjunction
    assert s.add_stars([((1, 1), 0)]) == 0


def test_levels_never_exceed_top():
    s = c.Sky()
    s.add_stars([((r, k), c.TOP_LEVEL) for r in range(5) for k in range(5)])
    assert max(s.levels().values()) == c.TOP_LEVEL


def test_each_zone_pays_once():
    s = c.Sky()
    s.add_stars([((r, 4), 0) for r in range(5)])
    assert s.new_zones() == [("Horizon", 20)]
    assert s.new_zones() == []


def test_full_sky_completes_every_zone():
    s = c.Sky()
    s.add_stars([((r, k), 0) for r in range(5) for k in range(5)])
    done = dict(s.new_zones())
    assert done == {"Horizon": 20, "Meridien": 100, "Quadrature": 1000, "Firmament": 10000}


def test_firmament_needs_all_25_cells():
    s = c.Sky()
    s.add_stars([((r, k), 0) for r in range(5) for k in range(5) if (r, k) != (2, 2)])
    assert "Firmament" not in dict(s.new_zones())


def test_night_draw_is_deterministic_and_bounded():
    for seed in range(50):
        random.seed(seed)
        a = c.draw_night(c.Sky(), {0: 1, 1: 1, 2: 1, 3: 1}, {0: 1, 5: 1}, 1.5)
        random.seed(seed)
        b = c.draw_night(c.Sky(), {0: 1, 1: 1, 2: 1, 3: 1}, {0: 1, 5: 1}, 1.5)
        assert a == b
        assert len(a) <= 3
        assert len({cell for cell, _ in a}) == len(a)  # no two stars on one cell


def test_night_never_loses_value():
    """Adding stars can only raise the total value of the sky."""
    for seed in range(200):
        random.seed(seed)
        s = c.Sky()
        for _ in range(10):
            before = s.total_value()
            s.add_stars(c.draw_night(s, {0: 30, 1: 40, 2: 22, 3: 8}, {0: 30, 1: 25, 2: 18, 3: 12}, 1.5))
            assert s.total_value() >= before - 1e-9


def test_no_jackpot_vocabulary_in_game_sources():
    """Stake Engine requires stateless games without 'jackpots': keep to 'multiplier' wording."""
    for name in ("constellation.py", "game_config.py", "game_events.py", "game_executables.py", "gamestate.py"):
        text = open(os.path.join(GAME_DIR, name), encoding="utf-8").read().lower()
        assert not re.search(r"jackpot", text), f"'jackpot' found in {name}"
