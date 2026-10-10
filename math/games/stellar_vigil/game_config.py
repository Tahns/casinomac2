import os
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode

# Price of the bonus buy, in multiples of the bet (also the wager-saver floor in buy mode).
BONUS_BUY_COST = 80.0

# Star-level weights (index into constellation.LADDER) and nightly star counts per bonus profile.
LEVELS_STD = {0: 30, 1: 25, 2: 18, 3: 12, 4: 8, 5: 4, 6: 2, 7: 1}
LEVELS_RICH = {0: 10, 1: 14, 2: 16, 3: 16, 4: 14, 5: 12, 6: 8, 7: 6, 8: 3, 9: 1}
NIGHT_STD = {0: 30, 1: 40, 2: 22, 3: 8}
NIGHT_WINCAP = {5: 1}


class GameConfig(Config):
    """Stellar Vigil: 5x4 ways base game, 5x5 constellation bonus."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "stellar_vigil"
        self.provider_number = 0
        self.working_name = "Stellar Vigil"
        self.wincap = 10000
        self.win_type = "ways"
        self.rtp = 0.96
        self.construct_paths()

        # Game dimensions
        self.num_reels = 5
        self.num_rows = [4] * self.num_reels

        # H1 Astrolabe, H2 Moon, H3 Comet, H4 Hourglass, L1-L4 = A K Q J
        self.paytable = {
            (5, "H1"): 12,
            (4, "H1"): 4,
            (3, "H1"): 1.2,
            (5, "H2"): 8,
            (4, "H2"): 3,
            (3, "H2"): 0.8,
            (5, "H3"): 5,
            (4, "H3"): 2,
            (3, "H3"): 0.5,
            (5, "H4"): 3,
            (4, "H4"): 1.2,
            (3, "H4"): 0.3,
            (5, "L1"): 2,
            (4, "L1"): 0.8,
            (3, "L1"): 0.2,
            (5, "L2"): 2,
            (4, "L2"): 0.8,
            (3, "L2"): 0.2,
            (5, "L3"): 1.5,
            (4, "L3"): 0.5,
            (3, "L3"): 0.1,
            (5, "L4"): 1.5,
            (4, "L4"): 0.5,
            (3, "L4"): 0.1,
        }

        self.include_padding = True

        # Roue de Sauvegarde (wager saver): spun at the end of a bonus whose total is below
        # what the player paid to enter it (the bet when triggered, the price when bought).
        # A 'saved' segment tops the bonus total up to that amount. 3 of 8 segments are 'saved'.
        self.saver_segments = ["saved", "empty", "saved", "empty", "empty", "saved", "empty", "empty"]
        self.saver_floor = {"base": 25.0, "bonus": BONUS_BUY_COST}

        self.special_symbols = {"wild": ["W"], "scatter": ["S"], "multiplier": [], "prize": ["ST"]}
        # Etoile a valeur (jeu de base): gain paye sur place, en multiples de la mise.
        self.star_values = {0.2: 40, 0.5: 30, 1: 18, 2: 8, 5: 3, 10: 1}

        # Number of nights (fixed, never reset) by Lunette count.
        self.freespin_triggers = {
            self.basegame_type: {3: 10, 4: 12, 5: 15},
            self.freegame_type: {3: 0},
        }
        self.anticipation_triggers = {self.basegame_type: 2, self.freegame_type: 1}

        reels = {"BR0": "BR0.csv"}
        self.reels = {}
        for r, f in reels.items():
            self.reels[r] = self.read_reels_csv(os.path.join(self.reels_path, f))

        mode_maxwins = {"base": self.wincap, "bonus": self.wincap}
        base_reels = {self.basegame_type: {"BR0": 1}}
        triggers = {3: 100, 4: 20, 5: 5}

        def bonus_conditions(night_weights, level_weights, adjacency, force_wincap=False):
            return {
                "reel_weights": base_reels,
                "force_wincap": force_wincap,
                "force_freegame": True,
                "scatter_triggers": triggers,
                "star_count_weights": night_weights,
                "level_weights": level_weights,
                "adjacency_bias": adjacency,
            }

        self.bet_modes = [
            BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=mode_maxwins["base"],
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=mode_maxwins["base"],
                        conditions=bonus_conditions(NIGHT_WINCAP, LEVELS_RICH, 2.0, force_wincap=True),
                    ),
                    Distribution(
                        criteria="freegame",
                        quota=0.1,
                        conditions=bonus_conditions(NIGHT_STD, LEVELS_STD, 1.5),
                    ),
                    Distribution(
                        criteria="0",
                        quota=0.4,
                        win_criteria=0.0,
                        conditions={
                            "reel_weights": base_reels,
                            "force_wincap": False,
                            "force_freegame": False,
                        },
                    ),
                    Distribution(
                        criteria="basegame",
                        quota=0.5,
                        conditions={
                            "reel_weights": base_reels,
                            "force_wincap": False,
                            "force_freegame": False,
                        },
                    ),
                ],
            ),
            BetMode(
                name="bonus",
                cost=BONUS_BUY_COST,
                rtp=self.rtp,
                max_win=mode_maxwins["bonus"],
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=mode_maxwins["bonus"],
                        conditions=bonus_conditions(NIGHT_WINCAP, LEVELS_RICH, 2.0, force_wincap=True),
                    ),
                    Distribution(
                        criteria="freegame",
                        quota=0.999,
                        conditions=bonus_conditions(NIGHT_STD, LEVELS_STD, 1.5),
                    ),
                ],
            ),
        ]
