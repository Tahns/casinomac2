"""Cluster game configuration file/setup"""

import os
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode
from layouts import NOMINAL_WEIGHTS
from missions import (
    BASE_BUCKET_QUOTAS,
    DEFAULT_BASE_PROFILE,
    DEFAULT_MISSION_WEIGHTS,
    DOOR_MODES,
    SEED_OFFSETS,
    calib,
    scale_paytable,
)


class GameConfig(Config):
    """Singleton cluster game configuration class."""

    def set_base_profile(self, profile):
        """Switch the criteria set of the `base` mode ('v1' = the shipped v1 criteria wincap / freegame / 0 / basegame, 'v2' = one criterion per
        optimizer fence) on an existing config. Tools and tests that replay v1 books call set_base_profile('v1')."""
        assert profile in ("v1", "v2"), profile
        self.base_profile = profile
        self.bet_modes[0] = self._make_base_mode()

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "agent_mambo"
        self.provider_number = 0
        self.working_name = "Agent Mambo"
        self.wincap = 5000.0
        self.win_type = "cluster"
        self.rtp = 0.9600
        self.construct_paths()

        # Game Dimensions
        self.num_reels = 6
        # Optionally include variable number of rows per reel
        self.num_rows = [5] * self.num_reels
        # Board and Symbol Properties
        t1, t2, t3, t4 = (5, 5), (6, 8), (9, 12), (13, 36)
        pay_group = {
            (t1, "H1"): 5.0,
            (t2, "H1"): 12.5,
            (t3, "H1"): 25.0,
            (t4, "H1"): 60.0,
            (t1, "H2"): 2.0,
            (t2, "H2"): 5.0,
            (t3, "H2"): 10.0,
            (t4, "H2"): 40.0,
            (t1, "H3"): 1.3,
            (t2, "H3"): 3.2,
            (t3, "H3"): 7.0,
            (t4, "H3"): 30.0,
            (t1, "H4"): 1.0,
            (t2, "H4"): 2.5,
            (t3, "H4"): 6.0,
            (t4, "H4"): 20.0,
            (t1, "L1"): 0.6,
            (t2, "L1"): 1.5,
            (t3, "L1"): 4.0,
            (t4, "L1"): 10.0,
            (t1, "L2"): 0.4,
            (t2, "L2"): 1.2,
            (t3, "L2"): 3.5,
            (t4, "L2"): 8.0,
            (t1, "L3"): 0.2,
            (t2, "L3"): 0.8,
            (t3, "L3"): 2.5,
            (t4, "L3"): 5.0,
            (t1, "L4"): 0.1,
            (t2, "L4"): 0.5,
            (t3, "L4"): 1.5,
            (t4, "L4"): 4.0,
        }
        self.paytable = scale_paytable(self.convert_range_table(pay_group))  # PAYTABLE_SCALE (calib_params.py, default 1.0 = v1)

        self.include_padding = True
        self.special_symbols = {"wild": ["W"], "scatter": ["S"]}

        self.freespin_triggers = {
            self.basegame_type: {4: 10, 5: 12, 6: 15, 7: 18, 8: 20},
            self.freegame_type: {3: 5, 4: 8, 5: 10, 6: 12, 7: 15, 8: 18},
        }
        self.anticipation_triggers = {
            self.basegame_type: min(self.freespin_triggers[self.basegame_type].keys()) - 1,
            self.freegame_type: min(self.freespin_triggers[self.freegame_type].keys()) - 1,
        }

        # ---- v2 (WP7 / WP8) ------------------------------------------------------------------------------------------------
        # Floor plans: PER BET MODE (a flat dict would apply to the doors too and break the reused `bonus` books). The doors play
        # Mezzanine only; free spins are always Mezzanine. `{"mezzanine": 1}` (or nothing) = v1 books bit for bit.
        self.layout_weights = {"base": dict(calib("LAYOUT_WEIGHTS", NOMINAL_WEIGHTS))}
        # Mission mix, per bet mode: the base trigger draws one mission (40/30/30), every door plays one mission. A single weight
        # draws no random number, so the `bonus` door ({'briefing': 1}) replays the published 100k books bit for bit.
        third = calib("THIRD_MISSION", "blackout")  # 'blackout' | 'fuse' (The Long Fuse, fallback of the Blackout gate)
        assert third in ("blackout", "fuse"), third
        self.third_mission = third
        base_mix = dict(calib("MISSION_WEIGHTS", DEFAULT_MISSION_WEIGHTS))
        if third == "fuse" and "fuse" not in base_mix:
            base_mix["fuse"] = base_mix.pop("blackout", 0) or 30
        self.mission_weights = {"base": base_mix}
        for _mode, (_mission, _books) in DOOR_MODES.items():
            self.mission_weights[_mode] = {_mission: 1}
        # `missionAssigned` is announced when a mode can draw several missions or its single mission is not the Briefing
        # (None = that rule); `bonus` therefore stays a v1 book. True / False forces it.
        self.mission_event = None
        # 'v2' = one criterion per optimizer fence in `base` (mission and win bucket pinned); 'v1' = the shipped v1 criteria / fences
        # (the stop-loss of SYNTHESIS 4: if the base optimizer cannot reach the P(R > stake) target, switch back).
        self.base_profile = calib("BASE_PROFILE", DEFAULT_BASE_PROFILE)
        assert self.base_profile in ("v1", "v2"), self.base_profile
        self.seed_offsets = dict(SEED_OFFSETS)  # per-mode random stream (random.seed(sim + 1 + offset))
        self.door_modes = [m for m, (mission, _) in DOOR_MODES.items() if mission != ("fuse" if third == "blackout" else "blackout")]

        self.bonus_floor = 30.0
        # Global multiplier meter (free spins only): starts at gm_start when the feature starts, every winning
        # tumble step is paid with the CURRENT value, then it rises by gm_step (capped at gm_cap). It persists
        # through all spins of the feature (also after retriggers). Base game: always x1.
        self.gm_start = 1
        self.gm_step = 8
        self.gm_cap = 100
        # Bomb-timer wire (ex Fuse Line; blast REMOVES burnt non-scatter cells, no wild creation): per game type. len=N path cells, b0=cells burnt at reveal,
        # adv=cells burnt per winning cascade step, detmin=burnt cells needed to detonate. None disables.
        self.fuse_params = {
            self.basegame_type: {"len": 8, "b0": 1, "adv": 1, "detmin": 3},
            self.freegame_type: {"len": 8, "b0": 1, "adv": 1, "detmin": 3},
        }

        reels = {"BR0": "BR0.csv", "FR0": "FR0.csv", "WCAP": "WCAP.csv"}
        self.reels = {}
        for r, f in reels.items():
            self.reels[r] = self.read_reels_csv(os.path.join(self.reels_path, f))
        mode_maxwins = {"base": 5000, "bonus": 5000}

        def door_distributions():
            """Criteria of a 100x door (the same set as the published `bonus` mode): wincap + one criterion per scatter tier so the
            reweighter can pin the share of purchases per tier (10 / 12 / 15 / 18-20 starting free spins)."""

            def fg(criteria, quota, scatter_triggers):
                return Distribution(
                    criteria=criteria,
                    quota=quota,
                    conditions={
                        "reel_weights": {
                            self.basegame_type: {"BR0": 1},
                            self.freegame_type: {"FR0": 1},
                        },
                        "scatter_triggers": scatter_triggers,
                        "force_wincap": False,
                        "force_freegame": True,
                    },
                )

            return [
                Distribution(
                    criteria="wincap",
                    quota=0.001,
                    win_criteria=mode_maxwins["bonus"],
                    conditions={
                        "reel_weights": {
                            self.basegame_type: {"BR0": 1},
                            self.freegame_type: {"WCAP": 1},
                        },
                        "scatter_triggers": {4: 1, 5: 2},
                        "force_wincap": True,
                        "force_freegame": True,
                    },
                ),
                # Natural free games with at least bonus_floor x (rejection filter in check_repeat).
                fg("fgfloor4", 0.55, {4: 1}),
                fg("fgfloor5", 0.25, {5: 1}),
                fg("fgfloor6", 0.12, {6: 1}),
                fg("fgfloor7", 0.079, {7: 3, 8: 1}),
            ]

        def door(name):
            # SYNTHESIS 7: doors are is_feature False / is_buybonus True (SDK docs sample; to be confirmed with Stake).
            return BetMode(
                name=name,
                cost=100,
                rtp=self.rtp,
                max_win=mode_maxwins["bonus"],
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=door_distributions(),
            )

        def base_distributions():
            """Criteria of the `base` mode. Profile 'v1' (the shipped v1 shares): wincap / freegame / 0 / basegame, mission and win
            bucket are outputs of the optimizer. Profile 'v2' (stop-loss switch BASE_PROFILE in calib_params / AM_CALIB): one criterion
            per optimizer fence so the Rust program can PIN them: a trigger criterion per mission (quota = 10 % x mission weight), the
            dead spins, and the non-trigger winners in three buckets (sub-stake R <= 1x, 1x < R < 5x, R >= 5x; SYNTHESIS 4 lever L14)."""
            reels_free = {self.basegame_type: {"BR0": 1}, self.freegame_type: {"FR0": 1}}
            reels_base = {self.basegame_type: {"BR0": 1}}
            wincap = Distribution(
                criteria="wincap",
                quota=0.001,
                win_criteria=mode_maxwins["base"],
                conditions={
                    "reel_weights": {self.basegame_type: {"BR0": 1}, self.freegame_type: {"WCAP": 1}},
                    "scatter_triggers": {4: 1, 5: 2},
                    "force_wincap": True,
                    "force_freegame": True,
                },
            )
            dead = Distribution(
                criteria="0",
                quota=0.4,
                win_criteria=0.0,
                conditions={"reel_weights": reels_base, "force_wincap": False, "force_freegame": False},
            )
            if self.base_profile == "v1":
                return [
                    wincap,
                    Distribution(
                        criteria="freegame",
                        quota=0.1,
                        conditions={
                            "reel_weights": reels_free,
                            "scatter_triggers": {4: 5, 5: 1},
                            "force_wincap": False,
                            "force_freegame": True,
                        },
                    ),
                    dead,
                    Distribution(
                        criteria="basegame",
                        quota=0.5,
                        conditions={"reel_weights": reels_base, "force_wincap": False, "force_freegame": False},
                    ),
                ]
            mix = self.mission_weights["base"]
            total = float(sum(mix.values()))
            out = [wincap]
            for mission, w in mix.items():
                out.append(
                    Distribution(
                        criteria=f"fg_{mission}",
                        quota=round(0.1 * w / total, 6),
                        conditions={
                            "reel_weights": reels_free,
                            "scatter_triggers": {4: 5, 5: 1},
                            "force_wincap": False,
                            "force_freegame": True,
                            "mission_weights": {mission: 1},  # stratified: the mission of this criterion (the 40/30/30 mix = the quotas)
                        },
                    )
                )
            out.append(dead)
            for bucket, quota in BASE_BUCKET_QUOTAS.items():
                out.append(
                    Distribution(
                        criteria=f"bg_{bucket}",
                        quota=quota,
                        conditions={"reel_weights": reels_base, "force_wincap": False, "force_freegame": False, "base_bucket": bucket},
                    )
                )
            return out

        def make_base_mode():
            return BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=mode_maxwins["base"],
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=base_distributions(),
            )

        self._make_base_mode = make_base_mode
        self.bet_modes = [make_base_mode()] + [door(name) for name in self.door_modes]
