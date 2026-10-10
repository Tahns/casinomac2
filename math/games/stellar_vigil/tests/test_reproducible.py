"""The simulation engine itself must be deterministic: same simulation id, same book.

(Only the Rust optimizer is not reproducible; see test_quality_gates.py and tools/freeze_maths.py.)
"""

import json

from game_config import GameConfig
from gamestate import GameState
from src.wins.win_manager import WinManager

CRITERIA = ["0", "basegame", "freegame", "wincap"]


def play(mode: str, sims):
    config = GameConfig()
    gs = GameState(config)
    wincap = next(bm._wincap for bm in config.bet_modes if bm._name.lower() == mode)
    gs.win_manager = WinManager(config.basegame_type, config.freegame_type, wincap)
    gs.library, gs.recorded_events, gs.betmode, gs.num_sims = {}, {}, mode, len(sims)
    for sim in sims:
        gs.criteria = CRITERIA[sim % len(CRITERIA)] if mode == "base" else ("wincap" if sim % 4 == 3 else "freegame")
        gs.run_spin(sim)
    return {k: json.dumps(v, sort_keys=True) for k, v in gs.library.items()}


def test_same_seed_same_books_base():
    sims = list(range(12))
    a, b = play("base", sims), play("base", sims)
    assert a == b and len(a) == len(sims)


def test_same_seed_same_books_bonus():
    sims = list(range(8))
    a, b = play("bonus", sims), play("bonus", sims)
    assert a == b and len(a) == len(sims)


def test_order_does_not_matter():
    """A book depends only on its simulation id, not on what was simulated before it."""
    full = play("base", list(range(8)))
    alone = play("base", [5])
    assert full[6] == alone[6]  # library is keyed by sim + 1
