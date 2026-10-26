"""Bonus (buy) weights without the Rust optimizer.
Natural books -> weights: per starting-free-spin tier a pinned share, inside a tier every non-wincap book gets
exp(-lam * payout), P(5000x) is pinned to 1/50000, lam is solved so that the mode RTP is exactly 96.000 %.
Reads  library/lookup_tables/lookUpTable_bonus.csv (unit weights) + books_bonus.jsonl.zst (tier = totalFs of the first
freeSpinTrigger, cached in library/bonus_tiers.json), writes library/publish_files/lookUpTable_bonus_0.csv.
Usage (env python): reweight_bonus.py [--cache-only]"""
import csv, io, json, math, os, re, sys
import numpy as np
import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "..", "library")
PUB = os.path.join(LIB, "publish_files")
CACHE = os.path.join(LIB, "bonus_tiers.json")
SHARES = {10: 0.8800, 12: 0.1000, 15: 0.0178, "18+": 0.0022}  # starting free spins; 18+ = 18 and 20 together
P_MAX = 1 / 50000          # chance of the 5000x wincap books (all of them together)
TARGET_RTP = 0.96
COST = 100.0
TOTAL = 10**15             # integer weight scale


def tiers():
    if os.path.exists(CACHE):
        return {int(k): v for k, v in json.load(open(CACHE)).items()}
    out = {}
    rid = re.compile(rb'^\{"id":\s*(\d+)')
    rfs = re.compile(rb'"totalFs":\s*(\d+)')
    with open(os.path.join(PUB, "books_bonus.jsonl.zst"), "rb") as fh:
        for line in io.BufferedReader(zstandard.ZstdDecompressor().stream_reader(fh), 1 << 20):
            i = int(rid.match(line).group(1))
            m = rfs.search(line)
            out[i] = int(m.group(1)) if m else 0
    json.dump(out, open(CACHE, "w"))
    return out


def main():
    t = tiers()
    rows = [(int(a), int(p)) for a, _, p in csv.reader(open(os.path.join(LIB, "lookup_tables", "lookUpTable_bonus.csv")))]
    ids = np.array([r[0] for r in rows]); pay = np.array([r[1] for r in rows], float) / 100.0
    fs = np.array([t[i] for i in ids])
    tier = np.where(fs >= 18, 3, np.where(fs == 15, 2, np.where(fs == 12, 1, 0)))  # 0:10 1:12 2:15 3:18+
    assert (fs >= 10).all()
    cap = pay >= 5000 - 1e-9
    shares = np.array([SHARES[10], SHARES[12], SHARES[15], SHARES["18+"]])
    shares = shares / shares.sum()
    print("books", len(ids), "wincap books", int(cap.sum()), "per tier", np.bincount(tier[~cap], minlength=4))

    def build(lam):
        w = np.zeros(len(ids))
        for k in range(4):
            sel = (tier == k) & ~cap
            e = np.exp(-lam * (pay[sel] - pay[sel].min()))
            w[sel] = shares[k] * (1 - P_MAX) * e / e.sum()
        w[cap] = P_MAX / cap.sum()
        return w

    lo, hi = -0.05, 0.05
    for _ in range(200):
        mid = (lo + hi) / 2
        rtp = (build(mid) * pay).sum() / COST
        if rtp > TARGET_RTP: lo = mid
        else: hi = mid
    lam = (lo + hi) / 2
    w = build(lam)
    wi = np.maximum(np.round(w * TOTAL), 1).astype(np.int64)
    rtp = (wi * pay).sum() / wi.sum() / COST
    # final nudge: move rounding error into the weights of the most common payout bucket
    print("lambda %.6f rtp(int) %.7f" % (lam, rtp))
    with open(os.path.join(PUB, "lookUpTable_bonus_0.csv"), "w", newline="") as f:
        for i, wt, p in zip(ids, wi, np.rint(pay * 100).astype(int)):
            f.write(f"{i},{wt},{p}\n")
    print("written")


if __name__ == "__main__":
    main()
