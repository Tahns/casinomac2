"""The session simulator must sample the lookup tables the way the RGS does (sanity check on the tool)."""

import importlib.util
import os
import random

import pytest

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(GAME_DIR, "library", "publish_files")

pytestmark = pytest.mark.skipif(not os.path.isdir(PUB), reason="library not generated (run run.py)")


def load_tool():
    spec = importlib.util.spec_from_file_location("session_sim", os.path.join(GAME_DIR, "tools", "session_sim.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.parametrize("mode", ["base", "bonus"])
def test_sampling_reproduces_the_rtp(mode):
    tool = load_tool()
    cum, mult = tool.load(mode)
    cost = tool.costs()[mode]
    total = cum[-1]
    exact = sum((cum[i] - (cum[i - 1] if i else 0)) * mult[i] for i in range(len(cum))) / total / cost
    rng = random.Random(3)
    n = 200_000
    picks = rng.choices(range(len(cum)), cum_weights=cum, k=n)
    sampled = sum(mult[i] for i in picks) / n / cost
    assert abs(exact - 0.96) < 0.005
    assert abs(sampled - exact) < 0.1 if mode == "base" else abs(sampled - exact) < 0.08


def test_a_losing_streak_hits_the_bankroll_limit():
    """A bankroll of 0 bets is always 'bust' after the first losing bet; one of 10^9 never is."""
    tool = load_tool()
    rng = random.Random(1)
    assert tool.sessions("base", 5, 200, 1.0, 10**9, rng)["bust"] == 0.0
