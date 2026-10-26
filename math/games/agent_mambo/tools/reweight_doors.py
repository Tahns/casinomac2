"""Door weights without the Rust optimizer (generalises tools/reweight_bonus.py to every 100x door; WP9).

  math/env/bin/python math/games/agent_mambo/tools/reweight_doors.py [--modes bonus,entrance_orders,entrance_blackout]
                                                                       [--pin-over 0.31] [--dry] [--report FILE]

Input per mode (all written by create_books):  library/lookup_tables/lookUpTable_<mode>.csv  (id, 1, payout x100)
                                               library/forces/force_record_<mode>.json         (bookIds per {"bonusTier": 4|5|6|7})
Output per mode:                               library/publish_files/lookUpTable_<mode>_0.csv   (id, integer weight, payout x100)

Recipe (one tilt per mode, exactly the shape of the published v1 `bonus` table):
  * every non-wincap book of scatter tier k (4 scatters = 10 spins, 5 = 12, 6 = 15, 7+ = 18/20) gets
        w = share_k * (1 - P_MAX) * exp(-lam * (x - x_min_k)) * (1 + kappa * [x > price])   normalised inside the tier,
    x = payout in multiples of the bet, price = 100 (cost of the door);
  * P_MAX = 1 / 50 000 is split evenly over the 5000x wincap books (P(5000x) pinned);
  * the 30x floor is a rejection filter of the simulation (every book pays >= 30x), so it is kept by construction (asserted);
  * lam is solved so that RTP = 96.000 % (continuous solution; the integer rounding moves it by < 1e-8);
  * kappa >= 0 is solved so that P(R > price) = --pin-over (default calib_params.DOOR_PIN_OVER); kappa = 0 (--pin-over 0) is the plain
    exponential tilt of reweight_bonus.py. kappa is a boost on the books above the price: the lever of the SYNTHESIS 4 metric
    P(return > stake) for a door; it is solved on the real pool, so the published table carries the exact value.
Integer weights (scale 1e15, minimum 1), the sum is far below uint64.
"""
import argparse
import csv
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, ".."))
LIB = os.path.join(GAME, "library")
PUB = os.path.join(LIB, "publish_files")
sys.path.insert(0, GAME)

MODES = ("bonus", "entrance_orders", "entrance_blackout")
SHARES = (0.8800, 0.1000, 0.0178, 0.0022)  # start spins 10 / 12 / 15 / 18+20 (tiers 4 / 5 / 6 / 7)
P_MAX = 1 / 50000
TARGET_RTP = 0.96
COST = 100.0
PRICE = COST
FLOOR = 30.0
TOTAL = 10**15
CAP_X = 5000.0


def default_pin_over():
    try:
        import calib_params

        v = getattr(calib_params, "DOOR_PIN_OVER", None)
        return float(v) if v else 0.0
    except ImportError:
        return 0.0


def load_mode(mode, lib=LIB):
    rows = list(csv.reader(open(os.path.join(lib, "lookup_tables", f"lookUpTable_{mode}.csv"))))
    ids = np.array([int(r[0]) for r in rows])
    assert (ids == np.arange(len(ids))).all(), "ids must be 0..n-1"
    pay = np.array([int(r[2]) for r in rows], float) / 100.0
    tier = np.full(len(ids), -1)
    for rec in json.load(open(os.path.join(lib, "forces", f"force_record_{mode}.json"))):
        s = rec["search"]
        if len(s) == 1 and s[0]["name"] == "bonusTier":
            k = int(s[0]["value"]) - 4
            assert 0 <= k <= 3, k
            b = np.array(rec["bookIds"])
            assert (tier[b] == -1).all(), "a book carries two bonusTier records"
            tier[b] = k
    miss = tier < 0
    # wincap books are not tiered (their share is P_MAX as a whole); every other book must carry its tier
    assert (pay[miss] >= CAP_X - 1e-9).all(), f"{int((miss & (pay < CAP_X)).sum())} non-wincap books without bonusTier in force_record_{mode}.json"
    return ids, pay, tier


class Tilt:
    """Weights of one mode as a function of (lam, kappa); pool arrays are precomputed once."""

    def __init__(self, pay, tier, price=PRICE):
        self.pay = pay
        self.cap = pay >= CAP_X - 1e-9
        self.sel = [np.where((tier == k) & ~self.cap)[0] for k in range(4)]
        self.shares = np.array(SHARES) / sum(SHARES)
        self.x = [pay[s] - pay[s].min() if len(s) else pay[s] for s in self.sel]
        self.over = [(pay[s] > price + 1e-9).astype(float) for s in self.sel]
        self.price = price

    def weights(self, lam, kappa):
        w = np.zeros(len(self.pay))
        for k, s in enumerate(self.sel):
            if not len(s):
                continue
            e = np.exp(-lam * self.x[k]) * (1.0 + kappa * self.over[k])
            w[s] = self.shares[k] * (1 - P_MAX) * e / e.sum()
        if self.cap.any():
            w[self.cap] = P_MAX / self.cap.sum()
        return w

    def rtp(self, lam, kappa):
        return float((self.weights(lam, kappa) * self.pay).sum() / COST)

    def solve_lam(self, kappa, target=TARGET_RTP, iters=100):
        lo, hi = -0.05, 0.05
        assert self.rtp(lo, kappa) > target > self.rtp(hi, kappa), "RTP target not bracketed by lam in [-0.05, 0.05]"
        for _ in range(iters):
            mid = (lo + hi) / 2
            if self.rtp(mid, kappa) > target:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    def p_over(self, w):
        return float(w[self.pay > self.price + 1e-9].sum() / w.sum())

    def solve(self, pin_over):
        """Returns lam, kappa, float weights. pin_over falsy = plain tilt (kappa 0)."""
        if not pin_over:
            lam = self.solve_lam(0.0)
            return lam, 0.0, self.weights(lam, 0.0)
        lam0 = self.solve_lam(0.0)
        p0 = self.p_over(self.weights(lam0, 0.0))
        if p0 >= pin_over:  # already above: nothing to boost
            return lam0, 0.0, self.weights(lam0, 0.0)
        klo, khi = 0.0, 50.0
        for _ in range(48):
            km = (klo + khi) / 2
            lam = self.solve_lam(km, iters=60)
            if self.p_over(self.weights(lam, km)) < pin_over:
                klo = km
            else:
                khi = km
        kappa = (klo + khi) / 2
        lam = self.solve_lam(kappa)
        return lam, kappa, self.weights(lam, kappa)


def wquant(pay, w, q):
    o = np.argsort(pay, kind="stable")
    c = np.cumsum(w[o]) / w.sum()
    return float(pay[o][np.searchsorted(c, q)])


def table_stats(pay, w, tier=None):
    """Numbers of a weighted door table (w need not be normalised). pay in x of the bet, price = 100."""
    W = w.sum()

    def share(m):
        return float(w[m].sum() / W)

    out = {
        "books": int(len(pay)),
        "rtp": float((w * pay).sum() / W / COST),
        "medianX": wquant(pay, w, 0.5),
        "meanX": float((w * pay).sum() / W),
        "minX": float(pay.min()),
        "maxX": float(pay.max()),
        "pGtPrice": share(pay > PRICE + 1e-9),
        "pGePrice": share(pay >= PRICE - 1e-9),
        "p_10pct_x": wquant(pay, w, 0.10),
        "p_90pct_x": wquant(pay, w, 0.90),
        "share_30_60": share((pay >= 30) & (pay < 60)),
        "share_60_100": share((pay >= 60) & (pay < 100)),
        "share_100_300": share((pay >= 100) & (pay < 300)),
        "share_300_1000": share((pay >= 300) & (pay < 1000)),
        "share_1000_plus": share(pay >= 1000),
        "pMax": share(pay >= CAP_X - 1e-9),
    }
    out["oddsMax"] = (1 / out["pMax"]) if out["pMax"] > 0 else None
    mean = out["meanX"]
    out["stdX"] = float(np.sqrt((w * (pay - mean) ** 2).sum() / W))
    if tier is not None:
        out["tierShare"] = {str(k): share(tier == k) for k in range(4)}
    return out


def write_lut(mode, ids, wi, pay, pub=PUB):
    path = os.path.join(pub, f"lookUpTable_{mode}_0.csv")
    tmp = path + ".tmp"
    with open(tmp, "w", newline="") as f:
        for i, wt, p in zip(ids, wi, np.rint(pay * 100).astype(np.int64)):
            f.write(f"{i},{wt},{p}\n")
    os.replace(tmp, path)  # never truncate in place
    return path


def reweight(mode, pin_over, dry=False, lib=LIB, pub=PUB):
    ids, pay, tier = load_mode(mode, lib)
    assert pay.min() >= FLOOR - 1e-9, f"{mode}: a book pays {pay.min()}x < the {FLOOR}x floor"
    assert (np.rint(pay * 10) == pay * 10).all(), "payouts must be multiples of 0.1x"
    t = Tilt(pay, tier)
    lam, kappa, w = t.solve(pin_over)
    wi = np.maximum(np.rint(w * TOTAL), 1).astype(np.int64)
    stats = table_stats(pay, wi.astype(float), tier)
    stats.update({"mode": mode, "lam": lam, "kappa": kappa, "pinOver": pin_over, "floatRtp": t.rtp(lam, kappa),
                  "wincapBooks": int(t.cap.sum()), "booksPerTier": [int(((tier == k) & ~t.cap).sum()) for k in range(4)],
                  "minWeight": int(wi.min()), "weightSum": int(wi.sum()), "effectiveBooks": float(wi.astype(float).sum() ** 2 / (wi.astype(float) ** 2).sum())})
    assert abs(stats["rtp"] - TARGET_RTP) < 1e-6, stats["rtp"]
    if not dry:
        write_lut(mode, ids, wi, pay, pub)
    return stats


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--modes", default=",".join(MODES))
    ap.add_argument("--pin-over", type=float, default=None, help="P(R > price) to pin (default calib_params.DOOR_PIN_OVER; 0 = plain tilt)")
    ap.add_argument("--dry", action="store_true", help="solve and print, write nothing")
    ap.add_argument("--report", default=None, help="write the stats of all modes as JSON")
    a = ap.parse_args(argv)
    pin = default_pin_over() if a.pin_over is None else a.pin_over
    res = {}
    for mode in a.modes.split(","):
        s = reweight(mode, pin, a.dry)
        res[mode] = s
        print(f"{mode}: lam {s['lam']:.6f} kappa {s['kappa']:.4f} rtp {s['rtp']:.7f} median {s['medianX']:.1f}x P(R>price) {s['pGtPrice']*100:.2f}% "
              f"30-60x {s['share_30_60']*100:.1f}% 300x+ {(s['share_300_1000']+s['share_1000_plus'])*100:.2f}% p(max) 1/{s['oddsMax']:.0f} "
              f"effective books {s['effectiveBooks']:.0f} of {s['books']}{' (dry)' if a.dry else ' written'}")
    if a.report:
        json.dump(res, open(a.report, "w"), indent=1)
    return res


if __name__ == "__main__":
    main()
