from game_override import GameStateOverride


class GameState(GameStateOverride):
    """Core function handling simulation results."""

    def cascade(self, freegame=False):
        """Evaluate, tumble until dead; the bomb-timer wire burns one cell per winning step and, on the dead
        board, blasts (burnt non-scatter cells vanish, new symbols drop, board re-evaluated) or fizzles."""
        self.get_clusters_update_wins()
        self.emit_tumble_win_events()
        if freegame:
            self.bump_global_mult()
        while True:
            while self.win_data["totalWin"] > 0 and not (self.wincap_triggered):
                self.tumble_game_board()
                self.advance_fuse()
                self.get_clusters_update_wins()
                self.emit_tumble_win_events()
                if freegame:
                    self.bump_global_mult()
            if self.wincap_triggered or not self.resolve_fuse():
                break
            self.get_clusters_update_wins()
            self.emit_tumble_win_events()
            if freegame:
                self.bump_global_mult()
        if freegame:
            self.open_case()  # Sealed Orders: the board is dead and the wire has resolved -> the envelope opens (no-op for other missions)

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim, sim + self.seed_offset())  # per-mode stream (offset 0 for base / bonus: v1 books reproduce)
        self.repeat = True
        while self.repeat:
            # Reset simulation variables and draw a new board based on the betmode criteria.
            self.reset_book()
            self.draw_board()
            self.begin_spin()
            self.make_fuse_path()
            self.cascade(freegame=False)

            self.set_end_tumble_event()
            self.win_manager.update_gametype_wins(self.gametype)
            self.record_base_bucket()

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
            self.begin_spin()
            self.make_fuse_path()
            self.cascade(freegame=True)

            self.set_end_tumble_event()
            self.win_manager.update_gametype_wins(self.gametype)

            if self.check_fs_condition():
                self.update_fs_retrigger_amt()

        self.end_freespin()
