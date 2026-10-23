from game_override import GameStateOverride
from game_events import update_grid_mult_event


class GameState(GameStateOverride):
    """Core function handling simulation results."""

    def cascade(self, freegame=False):
        """Evaluate, tumble until dead; the Fuse Line burns one cell per winning step and, on the dead
        board, blasts (burnt non-scatter cells become wilds, board re-evaluated) or fizzles."""
        self.get_clusters_update_wins()
        self.emit_tumble_win_events()
        if freegame:
            self.update_grid_mults()
        while True:
            while self.win_data["totalWin"] > 0 and not (self.wincap_triggered):
                self.tumble_game_board()
                self.advance_fuse()
                self.get_clusters_update_wins()
                self.emit_tumble_win_events()
                if freegame:
                    self.update_grid_mults()
            if self.wincap_triggered or not self.resolve_fuse():
                break
            self.get_clusters_update_wins()
            self.emit_tumble_win_events()
            if freegame:
                self.update_grid_mults()

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            # Reset simulation variables and draw a new board based on the betmode criteria.
            self.reset_book()
            self.draw_board()
            self.make_fuse_path()
            self.cascade(freegame=False)

            self.set_end_tumble_event()
            self.win_manager.update_gametype_wins(self.gametype)

            if self.check_fs_condition() and self.check_freespin_entry():
                self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()

        self.imprint_wins()

    def run_freespin(self):
        self.reset_fs_spin()
        while self.fs < self.tot_fs:
            self.update_freespin()
            self.draw_board()
            self.make_fuse_path()
            update_grid_mult_event(self)
            self.cascade(freegame=True)

            self.set_end_tumble_event()
            self.win_manager.update_gametype_wins(self.gametype)

            if self.check_fs_condition():
                self.update_fs_retrigger_amt()

        self.end_freespin()
