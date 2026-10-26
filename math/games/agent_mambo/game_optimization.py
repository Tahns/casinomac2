"""Set conditions/parameters for optimization program program"""

from optimization_program.optimization_config import (
    ConstructScaling,
    ConstructParameters,
    ConstructFenceBias,
    ConstructConditions,
    verify_optimization_input,
)


# Bonus (UNLEASH) scatter-tier design: share of purchases and RTP contribution per tier.
TIER_SHARE = {4: 0.880, 5: 0.100, 6: 0.0178}
TIER_RTP = {4: 0.8360, 5: 0.1000, 6: 0.0200, 7: 0.0030}


class OptimizationSetup:
    """"""

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
                    "freegame": ConstructConditions(
                        rtp=0.37, hr=200, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "basegame": ConstructConditions(hr=3.5, rtp=0.589).return_dict(),
                },
                "scaling": ConstructScaling(
                    [
                        {"criteria": "basegame", "scale_factor": 1.2, "win_range": (1, 2), "probability": 1.0},
                        {"criteria": "basegame", "scale_factor": 1.5, "win_range": (2, 5), "probability": 1.0},
                        {"criteria": "basegame", "scale_factor": 0.5, "win_range": (10, 20), "probability": 1.0},
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
                    bias_ranges=[(0.5, 1.5)],
                    bias_weights=[0.4],
                ).return_dict(),
            },
            "bonus": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.001, av_win=wincaps["bonus"], search_conditions=wincaps["bonus"]
                    ).return_dict(),
                    # One fence per scatter tier: shares of purchases are pinned by hr (1 / share).
                    # 4 scatters (10 spins) 88 %, 5 (12) 10 %, 6 (15) 1.78 %, 7-8 (18/20) remainder ~0.2 %.
                    # rtp = share x mean win of the tier (mean 10-spin tier ~93x).
                    "fgfloor4": ConstructConditions(
                        rtp=TIER_RTP[4], hr=1 / TIER_SHARE[4], search_conditions={"bonusTier": "4"}
                    ).return_dict(),
                    "fgfloor5": ConstructConditions(
                        rtp=TIER_RTP[5], hr=1 / TIER_SHARE[5], search_conditions={"bonusTier": "5"}
                    ).return_dict(),
                    "fgfloor6": ConstructConditions(
                        rtp=TIER_RTP[6], hr=1 / TIER_SHARE[6], search_conditions={"bonusTier": "6"}
                    ).return_dict(),
                    "fgfloor7": ConstructConditions(
                        rtp=TIER_RTP[7], hr="x", search_conditions={"bonusTier": "7"}
                    ).return_dict(),
                },
                "scaling": ConstructScaling(
                    [
                        {"criteria": c, "scale_factor": f, "win_range": r, "probability": 1.0}
                        for c in ("fgfloor4", "fgfloor5", "fgfloor6", "fgfloor7")
                        for f, r in ((0.7, (30, 40)), (0.8, (1000, 2000)), (1.2, (3000, 4000)))
                    ]
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
            },
        }

        verify_optimization_input(self.game_config, self.game_config.opt_params)
