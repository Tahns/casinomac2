import random
from game_executables import GameExecutables
from src.events.events import fs_trigger_event


class GameStateOverride(GameExecutables):
    """
    This class is is used to override or extend universal state.py functions.
    e.g: A specific game may have custom book properties to reset
    """

    def reset_book(self):
        # Reset global values used across multiple projects
        super().reset_book()
        # Reset parameters relevant to local game only
        self.tumble_win = 0
        self.trigger_scatters = None
        # Clear the position-multiplier grid every spin so a previous freegame's
        # sticky grid cannot leak into a later base spin (the grid is re-zeroed at
        # freegame start by reset_fs_spin and accumulates only within a feature).
        self.reset_grid_mults()        

    def reset_fs_spin(self):
        super().reset_fs_spin()
        self.init_vein_grid()

    def assign_special_sym_function(self):
        pass

    def force_special_board(self, force_criteria, num_force_syms):
        """The SDK forces at most one scatter per reel (6). 7 and 8 scatter boards (18 / 20 free
        spins) are built by forcing 6 on the reels, then dropping the extra Dynamite on random
        other cells of the board."""
        n_reels = self.config.num_reels
        if num_force_syms <= n_reels:
            return super().force_special_board(force_criteria, num_force_syms)
        super().force_special_board(force_criteria, n_reels)
        free = [
            (r, c)
            for r in range(n_reels)
            for c in range(self.config.num_rows[r])
            if not self.board[r][c].check_attribute(force_criteria)
        ]
        for r, c in random.sample(free, num_force_syms - n_reels):
            self.board[r][c] = self.create_symbol("S")
        self.get_special_symbols_on_board()

    def _fs_award(self, scatter_key):
        table = self.config.freespin_triggers[self.gametype]
        return table[min(self.count_special_symbols(scatter_key), max(table))]  # 9+ scatters pay like 8

    def update_freespin_amount(self, scatter_key="scatter"):
        self.tot_fs = self._fs_award(scatter_key)
        base = self.gametype == self.config.basegame_type
        fs_trigger_event(self, basegame_trigger=base, freegame_trigger=not base)

    def update_fs_retrigger_amt(self, scatter_key="scatter"):
        self.tot_fs += self._fs_award(scatter_key)
        fs_trigger_event(self, freegame_trigger=True, basegame_trigger=False)

    def run_freespin_from_base(self, scatter_key="scatter"):
        # remember the scatter count that started the feature (free-spin boards overwrite it)
        self.trigger_scatters = self.count_special_symbols(scatter_key)
        if self.criteria.startswith("fgfloor"):
            # force-record key the optimizer uses to pin the share of each scatter tier
            self.record({"bonusTier": min(self.trigger_scatters, 7)})
        super().run_freespin_from_base(scatter_key)

    def check_repeat(self) -> None:
        """Checks if the spin failed a criteria constraint at any point."""
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True

            if self.criteria.startswith("fgfloor"):
                if self.final_win < self.config.bonus_floor:
                    self.repeat = True
                # tumbles can add scatters after the forced reveal: keep only books whose
                # real trigger count belongs to the tier of this criterion
                tier = self.get_current_distribution_conditions()["scatter_triggers"]
                if self.triggered_freegame and getattr(self, "trigger_scatters", None) not in tier:
                    self.repeat = True

            if self.get_current_distribution_conditions()["force_freegame"] and not (self.triggered_freegame):
                self.repeat = True

            if self.win_manager.running_bet_win == 0 and self.criteria != "0":
                self.repeat = True
