import os
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode

# Price of the bonus buy, in multiples of the bet (also the wager-saver floor in buy mode).
BONUS_BUY_COST = 80.0

# Share of the 96 % RTP asked of the optimizer: (base game without bonus, bonus triggered from the base game).
#   default    : 45.9 % base, 50.0 % bonus. Bonus-heavy: high volatility (median 20-spin session: -13 stakes).
#   base_heavy : 54.9 % base, 41.0 % bonus. Measured (DESIGN.md section 13): 1 spin without bonus in 9 pays the
#                stake instead of 1 in 17, and 200-spin ruin of a 100-stake bankroll halves (26.8 % -> 13.0 %).
RTP_SPLITS = {"default": (0.459, 0.50), "base_heavy": (0.549, 0.41)}
ACTIVE_RTP_SPLIT = "default"
BASE_RTP_SHARE, BONUS_RTP_SHARE = RTP_SPLITS[ACTIVE_RTP_SPLIT]

# Bonus profiles: stars per night, star value levels (index into constellation.LADDER), clustering, and the number
# of nights by Lunette count (3/4/5).
#   A (default): denser sky, 10/12/15 nights. Natural bonus (about 106x for an 80x purchase) is richer than its
#      price, so the optimizer shaves a lot; about 1 optimizer run in 3 comes out too volatile (bimodal, see
#      DESIGN.md section 10); tools/reoptimize.py redraws until the quality gates pass.
#   B: sparser sky with richer stars. Natural bonus close to its price, but wins of 1000x and more almost disappear.
#   C: between A and B. Keeps little of the top end (0.35 % of base RTP from 1000x and more).
#   D: profile A with 10/11/12 nights. Keeps A's top end (1.7 % of base RTP from 1000x and more) with a lower natural
#      value, but NO measurable gain in optimizer robustness at 100k simulations (4 runs in 8 acceptable) and it
#      weakens the 4- and 5-Lunette bonuses: not adopted.
_A = {
    "night": {0: 30, 1: 40, 2: 22, 3: 8},
    "levels": {0: 30, 1: 25, 2: 18, 3: 12, 4: 8, 5: 4, 6: 2, 7: 1},
    "adjacency": 1.5,
    "nights": {3: 10, 4: 12, 5: 15},
}
PROFILES = {
    "A": _A,
    "B": {
        "night": {0: 42, 1: 38, 2: 15, 3: 5},
        "levels": {0: 12, 1: 16, 2: 18, 3: 17, 4: 14, 5: 10, 6: 7, 7: 4, 8: 2},
        "adjacency": 3.0,
        "nights": {3: 10, 4: 12, 5: 15},
    },
    "C": {
        "night": {0: 36, 1: 39, 2: 19, 3: 6},
        "levels": {0: 21, 1: 20, 2: 18, 3: 14, 4: 11, 5: 7, 6: 5, 7: 3, 8: 1},
        "adjacency": 2.25,
        "nights": {3: 10, 4: 12, 5: 15},
    },
    "D": {**_A, "nights": {3: 10, 4: 11, 5: 12}},
}
ACTIVE_PROFILE = "A"
NIGHT_STD = PROFILES[ACTIVE_PROFILE]["night"]
LEVELS_STD = PROFILES[ACTIVE_PROFILE]["levels"]
ADJACENCY_STD = PROFILES[ACTIVE_PROFILE]["adjacency"]

LEVELS_RICH = {0: 10, 1: 14, 2: 16, 3: 16, 4: 14, 5: 12, 6: 8, 7: 6, 8: 3, 9: 1}
NIGHT_WINCAP = {5: 1}


# ---- Deux roues et plusieurs bonus (docs/TWO_WHEELS_SPEC.md) --------------------------------------------------
# Roue des Saisons (avant le bonus) : Constellations / Cometes / Nova / Aurore. Aurore mene a la Roue de l'Aurore, qui
# ne contient que les versions Superieures. Chaque resultat est un CRITERE de l'optimiseur avec son propre taux (hr) :
# les chances affichees sont celles de la bibliotheque finale, jamais un tirage decide avant la ponderation.
#   constellation : nuits de 0 a 3 etoiles dispersees (bonus d'origine)
#   comet         : chaque nuit une comete traverse une ligne ou une colonne et pose une etoile sur chaque case libre
#   nova          : chaque nuit un bloc 2x2 d'etoiles se pose d'un coup
_MID = {0: 18, 1: 20, 2: 18, 3: 15, 4: 12, 5: 9, 6: 5, 7: 2, 8: 1}
_LOWL = {0: 60, 1: 28, 2: 9, 3: 3}
_COMET_PLUS = {0: 50, 1: 28, 2: 13, 3: 6, 4: 3}
# Deux roues INDEPENDANTES qui tournent ensemble, aucune ne mene a l'autre :
#   - la roue des Bonus (7 segments) choisit le bonus ;
#   - la roue des Phases de Lune (3 segments : croissant, quartier, pleine lune) choisit sa richesse (niveau 1, 2 ou 3).
# Chaque couple (bonus, phase) est un CRITERE de l'optimiseur avec son propre taux : les chances sont exactes.
_TOP = {0: 5, 1: 9, 2: 13, 3: 16, 4: 16, 5: 14, 6: 11, 7: 8, 8: 5, 9: 3}
KINDS_CFG = {
    # kind: (night weights, adjacency, {scatters: nights}, level weights for phase 1 / 2 / 3)
    "constellation": (NIGHT_STD, ADJACENCY_STD, {3: 10, 4: 12, 5: 15}, (LEVELS_STD, _MID, LEVELS_RICH)),
    "comet": (None, 0, {3: 2, 4: 3, 5: 3}, (_LOWL, _COMET_PLUS, _MID)),
    "nova": (None, 0, {3: 5, 4: 6, 5: 7}, (LEVELS_STD, _MID, LEVELS_RICH)),
    "cross": (None, 0, {3: 3, 4: 4, 5: 4}, (_MID, LEVELS_RICH, _TOP)),
    "rain": (None, 0, {3: 3, 4: 3, 5: 4}, (_MID, LEVELS_RICH, _TOP)),
    "eclipse": (None, 0, {3: 3, 4: 4, 5: 4}, (_MID, LEVELS_RICH, _TOP)),
    "galaxy": (None, 0, {3: 5, 4: 5, 5: 6}, (_MID, LEVELS_RICH, _TOP)),
}
PHASE_VALUE = {1: 100, 2: 130, 3: 170}  # relative natural value (informational)
# Roue des Bonus et roue des Phases : part de chaque segment (somme = 1 chacune).
WHEEL1_ODDS = {"constellation": 0.26, "comet": 0.15, "nova": 0.15, "cross": 0.13, "rain": 0.13, "eclipse": 0.10, "galaxy": 0.08}
WHEEL2_ODDS = {1: 0.60, 2: 0.30, 3: 0.10}
assert abs(sum(WHEEL1_ODDS.values()) - 1) < 1e-9 and abs(sum(WHEEL2_ODDS.values()) - 1) < 1e-9
# criteria: (phase, label, kind, night weights, level weights, adjacency, {scatters: nights}, relative natural value)
VARIANTS = {
    f"p{ph}_{kind}": (ph, kind + "+" * (ph - 1), kind, v[0], v[3][ph - 1], v[1], v[2], PHASE_VALUE[ph])
    for kind, v in KINDS_CFG.items()
    for ph in (1, 2, 3)
}
VARIANT_PROB = {k: WHEEL1_ODDS[v[2]] * WHEEL2_ODDS[v[0]] for k, v in VARIANTS.items()}
WINCAP_VARIANT = "p3_constellation"
_WSUM = sum(VARIANT_PROB[k] * VARIANTS[k][7] for k in VARIANTS)
VARIANT_RTP_FRACTION = {k: VARIANT_PROB[k] * VARIANTS[k][7] / _WSUM for k in VARIANTS}


class GameConfig(Config):
    """Stellar Vigil: 5x4 ways base game, 5x5 constellation bonus."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "stellar_vigil_wheels"
        self.provider_number = 0
        self.working_name = "Stellar Vigil - Deux Roues"
        self.wincap = 10000
        self.win_type = "ways"
        self.rtp = 0.96
        self.construct_paths()

        # Game dimensions
        self.num_reels = 5
        self.num_rows = [4] * self.num_reels

        # H1 Astrolabe, H2 Moon, H3 Comet, H4 Hourglass, L1-L4 = A K Q J
        # Calibrated so the natural base game pays about what the optimizer asks for per winning spin (about 1.6x).
        # Every value must be a multiple of 0.1x: Stake's format check rejects any other payout.
        self.paytable = {
            (5, "H1"): 4.0,
            (4, "H1"): 1.4,
            (3, "H1"): 0.4,
            (5, "H2"): 2.8,
            (4, "H2"): 1.0,
            (3, "H2"): 0.3,
            (5, "H3"): 1.8,
            (4, "H3"): 0.7,
            (3, "H3"): 0.2,
            (5, "H4"): 1.0,
            (4, "H4"): 0.4,
            (3, "H4"): 0.1,
            (5, "L1"): 0.7,
            (4, "L1"): 0.3,
            (3, "L1"): 0.1,
            (5, "L2"): 0.7,
            (4, "L2"): 0.3,
            (3, "L2"): 0.1,
            (5, "L3"): 0.5,
            (4, "L3"): 0.2,
            (3, "L3"): 0.1,
            (5, "L4"): 0.5,
            (4, "L4"): 0.2,
            (3, "L4"): 0.1,
        }

        self.include_padding = True

        # Roue de Sauvegarde (wager saver): spun at the end of a bonus whose total is below a floor (25x for a bonus
        # triggered from the base game, the purchase price for a bought bonus). If it saves, the total is topped up
        # to the floor. `saver_draw_probability` is only the draw used while SIMULATING the books; the optimizer
        # then re-weights the books, so the odds a player really gets are different (about 5 % instead of 37.5 % in
        # buy mode). The real odds are measured on the final library (tools/saver_odds.py) and the front-end draws
        # the wheel from them: the math never dictates how many segments are "saved".
        self.saver_draw_probability = 0.375
        self.saver_floor = {"base": 25.0, "bonus": BONUS_BUY_COST}

        self.special_symbols = {"wild": ["W"], "scatter": ["S"], "multiplier": [], "prize": ["ST"]}
        # Etoile a valeur (jeu de base): gain paye sur place, en multiples de la mise.
        self.star_values = {0.2: 40, 0.5: 30, 1: 18, 2: 8, 5: 3, 10: 1}

        # Number of nights (fixed, never reset) by Lunette count.
        self.freespin_triggers = {
            self.basegame_type: dict(PROFILES[ACTIVE_PROFILE]["nights"]),
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

        def bonus_conditions(night_weights, level_weights, adjacency, force_wincap=False, variant=None):
            return {
                "reel_weights": base_reels,
                "force_wincap": force_wincap,
                "force_freegame": True,
                "scatter_triggers": triggers,
                "star_count_weights": night_weights,
                "level_weights": level_weights,
                "adjacency_bias": adjacency,
                "variant": variant,
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
                    *[
                        Distribution(
                            criteria=crit,
                            quota=round(0.1 * VARIANT_PROB[crit], 5),
                            conditions=bonus_conditions(v[3], v[4], v[5], variant=crit),
                        )
                        for crit, v in VARIANTS.items()
                    ],
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
                        quota=0.499,
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
                    *[
                        Distribution(
                            criteria=crit,
                            quota=round(0.999 * VARIANT_PROB[crit], 5),
                            conditions=bonus_conditions(v[3], v[4], v[5], variant=crit),
                        )
                        for crit, v in VARIANTS.items()
                    ],
                ],
            ),
        ]
