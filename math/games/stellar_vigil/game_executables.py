from game_calculations import GameCalculations
from src.calculations.ways import Ways
from constellation import Sky, draw_night
from game_events import (
    night_start_event,
    stars_landed_event,
    constellations_event,
    zones_event,
    night_payout_event,
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
