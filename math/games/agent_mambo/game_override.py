import random
from game_executables import GameExecutables
from game_events import mission_assigned_event
from missions import SEED_OFFSETS, announce_mission, draw_mission, mission_params, resolve_mission_weights
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
        self.fuse = None
        self.mission = None  # mission id of the feature (set at the base trigger)
        self.mission_cfg = None  # resolved parameters (missions.mission_params); None in the base game
        self.mission_announced = False
        self.eval_step = 0  # evaluation counter of the current spin (Blackout window index)
        self.lens_route = None

    def reset_fs_spin(self):
        super().reset_fs_spin()
        self.start_global_mult()

    def seed_offset(self):
        """Offset of the random stream of the current bet mode (config.seed_offsets, default missions.SEED_OFFSETS)."""
        offsets = getattr(self.config, "seed_offsets", None) or SEED_OFFSETS
        return int(offsets.get(getattr(self, "betmode", None), 0))

    def start_mission(self):
        """The mission of the feature, drawn once at the base trigger with `mission_weights` (get_random_outcome recipe, SDK-seeded
        `random`; a single weight draws nothing) and recorded as the force key {"mission": id} so the reweighter can pin the shares."""
        weights = resolve_mission_weights(self.config, getattr(self, "betmode", None), self.get_current_distribution_conditions())
        self.mission = draw_mission(weights)
        self.mission_cfg = mission_params(self.mission, self.config)
        self.mission_announced = announce_mission(weights, getattr(self.config, "mission_event", None))
        if self.mission_announced:
            self.record({"mission": self.mission})

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
        if base and self.mission_announced:
            mission_assigned_event(self)  # after freeSpinTrigger, before the first updateGlobalMult

    def update_fs_retrigger_amt(self, scatter_key="scatter"):
        self.tot_fs += self._fs_award(scatter_key)
        fs_trigger_event(self, freegame_trigger=True, basegame_trigger=False)

    def run_freespin_from_base(self, scatter_key="scatter"):
        # remember the scatter count that started the feature (free-spin boards overwrite it)
        self.trigger_scatters = self.count_special_symbols(scatter_key)
        self.start_mission()
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
