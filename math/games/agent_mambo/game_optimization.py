"""Set conditions/parameters for optimization program program"""

from optimization_program.optimization_config import (
    ConstructScaling,
    ConstructParameters,
    ConstructFenceBias,
    ConstructConditions,
    verify_optimization_input,
)


import json
import os

from missions import calib

# Experiment knobs (env), defaults = shipped values
BONUS_M2M = tuple(float(x) for x in os.environ.get("BM2M", "4,8").split(","))
BONUS_SCALES = [tuple(float(y) for y in x.split(":")) for x in os.environ.get("BSCALE", "0.7:30:40,0.8:1000:2000,1.2:3000:4000").split(",")]
BONUS_PMB = float(os.environ.get("BPMB", "1.0"))
BONUS_BIAS = [float(x) for x in os.environ["BBIAS"].split(",")] if os.environ.get("BBIAS") else None
BONUS_SPINS = [int(x) for x in os.environ.get("BSPINS", "50,100,200").split(",")]

# Bonus (UNLEASH) scatter-tier design: share of purchases and RTP contribution per tier.
TIER_SHARE = {4: 0.880, 5: 0.100, 6: 0.0178}
TIER_RTP = {4: 0.8360, 5: 0.1000, 6: 0.0200, 7: 0.0030}


def door_opt_params(wincap):
    """Optimizer entry of a 100x door (`bonus`, `entrance_orders`, `entrance_blackout`, `entrance_fuse`). EVERY mode needs an entry:
    `make_temp_math_config` never resets the previous mode's fences, so a mode without one is written with the wrong fences and the
    Rust program panics on the missing name. The doors are weighted by tools/reweight_bonus.py (one lambda per mode, exactly 96.000 %),
    the Rust pass is formal here (see MATH_REPORT.md: it cannot give a flat buy shape).
    Fences: wincap first (exclusive id pool), then one fence per scatter tier so the share of purchases per tier is pinned by hr
    (1 / share): 4 scatters (10 spins) 88 %, 5 (12) 10 %, 6 (15) 1.78 %, 7-8 (18/20) the remainder ~0.2 %; rtp = share x mean win of
    the tier. The wincap criterion is tested per mission with the WCAP strip (tests/test_missions.py, tools/mission_smoke.py)."""
    return {
        "conditions": {
            "wincap": ConstructConditions(rtp=0.001, av_win=wincap, search_conditions=wincap).return_dict(),
            "fgfloor4": ConstructConditions(
                rtp=TIER_RTP[4], hr=1 / TIER_SHARE[4], search_conditions={"bonusTier": "4"}
            ).return_dict(),
            "fgfloor5": ConstructConditions(
                rtp=TIER_RTP[5], hr=1 / TIER_SHARE[5], search_conditions={"bonusTier": "5"}
            ).return_dict(),
            "fgfloor6": ConstructConditions(
                rtp=TIER_RTP[6], hr=1 / TIER_SHARE[6], search_conditions={"bonusTier": "6"}
            ).return_dict(),
            "fgfloor7": ConstructConditions(rtp=TIER_RTP[7], hr="x", search_conditions={"bonusTier": "7"}).return_dict(),
        },
        "scaling": ConstructScaling(
            [
                {"criteria": c, "scale_factor": f, "win_range": r, "probability": 1.0}
                for c in ("fgfloor4", "fgfloor5", "fgfloor6", "fgfloor7")
                for f, r in ((f_, (lo_, hi_)) for f_, lo_, hi_ in BONUS_SCALES)
            ]
        ).return_dict(),
        "parameters": ConstructParameters(
            num_show=5000,
            num_per_fence=10000,
            min_m2m=BONUS_M2M[0],
            max_m2m=BONUS_M2M[1],
            pmb_rtp=BONUS_PMB,
            sim_trials=5000,
            test_spins=BONUS_SPINS,
            test_weights=[0.3, 0.4, 0.3],
            score_type="rtp",
        ).return_dict(),
        **(
            {
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["fgfloor4", "fgfloor5", "fgfloor6", "fgfloor7"],
                    bias_ranges=[(BONUS_BIAS[0], BONUS_BIAS[1])] * 4,
                    bias_weights=[BONUS_BIAS[2]] * 4,
                ).return_dict()
            }
            if BONUS_BIAS
            else {}
        ),
    }


# ---------------------------------------------------------------------------------------------------------- base profile v2
# Per-spin targets of the pinned fences of the `base` mode (SYNTHESIS 4, levers L14): share of ALL spins and RTP contribution. The
# shares of the missions come from the mission weights (config.mission_weights['base'], 40/30/30), the trigger rate stays 1 in 200 and its
# RTP .37, the wincap fence .001. Design (S1 of SYNTHESIS 4 measured on the published v1 table: sub-stake wins 20.2 % of spins carrying 11.2
# RTP points, 1x < R < 5x 4.3 % / 12.9 points, R >= 5x 4.1 % / 35.3 points): keep roughly half of the sub-stake wins, pay the freed RTP as
# wins just above the stake. Result: hit rate 23.8 %, P(R > 1x) 12.5 % (targets >= 23 % and >= 11.5 %, stretch 13 %).
BASE_TRIGGER_HR, BASE_TRIGGER_RTP, BASE_WINCAP_RTP = 200.0, 0.37, 0.001
BASE_BUCKET_TARGETS = {  # bucket: (share of spins, rtp)
    "sub": (0.108, 0.049),
    "mid": (0.079, 0.169),
    "big": (0.0412, 0.371),
}


def base_bucket_targets():
    t = dict(BASE_BUCKET_TARGETS)
    env = os.environ.get("BASE_TARGETS")
    if env:
        t.update({k: tuple(v) for k, v in json.loads(env).items()})
    return t


def base_opt_params_v2(game_config, wincap):
    mix = game_config.mission_weights["base"]
    total = float(sum(mix.values()))
    cond = {"wincap": ConstructConditions(rtp=BASE_WINCAP_RTP, av_win=wincap, search_conditions=wincap).return_dict()}
    cond["0"] = ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict()
    for mission, w in mix.items():  # mission shares pinned: a fence per mission, hr = 200 / share, rtp = .37 x share (same mean per mission)
        share = w / total
        cond[f"fg_{mission}"] = ConstructConditions(
            rtp=round(BASE_TRIGGER_RTP * share, 6), hr=BASE_TRIGGER_HR / share, search_conditions={"mission": mission}
        ).return_dict()
    buckets = base_bucket_targets()
    for bucket, (share, rtp) in buckets.items():
        cond[f"bg_{bucket}"] = ConstructConditions(rtp=rtp, hr=1.0 / share, search_conditions={"bw": bucket}).return_dict()
    # the 'rtp' of the fences must add up to the mode RTP (verify_optimization_input); the dead spins carry none
    dresses = []
    for mission in mix:
        dresses += [
            {"criteria": f"fg_{mission}", "scale_factor": 0.8, "win_range": (1000, 2000), "probability": 1.0},
            {"criteria": f"fg_{mission}", "scale_factor": 1.2, "win_range": (3000, 4000), "probability": 1.0},
        ]
    for extra in json.loads(os.environ.get("BASE_DRESSES", "[]")):  # experiments: [[fence, scale, lo, hi], ...]
        dresses.append({"criteria": extra[0], "scale_factor": extra[1], "win_range": (extra[2], extra[3]), "probability": 1.0})
    return {
        "conditions": cond,
        "scaling": ConstructScaling(dresses).return_dict(),
        "parameters": ConstructParameters(
            num_show=5000,
            num_per_fence=10000,
            min_m2m=float(os.environ.get("BASE_M2M_MIN", "1.0")),
            max_m2m=float(os.environ.get("BASE_M2M_MAX", "8.0")),
            pmb_rtp=1.0,
            sim_trials=5000,
            test_spins=[50, 100, 200],
            test_weights=[0.3, 0.4, 0.3],
            score_type="rtp",
        ).return_dict(),
        "distribution_bias": ConstructFenceBias(
            applied_criteria=["bg_sub", "bg_mid", "bg_big"],
            bias_ranges=[(0.2, 0.9), (1.1, 3.0), (5.0, 14.0)],
            bias_weights=[0.4, 0.4, 0.4],
        ).return_dict(),
    }


class OptimizationSetup:
    """"""

    def __init__(self, game_config):
        self.game_config = game_config
        wincaps = {}
        for bm in game_config.bet_modes:
            wincaps[bm.get_name()] = bm.get_wincap()
        self.game_config.opt_params = {
            "base": base_opt_params_v2(game_config, wincaps["base"]) if game_config.base_profile == "v2" else {
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
        }
        for name, cap in wincaps.items():
            if name != "base":
                self.game_config.opt_params[name] = door_opt_params(cap)

        verify_optimization_input(self.game_config, self.game_config.opt_params)
