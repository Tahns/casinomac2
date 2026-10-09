"""Game logic and event emission for Stellar Vigil."""

from game_override import GameStateOverride
from constellation import Sky


class GameState(GameStateOverride):
    """Handle basegame and constellation-bonus logic."""

    def run_spin(self, sim: int, simulation_seed=None) -> None:
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.draw_board(emit_event=True)

            # Evaluate base-game board
            self.evaluate_ways_board()
            self.evaluate_star_prizes()

            self.win_manager.update_gametype_wins(self.gametype)
            # Three or more Lunettes open the Nuit des Constellations
            if self.check_fs_condition() and self.check_freespin_entry():
                self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()

        self.imprint_wins()

    def run_freespin(self) -> None:
        """Nuit des Constellations: a fixed number of nights, no counter reset."""
        self.reset_fs_spin()
        sky = Sky()
        while self.fs < self.tot_fs:
            self.update_freespin()
            self.play_constellation_night(sky, self.fs)
            if self.evaluate_wincap():
                break
        self.play_saver_wheel()
        self.end_freespin()
