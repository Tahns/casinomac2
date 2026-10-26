"""WP8 calibration helper: natural pools and the door reweighting estimate per mission (run with the repo env python).

  math/env/bin/python math/games/agent_mambo/tools/mission_calib.py door    --mission blackout --n 20000 --procs 3
  math/env/bin/python math/games/agent_mambo/tools/mission_calib.py natural --mission orders   --n 6000  --procs 3

`door`   plays the 100x door of the mission with the SDK criteria split (30x floor, tier criteria, wincap) and applies the SAME recipe as
         tools/reweight_bonus.py to the books (pinned share per starting-free-spin tier, one exponential tilt exp(-lam * win), P(5000x) =
         1/50000, lam solved for RTP 96.000 %) to estimate the FINAL table: lam, median, P(R > price), 30-60x share, 100x+ share.
`natural` plays base-mode `freegame` books (the trigger pool, NO floor) with one forced mission: mean / median / share below the floor of the
         pool the base fences see (base fence `freegame`: hr 200, rtp .37 -> mean 74x).
Same books, same code as the smoke (every book is reconciled). Knobs are the calib_params names (or env AM_CALIB).
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mission_smoke as ms  # noqa: E402

DOOR = {"briefing": "bonus", "orders": "entrance_orders", "blackout": "entrance_blackout", "fuse": "entrance_fuse"}
SHARES = {10: 0.8800, 12: 0.1000, 15: 0.0178, "18+": 0.0022}  # same as tools/reweight_bonus.py
P_MAX = 1 / 50000


def tilt_estimate(pay, tier, cost=100.0, target=0.96):
    """pay in x; tier 0..3 (10/12/15/18+ spins). Returns (lam, weights)."""
    cap = pay >= 5000 - 1e-9
    shares = np.array([SHARES[10], SHARES[12], SHARES[15], SHARES["18+"]])
    shares = shares / shares.sum()

    def build(lam):
        w = np.zeros(len(pay))
        for k in range(4):
            sel = (tier == k) & ~cap
            if not sel.any():
                continue
            e = np.exp(-lam * (pay[sel] - pay[sel].min()))
            w[sel] = shares[k] * (1 - P_MAX) * e / e.sum()
        if cap.any():
            w[cap] = P_MAX / cap.sum()
        return w

    lo, hi = -0.05, 0.05
    for _ in range(200):
        mid = (lo + hi) / 2
        if (build(mid) * pay).sum() / cost > target:
            lo = mid
        else:
            hi = mid
    lam = (lo + hi) / 2
    return lam, build(lam)


def pinned_estimate(pay, tier, over_target, cost=100.0, target=0.96):
    """Same tilt, plus a boost kappa on the books above the price: weights exp(-lam x) (1 + kappa [x > cost]) per tier, kappa solved so that
    P(R > price) = over_target, lam so that RTP = target. Feasibility estimate of a 'pinned P(R > price)' door fence for the reweighter."""
    cap = pay >= 5000 - 1e-9
    shares = np.array([SHARES[10], SHARES[12], SHARES[15], SHARES["18+"]])
    shares = shares / shares.sum()

    def build(lam, kappa):
        w = np.zeros(len(pay))
        for k in range(4):
            sel = (tier == k) & ~cap
            if not sel.any():
                continue
            e = np.exp(-lam * (pay[sel] - pay[sel].min())) * (1.0 + kappa * (pay[sel] > cost))
            w[sel] = shares[k] * (1 - P_MAX) * e / e.sum()
        if cap.any():
            w[cap] = P_MAX / cap.sum()
        return w

    def solve_lam(kappa):
        lo, hi = -0.05, 0.05
        for _ in range(120):
            mid = (lo + hi) / 2
            if (build(mid, kappa) * pay).sum() / cost > target:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    klo, khi = -0.9, 20.0
    for _ in range(60):
        km = (klo + khi) / 2
        w = build(solve_lam(km), km)
        if w[pay > cost].sum() / w.sum() < over_target:
            klo = km
        else:
            khi = km
    kappa = (klo + khi) / 2
    lam = solve_lam(kappa)
    return lam, kappa, build(lam, kappa)


def wquant(pay, w, q):
    o = np.argsort(pay)
    c = np.cumsum(w[o]) / w.sum()
    return pay[o][np.searchsorted(c, q)]


def cmd_door(a):
    mode = DOOR[a.mission]
    s, rows, errors = ms.run_smoke(mode, a.n, a.procs, {a.mission: 1}, None, quiet=True)
    pay = np.array([r[2] / 100 for r in rows])
    fs = np.array([r[5].get("fs0") or 0 for r in rows])
    tier = np.where(fs >= 18, 3, np.where(fs == 15, 2, np.where(fs == 12, 1, 0)))
    lam, w = tilt_estimate(pay, tier)
    out = {
        "mission": a.mission, "books": len(rows), "reconcile_errors": len(errors), "natural_mean": round(float(pay.mean()), 2),
        "natural_median": float(np.median(pay)), "lam": round(lam, 6), "weighted_rtp": round(float((w * pay).sum() / w.sum() / 100), 5),
        "median_x": float(wquant(pay, w, 0.5)), "p_gt_price": round(float(w[pay > 100].sum() / w.sum()), 4),
        "share_30_60": round(float(w[(pay >= 30) & (pay < 60)].sum() / w.sum()), 4),
        "share_60_300": round(float(w[(pay >= 60) & (pay < 300)].sum() / w.sum()), 4),
        "share_300_plus": round(float(w[pay >= 300].sum() / w.sum()), 4),
        "share_100_plus": round(float(w[pay >= 100].sum() / w.sum()), 4),
        "tier_counts": [int((tier == k).sum()) for k in range(4)], "ms_per_book_cpu": s["ms_per_book_cpu"], "attempts": s["attempts_per_book"],
        "json_kb": s["json_kb_per_book"],
    }
    if a.pin_over:
        lam2, kappa, w2 = pinned_estimate(pay, tier, a.pin_over)
        out["pinned"] = {"target_over": a.pin_over, "lam": round(lam2, 6), "kappa": round(kappa, 3), "rtp": round(float((w2 * pay).sum() / w2.sum() / 100), 5),
                         "median_x": float(wquant(pay, w2, 0.5)), "p_gt_price": round(float(w2[pay > 100].sum() / w2.sum()), 4),
                         "share_30_60": round(float(w2[(pay >= 30) & (pay < 60)].sum() / w2.sum()), 4),
                         "share_300_plus": round(float(w2[pay >= 300].sum() / w2.sum()), 4),
                         "share_1000_plus": round(float(w2[pay >= 1000].sum() / w2.sum()), 5)}
    print(json.dumps(out))
    return 1 if errors else 0


def cmd_natural(a):
    s, rows, errors = ms.run_smoke("base", a.n, a.procs, {a.mission: 1}, "freegame", quiet=True)
    pay = np.array([r[2] / 100 for r in rows])
    out = {"mission": a.mission, "books": len(rows), "reconcile_errors": len(errors), "mean": round(float(pay.mean()), 2),
           "median": float(np.median(pay)), "below_30": round(float((pay < 30).mean()), 3), "p_ge_100": round(float((pay >= 100).mean()), 3),
           "p_ge_1000": round(float((pay >= 1000).mean()), 4), "ms_per_book_cpu": s["ms_per_book_cpu"], "attempts": s["attempts_per_book"]}
    print(json.dumps(out))
    return 1 if errors else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["door", "natural"])
    ap.add_argument("--mission", required=True, choices=list(DOOR))
    ap.add_argument("--n", type=int, default=6000)
    ap.add_argument("--procs", type=int, default=3)
    ap.add_argument("--pin-over", type=float, default=None, help="door: also estimate a reweighting that PINS P(R > price) to this value")
    a = ap.parse_args()
    sys.exit({"door": cmd_door, "natural": cmd_natural}[a.cmd](a))
