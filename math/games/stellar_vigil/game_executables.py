from game_calculations import GameCalculations
from src.calculations.ways import Ways
import random
from constellation import Sky, draw_night
from src.events.events import set_win_event
from game_events import (
    night_start_event,
    stars_landed_event,
    constellations_event,
    zones_event,
    night_payout_event,
    star_prizes_event,
    saver_wheel_event,
)


class GameExecutables(GameCalculations):
    """Events specific to 'ways' wins and to the constellation bonus."""

    def evaluate_ways_board(self):
        """Populate win-data, record wins, transmit events"""
        self.win_data = Ways.get_ways_data(self.config, self.board)
        if self.win_data["totalWin"] > 0:
            Ways.record_ways_wins(self)
            self.win_manager.update_spinwin(self.win_data["totalWin"])
        Ways.emit_wayswin_events(self)

    def evaluate_star_prizes(self) -> None:
        """Pay every Etoile visible on the base-game board, on the spot."""
        stars = []
        for reel, col in enumerate(self.board):
            for row, sym in enumerate(col):
                if sym.name == "ST":
                    stars.append((reel, row, sym.get_attribute("prize")))
        if not stars:
            return
        total = sum(v for _, _, v in stars)
        star_prizes_event(self, stars)
        self.win_manager.update_spinwin(total)
        self.record({"kind": len(stars), "symbol": "star", "gametype": self.gametype})
        set_win_event(self)

    def play_constellation_night(self, sky: Sky, night: int) -> None:
        """Run one night: drop stars, relink constellations, pay the value gained and any zone."""
        cond = self.get_current_distribution_conditions()
        value_before = sky.total_value()
        stars = draw_night(sky, cond["star_count_weights"], cond["level_weights"], cond["adjacency_bias"])
        night_start_event(self, night, self.tot_fs)
        stars_landed_event(self, stars)
        conjunctions = sky.add_stars(stars)
        constellations_event(self, sky, sky.levels(), conjunctions)

        night_win = sky.total_value() - value_before
        zones = sky.new_zones()
        if zones:
            zones_event(self, zones)
            night_win += sum(w for _, w in zones)

        self.win_manager.reset_spin_win()
        self.win_manager.update_spinwin(night_win)
        self.win_manager.update_gametype_wins(self.gametype)
        night_payout_event(self, night_win)
        self.record({"night": night, "stars": len(sky.base), "zones": len(sky.zones_done), "gametype": self.gametype})

    def play_saver_wheel(self) -> None:
        """Spin the wager-saver wheel if the bonus total is below the amount wagered to enter it."""
        floor = self.config.saver_floor[self.get_current_betmode().get_name()]
        total = self.win_manager.freegame_wins
        if total >= floor - 1e-6 or self.wincap_triggered:  # tolerance: float sums can land a hair under the floor
            return
        saved = random.random() < self.config.saver_draw_probability
        top_up = floor - total if saved else 0.0
        if top_up > 0:
            self.win_manager.reset_spin_win()
            self.win_manager.update_spinwin(top_up)
            self.win_manager.update_gametype_wins(self.gametype)
        saver_wheel_event(self, saved, floor, top_up)
        self.record({"wheel": "saved" if saved else "empty", "gametype": self.gametype})
