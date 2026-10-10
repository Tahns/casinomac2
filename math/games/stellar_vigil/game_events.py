"""Custom events for the Nuit des Constellations bonus."""

from src.events.events import *  # noqa: F401,F403
from constellation import LADDER


def _cents(x: float, wincap: float) -> int:
    return int(round(min(x, wincap) * 100))


def night_start_event(gamestate, night: int, total: int) -> None:
    gamestate.book.add_event(
        {"index": len(gamestate.book.events), "type": "nightStart", "night": night, "totalNights": total}
    )


def stars_landed_event(gamestate, stars) -> None:
    """stars: [((reel,row), base_level)]"""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "starsLanded",
            "stars": [
                {"reel": c[0], "row": c[1], "level": lvl, "value": int(round(LADDER[lvl] * 100))}
                for c, lvl in stars
            ],
        }
    )


def constellations_event(gamestate, sky, levels, conjunctions: int) -> None:
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "constellationsUpdate",
            "constellations": [
                [{"reel": c[0], "row": c[1]} for c in comp] for comp in sky.components() if len(comp) > 1
            ],
            "stars": [
                {"reel": c[0], "row": c[1], "level": lvl, "value": int(round(LADDER[lvl] * 100))}
                for c, lvl in sorted(levels.items())
            ],
            "conjunctions": conjunctions,
        }
    )


def zones_event(gamestate, zones) -> None:
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "zonesComplete",
            "zones": [{"name": n, "win": _cents(w, gamestate.config.wincap)} for n, w in zones],
        }
    )


def night_payout_event(gamestate, amount: float) -> None:
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "nightPayout",
            "amount": _cents(amount, gamestate.config.wincap),
            "total": _cents(gamestate.win_manager.freegame_wins, gamestate.config.wincap),
        }
    )


def star_prizes_event(gamestate, stars) -> None:
    """stars: [(reel,row,value)] -> positions include the top padding row (+1)."""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "starPrizes",
            "stars": [{"reel": r, "row": row + 1, "value": int(round(v * 100))} for r, row, v in stars],
            "total": _cents(sum(v for _, _, v in stars), gamestate.config.wincap),
        }
    )


def saver_wheel_event(gamestate, saved: bool, floor: float, top_up: float) -> None:
    """Wager-saver wheel result. The visual (segments) is the front-end's job: it uses the measured real odds."""
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": "saverWheel",
            "saved": saved,
            "floor": _cents(floor, gamestate.config.wincap),
            "topUp": _cents(top_up, gamestate.config.wincap),
            "total": _cents(gamestate.win_manager.freegame_wins, gamestate.config.wincap),
        }
    )
