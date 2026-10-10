"""Set conditions/parameters for optimization program program"""

from game_config import BASE_RTP_SHARE, BONUS_RTP_SHARE, VARIANTS, VARIANT_PROB, VARIANT_RTP_FRACTION
from optimization_program.optimization_config import (
    ConstructScaling,
    ConstructParameters,
    ConstructConditions,
    ConstructFenceBias,
    verify_optimization_input,
)


def _rtp_shares(total):
    """Per-variant RTP that sums exactly to `total` (the SDK checks the sum to 5 decimals)."""
    keys = list(VARIANTS)
    shares = {k: round(total * VARIANT_RTP_FRACTION[k], 5) for k in keys[:-1]}
    shares[keys[-1]] = round(total - sum(shares.values()), 5)
    return shares


def _expand(scalings):
    """Apply every scaling written for 'freegame' to each wheel-variant criterion."""
    out = []
    for sc in scalings:
        if sc["criteria"] == "freegame":
            out.extend({**sc, "criteria": k} for k in VARIANTS)
        else:
            out.append(sc)
    return out


class OptimizationSetup:
    """Game specific optimization setup.
    Amends game_config.opt_params, which is required to setup maths configuration file.
    """

    def __init__(self, game_config):
        self.game_config = game_config
        wincaps = {}
        for bm in game_config.bet_modes:
            wincaps[bm.get_name()] = bm.get_wincap()
        self.game_config.opt_params = {
            "base": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.001, av_win=wincaps["base"], search_conditions=wincaps["base"]
                    ).return_dict(),
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    **{
                        k: ConstructConditions(
                            rtp=_rtp_shares(BONUS_RTP_SHARE)[k],
                            hr=round(150 / VARIANT_PROB[k], 2),
                            search_conditions={"variant": k},
                        ).return_dict()
                        for k in VARIANTS
                    },
                    "basegame": ConstructConditions(hr=3.6, rtp=BASE_RTP_SHARE).return_dict(),
                },
                "scaling": ConstructScaling(
                    _expand(
                    [
                        # Favour mid-sized wins (1-5x). The SDK sample pushed 10-20x instead, which feeds a barbell
                        # (many sub-bet wins, a few big ones, almost nothing in between).
                        {
                            "criteria": "basegame",
                            "scale_factor": 8.0,
                            "win_range": (1, 5),
                            "probability": 1.0,
                        },
                        {
                            "criteria": "freegame",
                            "scale_factor": 0.8,
                            "win_range": (1000, 2000),
                            "probability": 1.0,
                        },
                        {
                            "criteria": "freegame",
                            "scale_factor": 1.2,
                            "win_range": (3000, 4000),
                            "probability": 1.0,
                        },
                    ]
                    )
                ).return_dict(),
                "parameters": ConstructParameters(
                    num_show=5000,
                    num_per_fence=10000,
                    min_m2m=4,
                    max_m2m=8,
                    pmb_rtp=1.0,
                    sim_trials=5000,
                    test_spins=[50, 100, 200],
                    test_weights=[0.3, 0.4, 0.3],
                    score_type="rtp",
                ).return_dict(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["basegame"],
                    bias_ranges=[(1.0, 5.0)],
                    bias_weights=[0.7],
                ).return_dict(),
            },
            "bonus": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.001, av_win=wincaps["bonus"], search_conditions=wincaps["bonus"]
                    ).return_dict(),
                    **{
                        k: ConstructConditions(
                            rtp=_rtp_shares(0.959)[k], hr=round(1 / VARIANT_PROB[k], 3), search_conditions={"variant": k}
                        ).return_dict()
                        for k in VARIANTS
                    },
                },
                "scaling": ConstructScaling(
                    _expand(
                    [
                        # Damp the ~1000x books (zone Quadrature) in the buy-mode candidates: without this about
                        # 1 optimizer run in 3 comes out far too volatile (median ~22x, std ~210). Measured on 8
                        # runs at 100k: 0 such runs with the damping (see DESIGN.md section 10).
                        {
                            "criteria": "freegame",
                            "scale_factor": 0.25,
                            "win_range": (900, 1500),
                            "probability": 1.0,
                        },
                        {
                            "criteria": "freegame",
                            "scale_factor": 0.9,
                            "win_range": (20, 50),
                            "probability": 1.0,
                        },
                        {
                            "criteria": "freegame",
                            "scale_factor": 0.8,
                            "win_range": (1000, 2000),
                            "probability": 1.0,
                        },
                        {
                            "criteria": "freegame",
                            "scale_factor": 1.2,
                            "win_range": (3000, 4000),
                            "probability": 1.0,
                        },
                    ]
                    )
                ).return_dict(),
                "parameters": ConstructParameters(
                    num_show=5000,
                    num_per_fence=10000,
                    min_m2m=1.5,
                    max_m2m=3,
                    pmb_rtp=1.0,
                    sim_trials=5000,
                    test_spins=[10, 20, 50],
                    test_weights=[0.6, 0.2, 0.2],
                    score_type="rtp",
                ).return_dict(),
            },
        }

        verify_optimization_input(self.game_config, self.game_config.opt_params)
